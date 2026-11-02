import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ReservationStateStoreTest {
    private static int assertions;

    private ReservationStateStoreTest() {
    }

    public static void main(String[] args) throws Exception {
        Path testDirectory = Files.createTempDirectory("gym-reservation-state-test-");
        try {
            initializesMissingFile(testDirectory.resolve("initialize").resolve("reservations.json"));
            loadsExistingState(testDirectory.resolve("existing").resolve("reservations.json"));
            savesAndRestoresChanges(testDirectory.resolve("save").resolve("reservations.json"));
            reportsReadAndWriteErrors(testDirectory.resolve("errors"));
        } finally {
            deleteTree(testDirectory);
        }
        System.out.println("Passed " + assertions + " API-02 persistence assertions.");
    }

    private static void initializesMissingFile(Path dataFile) throws IOException {
        ReservationStateStore store = new ReservationStateStore(dataFile);
        ReservationStateStore.ApplicationState state = store.load();
        equal(true, Files.isRegularFile(dataFile), "missing state file created on startup");
        equal(GymCatalogue.initialAvailability(), state.availability(), "initial availability loaded");
        equal(List.of(), state.reservations(), "initial reservations empty");
        equal(state, new ReservationStateStore(dataFile).load(), "initialized state is valid JSON on disk");
    }

    private static void loadsExistingState(Path dataFile) throws IOException {
        Files.createDirectories(dataFile.getParent());
        String savedJson = """
                {
                  "availability": {
                    "YOGA-1": 10, "YOGA-2": 4, "YOGA-3": 2,
                    "PILATES-1": 8, "PILATES-2": 4, "PILATES-3": 0,
                    "FUNCTIONAL-1": 5, "FUNCTIONAL-2": 10, "FUNCTIONAL-3": 3,
                    "SPINNING-1": 7, "SPINNING-2": 1, "SPINNING-3": 10
                  },
                  "reservations": [
                    {
                      "code": "GYM-004217",
                      "className": "Yoga",
                      "sessionId": "YOGA-2",
                      "day": "Wednesday",
                      "time": "19:00",
                      "participants": 2,
                      "pricePerParticipant": 8,
                      "totalPrice": 16,
                      "status": "Confirmed"
                    }
                  ]
                }
                """;
        Files.writeString(dataFile, savedJson);

        ReservationStateStore.ApplicationState state = new ReservationStateStore(dataFile).load();
        equal(4, state.availability().get("YOGA-2"), "existing availability loaded");
        equal(List.of(confirmedYogaReservation()), state.reservations(), "existing reservation loaded");
        equal(savedJson, Files.readString(dataFile), "loading does not rewrite existing data");
    }

    private static void savesAndRestoresChanges(Path dataFile) throws IOException {
        ReservationStateStore store = new ReservationStateStore(dataFile);
        ReservationStateStore.ApplicationState initialState = store.load();
        Map<String, Integer> availability = new LinkedHashMap<>(initialState.availability());
        availability.put("YOGA-2", 4);
        List<ReservationStateStore.Reservation> reservations = new ArrayList<>();
        reservations.add(confirmedYogaReservation());
        ReservationStateStore.ApplicationState changedState =
                new ReservationStateStore.ApplicationState(availability, reservations);

        store.save(changedState);
        String savedJson = Files.readString(dataFile);
        equal(true, savedJson.contains("\"reservations\""), "reservation collection persisted");
        equal(true, savedJson.contains("\"status\": \"Confirmed\""), "reservation status persisted");
        equal(true, savedJson.contains("\"YOGA-2\": 4"), "updated availability persisted");
        equal(changedState, store.currentState(), "current store state updated after successful write");

        ReservationStateStore restartedStore = new ReservationStateStore(dataFile);
        ReservationStateStore.ApplicationState restoredState = restartedStore.load();
        equal(changedState, restoredState, "saved reservation and availability restored after restart");

        ReservationStateStore.Reservation cancelled = new ReservationStateStore.Reservation(
                "GYM-004217", "Yoga", "YOGA-2", "Wednesday", "19:00",
                2, 8, 16, ReservationStateStore.Status.CANCELLED);
        ReservationStateStore.ApplicationState cancelledState =
                new ReservationStateStore.ApplicationState(
                        initialState.availability(), List.of(cancelled));
        restartedStore.save(cancelledState);
        ReservationStateStore.ApplicationState cancelledAfterRestart =
                new ReservationStateStore(dataFile).load();
        equal(cancelledState, cancelledAfterRestart, "cancelled status and restored availability survive restart");
    }

    private static void reportsReadAndWriteErrors(Path directory) throws IOException {
        Files.createDirectories(directory);
        Path directoryAsFile = directory.resolve("not-a-file");
        Files.createDirectory(directoryAsFile);
        expectIOException(
                () -> new ReservationStateStore(directoryAsFile).load(),
                "directory used as state file fails explicitly");

        Path malformedFile = directory.resolve("malformed.json");
        Files.writeString(malformedFile, "{\"availability\":");
        expectIOException(
                () -> new ReservationStateStore(malformedFile).load(),
                "malformed state file fails explicitly");
        equal("{\"availability\":", Files.readString(malformedFile),
                "malformed state is not silently replaced");

        Path blockingFile = directory.resolve("parent-is-a-file");
        Files.writeString(blockingFile, "block");
        ReservationStateStore writeFailureStore =
                new ReservationStateStore(blockingFile.resolve("reservations.json"));
        expectIOException(writeFailureStore::load, "unwritable state path fails initialization");
        expectIllegalState(writeFailureStore::currentState, "failed initialization does not install state");

        Path validParent = directory.resolve("valid");
        Path validDataFile = validParent.resolve("reservations.json");
        ReservationStateStore store = new ReservationStateStore(validDataFile);
        ReservationStateStore.ApplicationState initialState = store.load();
        Path movedParent = directory.resolve("valid-saved");
        Files.move(validParent, movedParent);
        Files.writeString(validParent, "block");
        try {
            Map<String, Integer> changedAvailability =
                    new LinkedHashMap<>(initialState.availability());
            changedAvailability.put("YOGA-2", 4);
            ReservationStateStore.ApplicationState changedState =
                    new ReservationStateStore.ApplicationState(changedAvailability,
                            List.of(confirmedYogaReservation()));
            expectIOException(() -> store.save(changedState), "disk write failure is reported");
            equal(initialState, store.currentState(), "failed write does not replace active state");
        } finally {
            Files.delete(validParent);
            Files.move(movedParent, validParent);
        }
        equal(initialState, new ReservationStateStore(validDataFile).load(),
                "failed write leaves persisted state unchanged");
    }

    private static ReservationStateStore.Reservation confirmedYogaReservation() {
        return new ReservationStateStore.Reservation(
                "GYM-004217", "Yoga", "YOGA-2", "Wednesday", "19:00",
                2, 8, 16, ReservationStateStore.Status.CONFIRMED);
    }

    private static void deleteTree(Path path) throws IOException {
        if (!Files.exists(path)) {
            return;
        }
        try (var entries = Files.walk(path)) {
            for (Path entry : entries.sorted(java.util.Comparator.reverseOrder()).toList()) {
                Files.delete(entry);
            }
        }
    }

    private static void expectIOException(IoAction action, String description) throws IOException {
        assertions++;
        try {
            action.run();
        } catch (IOException expected) {
            return;
        }
        throw new AssertionError(description + ": expected IOException");
    }

    private static void expectIllegalState(Runnable action, String description) {
        assertions++;
        try {
            action.run();
        } catch (IllegalStateException expected) {
            return;
        }
        throw new AssertionError(description + ": expected IllegalStateException");
    }

    private static void equal(Object expected, Object actual, String description) {
        assertions++;
        if (!expected.equals(actual)) {
            throw new AssertionError(description + ": expected <" + expected + "> but was <" + actual + ">");
        }
    }

    @FunctionalInterface
    private interface IoAction {
        void run() throws IOException;
    }
}
