# Test Plan — Gym Reservation API Extension

## Purpose and status

This plan maps the approved `REQUIREMENTS.md` to automated and manual verification. API-01 domain tests, API-02 persistence tests, API-03 `POST /reservations`, API-04 `GET /classes`, API-06 `GET /reservations/{code}`, API-07 `DELETE /reservations/{code}`, and API-08 error-contract verification have been implemented and run.

The existing browser suite is loaded from `tests/tests.html`. All 112 tests passed when run through the Java server after API-02 changes; the browser suite has not been rerun after API-03/API-04/API-06/API-07 because frontend files were unchanged. The Java domain, persistence, reservation-endpoint, and classes-endpoint suites are standalone test mains compiled with the installed JDK; no third-party test library or build system is used. Latest observed results: API-01 58 assertions, API-02 21, combined API-03/API-06/API-07 reservation endpoints 162, and API-04 250, all passed.

## Test approach

- Run the existing browser suite as a baseline before changing application behavior and record the actual result.
- Run the Java domain, persistence, reservation endpoint, and classes endpoint test mains using the JDK.
- Add focused tests for UI/API integration as that work is authorized; API-08 error-contract coverage has been run.
- Keep regression tests for original requirements not overridden by the extension.
- Use a temporary or test-owned data file/fixture where the chosen test approach supports it; do not overwrite user data.
- Verify persistence by stopping and restarting the running application with the same configured data file.
- Do not report a test as passing until it has actually run and passed.

## Coverage matrix

| Requirement area | Planned verification |
|---|---|
| Classes, prices, sessions, IDs, capacity, initial availability | Catalogue/domain tests verify all four classes, exact prices, all 12 session IDs and times, capacity 10, and initial place counts. |
| Reservation flow, participant limits, and price | Domain and UI tests cover minimum 1, whole-number counts, exact available-place boundary, over-capacity, full sessions, and participant count × unit price. |
| Summary, explicit confirmation, success | UI tests verify all required summary fields, editable choices before confirmation, explicit action, success details, and no payment processing. |
| Anonymous use | UI regression verifies no personal/account/payment data is collected or required. |
| Reservation code | Create multiple confirmed reservations; verify each code is unique and matches `GYM-` followed by exactly six digits. |
| `GET /classes` | `ClassesApiHandlerTest` checks HTTP 200 and JSON content type, four class objects and three sessions each, exact names/prices/session IDs/days/times and JSON types, capacity 10, initial availability and current persisted remaining places using confirmed/cancelled state fixtures, and no in-memory or file-backed mutation. It also checks unsupported methods (405 and `Allow: GET`) and non-exact/unknown paths (404). The test seeds saved-state fixtures directly; reservation/cancellation endpoint requests are covered separately when those endpoints are available. Latest run: 250 API-04 assertions passed. |
| `POST /reservations` | Valid request returns HTTP 201 and all required Reservation fields with correct class, session, participants, prices, status, code, and deducted availability; response assertions allow additional fields. |
| API-03 reservation creation | Handler-level HTTP tests check required success fields/status as a subset (allowing additional fields), code format/uniqueness/collision handling/exhaustion, malformed or invalid input, validation ordering, unknown/full session, and no state changes on failures including persistence errors. |
| `GET /reservations/{code}` | `ReservationApiHandlerTest` checks HTTP 200/JSON and all required Reservation fields/types for Confirmed and Cancelled records while permitting additional fields, strict `GYM-` plus six-digit code validation (400), well-formed unknown codes (404), and no memory/file mutation for successful and failed lookups. Method and path behavior are also tested. |
| `DELETE /reservations/{code}` | `ReservationApiHandlerTest` checks HTTP 200 with all required Reservation fields and `Cancelled` status while permitting additional fields, restored availability, persistence after reload, and continued GET lookup. It checks malformed code (400), unknown code (404), repeat cancellation (409), no state changes for errors, and failed persistence (no success and no in-memory or file-state change). |
| API-08 error contract | Reservation endpoint tests check documented 400/404/409 statuses and readable messages, validation precedence, and no state change for failures; implementation-specific 500 persistence and 503 code-exhaustion errors remain distinct. Reservation success checks assert all required fields/values/types as a subset and accept additional JSON fields. Latest combined Java run: API-01 58, API-02 21, reservation endpoints 162, API-04 250 assertions passed. |
| API input/errors | Verify missing required fields, invalid/empty session ID, non-whole or less-than-one participants, malformed code, unknown session, unknown valid-format reservation code, insufficient places/full session, and already-cancelled reservation. Check status and readable message against `REQUIREMENTS.md`. |
| Validation precedence | Test invalid input before lookup/conflict; unknown session plus participant count 0 returns 400. Test not-found before 409 conflict checks where the contract applies. |
| Failed-operation integrity | For each defined failing operation, compare reservations and availability before/after; no stored data changes. |
| File initialization and persistence | With no data file, initialize original availability. After booking, restart and verify record/status/remaining places. Cancel, restart again, verify Cancelled record and restored availability. |
| API-02 state store | Java tests verify creation of missing `data/reservations.json` state, loading existing state, saving availability/reservation/status changes, restoration through a new store instance, and explicit read/write failures. |
| Frontend/API integration | Verify catalogue loads from API; valid confirmation submits to API; UI uses server response; starting another reservation shows current server availability; API errors display clear feedback and do not appear as success. |
| Responsive/accessibility regression | Preserve applicable existing keyboard, focus, live-region, light/dark, reduced-motion, and viewport behavior; run established manual checks where available. |
| Scope | Verify no accounts, personal data, payment processing, or simultaneous multi-visitor behavior was added. |

## API contract cases

### `GET /classes`

- Success status is 200.
- Response is JSON in the specified array/class/session shape.
- Required fields are present with defined types and exact casing.
- Contains the four named classes and three specified sessions each.
- `capacity` is 10; `remainingPlaces` matches current persisted state.
- Additional response fields are permitted by the BRD.
- Request does not mutate stored state.

### `POST /reservations`

- Valid request has `sessionId` text and `participants` as a whole number from 1 through current availability.
- Valid request returns 201, a unique code matching the format, status Confirmed, complete Reservation fields, and correct total.
- Availability is reduced by the participant count and reservation is stored.
- Defined errors are returned in required order: 400 invalid input, 404 unknown session, 409 insufficient places.
- Error response includes a readable message. The exact error JSON shape is not prescribed.
- Failure leaves stored reservations and availability unchanged.

### `GET /reservations/{code}`

- Valid code for an existing Confirmed or Cancelled reservation returns 200 and the complete reservation.
- Malformed code returns 400.
- Correctly formatted but unknown code returns 404.
- Lookup does not mutate state.
- Failure leaves stored state unchanged.

### `DELETE /reservations/{code}`

- Valid code for Confirmed reservation returns 200 with status Cancelled and the same required reservation details.
- All reserved places return to the session; cancellation is stored.
- Malformed code returns 400; valid-format unknown code returns 404; already-cancelled record returns 409.
- Failed cancellation leaves stored state unchanged.
- Cancelled reservation remains retrievable with GET.

## Persistence scenario

Run against the configured file using the approved application start/stop procedure:

1. Start with no data file and verify Yoga Wednesday (`YOGA-2`) has 6 places.
2. Reserve 2 places; verify status Confirmed and 4 places remaining.
3. Stop and restart the application using the same data file.
4. Verify the reservation remains Confirmed and Yoga Wednesday has 4 places.
5. Cancel the reservation; verify Cancelled and 6 places remaining.
6. Stop and restart again.
7. Verify the reservation remains Cancelled and Yoga Wednesday has 6 places.

Also verify that if no data file exists on startup, the complete initial inventory is used.

## Original-flow regression checks

Retain relevant checks for:

- The four classes, prices, sessions, and initial availability.
- Class/session selection and changing selections before confirmation.
- Full-session restriction and remaining-place feedback.
- Participant minimum, integer requirement, and available-place maximum.
- Automatic total and review summary.
- Explicit confirmation and useful success feedback.
- Starting another reservation with already-updated server availability.
- Anonymous reservation and absence of payment processing.

Update old tests/manual expectations that specifically require refresh/reopen to reset availability or assert there are no network calls/storage. These behaviors are superseded by `BRD-Extension.md`.

## Manual checks

| ID | Check | Expected result |
|---|---|---|
| M1 | Open the application against an initialized data file and inspect each class. | Four classes, prices, sessions, days/times, capacity and current places match the API data. |
| M2 | Select a full session and attempt to proceed. | It is displayed as full and cannot be reserved; feedback explains the invalid state. |
| M3 | Make a valid reservation for Yoga Wednesday, 2 participants. | Explicit confirmation shows Yoga, Wednesday 19:00, 2 participants, €8 each, €16 total, and the reservation code; remaining availability is 4. |
| M4 | Start another reservation without restarting. | Yoga Wednesday still shows 4 places. |
| M5 | Restart the application using the same data file. | Reservation remains Confirmed and availability remains 4. |
| M6 | Look up the reservation by its displayed code. | All required reservation fields and Confirmed status are shown. |
| M7 | Cancel that reservation. | Whole reservation changes to Cancelled; 2 places return, making availability 6. |
| M8 | Look up the cancelled reservation, then attempt cancellation again. | Lookup still shows Cancelled; second cancellation gives clear conflict feedback. |
| M9 | Restart after cancellation and lookup the reservation again. | Cancelled status persists and availability remains 6. |
| M10 | Try malformed and well-formed unknown codes; try an over-capacity reservation. | Clear feedback corresponds to API errors; no invalid action appears successful. |
| M11 | Review keyboard use, focus and announcements, both themes, reduced motion, and the established phone viewport. | Existing relevant accessibility and responsive behaviors remain usable. |

## Open testing decisions and limits

- Java backend/domain/persistence/create-endpoint test invocation is established below. Extend coverage for later endpoints when authorized.
- The frontend and server use the approved same-origin host on port 3000; the server must be launched from the repository root to serve the frontend and use the configured state path.
- The BRDs specify readable API errors but not the JSON error shape.
- The BRDs do not prescribe status codes or UI behavior for file read/write failures. Do not assert an unapproved response code for those failures.
- The browser suite passed 112/112 tests after API-02 changes; it was not rerun after API-03/API-04 because frontend files were unchanged.
- The browser suite has not been rerun after API-07; no frontend files changed for API-07.
- Latest Java run: API-01 **58 assertions passed**, API-02 **21 assertions passed**, combined reservation endpoint suite **162 assertions passed**, API-04 **250 assertions passed**.

## Java domain, persistence, and API test command

Run from the repository root in PowerShell:

```powershell
$buildDir = Join-Path $env:TEMP 'gym-vscode-api08-build'
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null
javac -d $buildDir server\*.java tests\java\*.java
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$testClasses = @('GymReservationDomainTest', 'ReservationStateStoreTest', 'ReservationApiHandlerTest', 'ClassesApiHandlerTest')
foreach ($testClass in $testClasses) {
    java -cp $buildDir $testClass
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```
