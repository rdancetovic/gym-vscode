import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class ClassesApiHandlerTest {
    private static final List<ExpectedClass> EXPECTED_CLASSES = List.of(
            new ExpectedClass("Yoga", 8, List.of(
                    new ExpectedSession("YOGA-1", "Monday", "18:00", 10),
                    new ExpectedSession("YOGA-2", "Wednesday", "19:00", 6),
                    new ExpectedSession("YOGA-3", "Saturday", "10:00", 2))),
            new ExpectedClass("Pilates", 10, List.of(
                    new ExpectedSession("PILATES-1", "Tuesday", "18:00", 8),
                    new ExpectedSession("PILATES-2", "Thursday", "19:00", 4),
                    new ExpectedSession("PILATES-3", "Saturday", "11:30", 0))),
            new ExpectedClass("Functional Training", 12, List.of(
                    new ExpectedSession("FUNCTIONAL-1", "Monday", "19:30", 5),
                    new ExpectedSession("FUNCTIONAL-2", "Wednesday", "18:00", 10),
                    new ExpectedSession("FUNCTIONAL-3", "Friday", "18:30", 3))),
            new ExpectedClass("Spinning", 11, List.of(
                    new ExpectedSession("SPINNING-1", "Tuesday", "19:30", 7),
                    new ExpectedSession("SPINNING-2", "Thursday", "18:00", 1),
                    new ExpectedSession("SPINNING-3", "Sunday", "10:00", 10))));
    private static int assertions;

    private ClassesApiHandlerTest() {
    }

    public static void main(String[] args) throws Exception {
        Path testDirectory = Files.createTempDirectory("gym-classes-api-test-");
        try {
            verifiesCatalogueAndReadOnlyBehavior(testDirectory.resolve("catalogue"));
            verifiesPersistedAvailabilityAndReadOnlyBehavior(testDirectory.resolve("persisted"));
            verifiesMethodAndPathBehavior(testDirectory.resolve("method-path"));
        } finally {
            deleteTree(testDirectory);
        }
        System.out.println("Passed " + assertions + " API-04 endpoint assertions.");
    }

    private static void verifiesCatalogueAndReadOnlyBehavior(Path directory) throws Exception {
        Files.createDirectories(directory);
        Path dataFile = directory.resolve("reservations.json");
        ReservationStateStore store = loadStore(dataFile);
        ReservationStateStore.ApplicationState baseline = store.currentState();
        String savedJson = Files.readString(dataFile);

        try (RunningApi api = new RunningApi(store)) {
            HttpResponse<String> response = api.send("GET", "/classes");
            equal(200, response.statusCode(), "successful GET status");
            equal("application/json; charset=utf-8",
                    response.headers().firstValue("Content-Type").orElse(null), "JSON content type");
            verifyClasses(response.body(), baseline.availability());
            verifyInitialAvailability(baseline.availability());
            equal(baseline, store.currentState(), "GET leaves in-memory state unchanged");
            equal(savedJson, Files.readString(dataFile), "GET leaves persisted file unchanged");
        }
    }

    private static void verifiesPersistedAvailabilityAndReadOnlyBehavior(Path directory) throws Exception {
        Files.createDirectories(directory);
        Path dataFile = directory.resolve("reservations.json");
        ReservationStateStore store = loadStore(dataFile);
        ReservationStateStore.ApplicationState initialState = store.currentState();
        Map<String, Integer> availability = new LinkedHashMap<>(initialState.availability());
        availability.put("YOGA-2", 4);
        ReservationStateStore.Reservation reservation = new ReservationStateStore.Reservation(
                "GYM-004217", "Yoga", "YOGA-2", "Wednesday", "19:00",
                2, 8, 16, ReservationStateStore.Status.CONFIRMED);
        ReservationStateStore.ApplicationState persistedState =
                new ReservationStateStore.ApplicationState(availability, List.of(reservation));
        store.save(persistedState);
        String savedJson = Files.readString(dataFile);

        try (RunningApi api = new RunningApi(store)) {
            HttpResponse<String> response = api.send("GET", "/classes");
            equal(200, response.statusCode(), "GET with persisted reservation status");
            verifyClasses(response.body(), persistedState.availability());
            equal(persistedState, store.currentState(), "GET preserves in-memory reservation and availability");
            equal(savedJson, Files.readString(dataFile), "GET preserves persisted reservation and availability");
        }

        equal(persistedState, new ReservationStateStore(dataFile).load(),
                "GET did not change restart-restored state");

        ReservationStateStore.Reservation cancelledReservation = new ReservationStateStore.Reservation(
                reservation.code(), reservation.className(), reservation.sessionId(), reservation.day(),
                reservation.time(), reservation.participants(), reservation.pricePerParticipant(),
                reservation.totalPrice(), ReservationStateStore.Status.CANCELLED);
        ReservationStateStore.ApplicationState cancelledState = new ReservationStateStore.ApplicationState(
                initialState.availability(), List.of(cancelledReservation));
        store.save(cancelledState);
        String cancelledJson = Files.readString(dataFile);
        try (RunningApi api = new RunningApi(store)) {
            HttpResponse<String> response = api.send("GET", "/classes");
            equal(200, response.statusCode(), "GET after persisted cancellation");
            verifyClasses(response.body(), cancelledState.availability());
            equal(cancelledState, store.currentState(), "GET preserves cancelled reservation and restored places");
            equal(cancelledJson, Files.readString(dataFile), "GET leaves cancelled reservation file unchanged");
        }
    }

    private static void verifiesMethodAndPathBehavior(Path directory) throws Exception {
        Files.createDirectories(directory);
        ReservationStateStore store = loadStore(directory.resolve("reservations.json"));
        try (RunningApi api = new RunningApi(store)) {
            HttpResponse<String> wrongMethod = api.send("POST", "/classes");
            assertError(wrongMethod, 405, "method not allowed", "unsupported method");
            equal("GET", wrongMethod.headers().firstValue("Allow").orElse(null),
                    "unsupported method Allow header");

            assertError(api.send("GET", "/classes/extra"), 404, "not found", "non-exact classes path");
            equal(404, api.send("GET", "/not-classes").statusCode(),
                    "unknown path status");
        }
    }

    private static void verifyClasses(String json, Map<String, Integer> availability) throws IOException {
        Object parsed = ReservationStateStore.parseJson(json);
        if (!(parsed instanceof List<?> actualClasses)) {
            throw new AssertionError("Expected classes JSON array: " + json);
        }
        equal(EXPECTED_CLASSES.size(), actualClasses.size(), "number of classes");

        for (int classIndex = 0; classIndex < EXPECTED_CLASSES.size(); classIndex++) {
            ExpectedClass expectedClass = EXPECTED_CLASSES.get(classIndex);
            Map<String, Object> actualClass = object(actualClasses.get(classIndex), "class");
            equal(expectedClass.name(), stringField(actualClass, "name"), "class name");
            integerField(actualClass, "pricePerParticipant", expectedClass.pricePerParticipant());

            Object rawSessions = actualClass.get("sessions");
            if (!(rawSessions instanceof List<?> actualSessions)) {
                throw new AssertionError("sessions must be a JSON array for " + expectedClass.name());
            }
            equal(expectedClass.sessions().size(), actualSessions.size(),
                    "session count for " + expectedClass.name());
            for (int sessionIndex = 0; sessionIndex < expectedClass.sessions().size(); sessionIndex++) {
                ExpectedSession expectedSession = expectedClass.sessions().get(sessionIndex);
                Map<String, Object> actualSession = object(actualSessions.get(sessionIndex), "session");
                equal(expectedSession.sessionId(), stringField(actualSession, "sessionId"), "session ID");
                equal(expectedSession.day(), stringField(actualSession, "day"), "session day");
                equal(expectedSession.time(), stringField(actualSession, "time"), "session time");
                integerField(actualSession, "capacity", 10);
                Integer currentAvailability = availability.get(expectedSession.sessionId());
                if (currentAvailability == null) {
                    throw new AssertionError("Missing state availability for " + expectedSession.sessionId());
                }
                integerField(actualSession, "remainingPlaces", currentAvailability);
            }
        }
    }

    private static void verifyInitialAvailability(Map<String, Integer> availability) {
        for (ExpectedClass expectedClass : EXPECTED_CLASSES) {
            for (ExpectedSession expectedSession : expectedClass.sessions()) {
                equal(expectedSession.initialAvailability(),
                        availability.get(expectedSession.sessionId()),
                        "initial availability for " + expectedSession.sessionId());
            }
        }
    }

    private static String stringField(Map<String, Object> object, String field) {
        Object value = object.get(field);
        if (!(value instanceof String text)) {
            throw new AssertionError(field + " must be a JSON string but was " + value);
        }
        return text;
    }

    private static void integerField(Map<String, Object> object, String field, int expected) {
        Object value = object.get(field);
        if (!(value instanceof BigDecimal number) || number.stripTrailingZeros().scale() > 0) {
            throw new AssertionError(field + " must be a whole-number JSON value but was " + value);
        }
        equal(BigDecimal.valueOf(expected), number, field);
    }

    private static Map<String, Object> object(Object value, String description) {
        if (!(value instanceof Map<?, ?> map)) {
            throw new AssertionError("Expected " + description + " object but was " + value);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : map.entrySet()) {
            if (!(entry.getKey() instanceof String key)) {
                throw new AssertionError(description + " contains a non-text field name");
            }
            result.put(key, entry.getValue());
        }
        return result;
    }

    private static ReservationStateStore loadStore(Path dataFile) throws IOException {
        ReservationStateStore store = new ReservationStateStore(dataFile);
        store.load();
        return store;
    }

    private static void assertError(
            HttpResponse<String> response, int status, String message, String description) throws IOException {
        equal(status, response.statusCode(), description + " status");
        equal("application/json; charset=utf-8",
                response.headers().firstValue("Content-Type").orElse(null), description + " content type");
        equal(message, object(ReservationStateStore.parseJson(response.body()), "error").get("message"),
                description + " message");
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

    private static void equal(Object expected, Object actual, String description) {
        assertions++;
        if (!expected.equals(actual)) {
            throw new AssertionError(description + ": expected <" + expected + "> but was <" + actual + ">");
        }
    }

    private record ExpectedClass(String name, int pricePerParticipant, List<ExpectedSession> sessions) {
    }

    private record ExpectedSession(String sessionId, String day, String time, int initialAvailability) {
    }

    private static final class RunningApi implements AutoCloseable {
        private final HttpServer server;
        private final ExecutorService executor;
        private final HttpClient client;
        private final String baseUrl;

        private RunningApi(ReservationStateStore store) throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            executor = Executors.newSingleThreadExecutor();
            server.setExecutor(executor);
            server.createContext("/classes", new ClassesApiHandler(store));
            server.start();
            baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
            client = HttpClient.newHttpClient();
        }

        private HttpResponse<String> send(String method, String path) throws Exception {
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + path))
                    .method(method, HttpRequest.BodyPublishers.noBody())
                    .build();
            return client.send(request, HttpResponse.BodyHandlers.ofString());
        }

        @Override
        public void close() {
            server.stop(0);
            executor.shutdownNow();
        }
    }
}
