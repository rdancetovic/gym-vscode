import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class ReservationStateStore {
    public enum Status {
        CONFIRMED("Confirmed"),
        CANCELLED("Cancelled");

        private final String jsonValue;

        Status(String jsonValue) {
            this.jsonValue = jsonValue;
        }

        public String jsonValue() {
            return jsonValue;
        }

        private static Status fromJson(String value) throws IOException {
            for (Status status : values()) {
                if (status.jsonValue.equals(value)) {
                    return status;
                }
            }
            throw new IOException("Invalid reservation status in state file: " + value);
        }
    }

    public record Reservation(
            String code,
            String className,
            String sessionId,
            String day,
            String time,
            int participants,
            int pricePerParticipant,
            int totalPrice,
            Status status) {
    }

    public record ApplicationState(Map<String, Integer> availability, List<Reservation> reservations) {
        public ApplicationState {
            availability = Collections.unmodifiableMap(new LinkedHashMap<>(availability));
            reservations = List.copyOf(reservations);
        }
    }

    private static final Set<String> ROOT_FIELDS = Set.of("availability", "reservations");
    private static final Set<String> RESERVATION_FIELDS = Set.of(
            "code", "className", "sessionId", "day", "time",
            "participants", "pricePerParticipant", "totalPrice", "status");

    private final Path dataFile;
    private ApplicationState currentState;

    public ReservationStateStore(Path dataFile) {
        this.dataFile = dataFile.toAbsolutePath().normalize();
    }

    public synchronized ApplicationState load() throws IOException {
        if (!Files.exists(dataFile)) {
            ApplicationState initialState = new ApplicationState(GymCatalogue.initialAvailability(), List.of());
            saveToDisk(initialState);
            currentState = initialState;
            return currentState;
        }
        if (!Files.isRegularFile(dataFile)) {
            throw new IOException("Reservation state path is not a regular file: " + dataFile);
        }

        String json = Files.readString(dataFile, StandardCharsets.UTF_8);
        ApplicationState loadedState = decode(json);
        validate(loadedState);
        currentState = loadedState;
        return currentState;
    }

    public synchronized ApplicationState currentState() {
        if (currentState == null) {
            throw new IllegalStateException("Reservation state has not been loaded.");
        }
        return currentState;
    }

    public synchronized void save(ApplicationState nextState) throws IOException {
        validate(nextState);
        saveToDisk(nextState);
        currentState = nextState;
    }

    private void saveToDisk(ApplicationState state) throws IOException {
        Path parent = dataFile.getParent();
        if (parent == null) {
            throw new IOException("Reservation state file must have a parent directory.");
        }
        Files.createDirectories(parent);
        Path temporaryFile = Files.createTempFile(parent, dataFile.getFileName().toString(), ".tmp");
        try {
            Files.writeString(temporaryFile, encode(state), StandardCharsets.UTF_8);
            try {
                Files.move(temporaryFile, dataFile,
                        StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException exception) {
                Files.move(temporaryFile, dataFile, StandardCopyOption.REPLACE_EXISTING);
            }
        } finally {
            Files.deleteIfExists(temporaryFile);
        }
    }

    private static void validate(ApplicationState state) throws IOException {
        if (state == null) {
            throw new IOException("Reservation state cannot be null.");
        }

        Map<String, Integer> initialAvailability = GymCatalogue.initialAvailability();
        if (!state.availability().keySet().equals(initialAvailability.keySet())) {
            throw new IOException("Reservation state must contain availability for all catalogue sessions.");
        }
        for (Map.Entry<String, Integer> entry : state.availability().entrySet()) {
            GymCatalogue.Session session = GymCatalogue.findSession(entry.getKey())
                    .orElseThrow(() -> new IOException("Unknown session in reservation state: " + entry.getKey()));
            Integer remaining = entry.getValue();
            if (remaining == null || remaining < 0 || remaining > session.capacity()) {
                throw new IOException("Invalid remaining availability for session: " + entry.getKey());
            }
        }

        Set<String> codes = new java.util.HashSet<>();
        for (Reservation reservation : state.reservations()) {
            if (reservation == null || reservation.code() == null
                    || !reservation.code().matches("GYM-\\d{6}")) {
                throw new IOException("Invalid reservation code in state.");
            }
            if (!codes.add(reservation.code())) {
                throw new IOException("Duplicate reservation code in state: " + reservation.code());
            }
            GymCatalogue.Session session = GymCatalogue.findSession(reservation.sessionId())
                    .orElseThrow(() -> new IOException(
                            "Unknown reservation session in state: " + reservation.sessionId()));
            GymCatalogue.GymClass gymClass = GymCatalogue.findClassForSession(reservation.sessionId())
                    .orElseThrow(() -> new IOException(
                            "Unknown reservation class in state: " + reservation.sessionId()));
            if (!gymClass.name().equals(reservation.className())
                    || !session.day().equals(reservation.day())
                    || !session.time().equals(reservation.time())
                    || gymClass.pricePerParticipant() != reservation.pricePerParticipant()
                    || reservation.participants() < 1
                    || reservation.participants() > session.capacity()
                    || reservation.totalPrice() != Math.multiplyExact(
                            reservation.participants(), reservation.pricePerParticipant())
                    || reservation.status() == null) {
                throw new IOException("Invalid reservation details in state for code: " + reservation.code());
            }
        }
    }

    private static String encode(ApplicationState state) {
        StringBuilder json = new StringBuilder();
        json.append("{\n  \"availability\": {");
        List<String> sessionIds = new ArrayList<>(GymCatalogue.initialAvailability().keySet());
        sessionIds.sort(String::compareTo);
        for (int index = 0; index < sessionIds.size(); index++) {
            String sessionId = sessionIds.get(index);
            json.append(index == 0 ? "\n" : ",\n")
                    .append("    ").append(quote(sessionId)).append(": ")
                    .append(state.availability().get(sessionId));
        }
        if (!sessionIds.isEmpty()) {
            json.append('\n').append("  ");
        }
        json.append("},\n  \"reservations\": [");
        for (int index = 0; index < state.reservations().size(); index++) {
            Reservation reservation = state.reservations().get(index);
            json.append(index == 0 ? "\n" : ",\n")
                    .append("    {")
                    .append("\"code\": ").append(quote(reservation.code())).append(", ")
                    .append("\"className\": ").append(quote(reservation.className())).append(", ")
                    .append("\"sessionId\": ").append(quote(reservation.sessionId())).append(", ")
                    .append("\"day\": ").append(quote(reservation.day())).append(", ")
                    .append("\"time\": ").append(quote(reservation.time())).append(", ")
                    .append("\"participants\": ").append(reservation.participants()).append(", ")
                    .append("\"pricePerParticipant\": ").append(reservation.pricePerParticipant()).append(", ")
                    .append("\"totalPrice\": ").append(reservation.totalPrice()).append(", ")
                    .append("\"status\": ").append(quote(reservation.status().jsonValue()))
                    .append("}");
        }
        if (!state.reservations().isEmpty()) {
            json.append('\n').append("  ");
        }
        return json.append("]\n}\n").toString();
    }

    private static String quote(String value) {
        StringBuilder quoted = new StringBuilder("\"");
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            switch (character) {
                case '"' -> quoted.append("\\\"");
                case '\\' -> quoted.append("\\\\");
                case '\b' -> quoted.append("\\b");
                case '\f' -> quoted.append("\\f");
                case '\n' -> quoted.append("\\n");
                case '\r' -> quoted.append("\\r");
                case '\t' -> quoted.append("\\t");
                default -> {
                    if (character < 0x20) {
                        quoted.append(String.format("\\u%04x", (int) character));
                    } else {
                        quoted.append(character);
                    }
                }
            }
        }
        return quoted.append('"').toString();
    }

    static Object parseJson(String json) throws IOException {
        return new JsonParser(json).parse();
    }

    private static ApplicationState decode(String json) throws IOException {
        Object parsed = parseJson(json);
        Map<String, Object> root = object(parsed, "root");
        requireExactFields(root, ROOT_FIELDS, "root");

        Map<String, Object> rawAvailability = object(root.get("availability"), "availability");
        Map<String, Integer> availability = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : rawAvailability.entrySet()) {
            availability.put(entry.getKey(), integer(entry.getValue(), "availability." + entry.getKey()));
        }

        List<Object> rawReservations = array(root.get("reservations"), "reservations");
        List<Reservation> reservations = new ArrayList<>();
        for (int index = 0; index < rawReservations.size(); index++) {
            Map<String, Object> rawReservation = object(rawReservations.get(index), "reservations[" + index + "]");
            requireExactFields(rawReservation, RESERVATION_FIELDS, "reservations[" + index + "]");
            reservations.add(new Reservation(
                    string(rawReservation.get("code"), "code"),
                    string(rawReservation.get("className"), "className"),
                    string(rawReservation.get("sessionId"), "sessionId"),
                    string(rawReservation.get("day"), "day"),
                    string(rawReservation.get("time"), "time"),
                    integer(rawReservation.get("participants"), "participants"),
                    integer(rawReservation.get("pricePerParticipant"), "pricePerParticipant"),
                    integer(rawReservation.get("totalPrice"), "totalPrice"),
                    Status.fromJson(string(rawReservation.get("status"), "status"))));
        }
        return new ApplicationState(availability, reservations);
    }

    private static void requireExactFields(Map<String, Object> value, Set<String> required, String location)
            throws IOException {
        if (!value.keySet().equals(required)) {
            throw new IOException("Unexpected or missing fields in " + location + ".");
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> object(Object value, String location) throws IOException {
        if (!(value instanceof Map<?, ?>)) {
            throw new IOException("Expected a JSON object at " + location + ".");
        }
        return (Map<String, Object>) value;
    }

    @SuppressWarnings("unchecked")
    private static List<Object> array(Object value, String location) throws IOException {
        if (!(value instanceof List<?>)) {
            throw new IOException("Expected a JSON array at " + location + ".");
        }
        return (List<Object>) value;
    }

    private static String string(Object value, String location) throws IOException {
        if (!(value instanceof String text)) {
            throw new IOException("Expected text at " + location + ".");
        }
        return text;
    }

    private static int integer(Object value, String location) throws IOException {
        if (!(value instanceof BigDecimal number)) {
            throw new IOException("Expected a whole number at " + location + ".");
        }
        try {
            return number.intValueExact();
        } catch (ArithmeticException exception) {
            throw new IOException("Expected an in-range whole number at " + location + ".", exception);
        }
    }

    private static final class JsonParser {
        private final String input;
        private int index;

        private JsonParser(String input) {
            this.input = input;
        }

        private Object parse() throws IOException {
            Object value = value();
            whitespace();
            if (index != input.length()) {
                fail("Unexpected trailing content");
            }
            return value;
        }

        private Object value() throws IOException {
            whitespace();
            if (index >= input.length()) {
                return fail("Unexpected end of input");
            }
            return switch (input.charAt(index)) {
                case '{' -> object();
                case '[' -> array();
                case '"' -> string();
                case 't' -> literal("true", Boolean.TRUE);
                case 'f' -> literal("false", Boolean.FALSE);
                case 'n' -> literal("null", null);
                default -> number();
            };
        }

        private Map<String, Object> object() throws IOException {
            index++;
            whitespace();
            Map<String, Object> values = new LinkedHashMap<>();
            if (consume('}')) {
                return values;
            }
            while (true) {
                whitespace();
                if (index >= input.length() || input.charAt(index) != '"') {
                    return fail("Expected an object key");
                }
                String key = string();
                whitespace();
                expect(':');
                Object value = value();
                if (values.containsKey(key)) {
                    return fail("Duplicate object key");
                }
                values.put(key, value);
                whitespace();
                if (consume('}')) {
                    return values;
                }
                expect(',');
            }
        }

        private List<Object> array() throws IOException {
            index++;
            whitespace();
            List<Object> values = new ArrayList<>();
            if (consume(']')) {
                return values;
            }
            while (true) {
                values.add(value());
                whitespace();
                if (consume(']')) {
                    return values;
                }
                expect(',');
            }
        }

        private String string() throws IOException {
            expect('"');
            StringBuilder value = new StringBuilder();
            while (index < input.length()) {
                char character = input.charAt(index++);
                if (character == '"') {
                    return value.toString();
                }
                if (character == '\\') {
                    if (index >= input.length()) {
                        return fail("Incomplete string escape");
                    }
                    char escaped = input.charAt(index++);
                    switch (escaped) {
                        case '"', '\\', '/' -> value.append(escaped);
                        case 'b' -> value.append('\b');
                        case 'f' -> value.append('\f');
                        case 'n' -> value.append('\n');
                        case 'r' -> value.append('\r');
                        case 't' -> value.append('\t');
                        case 'u' -> value.append(unicodeEscape());
                        default -> {
                            return fail("Invalid string escape");
                        }
                    }
                } else if (character < 0x20) {
                    return fail("Unescaped control character in string");
                } else {
                    value.append(character);
                }
            }
            return fail("Unterminated string");
        }

        private char unicodeEscape() throws IOException {
            if (index + 4 > input.length()) {
                return fail("Incomplete Unicode escape");
            }
            try {
                char value = (char) Integer.parseInt(input.substring(index, index + 4), 16);
                index += 4;
                return value;
            } catch (NumberFormatException exception) {
                throw new IOException("Invalid Unicode escape at character " + index + ".", exception);
            }
        }

        private Object number() throws IOException {
            int start = index;
            consume('-');
            if (consume('0')) {
                if (index < input.length() && Character.isDigit(input.charAt(index))) {
                    return fail("Leading zero in number");
                }
            } else {
                digits(true);
            }
            if (consume('.')) {
                digits(true);
            }
            if (consume('e') || consume('E')) {
                if (!consume('+')) {
                    consume('-');
                }
                digits(true);
            }
            if (start == index) {
                return fail("Expected a JSON value");
            }
            try {
                return new BigDecimal(input.substring(start, index));
            } catch (NumberFormatException exception) {
                throw new IOException("Invalid number at character " + start + ".", exception);
            }
        }

        private void digits(boolean required) throws IOException {
            int start = index;
            while (index < input.length() && Character.isDigit(input.charAt(index))) {
                index++;
            }
            if (required && start == index) {
                fail("Expected a digit");
            }
        }

        private Object literal(String literal, Object value) throws IOException {
            if (!input.startsWith(literal, index)) {
                return fail("Invalid JSON literal");
            }
            index += literal.length();
            return value;
        }

        private boolean consume(char expected) {
            if (index < input.length() && input.charAt(index) == expected) {
                index++;
                return true;
            }
            return false;
        }

        private void expect(char expected) throws IOException {
            if (!consume(expected)) {
                fail("Expected '" + expected + "'");
            }
        }

        private void whitespace() {
            while (index < input.length() && Character.isWhitespace(input.charAt(index))) {
                index++;
            }
        }

        private <T> T fail(String message) throws IOException {
            throw new IOException(message + " at character " + index + ".");
        }
    }
}
