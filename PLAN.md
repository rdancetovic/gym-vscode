# Gym Reservation API Extension — Implementation Plan

**Status:** Proposed. No application implementation has started. Task statuses remain Proposed until the user approves status changes.

## Sources and current project

This plan follows the approved `REQUIREMENTS.md`, `BRD.md`, `BRD-Extension.md`, and project guidance. The extension BRD overrides the original BRD where they conflict: file-backed persistent reservations and availability, the REST API, and cancellation are in scope.

The existing application is a plain HTML/CSS and browser-JavaScript project:

- `index.html` loads `js/data.js`, `js/reservation.js`, `js/ui.js`, and `js/app.js`.
- The existing JS catalogue uses local IDs and an in-memory state. It contains the prices, sessions, and initial availability to reuse, but the API requires its own fixed `sessionId` values and field names.
- `js/reservation.js` implements client-side validation, totals, and in-memory booking deductions.
- `js/ui.js` implements the reservation selection, summary, confirmation, and accessibility behavior.
- `tests/tests.html` loads the browser test harness and existing tests.
- `TEST_PLAN.md` documents 112 existing browser tests and the original in-memory behavior; the documented suite has not been rerun as part of this preparation.
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
- `GET /reservations/{code}` returns HTTP `200` and the stored reservation with its current status.
- Successful `DELETE /reservations/{code}` returns HTTP `200`, the updated reservation, and restored availability.
- Invalid inputs return `400`; unknown session/reservation returns `404`; insufficient availability and repeat cancellation return `409`.
- Validation order is verified, including an invalid participant count with an unknown session returning `400`.
- Responses contain all required fields; additional response fields remain permitted.
- Defined error cases leave data unchanged.
- Tests cover each operation, response contract, failure status, message readability, and no-change behavior.

### Dependencies

Phase 1 domain and persistence behavior; approved API runtime/address and test tooling.

## Phase 3 — Integrate the existing reservation UI

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

1. **Backend technology and launch method.** Java 21 is installed; Node/npm are not found; the Python command resolves to a Windows Store alias and `python --version` fails. No backend has been selected.
2. **API address/port and connection arrangement.** Endpoint paths are specified, but host, port, same-origin/proxy setup, and frontend configuration are not.
3. **Storage format, file location, and file organization.** File persistence is required; the format and location are unspecified.
4. **Reservation-code generation.** The format and uniqueness are mandatory; generation strategy and behavior if the six-digit code space is exhausted are unspecified.
5. **Persistence failure response.** Defined API failures must make no changes, but the BRDs do not prescribe the status or UI behavior for file read/write failures.
6. **Test tooling.** Existing tests are browser-based; no Node-based runner is documented, and no Maven/Gradle command or build manifest is present. Backend/API test tooling remains to be approved.
7. **Browser/API hosting for local demonstration.** The project currently opens as static HTML; the supported manner of serving the frontend alongside the API is unspecified.
