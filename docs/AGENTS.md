# Development and Assessment Guidance

## Sources and scope

- Treat the user-approved `REQUIREMENTS.md` as the implementation acceptance baseline.
- Read `BRD.md` and `BRD-Extension.md`; the extension takes precedence where they conflict. Persistent file storage, server/API behavior, reservation codes, lookup, and cancellation are in scope.
- Preserve remaining original requirements: catalogue, prices, sessions, capacity, reservation summary, explicit confirmation, participant limits, anonymity, and no payment.
- Do not add behavior beyond approved requirements. Do not select technologies where the BRDs leave a decision open; request user approval before a decision affects implementation.

## Existing project

- The current app is plain HTML/CSS and browser JavaScript in `index.html`, `css/`, and `js/`. Reuse compatible catalogue, reservation, UI, styling, accessibility, and test code.
- Browser tests are loaded by `tests/tests.html`. `TEST_PLAN.md` is the project test and traceability guide.
- Do not assume a build step, dependency manager, or command-line test runner unless confirmed present and approved.
- Maintain `PLAN.md`, `TASKS.md`, `TEST_PLAN.md`, `PROMPTS.md`, `CHAT_HISTORY.md`, `COMMANDS.md`, and `NEXT_STEPS.md` with factual, nonduplicative information.

## Assessment and task tracking

- Task statuses in `TASKS.md` remain Proposed until the user explicitly approves a status change. Do not infer approval from a review, test run, or implementation.
- Record AI Review findings and Human Review outcomes in separate fields. Use Pending when no finding or outcome has been provided; never invent one.
- Record in `PROMPTS.md` only prompts actually used. Preserve its existing history.
- Record in `COMMANDS.md` only commands actually executed and their purpose; do not record proposed commands as executed.
- `CHAT_HISTORY.md` is a factual summary of relevant conversation and decisions, not an invented transcript.
- `NEXT_STEPS.md` reflects observed status, unresolved choices, and upcoming steps; do not claim work or tests are complete without evidence.

## Implementation and verification

- Do not begin application implementation until the user authorizes it and blocking technical choices are approved or deferred.
- Keep requests sequential for one visitor; do not implement simultaneous multi-visitor behavior.
- Follow exact API paths, JSON field names/types, status codes, validation order, and error behavior in `REQUIREMENTS.md`.
- Failed API operations must not change stored reservations or availability.
- Verify file-backed initialization and reservation/cancellation status after real restarts; a fresh in-memory state is not persistence verification.
- Update focused tests and regression coverage. Keep the browser test page loading relevant browser tests. Document the actual command/manual route for any approved backend/API test tooling.
- Test result claims must match observed results. Existing documentation reporting 112 browser tests is not proof that tests were rerun in a later task.
- Update `TEST_PLAN.md` for extension coverage, known limits, and requirement traceability.

## Change hygiene

- Make precise, task-scoped changes. Do not change application source during documentation-only preparation.
- Preserve existing user changes; inspect worktree changes before editing and verify only intended files changed.
- Do not delete files or commit unless explicitly requested.
