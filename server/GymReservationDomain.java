import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.Map;
import java.util.Objects;

public final class GymReservationDomain {
    public enum ValidationResult {
        VALID,
        SESSION_ID_REQUIRED,
        SESSION_ID_MUST_BE_NON_EMPTY_TEXT,
        PARTICIPANTS_MUST_BE_WHOLE_NUMBER_OF_AT_LEAST_ONE,
        SESSION_NOT_FOUND,
        NOT_ENOUGH_PLACES
    }

    public ValidationResult validateReservation(
            Object sessionIdValue,
            Object participantsValue,
            Map<String, Integer> remainingAvailability) {
        Objects.requireNonNull(remainingAvailability, "remainingAvailability");

        if (sessionIdValue == null) {
            return ValidationResult.SESSION_ID_REQUIRED;
        }
        if (!(sessionIdValue instanceof String sessionId) || sessionId.isEmpty()) {
            return ValidationResult.SESSION_ID_MUST_BE_NON_EMPTY_TEXT;
        }
        BigDecimal participants = wholeNumber(participantsValue);
        if (participants == null || participants.signum() < 1) {
            return ValidationResult.PARTICIPANTS_MUST_BE_WHOLE_NUMBER_OF_AT_LEAST_ONE;
        }

        GymCatalogue.Session session = GymCatalogue.findSession(sessionId).orElse(null);
        if (session == null) {
            return ValidationResult.SESSION_NOT_FOUND;
        }

        Integer remainingPlaces = remainingAvailability.get(sessionId);
        if (remainingPlaces == null) {
            remainingPlaces = session.initialAvailablePlaces();
        }
        if (participants.compareTo(BigDecimal.valueOf(remainingPlaces)) > 0) {
            return ValidationResult.NOT_ENOUGH_PLACES;
        }
        return ValidationResult.VALID;
    }

    public int totalPrice(String sessionId, int participants) {
        GymCatalogue.GymClass gymClass = GymCatalogue.findClassForSession(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Unknown session: " + sessionId));
        GymCatalogue.Session session = GymCatalogue.findSession(sessionId).orElseThrow();
        if (participants < 1 || participants > session.capacity()) {
            throw new IllegalArgumentException("Participants must be between 1 and session capacity.");
        }
        return Math.multiplyExact(gymClass.pricePerParticipant(), participants);
    }

    private static BigDecimal wholeNumber(Object value) {
        if (!(value instanceof Number)) {
            return null;
        }
        BigDecimal number;
        if (value instanceof BigDecimal decimal) {
            number = decimal;
        } else if (value instanceof BigInteger integer) {
            number = new BigDecimal(integer);
        } else if (value instanceof Byte || value instanceof Short
                || value instanceof Integer || value instanceof Long) {
            number = BigDecimal.valueOf(((Number) value).longValue());
        } else if (value instanceof Float floatingPoint) {
            if (!Float.isFinite(floatingPoint)) {
                return null;
            }
            number = new BigDecimal(Float.toString(floatingPoint));
        } else if (value instanceof Double floatingPoint) {
            if (!Double.isFinite(floatingPoint)) {
                return null;
            }
            number = BigDecimal.valueOf(floatingPoint);
        } else {
            return null;
        }
        return number.scale() <= 0 ? number : null;
    }
}
