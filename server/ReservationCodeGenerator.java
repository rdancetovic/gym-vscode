import java.security.SecureRandom;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.IntSupplier;

public final class ReservationCodeGenerator {
    public static final int CODE_SPACE_SIZE = 1_000_000;

    private final IntSupplier startingNumber;
    private final int codeSpaceSize;

    public ReservationCodeGenerator() {
        SecureRandom random = new SecureRandom();
        this.startingNumber = () -> random.nextInt(CODE_SPACE_SIZE);
        this.codeSpaceSize = CODE_SPACE_SIZE;
    }

    ReservationCodeGenerator(IntSupplier startingNumber, int codeSpaceSize) {
        if (codeSpaceSize < 1 || codeSpaceSize > CODE_SPACE_SIZE) {
            throw new IllegalArgumentException("Code-space size must be from 1 through 1,000,000.");
        }
        this.startingNumber = startingNumber;
        this.codeSpaceSize = codeSpaceSize;
    }

    public String nextCode(List<ReservationStateStore.Reservation> reservations)
            throws CodeSpaceExhaustedException {
        Set<String> existingCodes = new HashSet<>();
        for (ReservationStateStore.Reservation reservation : reservations) {
            existingCodes.add(reservation.code());
        }
        if (existingCodes.size() >= codeSpaceSize) {
            throw new CodeSpaceExhaustedException();
        }

        int start = Math.floorMod(startingNumber.getAsInt(), codeSpaceSize);
        for (int offset = 0; offset < codeSpaceSize; offset++) {
            int candidate = (start + offset) % codeSpaceSize;
            String code = String.format("GYM-%06d", candidate);
            if (!existingCodes.contains(code)) {
                return code;
            }
        }
        throw new CodeSpaceExhaustedException();
    }

    public static final class CodeSpaceExhaustedException extends Exception {
        private CodeSpaceExhaustedException() {
            super("All available reservation codes have been used.");
        }
    }
}
