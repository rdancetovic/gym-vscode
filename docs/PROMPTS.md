# Project Prompt Record

Record significant AI prompts used during project development and the resulting changes. Preserve the actual prompt text; summarize outcomes factually and do not log prompts or work that did not occur.

## 1. Create `REQUIREMENTS.md`

**Purpose:** Derive a requirements document from the BRD and support case.

**Prompt:**

> Read `BRD.md` and the `support-case` file in the project folder.
>
> Create `REQUIREMENTS.md` in the project root based on both documents.
>
> - Extract all business and functional requirements.
> - Assign unique IDs (FR-001, FR-002, etc.).
> - Include acceptance criteria for each requirement where applicable.
> - Use the support case to identify the specific problem, expected behavior, and relevant edge cases.
> - Preserve the original business rules from the BRD.
> - Do not invent requirements or modify existing files.
> - If the documents conflict or leave something unclear, explicitly flag it in a separate section.
> After creating the file, summarize the requirements and any ambiguities.

**Resulting change:** Created `REQUIREMENTS.md` with uniquely identified requirements, acceptance criteria, session inventory, support-case finding, and an ambiguities/evidence section.

## 2. Verify and correct `REQUIREMENTS.md`

### Verify against source documents

**Purpose:** Audit the requirements for omissions, inaccuracies, unsupported requirements, and conflicts.

**Prompt:**

> Compare `REQUIREMENTS.md` against `BRD.md` and the support-case document.
>
> Verify that every requirement is accurately represented, with no missing, altered, or invented requirements. Check business rules, expected behavior, edge cases, and acceptance criteria.
>
> Do not modify any files yet. First report:
>
> - Missing requirements
> - Incorrect or incomplete requirements
> - Requirements not supported by the source documents
> - Conflicts or ambiguities between the documents
> Reference the relevant sections wherever possible.

**Resulting change:** The review identified that FR-022 weakened the BRD's “outside scope” wording, the capacity-versus-initial-availability note was not a genuine ambiguity, and the repeated support-case attempt was not recorded. It also recommended distinguishing the support-platform deliverable from application requirements.

### Ask for recommendations

**Purpose:** Ask how to address the review findings.

**Prompt:**

> what do you suggest

**Resulting change:** No files were changed by this prompt. The recommendations were to strengthen FR-022, remove the false ambiguity, preserve the repeatability detail, and document the support task separately if in scope.

### Apply the review corrections

**Purpose:** Make the suggested corrections to `REQUIREMENTS.md`.

**Prompt:**

> do those changes

**Resulting change:** Updated FR-022 to explicitly identify exclusions as outside scope; added that the client reproduced the behavior on a second attempt; added a separate support-task deliverable note; removed the capacity-versus-availability ambiguity. No other files were changed in that correction.

## 3. Create `AGENTS.md`

**Purpose:** Establish concise, project-specific development guidelines based on the source documents and current project structure.

**Prompt:**

> Create `AGENTS.md` in the project root with concise development guidelines for this project.
>
> Base the rules on `BRD.md`, `REQUIREMENTS.md`, the support-case document, and the existing project structure.
>
> Include:
>
> - Project purpose and key business rules
> - Coding conventions and existing project structure
> - Testing requirements and how to run tests
> - Instructions to avoid unrelated changes
> - Requirements to verify functionality against acceptance criteria
> - Git practices, including small, meaningful commits
> Do not invent project-specific tools, commands, or conventions. Inspect existing files before documenting them. Do not modify application code.

**Resulting change:** Created `AGENTS.md` with business rules, current structure and convention constraints, test guidance based on the absence of an existing test suite or test command, acceptance-criteria checks, scope guidance, and Git practices. No application code was modified.

## 4. Implement Phases 1 and 2

**Purpose:** Implement the catalogue data, in-browser test harness, and reservation business rules described in `PHASES.txt`.

**Prompt:**

> do you think that you can implement the first 2 phases now?

**Resulting change:** Added `js/data.js` and `js/reservation.js`, plus `tests/testkit.js`, `tests/data.test.js`, `tests/reservation.test.js`, and `tests/tests.html`. The suite contains 50 browser tests for catalogue data and reservation rules. Updated `AGENTS.md` to reflect the new project structure and browser test harness. The Phase 1–2 tests were later run with the Phase 3 suite in the integrated browser; all 62 tests passed.

## 5. Implement Phase 3

**Purpose:** Add the class and session selection interface described in `PHASES.txt`.

**Prompt:**

> execute phase 3

**Resulting change:** Added `index.html`, `css/styles.css`, `js/ui.js`, `js/app.js`, and `tests/ui.test.js`; updated `tests/tests.html` to include the off-screen UI test sandbox; updated `AGENTS.md` to reflect the interface and test page. All 62 browser tests passed, and the selection flow and mobile layout were checked in the integrated browser.

## 6. Implement Phase 4

**Purpose:** Add participant controls, live reservation summary, and validation feedback from the Phase 4 specification.

**Prompt:**

> everything seems fine. proceed with phase 4

**Resulting change:** Extended `js/ui.js` and `css/styles.css` with bounded participant controls, session-change adjustment, live summary and validation, and a non-booking Phase 5 confirmation placeholder. Added shared UI test helpers and 21 participant/summary tests, updated Phase 3 UI tests and `tests/tests.html`; updated `AGENTS.md`. All 83 browser tests passed. The live summary, reduced-availability adjustment, and responsive layout were also checked in the integrated browser.

## 7. Implement Phase 5

**Purpose:** Complete the booking confirmation, in-session availability updates, and start-another-reservation flow.

**Prompt:**

> it works. proceed with phase 5

**Resulting change:** Connected UI confirmation to the reservation rules, added a booking confirmation view and a guarded “Make another reservation” action, preserved confirmed availability in page memory, and added confirmation styles and tests. Updated the Phase 4 placeholder test and project guidance. All 99 browser tests passed; the Yoga Wednesday 6 → 4 → start-another-reservation flow and mobile confirmation layout were also verified.

## 8. Implement Phase 6

**Purpose:** Complete accessibility, responsive polish, contrast checks, and test documentation described in `PHASES.txt`.

**Prompt:**

> proceed with phase 6

**Resulting change:** Added a persistent polite live region, Confirm descriptions for validation text, and 13 accessibility tests; adjusted light/dark contrast and phone controls; created `TEST_PLAN.md` with traceability, automated inventory, 13 manual checks, and known limits. All 112 browser tests passed in both light and dark themes. Verified the support-case sequence, responsive 390px layout, reduced-motion setting, and absence of browser storage, network requests, and forms in the implementation.

## 9. Assess the API extension and prepare implementation planning

**Purpose:** Compare the existing Gym Reservation application with the BRDs, propose requirements and an implementation plan, and prepare supporting assessment documentation without beginning application implementation.

**Prompts used during this assessment (verbatim):**

### Analyze current application

> Analyze the existing Gym Reservation application.
>
> Read the entire project structure, source code, existing tests, and current documentation.
>
> Compare the implementation against:
>
> - BRD.md
> - BRD-Extension.md
>
> Your task is to produce an analysis report only.
>
> Identify:
>
> 1. Existing application architecture and technologies.
> 2. Currently implemented functionality.
> 3. Existing test coverage.
> 4. Functionality that already satisfies the original BRD.
> 5. Gaps introduced by BRD-Extension.md.
> 6. Existing code that can be reused.
> 7. Potential risks or architectural considerations for extending the application.
> Do not modify, create, or delete any files.
> Do not implement anything.
> Do not make assumptions where the source documents are silent.
>
> Present the findings in a structured report.

### Prepare a proposed requirements document

> Using the analysis you just completed, together with BRD.md and BRD-Extension.md, prepare a complete proposed REQUIREMENTS.md for the Gym Reservation API extension.
>
> Requirements:
>
> 1. Preserve all original BRD requirements that are not overridden by the extension.
> 2. Apply BRD-Extension.md wherever it extends or overrides the original BRD.
> 3. Specify all four REST endpoints and their exact contracts.
> 4. Include reservation code format and uniqueness.
> 5. Include file persistence and restart behavior.
> 6. Include reservation lookup and cancellation.
> 7. Include all HTTP status codes, validation rules, and validation order.
> 8. Include frontend integration requirements.
> 9. Include explicit out-of-scope items.
> 10. Clearly distinguish mandatory BRD requirements from implementation decisions that remain open.
> Do not invent requirements or select technologies that are not specified in the BRDs.
>
> Do not modify any files.
>
> Present the complete proposed document for human review and approval.

### Propose implementation plan

> Now that REQUIREMENTS.md has been reviewed and approved, prepare a proposed implementation plan for the Gym Reservation API Extension.
>
> First inspect:
>
> - REQUIREMENTS.md
> - BRD.md
> - BRD-Extension.md
> - The existing project structure and source code
> - Any existing PLAN.md, TASKS.md, AGENTS.md, and other project guidance files
> Create a phased implementation plan that:
>
> 1. Covers every mandatory requirement in REQUIREMENTS.md.
> 2. Reuses the existing application where appropriate.
> 3. Identifies the backend/API and file-persistence work.
> 4. Covers frontend integration.
> 5. Includes testing, regression testing, and persistence verification after restart.
> 6. Defines clear acceptance criteria for each phase.
> 7. Identifies dependencies and implementation decisions that are not specified in the BRDs.
> Do not start implementation.
> Do not modify or create any files.
> Do not invent additional requirements.
>
> Return the complete proposed PLAN.md content and identify any assumptions or decisions that require my approval.

### Add assessment tracking to the proposed plan

> The proposed PLAN.md is generally good. Please revise it to include the project documentation and assessment tracking deliverables.
>
> Add explicit work for:
>
> 1. Creating and maintaining TASKS.md, with individual tasks, acceptance criteria, status, AI Review findings, and Human Review outcomes.
> 2. Creating and maintaining PROMPTS.md to record the prompts used during the assessment.
> 3. Creating CHAT_HISTORY.md to preserve the relevant conversation history and key project decisions.
> 4. Creating COMMANDS.md containing only commands actually executed, with their purpose.
> 5. Creating NEXT_STEPS.md to track the current status and upcoming steps.
> Ensure that task status changes require my approval.
>
> Do not change the technical scope or introduce new application requirements.
>
> Return the complete revised PLAN.md proposal only. Do not create or modify any files.

### Prepare project documentation and development setup

> Work in Agent mode. Prepare the project documentation and development setup for the full assessment, using the existing BRD.md, BRD-Extension.md, AGENTS.md, REQUIREMENTS.md, TEST_PLAN.md, PROMPTS.md and the existing application as the source of truth.
>
> **1. Create these three new files:**
>
> - `CHAT_HISTORY.md` – summarize the relevant conversation history, decisions, approved requirements, and assessment instructions. Do not invent conversations or decisions.
> - `COMMANDS.md` – record only commands that have actually been executed, with a short explanation of their purpose. Do not list commands that were merely suggested.
> - `NEXT_STEPS.md` – provide the current project status, remaining preparation work, implementation phases, and immediate next actions.
>
> **2. Update existing documentation:**
>
> - `PLAN.md` – create or update the complete implementation plan based on the approved requirements and assessment process.
> - `TASKS.md` – create a detailed task breakdown with individual tasks, acceptance criteria, dependencies, and proposed statuses. Include separate fields for AI Review findings and Human Review outcomes.
> - `REQUIREMENTS.md` – verify it against the original BRD and extension. Preserve the approved requirements and examples. Only correct genuine inconsistencies or omissions, and report any proposed changes.
> - `TEST_PLAN.md` – update test coverage for all API endpoints, validation, persistence, reservation lookup, cancellation, availability restoration, restart behavior, and regression testing.
> - `AGENTS.md` – update project guidance for the implementation workflow, testing, documentation, and assessment rules.
> - `PROMPTS.md` – preserve existing content and add the prompts actually used during this assessment. Do not invent prompts.
>
> **3. Project preparation:**
>
> - Inspect the existing application, scripts, tests, and available runtime.
> - Identify technical decisions that must be made before implementation, including backend technology, API port, file storage format/location, and test tooling.
> - Do not arbitrarily choose technologies where a decision is still required. Document recommendations and unresolved decisions.
> - Prepare a clear implementation sequence so that each phase can be executed and tested independently.
> - Ensure the plan covers the complete extension, including persistent storage, REST API, frontend integration, reservation lookup, and cancellation.
>
> **4. Important restrictions:**
>
> - Do not start implementing application functionality yet.
> - Do not modify existing application source code.
> - Do not delete existing files.
> - Do not invent test results, completed tasks, AI Review findings, or Human Review approvals.
> - Keep task statuses as Proposed until explicitly approved.
> - Preserve existing useful documentation and avoid duplicating content unnecessarily.
>
> **5. Final report:**
> List every file created or updated, summarize the changes, identify unresolved technical decisions, and state whether the project is ready to begin Phase 1.
>
> Complete the documentation preparation in one pass rather than stopping after each file.

**Resulting change:** Created `PLAN.md`, `TASKS.md`, `CHAT_HISTORY.md`, `COMMANDS.md`, and `NEXT_STEPS.md`; updated `TEST_PLAN.md`, `AGENTS.md`, and this prompt record. Marked the already user-approved `REQUIREMENTS.md` status accordingly; no requirement content or application source code was changed. Runtime availability and open technical decisions are documented. No tests were run as part of this preparation.

## 9. Implement API-02 persistence

**Prompt (actual user request):**

> Implement API-02 only: File-backed state.
>
> Follow the API-02 acceptance criteria in TASKS.md and REQUIREMENTS.md.
>
> Approved design:
>
> - Store application state in `data/reservations.json`.
> - If the file does not exist, initialize it using the initial inventory defined in the BRD.
> - Load existing state on server startup.
> - Persist reservations, reservation statuses, and availability.
> - Restore the saved state after server restart.
> - Keep request handling sequential to avoid concurrent state modifications.
>
> Requirements:
>
> 1. Integrate persistence with the existing API-01 Java server and domain classes.
> 2. Preserve the existing frontend and server behavior.
> 3. Handle file read/write errors explicitly. Never report a successful operation if persistence fails.
> 4. Add Java tests for initialization, loading existing state, saving changes, and restoring state.
> 5. Do not implement API-03 or any later API task.
> 6. Do not add dependencies or change the approved architecture without asking first.
> 7. Do not change task statuses in TASKS.md.
>
> When finished, report changed files, implementation details, test commands, and actual test results. Provide exact PowerShell commands to compile and run the tests.

**Result:** Added file-backed JSON state loading/saving, startup initialization, and sequential HTTP request execution. Added persistence tests; no API endpoints or task-status changes.

## 10. Implement API-03 reservation creation endpoint

**Prompt (actual user request):**

> Implement API-03 only: Reservation API endpoints.
>
> Read TASKS.md and REQUIREMENTS.md carefully and follow the exact API-03 acceptance criteria.
>
> Requirements:
>
> 1. Implement the reservation API endpoints defined in REQUIREMENTS.md.
> 2. Integrate them with the existing GymReservationServer, GymReservationDomain, GymCatalogue and API-02 file-backed persistence.
> 3. Validate incoming requests and return the HTTP status codes and JSON response structures specified in REQUIREMENTS.md.
> 4. Ensure reservation creation updates availability and persists the state.
> 5. Ensure cancellation updates reservation status, restores availability and persists the state.
> 6. Ensure invalid requests do not modify application state.
> 7. Add automated Java tests for all API-03 acceptance criteria, including successful and unsuccessful requests.
> 8. Preserve existing frontend behavior. Do not connect or modify the frontend yet unless API-03 explicitly requires it.
> 9. Do not implement API-04 or later tasks.
> 10. Do not change task statuses or mark tasks Complete.
>
> After implementation, report endpoints and methods, examples, changed files, exact PowerShell test commands, actual results, and remaining API-03 requirements. Do not claim completion if an API-03 criterion remains unimplemented.

**Scope clarification:** The request included cancellation, which is API-07, while also prohibiting API-04 and later. The user selected “API-03 only — implement POST /reservations; defer classes, lookup, and cancellation endpoints.”

**Result:** Implemented and tested `POST /reservations` only. Later endpoints and UI integration remain deferred; no task statuses changed.

## 11. Implement API-04 `GET /classes`

**Purpose:** Implement the read-only classes catalogue endpoint and automated HTTP coverage.

**Prompt (actual user request):**

> Implement API-04 only: GET /classes.
>
> Follow the exact acceptance criteria in TASKS.md and the response contract in REQUIREMENTS.md Section 5.1.
>
> Requirements:
>
> 1. Implement GET /classes using the existing Java 21 HTTP server.
> 2. Return HTTP 200 with a JSON array containing all four classes and their three sessions each.
> 3. Use the exact catalogue names, prices, session IDs, days, times and field names/types defined in REQUIREMENTS.md Sections 3 and 5.1.
> 4. Capacity must be 10.
> 5. remainingPlaces must reflect the current availability from the API-02 persisted state, including changes made by API-03 reservations and cancellations.
> 6. GET /classes must never modify in-memory or file-backed state.
> 7. Follow the existing project architecture and JSON serialization conventions.
> 8. Add automated HTTP tests covering all API-04 acceptance criteria, including persisted availability and non-mutation of state.
> 9. Test HTTP method/path behavior according to existing server conventions.
> 10. Do not modify frontend files.
> 11. Do not implement API-05 or later tasks.
> 12. Do not change task statuses, AI Review findings or Human Review records.
>
> After implementation:
>
> - List modified and created files.
> - Show an example GET /classes response.
> - Provide exact PowerShell commands to compile and run tests.
> - Report actual test results.
> - Identify any API-04 acceptance criteria not implemented.
>
> Do not claim completion if any acceptance criterion remains unmet.

**Result:** Added and registered `ClassesApiHandler`, which returns catalogue values and availability from the loaded state store without saving or modifying state. Added `ClassesApiHandlerTest` for the complete response, persisted availability, non-mutation, and method/path behavior. The final Java run passed 58 API-01, 21 API-02, 51 API-03, and 250 API-04 assertions. No frontend or task-status/review changes were made.

## 12. Implement API-06 reservation lookup

**Purpose:** Add reservation lookup to the existing reservation route and test its contract without changing frontend code or task/review records.

**Prompt (actual user request):**

> Implement API-06 only: GET /reservations/{code}.
>
> Follow the API-06 acceptance criteria in TASKS.md and the exact contract in REQUIREMENTS.md.
>
> Implementation requirements:
>
> 1. Extend the existing ReservationApiHandler.java. Do not create a separate handler or duplicate the existing /reservations route.
> 2. Support both:
>
> - POST /reservations — preserve existing API-03 behavior.
> - GET /reservations/{code} — implement reservation lookup.
>
> 3. For an existing reservation, return HTTP 200 with all required fields:
> code, className, sessionId, day, time, participants, pricePerParticipant, totalPrice, status.
> 4. Support both Confirmed and Cancelled reservations.
> 5. Validate the code strictly: GYM- followed by exactly six digits.
> 6. Return HTTP 400 with message "invalid reservation code" for malformed codes.
> 7. Return HTTP 404 with message "reservation not found" for correctly formatted but unknown codes.
> 8. Lookup must be read-only. Do not modify in-memory state, persisted reservations, or availability.
> 9. Reuse existing state-store, JSON serialization, and error-response functionality.
> 10. Preserve existing POST behavior and all API-03 tests.
> 11. Add HTTP tests for all API-06 acceptance criteria, including read-only verification for successful and failed lookups.
> 12. Test unsupported methods and path behavior according to existing server conventions.
> 13. Do not modify frontend files.
> 14. Do not implement API-07 or later tasks.
> 15. Do not change task statuses, AI Review findings, or Human Review records.
>
> After implementation:
>
> - List modified and created files.
> - Show example successful and error responses.
> - Provide exact PowerShell commands to compile and run all Java tests.
> - Report actual test results.
> - Identify any API-06 criteria not implemented.
>
> Do not claim completion unless every API-06 acceptance criterion is satisfied.

**Result:** Extended `ReservationApiHandler` to dispatch GET lookups alongside POST and added lookup cases to `ReservationApiHandlerTest`. The final Java run passed 58 API-01, 21 API-02, 74 combined reservation-endpoint, and 250 API-04 assertions. No frontend or task/review changes were made.

## 13. Implement API-07 cancellation

**Purpose:** Add cancellation to the existing reservation handler, preserve POST and GET behavior, and test persistence and state integrity.

**Prompt (actual user request):**

> Implement API-07 only: DELETE /reservations/{code}.
>
> Follow the API-07 acceptance criteria in TASKS.md and the exact contract in REQUIREMENTS.md.
>
> Extend the existing ReservationApiHandler.java without creating a separate handler or route. Preserve POST and GET. For a Confirmed reservation, set status Cancelled, restore all participants to availability, persist both changes, and return HTTP 200 with all required Reservation fields. Return 400 for malformed codes, 404 for well-formed unknown codes, and 409 for already Cancelled reservations, with the specified messages. Failed operations must not modify state; failed persistence must not report success or change in-memory state. Keep cancelled reservations available for GET. Reuse existing state-store, validation, serialization, and error functionality; add HTTP tests and rerun all Java tests. Do not modify frontend files, implement API-08 or later, or change task statuses/review records.

**Result:** Added DELETE dispatch to `ReservationApiHandler` and cancellation/persistence/error-integrity tests to `ReservationApiHandlerTest`. The final Java run passed 58 API-01, 21 API-02, 95 combined reservation-endpoint, and 250 API-04 assertions. No frontend or task/review changes were made.
