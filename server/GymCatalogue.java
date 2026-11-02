import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.LinkedHashMap;

public final class GymCatalogue {
    public record Session(
            String sessionId,
            String day,
            String time,
            int capacity,
            int initialAvailablePlaces) {
    }

    public record GymClass(String name, int pricePerParticipant, List<Session> sessions) {
        public GymClass {
            sessions = List.copyOf(sessions);
        }
    }

    private static final List<GymClass> CLASSES = List.of(
            new GymClass("Yoga", 8, List.of(
                    new Session("YOGA-1", "Monday", "18:00", 10, 10),
                    new Session("YOGA-2", "Wednesday", "19:00", 10, 6),
                    new Session("YOGA-3", "Saturday", "10:00", 10, 2))),
            new GymClass("Pilates", 10, List.of(
                    new Session("PILATES-1", "Tuesday", "18:00", 10, 8),
                    new Session("PILATES-2", "Thursday", "19:00", 10, 4),
                    new Session("PILATES-3", "Saturday", "11:30", 10, 0))),
            new GymClass("Functional Training", 12, List.of(
                    new Session("FUNCTIONAL-1", "Monday", "19:30", 10, 5),
                    new Session("FUNCTIONAL-2", "Wednesday", "18:00", 10, 10),
                    new Session("FUNCTIONAL-3", "Friday", "18:30", 10, 3))),
            new GymClass("Spinning", 11, List.of(
                    new Session("SPINNING-1", "Tuesday", "19:30", 10, 7),
                    new Session("SPINNING-2", "Thursday", "18:00", 10, 1),
                    new Session("SPINNING-3", "Sunday", "10:00", 10, 10))));

    private static final Map<String, GymClass> CLASS_BY_SESSION;
    private static final Map<String, Session> SESSION_BY_ID;
    private static final Map<String, Integer> INITIAL_AVAILABILITY;

    static {
        Map<String, GymClass> classesBySession = new LinkedHashMap<>();
        Map<String, Session> sessionsById = new LinkedHashMap<>();
        Map<String, Integer> initialAvailability = new LinkedHashMap<>();
        for (GymClass gymClass : CLASSES) {
            for (Session session : gymClass.sessions()) {
                classesBySession.put(session.sessionId(), gymClass);
                sessionsById.put(session.sessionId(), session);
                initialAvailability.put(session.sessionId(), session.initialAvailablePlaces());
            }
        }
        CLASS_BY_SESSION = Map.copyOf(classesBySession);
        SESSION_BY_ID = Map.copyOf(sessionsById);
        INITIAL_AVAILABILITY = Map.copyOf(initialAvailability);
    }

    private GymCatalogue() {
    }

    public static List<GymClass> classes() {
        return CLASSES;
    }

    public static Optional<Session> findSession(String sessionId) {
        return Optional.ofNullable(SESSION_BY_ID.get(sessionId));
    }

    public static Optional<GymClass> findClassForSession(String sessionId) {
        return Optional.ofNullable(CLASS_BY_SESSION.get(sessionId));
    }

    public static Map<String, Integer> initialAvailability() {
        return INITIAL_AVAILABILITY;
    }
}
