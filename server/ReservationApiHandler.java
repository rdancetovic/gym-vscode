import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

public final class ReservationApiHandler implements HttpHandler {
    private static final Pattern RESERVATION_CODE_PATTERN = Pattern.compile("GYM-[0-9]{6}");

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
        String method = exchange.getRequestMethod();
        if ("GET".equals(method)) {
            handleLookup(exchange);
            return;
        }
        if ("DELETE".equals(method)) {
            handleCancellation(exchange);
            return;
        }
        if (!"POST".equals(method)) {
            exchange.getResponseHeaders().set("Allow", "GET, POST, DELETE");
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

    private void handleLookup(HttpExchange exchange) throws IOException {
        String code = reservationCode(exchange);
        if (code == null) {
            return;
        }

        ReservationStateStore.Reservation reservation = findReservation(code);
        if (reservation == null) {
            sendError(exchange, 404, "reservation not found");
            return;
        }
        sendJson(exchange, 200, reservationJson(reservation));
    }

    private void handleCancellation(HttpExchange exchange) throws IOException {
        String code = reservationCode(exchange);
        if (code == null) {
            return;
        }

        ReservationStateStore.ApplicationState currentState = stateStore.currentState();
        List<ReservationStateStore.Reservation> reservations =
                new ArrayList<>(currentState.reservations());
        int reservationIndex = -1;
        for (int index = 0; index < reservations.size(); index++) {
            if (reservations.get(index).code().equals(code)) {
                reservationIndex = index;
                break;
            }
        }
        if (reservationIndex < 0) {
            sendError(exchange, 404, "reservation not found");
            return;
        }

        ReservationStateStore.Reservation reservation = reservations.get(reservationIndex);
        if (reservation.status() == ReservationStateStore.Status.CANCELLED) {
            sendError(exchange, 409, "reservation already cancelled");
            return;
        }

        ReservationStateStore.Reservation cancelledReservation = new ReservationStateStore.Reservation(
                reservation.code(),
                reservation.className(),
                reservation.sessionId(),
                reservation.day(),
                reservation.time(),
                reservation.participants(),
                reservation.pricePerParticipant(),
                reservation.totalPrice(),
                ReservationStateStore.Status.CANCELLED);
        reservations.set(reservationIndex, cancelledReservation);
        Map<String, Integer> availability = new LinkedHashMap<>(currentState.availability());
        availability.compute(reservation.sessionId(),
                (ignored, remaining) -> Math.addExact(remaining, reservation.participants()));
        ReservationStateStore.ApplicationState nextState =
                new ReservationStateStore.ApplicationState(availability, reservations);
        try {
            stateStore.save(nextState);
        } catch (IOException exception) {
            sendError(exchange, 500, "reservation could not be saved");
            return;
        }
        sendJson(exchange, 200, reservationJson(cancelledReservation));
    }

    private String reservationCode(HttpExchange exchange) throws IOException {
        String requestPath = exchange.getRequestURI().getPath();
        String prefix = "/reservations/";
        if (!requestPath.startsWith(prefix) || requestPath.indexOf('/', prefix.length()) >= 0) {
            sendError(exchange, 404, "not found");
            return null;
        }

        String code = requestPath.substring(prefix.length());
        if (!RESERVATION_CODE_PATTERN.matcher(code).matches()) {
            sendError(exchange, 400, "invalid reservation code");
            return null;
        }
        return code;
    }

    private ReservationStateStore.Reservation findReservation(String code) {
        return stateStore.currentState().reservations().stream()
                .filter(candidate -> candidate.code().equals(code))
                .findFirst()
                .orElse(null);
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
