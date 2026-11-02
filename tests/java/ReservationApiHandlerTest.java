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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class ReservationApiHandlerTest {
    private static int assertions;

    private ReservationApiHandlerTest() {
    }

    public static void main(String[] args) throws Exception {
        Path testDirectory = Files.createTempDirectory("gym-reservation-api-test-");
        try {
            verifiesSuccessfulCreationAndUniqueCodes(testDirectory.resolve("success"));
            verifiesValidationAndFailureIntegrity(testDirectory.resolve("validation"));
            verifiesPersistenceFailureDoesNotSucceed(testDirectory.resolve("write-failure"));
            verifiesCodeExhaustion(testDirectory.resolve("exhaustion"));
            verifiesReservationLookup(testDirectory.resolve("lookup"));
            verifiesReservationCancellation(testDirectory.resolve("cancellation"));
            verifiesCancellationPersistenceFailure(testDirectory.resolve("cancellation-write-failure"));
        } finally {
            deleteTree(testDirectory);
        }
        System.out.println("Passed " + assertions + " reservation endpoint assertions.");
    }

    private static void verifiesSuccessfulCreationAndUniqueCodes(Path directory) throws Exception {
        Files.createDirectories(directory);
        Path dataFile = directory.resolve("reservations.json");
        ReservationStateStore store = loadStore(dataFile);
        try (RunningApi api = new RunningApi(store, new ReservationCodeGenerator(() -> 123, 1_000_000))) {
            HttpResponse<String> first = api.post("{\"sessionId\":\"YOGA-2\",\"participants\":2}");
            equal(201, first.statusCode(), "successful create status");
            equal("application/json; charset=utf-8", first.headers().firstValue("Content-Type").orElse(null),
                    "successful create content type");
            Map<String, Object> firstJson = jsonObject(first.body());
            assertReservationFields(Map.of(
                    "code", "GYM-000123",
                    "className", "Yoga",
                    "sessionId", "YOGA-2",
                    "day", "Wednesday",
                    "time", "19:00",
                    "participants", new BigDecimal("2"),
                    "pricePerParticipant", new BigDecimal("8"),
                    "totalPrice", new BigDecimal("16"),
                    "status", "Confirmed"), firstJson, "complete reservation response fields");
            equal(4, store.currentState().availability().get("YOGA-2"),
                    "availability reduced after persisted booking");
            equal(1, store.currentState().reservations().size(), "reservation appended");
            equal(store.currentState(), new ReservationStateStore(dataFile).load(),
                    "created reservation and availability persisted");

            HttpResponse<String> second = api.post("{\"sessionId\":\"YOGA-2\",\"participants\":1}");
            equal(201, second.statusCode(), "second valid booking status");
            Map<String, Object> secondJson = jsonObject(second.body());
            assertReservationFields(Map.of(
                    "code", "GYM-000124",
                    "className", "Yoga",
                    "sessionId", "YOGA-2",
                    "day", "Wednesday",
                    "time", "19:00",
                    "participants", new BigDecimal("1"),
                    "pricePerParticipant", new BigDecimal("8"),
                    "totalPrice", new BigDecimal("8"),
                    "status", "Confirmed"), secondJson, "second complete reservation response fields");
            equal("GYM-000124", secondJson.get("code"), "collision advances to an unused code");
            equal(false, firstJson.get("code").equals(secondJson.get("code")), "codes are unique");
            equal(3, store.currentState().availability().get("YOGA-2"),
                    "second booking deducts current availability");
        }
    }

    private static void verifiesValidationAndFailureIntegrity(Path directory) throws Exception {
        Files.createDirectories(directory);
        ReservationStateStore store = loadStore(directory.resolve("reservations.json"));
        ReservationStateStore.ApplicationState baseline = store.currentState();
        try (RunningApi api = new RunningApi(store, new ReservationCodeGenerator(() -> 5, 1_000_000))) {
            assertError(api.post("{}"), 400, "sessionId is required", "missing session ID");
            assertError(api.post("{\"sessionId\":null,\"participants\":1}"),
                    400, "sessionId must be non-empty text", "null session ID");
            assertError(api.post("{\"sessionId\":\"\",\"participants\":1}"),
                    400, "sessionId must be non-empty text", "empty session ID");
            assertError(api.post("{\"sessionId\":12,\"participants\":1}"),
                    400, "sessionId must be non-empty text", "non-text session ID");
            assertError(api.post("{\"sessionId\":\"YOGA-2\"}"),
                    400, "participants is required", "missing participants");
            assertError(api.post("{\"sessionId\":\"YOGA-2\",\"participants\":\"2\"}"),
                    400, "participants must be a whole number of at least 1", "text participants");
            assertError(api.post("{\"sessionId\":\"YOGA-2\",\"participants\":1.5}"),
                    400, "participants must be a whole number of at least 1", "fractional participants");
            assertError(api.post("{\"sessionId\":\"YOGA-2\",\"participants\":0}"),
                    400, "participants must be a whole number of at least 1", "zero participants");
            assertError(api.post("{\"sessionId\":\"UNKNOWN\",\"participants\":0}"),
                    400, "participants must be a whole number of at least 1",
                    "invalid participant count precedes session lookup");
            assertError(api.post("{\"sessionId\":\"UNKNOWN\",\"participants\":1}"),
                    404, "session not found", "unknown session");
            assertError(api.post("{\"sessionId\":\"PILATES-3\",\"participants\":1}"),
                    409, "not enough places available", "full session");
            assertError(api.post("{\"sessionId\":\"YOGA-2\",\"participants\":7}"),
                    409, "not enough places available", "participants exceed availability");
            assertError(api.post("{broken"), 400, "invalid JSON request body", "malformed JSON");
            assertStatus(api.send("GET", "/reservations", null), 404, "missing reservation code path");
            HttpResponse<String> unsupportedMethod = api.send("PATCH", "/reservations/GYM-000123", null);
            assertStatus(unsupportedMethod, 405, "unsupported method");
            equal("GET, POST, DELETE", unsupportedMethod.headers().firstValue("Allow").orElse(null),
                    "unsupported method Allow header");
            assertStatus(api.send("POST", "/reservations/extra",
                    "{\"sessionId\":\"YOGA-2\",\"participants\":1}"), 404, "non-exact endpoint path");
            equal(baseline, store.currentState(), "invalid requests do not change in-memory state");
            equal(baseline, new ReservationStateStore(directory.resolve("reservations.json")).load(),
                    "invalid requests do not change stored state");
        }
    }

    private static void verifiesPersistenceFailureDoesNotSucceed(Path directory) throws Exception {
        Files.createDirectories(directory);
        Path stateDirectory = directory.resolve("state");
        Files.createDirectories(stateDirectory);
        Path stateFile = stateDirectory.resolve("reservations.json");
        ReservationStateStore store = loadStore(stateFile);
        ReservationStateStore.ApplicationState baseline = store.currentState();
        Path movedStateDirectory = directory.resolve("saved-state");

        try (RunningApi api = new RunningApi(store, new ReservationCodeGenerator(() -> 7, 1_000_000))) {
            Files.move(stateDirectory, movedStateDirectory);
            Files.writeString(stateDirectory, "blocks directory creation");
            HttpResponse<String> response = api.post("{\"sessionId\":\"YOGA-2\",\"participants\":2}");
            assertError(response, 500, "reservation could not be saved", "file write failure");
            equal(baseline, store.currentState(), "failed persistence does not change active state");
        } finally {
            Files.deleteIfExists(stateDirectory);
            Files.move(movedStateDirectory, stateDirectory);
        }
        equal(baseline, new ReservationStateStore(stateFile).load(),
                "failed persistence does not change stored state");
    }

    private static void verifiesCodeExhaustion(Path directory) throws Exception {
        Files.createDirectories(directory);
        ReservationStateStore store = loadStore(directory.resolve("reservations.json"));
        ReservationCodeGenerator generator = new ReservationCodeGenerator(() -> 0, 2);
        try (RunningApi api = new RunningApi(store, generator)) {
            HttpResponse<String> first = api.post("{\"sessionId\":\"YOGA-2\",\"participants\":1}");
            HttpResponse<String> second = api.post("{\"sessionId\":\"YOGA-2\",\"participants\":1}");
            equal(201, first.statusCode(), "code-space first reservation");
            equal(201, second.statusCode(), "code-space second reservation");
            assertReservationFields(Map.of(
                    "code", "GYM-000000",
                    "className", "Yoga",
                    "sessionId", "YOGA-2",
                    "day", "Wednesday",
                    "time", "19:00",
                    "participants", new BigDecimal("1"),
                    "pricePerParticipant", new BigDecimal("8"),
                    "totalPrice", new BigDecimal("8"),
                    "status", "Confirmed"),
                    jsonObject(first.body()), "first code-space reservation fields");
            assertReservationFields(Map.of(
                    "code", "GYM-000001",
                    "className", "Yoga",
                    "sessionId", "YOGA-2",
                    "day", "Wednesday",
                    "time", "19:00",
                    "participants", new BigDecimal("1"),
                    "pricePerParticipant", new BigDecimal("8"),
                    "totalPrice", new BigDecimal("8"),
                    "status", "Confirmed"),
                    jsonObject(second.body()), "second code-space reservation fields");
            ReservationStateStore.ApplicationState fullState = store.currentState();
            assertError(api.post("{\"sessionId\":\"YOGA-2\",\"participants\":1}"),
                    503, "reservation code space exhausted", "code-space exhaustion");
            equal(fullState, store.currentState(), "code exhaustion does not change active state");
            equal(fullState, new ReservationStateStore(directory.resolve("reservations.json")).load(),
                    "code exhaustion does not change stored state");
        }
    }

    private static void verifiesReservationLookup(Path directory) throws Exception {
        Files.createDirectories(directory);
        Path dataFile = directory.resolve("reservations.json");
        ReservationStateStore store = loadStore(dataFile);
        ReservationStateStore.ApplicationState initialState = store.currentState();
        ReservationStateStore.Reservation confirmed = new ReservationStateStore.Reservation(
                "GYM-004217", "Yoga", "YOGA-2", "Wednesday", "19:00",
                2, 8, 16, ReservationStateStore.Status.CONFIRMED);
        ReservationStateStore.Reservation cancelled = new ReservationStateStore.Reservation(
                "GYM-008014", "Pilates", "PILATES-1", "Tuesday", "18:00",
                1, 10, 10, ReservationStateStore.Status.CANCELLED);
        Map<String, Integer> availability = new LinkedHashMap<>(initialState.availability());
        availability.put("YOGA-2", 4);
        ReservationStateStore.ApplicationState lookupState =
                new ReservationStateStore.ApplicationState(availability, List.of(confirmed, cancelled));
        store.save(lookupState);
        String persistedJson = Files.readString(dataFile);

        try (RunningApi api = new RunningApi(store, new ReservationCodeGenerator(() -> 0, 1_000_000))) {
            assertLookupResponse(api.send("GET", "/reservations/GYM-004217", null),
                    confirmed, "confirmed reservation lookup");
            assertLookupResponse(api.send("GET", "/reservations/GYM-008014", null),
                    cancelled, "cancelled reservation lookup");

            assertError(api.send("GET", "/reservations/ABC-004217", null),
                    400, "invalid reservation code", "wrong code prefix");
            assertError(api.send("GET", "/reservations/GYM-04217", null),
                    400, "invalid reservation code", "too few code digits");
            assertError(api.send("GET", "/reservations/GYM-0004217", null),
                    400, "invalid reservation code", "too many code digits");
            assertError(api.send("GET", "/reservations/GYM-00A217", null),
                    400, "invalid reservation code", "nondigit code");
            assertError(api.send("GET", "/reservations/", null),
                    400, "invalid reservation code", "empty code segment");
            assertError(api.send("GET", "/reservations/GYM-999999", null),
                    404, "reservation not found", "unknown well-formed code");
            assertStatus(api.send("GET", "/reservations/GYM-004217/extra", null),
                    404, "extra lookup path segment");

            equal(lookupState, store.currentState(), "successful and failed lookups do not change memory state");
            equal(persistedJson, Files.readString(dataFile),
                    "successful and failed lookups do not change persisted file");
            equal(lookupState, new ReservationStateStore(dataFile).load(),
                    "lookups leave restart-restored state unchanged");
        }
    }

    private static void assertLookupResponse(
                HttpResponse<String> response,
                ReservationStateStore.Reservation reservation,
                String description) throws IOException {
        assertStatus(response, 200, description + " status");
        equal("application/json; charset=utf-8",
                response.headers().firstValue("Content-Type").orElse(null), description + " content type");
        assertReservationFields(Map.of(
                "code", reservation.code(),
                "className", reservation.className(),
                "sessionId", reservation.sessionId(),
                "day", reservation.day(),
                "time", reservation.time(),
                "participants", BigDecimal.valueOf(reservation.participants()),
                "pricePerParticipant", BigDecimal.valueOf(reservation.pricePerParticipant()),
                "totalPrice", BigDecimal.valueOf(reservation.totalPrice()),
                "status", reservation.status().jsonValue()),
                jsonObject(response.body()), description + " complete Reservation fields");
    }

    private static void verifiesReservationCancellation(Path directory) throws Exception {
        Files.createDirectories(directory);
        Path dataFile = directory.resolve("reservations.json");
        ReservationStateStore store = loadStore(dataFile);
        ReservationStateStore.ApplicationState initialState = store.currentState();
        ReservationStateStore.Reservation confirmed = new ReservationStateStore.Reservation(
                "GYM-004217", "Yoga", "YOGA-2", "Wednesday", "19:00",
                2, 8, 16, ReservationStateStore.Status.CONFIRMED);
        ReservationStateStore.Reservation other = new ReservationStateStore.Reservation(
                "GYM-008014", "Pilates", "PILATES-1", "Tuesday", "18:00",
                1, 10, 10, ReservationStateStore.Status.CONFIRMED);
        Map<String, Integer> availability = new LinkedHashMap<>(initialState.availability());
        availability.put("YOGA-2", 4);
        availability.put("PILATES-1", 7);
        ReservationStateStore.ApplicationState confirmedState =
                new ReservationStateStore.ApplicationState(availability, List.of(confirmed, other));
        store.save(confirmedState);

        ReservationStateStore.Reservation cancelled = new ReservationStateStore.Reservation(
                confirmed.code(), confirmed.className(), confirmed.sessionId(), confirmed.day(),
                confirmed.time(), confirmed.participants(), confirmed.pricePerParticipant(),
                confirmed.totalPrice(), ReservationStateStore.Status.CANCELLED);
        Map<String, Integer> restoredAvailability = new LinkedHashMap<>(availability);
        restoredAvailability.put("YOGA-2", 6);
        ReservationStateStore.ApplicationState cancelledState =
                new ReservationStateStore.ApplicationState(restoredAvailability, List.of(cancelled, other));

        try (RunningApi api = new RunningApi(store, new ReservationCodeGenerator(() -> 0, 1_000_000))) {
            HttpResponse<String> response = api.send("DELETE", "/reservations/GYM-004217", null);
            assertLookupResponseWithStatus(response, cancelled, 200, "successful cancellation response");
            equal(cancelledState, store.currentState(), "cancellation updates active state and restores availability");
            equal(cancelledState, new ReservationStateStore(dataFile).load(),
                    "cancellation persists status and restored availability");
            assertLookupResponse(api.send("GET", "/reservations/GYM-004217", null),
                    cancelled, "cancelled reservation remains available for lookup");

            String savedJson = Files.readString(dataFile);
            assertError(api.send("DELETE", "/reservations/GYM-004217", null),
                    409, "reservation already cancelled", "repeat cancellation");
            assertError(api.send("DELETE", "/reservations/bad-code", null),
                    400, "invalid reservation code", "malformed cancellation code");
            assertError(api.send("DELETE", "/reservations/GYM-999999", null),
                    404, "reservation not found", "unknown cancellation code");
            equal(cancelledState, store.currentState(), "failed cancellations do not change active state");
            equal(savedJson, Files.readString(dataFile), "failed cancellations do not change persisted file");
        }
    }

    private static void verifiesCancellationPersistenceFailure(Path directory) throws Exception {
        Files.createDirectories(directory);
        Path stateDirectory = directory.resolve("state");
        Files.createDirectories(stateDirectory);
        Path stateFile = stateDirectory.resolve("reservations.json");
        ReservationStateStore store = loadStore(stateFile);
        ReservationStateStore.ApplicationState initialState = store.currentState();
        ReservationStateStore.Reservation confirmed = new ReservationStateStore.Reservation(
                "GYM-004217", "Yoga", "YOGA-2", "Wednesday", "19:00",
                2, 8, 16, ReservationStateStore.Status.CONFIRMED);
        Map<String, Integer> availability = new LinkedHashMap<>(initialState.availability());
        availability.put("YOGA-2", 4);
        ReservationStateStore.ApplicationState confirmedState =
                new ReservationStateStore.ApplicationState(availability, List.of(confirmed));
        store.save(confirmedState);
        String savedJson = Files.readString(stateFile);
        Path movedStateDirectory = directory.resolve("saved-state");

        try (RunningApi api = new RunningApi(store, new ReservationCodeGenerator(() -> 0, 1_000_000))) {
            Files.move(stateDirectory, movedStateDirectory);
            Files.writeString(stateDirectory, "blocks directory creation");
            assertError(api.send("DELETE", "/reservations/GYM-004217", null),
                    500, "reservation could not be saved", "cancellation file write failure");
            equal(confirmedState, store.currentState(),
                    "failed cancellation persistence leaves active state unchanged");
        } finally {
            Files.deleteIfExists(stateDirectory);
            Files.move(movedStateDirectory, stateDirectory);
        }
        equal(savedJson, Files.readString(stateFile),
                "failed cancellation persistence leaves saved state unchanged");
        equal(confirmedState, new ReservationStateStore(stateFile).load(),
                "failed cancellation persistence leaves restart-restored state unchanged");
    }

    private static void assertLookupResponseWithStatus(
            HttpResponse<String> response,
            ReservationStateStore.Reservation reservation,
            int status,
            String description) throws IOException {
        assertStatus(response, status, description + " status");
        equal("application/json; charset=utf-8",
                response.headers().firstValue("Content-Type").orElse(null), description + " content type");
        assertReservationFields(Map.of(
                "code", reservation.code(),
                "className", reservation.className(),
                "sessionId", reservation.sessionId(),
                "day", reservation.day(),
                "time", reservation.time(),
                "participants", BigDecimal.valueOf(reservation.participants()),
                "pricePerParticipant", BigDecimal.valueOf(reservation.pricePerParticipant()),
                "totalPrice", BigDecimal.valueOf(reservation.totalPrice()),
                "status", reservation.status().jsonValue()),
                jsonObject(response.body()), description + " complete Reservation fields");
    }

    private static void assertReservationFields(
            Map<String, Object> expectedFields,
            Map<String, Object> actualResponse,
            String description) {
        for (Map.Entry<String, Object> expectedField : expectedFields.entrySet()) {
            String fieldName = expectedField.getKey();
            if (!actualResponse.containsKey(fieldName)) {
                throw new AssertionError(description + ": required field is missing: " + fieldName);
            }
            equal(expectedField.getValue(), actualResponse.get(fieldName),
                    description + " required field " + fieldName);
        }
    }

    private static ReservationStateStore loadStore(Path dataFile) throws IOException {
        ReservationStateStore store = new ReservationStateStore(dataFile);
        store.load();
        return store;
    }

    private static void assertError(HttpResponse<String> response, int status, String message, String description)
            throws IOException {
        assertStatus(response, status, description + " status");
        equal(message, jsonObject(response.body()).get("message"), description + " message");
    }

    private static void assertStatus(HttpResponse<String> response, int status, String description) {
        equal(status, response.statusCode(), description);
    }

    private static Map<String, Object> jsonObject(String json) throws IOException {
        Object parsed = ReservationStateStore.parseJson(json);
        if (!(parsed instanceof Map<?, ?> map)) {
            throw new AssertionError("Expected JSON object: " + json);
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) map;
        return result;
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

    private static final class RunningApi implements AutoCloseable {
        private final HttpServer server;
        private final ExecutorService executor;
        private final HttpClient client;
        private final String baseUrl;

        private RunningApi(ReservationStateStore store, ReservationCodeGenerator codeGenerator) throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            executor = Executors.newSingleThreadExecutor();
            server.setExecutor(executor);
            server.createContext("/reservations", new ReservationApiHandler(
                    store, new GymReservationDomain(), codeGenerator));
            server.start();
            baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
            client = HttpClient.newHttpClient();
        }

        private HttpResponse<String> post(String json) throws Exception {
            return send("POST", "/reservations", json);
        }

        private HttpResponse<String> send(String method, String path, String json) throws Exception {
            HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(baseUrl + path));
            if (json == null) {
                request.method(method, HttpRequest.BodyPublishers.noBody());
            } else {
                request.header("Content-Type", "application/json")
                        .method(method, HttpRequest.BodyPublishers.ofString(json));
            }
            return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
        }

        @Override
        public void close() {
            server.stop(0);
            executor.shutdownNow();
        }
    }
}
