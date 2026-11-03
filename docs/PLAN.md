# Gym Reservation API Extension — Implementation Plan

**Status:** Proposed. API-01 through API-07 work has been authorized and performed; all task statuses remain Proposed until the user approves status changes.

## Sources and current project

This plan follows the approved `REQUIREMENTS.md`, `BRD.md`, `BRD-Extension.md`, and project guidance. The extension BRD overrides the original BRD where they conflict: file-backed persistent reservations and availability, the REST API, and cancellation are in scope.

The existing application is a plain HTML/CSS and browser-JavaScript project:

- `index.html` loads `js/data.js`, `js/reservation.js`, `js/ui.js`, and `js/app.js`.
- The existing JS catalogue uses local IDs and an in-memory state. It contains the prices, sessions, and initial availability to reuse, but the API requires its own fixed `sessionId` values and field names.
- `js/reservation.js` implements client-side validation, totals, and in-memory booking deductions.
- `js/ui.js` implements the reservation selection, summary, confirmation, and accessibility behavior.
- `tests/tests.html` loads the browser test harness and existing tests.
- `TEST_PLAN.md` documents the original browser suite. The 112 browser tests were run through the Java server after API-02 changes and all passed.
- Java domain and persistence test mains exist under `tests/java/`; no build system or third-party dependency was added.
- `AGENTS.md` and `PROMPTS.md` exist. `TASKS.md`, `PLAN.md`, `CHAT_HISTORY.md`, `COMMANDS.md`, and `NEXT_STEPS.md` did not exist before this preparation.

## Execution rules

- Implement only behavior in approved `REQUIREMENTS.md`; do not expand application scope.
- Reuse existing catalogue, reservation UI, summary, validation, confirmation, styles, tests, and accessibility behavior where compatible.
- The API and persisted server data become authoritative for availability and reservations.
- Keep requests sequential for one visitor; do not add simultaneous multi-visitor behavior.
- Preserve anonymity and do not process payments.
- Keep application source changes within the approved implementation phases.
- Maintain `TASKS.md`, `PROMPTS.md`, `CHAT_HISTORY.md`, `COMMANDS.md`, and `NEXT_STEPS.md` factually as work proceeds.
- `COMMANDS.md` records only commands actually run. `PROMPTS.md` records only prompts actually used. Do not claim test or review results that were not observed.
- Task status remains Proposed unless the user explicitly approves a status change. Record AI Review findings separately from Human Review outcomes.

## Phase 0 — Approvals and baseline

### Work

1. Review and approve or defer the implementation decisions listed under **Open decisions**.
2. Run the existing browser test suite and record the actual baseline. Do not treat the documented 112-test result as a current run.
3. Identify existing tests/manual checks that assert behavior superseded by the extension, especially reset-on-refresh and absence of network/storage.
4. Confirm the selected backend/runtime, API address and frontend connection, file storage path/format, code-generation approach, and test tooling.

### Acceptance criteria

- Open decisions are explicitly approved or deferred before choices are encoded in implementation.
- Existing tests have an observed baseline result; any failures are distinguished from extension work.
- The test plan maps original requirements that remain valid and extension requirements to verification.
- No application functionality has been implemented merely by preparing this plan.

### Dependencies

User approval of the open decisions required to choose implementation technology and test execution approach.

## Phase 1 — Server-side catalogue, reservation rules, and persistence

### Work

1. Represent the four classes and twelve sessions using the exact names, prices, capacity, initial availability, and `sessionId` values in `REQUIREMENTS.md`.
2. Implement server-side reservation validation, total calculation, unique reservation-code assignment, status `Confirmed`, and availability deduction.
3. Implement reservation lookup data and whole-reservation cancellation, restoring places and changing status to `Cancelled`.
4. Persist reservations, statuses, and availability in a file. On first startup without a data file, initialize the original session availability.
5. Load the persisted state on restart and process requests sequentially.
6. Add focused tests for the rules and persistence using the approved test tooling.

### Acceptance criteria

- All 12 session identifiers and catalogue values match `REQUIREMENTS.md`.
- Valid bookings accept at least one participant and no more than current availability; full sessions are rejected.
- Totals equal participant count × class price.
- Every confirmed reservation has a unique `GYM-` code followed by exactly six digits.
- A confirmed booking reduces availability and a cancellation restores all booked places, retains the record, and sets status `Cancelled`.
- When no data file exists, initial availability matches `REQUIREMENTS.md`.
- Following restart, stored reservations, statuses, and availability remain as they were before shutdown.
- Domain and persistence tests cover valid and invalid bookings, cancellation, and state retention.

### Dependencies

Phase 0 approvals for backend/runtime, storage format/location, code generation, and test tooling.

## Phase 2 — REST API contract

### Implementation progress

`POST /reservations` has been implemented and covered by handler-level Java tests as API-03. It creates a Confirmed reservation, generates a unique six-digit code, deducts current availability, and persists before returning success. The endpoint tests cover successful response fields, request errors and precedence, no-change behavior on failures, code collisions, and code-space exhaustion.

API-04 `GET /classes` is also implemented. It uses the existing catalogue and reads current availability from the file-backed state store without changing state. Its HTTP tests cover the full response contract, initial and persisted availability using confirmed/cancelled state fixtures, state/file non-mutation, and method/path behavior.

API-05 verified the existing `POST /reservations` contract against its acceptance criteria; no gaps were identified and no source or test files were changed for that verification.

API-06 `GET /reservations/{code}` is now implemented in the existing reservation handler alongside POST. It validates the exact code format, returns stored Confirmed/Cancelled Reservation fields, and performs no state writes. The reservation HTTP tests cover lookup success and errors, read-only behavior, and method/path handling.

API-07 `DELETE /reservations/{code}` is implemented in that same handler. Confirmed reservations are marked Cancelled, their places are restored, and the changed state is persisted before returning HTTP 200. Tests cover success, persistence, lookup after cancellation, malformed/unknown/repeat-cancel errors, state integrity, and save failure. API-08 error-contract verification is also implemented and passed. Java results from the latest complete API verification were API-01 58, API-02 21, combined reservation-endpoint 162, and API-04 250 assertions.

### Work

Implement and test:

- `GET /classes`
- `POST /reservations`
- `GET /reservations/{code}`
- `DELETE /reservations/{code}`

Use the exact JSON field names, types, response fields, and success statuses in `REQUIREMENTS.md`. Implement the documented `400`, `404`, and `409` cases, readable errors, and validation precedence: invalid input first, missing session/reservation second, and availability conflict/already-cancelled last. Failed API operations must not change stored reservations or availability.

### Acceptance criteria

- `GET /classes` returns all four classes and three sessions each with current availability and HTTP `200`.
- Valid `POST /reservations` returns HTTP `201` with every required Reservation field and correct values.
- `GET /reservations/{code}` returns HTTP `200` and the stored reservation with its current status. (Implemented as API-06; retain as phase acceptance criterion.)
- Successful `DELETE /reservations/{code}` returns HTTP `200`, the updated reservation, and restored availability. (Implemented as API-07; retain as phase acceptance criterion.)
- Invalid inputs return `400`; unknown session/reservation returns `404`; insufficient availability and repeat cancellation return `409`.
- Validation order is verified, including an invalid participant count with an unknown session returning `400`.
- Responses contain all required fields; additional response fields remain permitted.
- Defined error cases leave data unchanged.
- Tests cover each operation, response contract, failure status, message readability, and no-change behavior.

### Dependencies

Phase 1 domain and persistence behavior; approved API runtime/address and test tooling.

## Phase 3 — Integrate the existing reservation UI

### Implementation progress

The UI is now initialized from `GET /classes` rather than the hard-coded catalogue. Class/session selections, participant validation, and price summaries use the returned data; explicit confirmation submits the selected session and participants to `POST /reservations`. Confirmation details and code use the successful response. Submission errors display the HTTP status and API message, and successful submission reloads availability before allowing another reservation. Catalogue-loading failures do not render fallback availability. The browser suite passes 119/119 tests, including the live-API integration tests. Manual verification through the Java server remains pending because the Java debug launch timed out without an active session being detected.

### Work

1. Use `GET /classes` to populate class, price, session, and availability displays.
2. Preserve the existing selection, participant, summary, and validation flow where compatible.
3. Submit `POST /reservations` only after explicit confirmation; use the response as the source for confirmation details and code.
4. Refresh current availability from the API when starting another reservation.
5. Present clear feedback for API failures using the returned status and readable message.
6. Preserve anonymous use, no payment, and existing relevant responsive/accessibility behavior.

### Acceptance criteria

- The interface displays API-provided class/session information and availability, without requiring visitors to see session IDs.
- Class/session/participant changes update the summary and total before confirmation.
- Explicit confirmation submits a valid reservation; a failed request is not shown as successful.
- Successful confirmation shows the reservation code and enough information to identify the reservation.
- Starting another reservation shows server availability, including prior deductions.
- API failure feedback is clear and no personal, account, or payment data is requested or collected.

### Dependencies

Phase 2 API contract and approved frontend/API connection arrangement.

## Phase 4 — Reservation lookup and cancellation UI

### Work

1. Add a code-entry lookup flow using `GET /reservations/{code}`.
2. Show class, session day/time, participant count, price per participant, total price, and status.
3. Add a whole-reservation cancellation flow using `DELETE /reservations/{code}`.
4. Show the updated status and clear feedback for invalid codes, missing reservations, and already-cancelled reservations.

### Acceptance criteria

- A found reservation displays every required field and its current status.
- Invalid-format and correctly formatted unknown codes produce distinct clear feedback consistent with the API response.
- Cancelling a confirmed reservation shows its Cancelled status and returns places to the session.
- A cancelled reservation remains viewable; a second cancellation displays clear conflict feedback.
- The interface does not offer partial cancellation.

### Dependencies

Phase 2 lookup and cancellation endpoints; Phase 3 API integration patterns.

## Phase 5 — Full regression, restart verification, and documentation closeout

### Work

1. Add/update tests for API behavior, persistence, UI/API integration, lookup, and cancellation.
2. Retain regression tests for original requirements not overridden by the extension; revise only old assertions that conflict with the approved extension.
3. Verify with a real application stop/restart that file-backed state persists.
4. Update `TEST_PLAN.md` and `AGENTS.md` for the extension.
5. Keep `PLAN.md`, `TASKS.md`, `PROMPTS.md`, `CHAT_HISTORY.md`, `COMMANDS.md`, and `NEXT_STEPS.md` accurate. Record AI findings and human outcomes separately, and do not change task statuses without user approval.

### Acceptance criteria

- Tests cover all four endpoint contracts, response fields/types, statuses, validation ordering, and unchanged state on defined failures.
- Regression tests cover the original catalogue, prices, sessions, participant limits, total calculation, summary, confirmation, anonymity, and no payment.
- Restart scenario is verified:
  1. With no data file, Yoga Wednesday has 6 places.
  2. Confirming 2 leaves 4 and records a Confirmed reservation.
  3. After restart, that reservation and 4-place availability remain.
  4. Cancelling restores availability to 6 and records Cancelled status.
  5. After another restart, the Cancelled status and restored availability remain.
- Full relevant test suite and documented manual checks pass; results are recorded only after execution.
- `TEST_PLAN.md` describes extension tests and no longer claims the final application is memory-only or resets on refresh.
- Project guidance and tracking docs reflect actual approved decisions, work, reviews, and status.

### Dependencies

Phases 1–4 and approved test environment.

## Requirement coverage

| Requirement area | Phase(s) |
|---|---|
| Catalogue, initial availability, capacity, and session IDs | 1–3, 5 |
| Reservation flow, participant validation, price, summary, confirmation | 1–3, 5 |
| Reservation code and response fields | 1–4 |
| Four endpoints, success/error statuses, validation order | 2–5 |
| File persistence and restart behavior | 1, 5 |
| Lookup and cancellation | 1, 2, 4, 5 |
| API-integrated UI, anonymous use, no payment | 3–5 |
| Sequential single-visitor scope and out-of-scope boundaries | All; verify in 5 |
| Regression and requirement traceability | 0, 5 |
| Assessment records and task approval workflow | 0, maintained throughout |

## Open decisions requiring approval

The BRDs do not prescribe these choices:

The user approved Java 21 with `com.sun.net.httpserver.HttpServer`, port 3000, same-origin frontend serving, sequential request handling, and file storage at `data/reservations.json`. Java backend/domain/persistence tests use standalone test mains compiled with `javac`; no external dependencies or build system are used.

The following implementation details remain open:

1. **Reservation-code exhaustion response.** API-03 uses randomized starting points with a scan of the six-digit code space to avoid collisions and detect exhaustion. The BRDs do not prescribe an HTTP status for exhaustion; the implementation currently returns 503.
2. **API error representation.** The BRDs specify readable messages but do not prescribe the JSON error shape; the create endpoint returns a JSON object with a `message` field.
3. **Persistence failure API behavior.** The BRDs do not prescribe the HTTP status or UI behavior for file failures; the create endpoint currently returns 500 after a save failure and leaves active/persisted state unchanged.
4. **Manual frontend verification.** The controlled-response browser integration suite has passed; manual UI/API end-to-end verification through the Java server remains pending.
