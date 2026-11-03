import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class GymReservationRestartIntegrationTest {
    private static final String STARTED_PREFIX = "Gym Reservation server listening at http://localhost:";
    private static final HttpClient CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .build();
    private static int assertions;

    private GymReservationRestartIntegrationTest() {
    }

    public static void main(String[] args) throws Exception {
        Path testDirectory = Files.createTempDirectory("gym-reservation-restart-test-");
        try {
            verifiesReservationAndAvailabilityAcrossServerRestarts(testDirectory);
        } finally {
            deleteTree(testDirectory);
        }
        System.out.println("Passed " + assertions + " server restart integration assertions.");
    }

    private static void verifiesReservationAndAvailabilityAcrossServerRestarts(Path testDirectory) throws Exception {
        String classPath = absoluteClassPath();
        Path dataFile = testDirectory.resolve("data").resolve("reservations.json");
        String reservationCode;

        equal(false, Files.exists(dataFile), "isolated data file starts missing");
        try (RunningServer server = RunningServer.start(testDirectory, classPath, 1)) {
            assertYogaWednesdayAvailability(server.baseUrl(), 6, "initial availability");

            HttpResponse<String> created = send(server.baseUrl(), "POST", "/reservations",
                    "{\"sessionId\":\"YOGA-2\",\"participants\":2}");
            equal(201, created.statusCode(), "reservation creation status");
            Map<String, Object> createdReservation = jsonObject(created.body());
            reservationCode = stringField(createdReservation, "code");
            equal(true, reservationCode.matches("GYM-[0-9]{6}"), "reservation code format");
            assertReservation(createdReservation, reservationCode, "Confirmed", "created reservation");
            assertYogaWednesdayAvailability(server.baseUrl(), 4, "availability after booking");
            assertLookup(server.baseUrl(), reservationCode, "Confirmed", "lookup before restart");
        }

        try (RunningServer server = RunningServer.start(testDirectory, classPath, 2)) {
            assertYogaWednesdayAvailability(server.baseUrl(), 4, "availability after first restart");
            assertLookup(server.baseUrl(), reservationCode, "Confirmed", "confirmed reservation after restart");

            HttpResponse<String> cancelled = send(server.baseUrl(), "DELETE",
                    "/reservations/" + reservationCode, null);
            equal(200, cancelled.statusCode(), "cancellation status");
            assertReservation(jsonObject(cancelled.body()), reservationCode, "Cancelled", "cancellation response");
            assertYogaWednesdayAvailability(server.baseUrl(), 6, "availability after cancellation");
        }

        try (RunningServer server = RunningServer.start(testDirectory, classPath, 3)) {
            assertYogaWednesdayAvailability(server.baseUrl(), 6, "availability after second restart");
            assertLookup(server.baseUrl(), reservationCode, "Cancelled", "cancelled reservation after restart");
        }
    }

    private static void assertLookup(String baseUrl, String code, String status, String description) throws Exception {
        HttpResponse<String> response = send(baseUrl, "GET", "/reservations/" + code, null);
        equal(200, response.statusCode(), description + " status");
        assertReservation(jsonObject(response.body()), code, status, description);
    }

    private static void assertReservation(
            Map<String, Object> reservation, String code, String status, String description) {
        equal(code, stringField(reservation, "code"), description + " code");
        equal("Yoga", stringField(reservation, "className"), description + " class");
        equal("YOGA-2", stringField(reservation, "sessionId"), description + " session");
        equal("Wednesday", stringField(reservation, "day"), description + " day");
        equal("19:00", stringField(reservation, "time"), description + " time");
        equal(2, integerField(reservation, "participants"), description + " participants");
        equal(8, integerField(reservation, "pricePerParticipant"), description + " unit price");
        equal(16, integerField(reservation, "totalPrice"), description + " total");
        equal(status, stringField(reservation, "status"), description + " status field");
    }

    private static void assertYogaWednesdayAvailability(String baseUrl, int expected, String description)
            throws Exception {
        HttpResponse<String> response = send(baseUrl, "GET", "/classes", null);
        equal(200, response.statusCode(), description + " GET /classes status");
        Object parsed = ReservationStateStore.parseJson(response.body());
        if (!(parsed instanceof List<?> classes)) {
            throw new AssertionError(description + ": expected classes array");
        }
        for (Object rawClass : classes) {
            Map<?, ?> gymClass = object(rawClass, description + " class");
            if (!"Yoga".equals(gymClass.get("name"))) continue;
            if (!(gymClass.get("sessions") instanceof List<?> sessions)) {
                throw new AssertionError(description + ": Yoga sessions must be an array");
            }
            for (Object rawSession : sessions) {
                Map<?, ?> session = object(rawSession, description + " session");
                if ("YOGA-2".equals(session.get("sessionId"))) {
                    equal(expected, integerField(session, "remainingPlaces"), description + " YOGA-2 places");
                    return;
                }
            }
        }
        throw new AssertionError(description + ": YOGA-2 was missing from GET /classes");
    }

    private static HttpResponse<String> send(String baseUrl, String method, String path, String body)
            throws IOException, InterruptedException {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .timeout(Duration.ofSeconds(4));
        if (body == null) {
            builder.method(method, HttpRequest.BodyPublishers.noBody());
        } else {
            builder.header("Content-Type", "application/json")
                    .method(method, HttpRequest.BodyPublishers.ofString(body));
        }
        return CLIENT.send(builder.build(), HttpResponse.BodyHandlers.ofString());
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

    private static Map<?, ?> object(Object value, String description) {
        if (!(value instanceof Map<?, ?> map)) {
            throw new AssertionError(description + " must be a JSON object");
        }
        return map;
    }

    private static String stringField(Map<?, ?> object, String field) {
        Object value = object.get(field);
        if (!(value instanceof String text)) {
            throw new AssertionError(field + " must be a JSON string but was " + value);
        }
        return text;
    }

    private static int integerField(Map<?, ?> object, String field) {
        Object value = object.get(field);
        if (!(value instanceof BigDecimal number)) {
            throw new AssertionError(field + " must be a JSON number but was " + value);
        }
        try {
            return number.intValueExact();
        } catch (ArithmeticException exception) {
            throw new AssertionError(field + " must be a whole number but was " + value, exception);
        }
    }

    private static String absoluteClassPath() {
        Path workingDirectory = Path.of("").toAbsolutePath();
        String[] entries = System.getProperty("java.class.path").split(Pattern.quote(File.pathSeparator), -1);
        List<String> absoluteEntries = new ArrayList<>();
        for (String entry : entries) {
            Path path = entry.isEmpty() ? workingDirectory : Path.of(entry);
            absoluteEntries.add((path.isAbsolute() ? path : workingDirectory.resolve(path)).normalize().toString());
        }
        return String.join(File.pathSeparator, absoluteEntries);
    }

    private static void deleteTree(Path path) throws IOException {
        if (!Files.exists(path)) return;
        try (var entries = Files.walk(path)) {
            for (Path entry : entries.sorted(Comparator.reverseOrder()).toList()) {
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

    private static final class RunningServer implements AutoCloseable {
        private final Process process;
        private final Thread outputReader;
        private final String baseUrl;

        private RunningServer(Process process, Thread outputReader, String baseUrl) {
            this.process = process;
            this.outputReader = outputReader;
            this.baseUrl = baseUrl;
        }

        private static RunningServer start(Path workingDirectory, String classPath, int instance) throws Exception {
            String javaExecutable = Path.of(System.getProperty("java.home"), "bin",
                    System.getProperty("os.name").toLowerCase(Locale.ROOT).contains("win")
                            ? "java.exe" : "java").toString();
            Process process = new ProcessBuilder(
                    javaExecutable,
                    "--add-modules", "jdk.httpserver",
                    "-Dgym.server.port=0",
                    "-cp", classPath,
                    "GymReservationServer")
                    .directory(workingDirectory.toFile())
                    .redirectErrorStream(true)
                    .start();
            List<String> output = java.util.Collections.synchronizedList(new ArrayList<>());
            CompletableFuture<Integer> boundPort = new CompletableFuture<>();
            Thread outputReader = new Thread(() -> readStartupOutput(process, output, boundPort));
            outputReader.setDaemon(true);
            outputReader.start();

            try {
                int port = boundPort.get(10, TimeUnit.SECONDS);
                String baseUrl = "http://127.0.0.1:" + port;
                awaitApi(process, baseUrl, output);
                return new RunningServer(process, outputReader, baseUrl);
            } catch (Exception exception) {
                stop(process);
                throw new IOException("Could not start isolated server " + instance + ": "
                        + String.join("\n", output), exception);
            }
        }

        private static void readStartupOutput(
                Process process, List<String> output, CompletableFuture<Integer> boundPort) {
            Pattern portPattern = Pattern.compile(Pattern.quote(STARTED_PREFIX) + "(\\d+)");
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.add(line);
                    Matcher matcher = portPattern.matcher(line);
                    if (matcher.find()) boundPort.complete(Integer.parseInt(matcher.group(1)));
                }
            } catch (IOException exception) {
                boundPort.completeExceptionally(exception);
            }
        }

        private static void awaitApi(Process process, String baseUrl, List<String> output) throws Exception {
            long deadline = System.nanoTime() + Duration.ofSeconds(5).toNanos();
            IOException lastFailure = null;
            while (System.nanoTime() < deadline) {
                if (!process.isAlive()) {
                    throw new IOException("Server process exited: " + String.join("\n", output));
                }
                try {
                    HttpResponse<String> response = send(baseUrl, "GET", "/classes", null);
                    if (response.statusCode() == 200) return;
                    lastFailure = new IOException("GET /classes returned HTTP " + response.statusCode());
                } catch (IOException exception) {
                    lastFailure = exception;
                }
                Thread.sleep(50);
            }
            throw new IOException("Server did not become ready: " + String.join("\n", output), lastFailure);
        }

        private String baseUrl() {
            return baseUrl;
        }

        @Override
        public void close() throws InterruptedException {
            stop(process);
            outputReader.join(1_000);
        }

        private static void stop(Process process) throws InterruptedException {
            if (!process.isAlive()) return;
            process.destroy();
            if (!process.waitFor(5, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                process.waitFor();
            }
        }
    }
}