import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class GymReservationServer {
    private static final int PORT = Integer.getInteger("gym.server.port", 3000);
    private static final String HTML_CONTENT_TYPE = "text/html; charset=utf-8";
    private static final String CSS_CONTENT_TYPE = "text/css; charset=utf-8";
    private static final String JAVASCRIPT_CONTENT_TYPE = "text/javascript; charset=utf-8";
    private static ReservationStateStore stateStore;
    private static ExecutorService requestExecutor;

    private GymReservationServer() {
    }

    public static void main(String[] args) throws IOException {
        Path webRoot = Path.of(".").toRealPath();
        stateStore = new ReservationStateStore(Path.of("data", "reservations.json"));
        stateStore.load();
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        requestExecutor = Executors.newSingleThreadExecutor();
        server.setExecutor(requestExecutor);
        server.createContext("/classes", new ClassesApiHandler(stateStore));
        server.createContext("/reservations", new ReservationApiHandler(
                stateStore, new GymReservationDomain(), new ReservationCodeGenerator()));
        server.createContext("/", exchange -> serveFrontend(exchange, webRoot));
        server.start();
        System.out.println("Gym Reservation server listening at http://localhost:" + server.getAddress().getPort());
    }

    private static void serveFrontend(HttpExchange exchange, Path webRoot) throws IOException {
        if (!"GET".equals(exchange.getRequestMethod())) {
            exchange.getResponseHeaders().set("Allow", "GET");
            sendText(exchange, 405, "Method Not Allowed");
            return;
        }

        String requestPath = exchange.getRequestURI().getPath();
        String relativePath;
        if ("/".equals(requestPath)) {
            relativePath = "index.html";
        } else if (isFrontendPath(requestPath)) {
            relativePath = requestPath.substring(1);
        } else {
            sendText(exchange, 404, "Not Found");
            return;
        }

        Path file;
        try {
            file = webRoot.resolve(relativePath).normalize();
            if (!file.startsWith(webRoot) || !isFrontendFile(webRoot, file)) {
                sendText(exchange, 404, "Not Found");
                return;
            }
            file = file.toRealPath();
        } catch (InvalidPathException | IOException exception) {
            sendText(exchange, 404, "Not Found");
            return;
        }

        if (!file.startsWith(webRoot) || !Files.isRegularFile(file)) {
            sendText(exchange, 404, "Not Found");
            return;
        }

        byte[] content = Files.readAllBytes(file);
        exchange.getResponseHeaders().set("Content-Type", contentType(file));
        exchange.sendResponseHeaders(200, content.length);
        try (var responseBody = exchange.getResponseBody()) {
            responseBody.write(content);
        }
    }

    private static boolean isFrontendPath(String requestPath) {
        return requestPath.equals("/index.html")
                || requestPath.startsWith("/css/")
                || requestPath.startsWith("/js/")
                || requestPath.startsWith("/tests/");
    }

    private static boolean isFrontendFile(Path webRoot, Path file) {
        Path relative = webRoot.relativize(file);
        if (relative.getNameCount() == 0) {
            return false;
        }
        String firstDirectory = relative.getName(0).toString();
        return relative.toString().equals("index.html")
                || firstDirectory.equals("css")
                || firstDirectory.equals("js")
                || firstDirectory.equals("tests");
    }

    private static String contentType(Path file) {
        String name = file.getFileName().toString().toLowerCase();
        if (name.endsWith(".html")) {
            return HTML_CONTENT_TYPE;
        }
        if (name.endsWith(".css")) {
            return CSS_CONTENT_TYPE;
        }
        if (name.endsWith(".js")) {
            return JAVASCRIPT_CONTENT_TYPE;
        }
        return "application/octet-stream";
    }

    private static void sendText(HttpExchange exchange, int status, String message) throws IOException {
        byte[] content = message.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
        exchange.sendResponseHeaders(status, content.length);
        try (var responseBody = exchange.getResponseBody()) {
            responseBody.write(content);
        }
    }
}
