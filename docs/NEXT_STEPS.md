# Gym Reservation API Extension — Next Steps

## Current status

- The extension requirements have been reviewed and approved by the user.
- Documentation and implementation planning remain Proposed deliverables.
- The Java 21 HTTP server, API-01 domain layer, and API-02 file-backed state are implemented. State loads on startup and persists JSON at `data/reservations.json`.
- API-03 `POST /reservations` and API-04 `GET /classes` are implemented. `GET /classes` returns the catalogue with current persisted availability and does not mutate state. Reservation lookup, cancellation, and frontend/API integration remain unimplemented.
- All tasks in `TASKS.md` remain Proposed; task status changes require explicit user approval.
- The 112 existing browser tests passed when run through the Java server after API-02 changes; they have not been rerun after API-03/API-04. The latest Java run passed API-01: 58, API-02: 21, API-03: 51, and API-04: 250 assertions.
- Java 21 is available. Node/npm are not found. The Python command is a Windows Store alias and fails to locate Python. Maven/Gradle commands and a backend build manifest were not found.

## Remaining work

1. Continue with the next separately authorized API task, respecting its dependencies (API-05 contract verification, API-06 lookup, or API-07 cancellation).
2. Keep task statuses Proposed unless the user explicitly approves a status change.
3. Keep task and review records factual; do not treat implementation or tests as task-status or review approval.

## Remaining work by dependencies

Based on the prerequisites in `TASKS.md` and the implementation evidence above:

- **API-04 (`GET /classes`)** depends on API-01 and API-02 and is implemented with passing HTTP tests.
- **API-05 (POST contract verification)** depends on API-03, whose reservation-create handler is implemented.
- **API-06 (reservation lookup)** and **API-07 (cancellation)** each depend on API-02 and API-03.
- **UI-01** depends on API-04, API-05, and PREP-02. **UI-02** depends on UI-01 and API-05.
- **API-08** depends on API-04 through API-07. **UI-03** depends on API-06 and PREP-02; **UI-04** depends on API-07 and UI-03.
- **TEST-01** depends on API-08 and UI-02 through UI-04. **TEST-02** depends on API-02, API-07, and TEST-01.

These dependency relationships do not change any task status or themselves authorize implementation.

## Open technical decisions

- The BRDs do not prescribe the HTTP status for reservation-code exhaustion or persistence failures; the current create endpoint uses 503 and 500 respectively. These implementation choices may require human review.
- The BRDs do not prescribe an error-response JSON shape; the create endpoint currently uses a JSON `message` field.
- API contract and browser/API integration tests for endpoints not yet implemented.

## Proposed implementation phases

1. **Approvals and baseline:** baseline browser suite was observed at 112 passed; it has not been rerun after API-03/API-04.
2. **Server domain, persistence, and catalogue/create endpoints:** API-01 through API-04 have implementation and Java test evidence; task statuses remain Proposed.
3. **Remaining REST API:** reservation lookup and cancellation remain to be implemented and tested under their separately authorized tasks; verify all endpoint contracts and errors.
4. **Reservation UI integration:** load catalogue/availability from API, submit confirmations, show API results and failure feedback.
5. **Lookup and cancellation UI:** search by code, display reservation details/status, cancel whole reservation and show result.
6. **Regression and closeout:** endpoint and frontend coverage, restart verification, original requirement regression, update docs with observed results.

See `PLAN.md` for phase-level work and acceptance criteria; see `TASKS.md` for the proposed task breakdown and dependencies.

## Immediate next actions

1. Obtain authorization for a remaining task, such as API-05, API-06, or API-07, subject to its recorded dependencies.
2. Review implementation choices not prescribed by the BRDs, including API error JSON shape and the selected 500/503 responses for persistence failure/code exhaustion.
3. Obtain explicit user approval for any task-status transition.
