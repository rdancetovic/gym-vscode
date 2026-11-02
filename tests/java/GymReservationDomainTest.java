import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public final class GymReservationDomainTest {
    private static int assertions;

    private GymReservationDomainTest() {
    }

    public static void main(String[] args) {
        verifiesCatalogue();
        verifiesInitialAvailability();
        verifiesParticipantValidation();
        verifiesTotals();
        System.out.println("Passed " + assertions + " API-01 domain assertions.");
    }

    private static void verifiesCatalogue() {
        List<GymCatalogue.GymClass> classes = GymCatalogue.classes();
        equal(4, classes.size(), "four classes");
        equal(List.of("Yoga", "Pilates", "Functional Training", "Spinning"),
                classes.stream().map(GymCatalogue.GymClass::name).toList(), "class names and order");
        equal(List.of(8, 10, 12, 11),
                classes.stream().map(GymCatalogue.GymClass::pricePerParticipant).toList(),
                "class prices");
        equal(12, classes.stream().mapToInt(gymClass -> gymClass.sessions().size()).sum(),
                "twelve sessions");

        Map<String, GymCatalogue.Session> expectedSessions = Map.ofEntries(
                Map.entry("YOGA-1", new GymCatalogue.Session("YOGA-1", "Monday", "18:00", 10, 10)),
                Map.entry("YOGA-2", new GymCatalogue.Session("YOGA-2", "Wednesday", "19:00", 10, 6)),
                Map.entry("YOGA-3", new GymCatalogue.Session("YOGA-3", "Saturday", "10:00", 10, 2)),
                Map.entry("PILATES-1", new GymCatalogue.Session("PILATES-1", "Tuesday", "18:00", 10, 8)),
                Map.entry("PILATES-2", new GymCatalogue.Session("PILATES-2", "Thursday", "19:00", 10, 4)),
                Map.entry("PILATES-3", new GymCatalogue.Session("PILATES-3", "Saturday", "11:30", 10, 0)),
                Map.entry("FUNCTIONAL-1", new GymCatalogue.Session("FUNCTIONAL-1", "Monday", "19:30", 10, 5)),
                Map.entry("FUNCTIONAL-2", new GymCatalogue.Session("FUNCTIONAL-2", "Wednesday", "18:00", 10, 10)),
                Map.entry("FUNCTIONAL-3", new GymCatalogue.Session("FUNCTIONAL-3", "Friday", "18:30", 10, 3)),
                Map.entry("SPINNING-1", new GymCatalogue.Session("SPINNING-1", "Tuesday", "19:30", 10, 7)),
                Map.entry("SPINNING-2", new GymCatalogue.Session("SPINNING-2", "Thursday", "18:00", 10, 1)),
                Map.entry("SPINNING-3", new GymCatalogue.Session("SPINNING-3", "Sunday", "10:00", 10, 10)));

        for (GymCatalogue.GymClass gymClass : classes) {
            equal(3, gymClass.sessions().size(), gymClass.name() + " session count");
            for (GymCatalogue.Session actual : gymClass.sessions()) {
                equal(expectedSessions.get(actual.sessionId()), actual, actual.sessionId() + " details");
                equal(gymClass, GymCatalogue.findClassForSession(actual.sessionId()).orElse(null),
                        actual.sessionId() + " owning class");
            }
        }
        equal(12, expectedSessions.size(), "expected session fixture count");
        equal(null, GymCatalogue.findSession("UNKNOWN").orElse(null), "unknown session lookup");
    }

    private static void verifiesInitialAvailability() {
        Map<String, Integer> expected = Map.ofEntries(
                Map.entry("YOGA-1", 10),
                Map.entry("YOGA-2", 6),
                Map.entry("YOGA-3", 2),
                Map.entry("PILATES-1", 8),
                Map.entry("PILATES-2", 4),
                Map.entry("PILATES-3", 0),
                Map.entry("FUNCTIONAL-1", 5),
                Map.entry("FUNCTIONAL-2", 10),
                Map.entry("FUNCTIONAL-3", 3),
                Map.entry("SPINNING-1", 7),
                Map.entry("SPINNING-2", 1),
                Map.entry("SPINNING-3", 10));
        equal(expected, GymCatalogue.initialAvailability(), "initial session availability");
    }

    private static void verifiesParticipantValidation() {
        GymReservationDomain domain = new GymReservationDomain();
        Map<String, Integer> availability = GymCatalogue.initialAvailability();

        validation(domain, null, 1, availability,
                GymReservationDomain.ValidationResult.SESSION_ID_REQUIRED, "missing session identifier");
        validation(domain, "", 1, availability,
                GymReservationDomain.ValidationResult.SESSION_ID_MUST_BE_NON_EMPTY_TEXT, "empty session identifier");
        validation(domain, 123, 1, availability,
                GymReservationDomain.ValidationResult.SESSION_ID_MUST_BE_NON_EMPTY_TEXT, "non-text session identifier");
        validation(domain, "YOGA-2", null, availability,
                GymReservationDomain.ValidationResult.PARTICIPANTS_MUST_BE_WHOLE_NUMBER_OF_AT_LEAST_ONE,
                "missing participant count");
        validation(domain, "YOGA-2", "2", availability,
                GymReservationDomain.ValidationResult.PARTICIPANTS_MUST_BE_WHOLE_NUMBER_OF_AT_LEAST_ONE,
                "text participant count");
        validation(domain, "YOGA-2", new BigDecimal("2.5"), availability,
                GymReservationDomain.ValidationResult.PARTICIPANTS_MUST_BE_WHOLE_NUMBER_OF_AT_LEAST_ONE,
                "fractional participant count");
        validation(domain, "YOGA-2", 0, availability,
                GymReservationDomain.ValidationResult.PARTICIPANTS_MUST_BE_WHOLE_NUMBER_OF_AT_LEAST_ONE,
                "zero participant count");
        validation(domain, "YOGA-2", -1, availability,
                GymReservationDomain.ValidationResult.PARTICIPANTS_MUST_BE_WHOLE_NUMBER_OF_AT_LEAST_ONE,
                "negative participant count");
        validation(domain, "UNKNOWN", 0, availability,
                GymReservationDomain.ValidationResult.PARTICIPANTS_MUST_BE_WHOLE_NUMBER_OF_AT_LEAST_ONE,
                "invalid input precedes session lookup");
        validation(domain, "UNKNOWN", 1, availability,
                GymReservationDomain.ValidationResult.SESSION_NOT_FOUND, "unknown session identifier");
        validation(domain, "YOGA-2", 1, availability,
                GymReservationDomain.ValidationResult.VALID, "valid participant minimum");
        validation(domain, "YOGA-2", 6, availability,
                GymReservationDomain.ValidationResult.VALID, "exact remaining-place limit");
        validation(domain, "YOGA-2", 7, availability,
                GymReservationDomain.ValidationResult.NOT_ENOUGH_PLACES, "over remaining-place limit");
        validation(domain, "PILATES-3", 1, availability,
                GymReservationDomain.ValidationResult.NOT_ENOUGH_PLACES, "full session");
        validation(domain, "YOGA-2", 2, Map.of("YOGA-2", 1),
                GymReservationDomain.ValidationResult.NOT_ENOUGH_PLACES, "updated availability limit");
    }

    private static void verifiesTotals() {
        GymReservationDomain domain = new GymReservationDomain();
        equal(16, domain.totalPrice("YOGA-2", 2), "Yoga total");
        equal(20, domain.totalPrice("PILATES-1", 2), "Pilates total");
        equal(24, domain.totalPrice("FUNCTIONAL-1", 2), "Functional Training total");
        equal(22, domain.totalPrice("SPINNING-1", 2), "Spinning total");
        equal(8, domain.totalPrice("YOGA-1", 1), "one-participant total");
        expectIllegalArgument(() -> domain.totalPrice("UNKNOWN", 1), "unknown session total");
        expectIllegalArgument(() -> domain.totalPrice("YOGA-1", 0), "zero-participant total");
        expectIllegalArgument(() -> domain.totalPrice("YOGA-1", 11), "over-capacity total");
    }

    private static void validation(
            GymReservationDomain domain,
            Object sessionId,
            Object participants,
            Map<String, Integer> availability,
            GymReservationDomain.ValidationResult expected,
            String description) {
        equal(expected, domain.validateReservation(sessionId, participants, availability), description);
    }

    private static void expectIllegalArgument(Runnable action, String description) {
        assertions++;
        try {
            action.run();
        } catch (IllegalArgumentException expected) {
            return;
        }
        throw new AssertionError(description + ": expected IllegalArgumentException");
    }

    private static void equal(Object expected, Object actual, String description) {
        assertions++;
        if (expected == null ? actual != null : !expected.equals(actual)) {
            throw new AssertionError(description + ": expected <" + expected + "> but was <" + actual + ">");
        }
    }
}
