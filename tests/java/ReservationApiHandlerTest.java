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
        } finally {
            deleteTree(testDirectory);
        }
        System.out.println("Passed " + assertions + " API-03 endpoint assertions.");
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
            equal(Map.of(
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
            assertError(api.send("GET", "/reservations", null),
                    405, "method not allowed", "unsupported method");
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
            ReservationStateStore.ApplicationState fullState = store.currentState();
            assertError(api.post("{\"sessionId\":\"YOGA-2\",\"participants\":1}"),
                    503, "reservation code space exhausted", "code-space exhaustion");
            equal(fullState, store.currentState(), "code exhaustion does not change active state");
            equal(fullState, new ReservationStateStore(directory.resolve("reservations.json")).load(),
                    "code exhaustion does not change stored state");
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
