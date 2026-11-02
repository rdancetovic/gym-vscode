import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

public final class ClassesApiHandler implements HttpHandler {
    private final ReservationStateStore stateStore;

    public ClassesApiHandler(ReservationStateStore stateStore) {
        this.stateStore = stateStore;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (!"GET".equals(exchange.getRequestMethod())) {
            exchange.getResponseHeaders().set("Allow", "GET");
            sendError(exchange, 405, "method not allowed");
            return;
        }
        if (!"/classes".equals(exchange.getRequestURI().getPath())) {
            sendError(exchange, 404, "not found");
            return;
        }

        sendJson(exchange, 200, classesJson(stateStore.currentState().availability()));
    }

    private static String classesJson(Map<String, Integer> availability) {
        StringBuilder json = new StringBuilder("[");
        List<GymCatalogue.GymClass> classes = GymCatalogue.classes();
        for (int classIndex = 0; classIndex < classes.size(); classIndex++) {
            if (classIndex > 0) {
                json.append(',');
            }
            GymCatalogue.GymClass gymClass = classes.get(classIndex);
            json.append("{\"name\":").append(quote(gymClass.name()))
                    .append(",\"pricePerParticipant\":").append(gymClass.pricePerParticipant())
                    .append(",\"sessions\":[");
            List<GymCatalogue.Session> sessions = gymClass.sessions();
            for (int sessionIndex = 0; sessionIndex < sessions.size(); sessionIndex++) {
                if (sessionIndex > 0) {
                    json.append(',');
                }
                GymCatalogue.Session session = sessions.get(sessionIndex);
                Integer remainingPlaces = availability.get(session.sessionId());
                if (remainingPlaces == null) {
                    throw new IllegalStateException(
                            "Availability is missing for catalogue session " + session.sessionId());
                }
                json.append("{\"sessionId\":").append(quote(session.sessionId()))
                        .append(",\"day\":").append(quote(session.day()))
                        .append(",\"time\":").append(quote(session.time()))
                        .append(",\"capacity\":").append(session.capacity())
                        .append(",\"remainingPlaces\":").append(remainingPlaces)
                        .append('}');
            }
            json.append("]}");
        }
        return json.append(']').toString();
    }

    private static String quote(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + "\"";
    }

    private static void sendError(HttpExchange exchange, int status, String message) throws IOException {
        sendJson(exchange, status, "{\"message\":" + quote(message) + "}");
    }

    private static void sendJson(HttpExchange exchange, int status, String body) throws IOException {
        byte[] content = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, content.length);
        try (var responseBody = exchange.getResponseBody()) {
            responseBody.write(content);
        }
    }
}
