import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ReservationApiHandler implements HttpHandler {
    private final ReservationStateStore stateStore;
    private final GymReservationDomain domain;
    private final ReservationCodeGenerator codeGenerator;

    public ReservationApiHandler(
            ReservationStateStore stateStore,
            GymReservationDomain domain,
            ReservationCodeGenerator codeGenerator) {
        this.stateStore = stateStore;
        this.domain = domain;
        this.codeGenerator = codeGenerator;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (!"POST".equals(exchange.getRequestMethod())) {
            exchange.getResponseHeaders().set("Allow", "POST");
            sendError(exchange, 405, "method not allowed");
            return;
        }
        if (!"/reservations".equals(exchange.getRequestURI().getPath())) {
            sendError(exchange, 404, "not found");
            return;
        }

        Map<String, Object> request;
        try {
            Object parsed = ReservationStateStore.parseJson(
                    new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            request = object(parsed);
        } catch (IOException | IllegalArgumentException exception) {
            sendError(exchange, 400, "invalid JSON request body");
            return;
        }

        if (!request.containsKey("sessionId")) {
            sendError(exchange, 400, "sessionId is required");
            return;
        }
        Object sessionIdValue = request.get("sessionId");
        if (!(sessionIdValue instanceof String sessionId) || sessionId.isEmpty()) {
            sendError(exchange, 400, "sessionId must be non-empty text");
            return;
        }
        if (!request.containsKey("participants")) {
            sendError(exchange, 400, "participants is required");
            return;
        }
        Object participantsValue = request.get("participants");
        GymReservationDomain.ValidationResult validation = domain.validateReservation(
                sessionId, participantsValue, stateStore.currentState().availability());
        if (validation == GymReservationDomain.ValidationResult.PARTICIPANTS_MUST_BE_WHOLE_NUMBER_OF_AT_LEAST_ONE) {
            sendError(exchange, 400, "participants must be a whole number of at least 1");
            return;
        }
        if (validation == GymReservationDomain.ValidationResult.SESSION_NOT_FOUND) {
            sendError(exchange, 404, "session not found");
            return;
        }
        if (validation == GymReservationDomain.ValidationResult.NOT_ENOUGH_PLACES) {
            sendError(exchange, 409, "not enough places available");
            return;
        }
        if (validation != GymReservationDomain.ValidationResult.VALID) {
            sendError(exchange, 400, "invalid reservation request");
            return;
        }

        int participants = ((BigDecimal) participantsValue).intValueExact();
        GymCatalogue.GymClass gymClass = GymCatalogue.findClassForSession(sessionId).orElseThrow();
        GymCatalogue.Session session = GymCatalogue.findSession(sessionId).orElseThrow();
        int totalPrice = domain.totalPrice(sessionId, participants);

        final String code;
        try {
            code = codeGenerator.nextCode(stateStore.currentState().reservations());
        } catch (ReservationCodeGenerator.CodeSpaceExhaustedException exception) {
            sendError(exchange, 503, "reservation code space exhausted");
            return;
        }

        ReservationStateStore.Reservation reservation = new ReservationStateStore.Reservation(
                code,
                gymClass.name(),
                session.sessionId(),
                session.day(),
                session.time(),
                participants,
                gymClass.pricePerParticipant(),
                totalPrice,
                ReservationStateStore.Status.CONFIRMED);
        ReservationStateStore.ApplicationState currentState = stateStore.currentState();
        Map<String, Integer> nextAvailability = new LinkedHashMap<>(currentState.availability());
        nextAvailability.compute(sessionId, (ignored, remaining) -> remaining - participants);
        List<ReservationStateStore.Reservation> nextReservations =
                new ArrayList<>(currentState.reservations());
        nextReservations.add(reservation);
        ReservationStateStore.ApplicationState nextState =
                new ReservationStateStore.ApplicationState(nextAvailability, nextReservations);

        try {
            stateStore.save(nextState);
        } catch (IOException exception) {
            sendError(exchange, 500, "reservation could not be saved");
            return;
        }
        sendJson(exchange, 201, reservationJson(reservation));
    }

    private static Map<String, Object> object(Object value) {
        if (!(value instanceof Map<?, ?> map)) {
            throw new IllegalArgumentException("Request body must be a JSON object.");
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> request = (Map<String, Object>) map;
        return request;
    }

    private static String reservationJson(ReservationStateStore.Reservation reservation) {
        return "{"
                + "\"code\":" + quote(reservation.code()) + ","
                + "\"className\":" + quote(reservation.className()) + ","
                + "\"sessionId\":" + quote(reservation.sessionId()) + ","
                + "\"day\":" + quote(reservation.day()) + ","
                + "\"time\":" + quote(reservation.time()) + ","
                + "\"participants\":" + reservation.participants() + ","
                + "\"pricePerParticipant\":" + reservation.pricePerParticipant() + ","
                + "\"totalPrice\":" + reservation.totalPrice() + ","
                + "\"status\":" + quote(reservation.status().jsonValue())
                + "}";
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
