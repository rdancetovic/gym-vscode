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

**Resulting change:** Added `js/data.js` and `js/reservation.js`, plus `tests/testkit.js`, `tests/data.test.js`, `tests/reservation.test.js`, and `tests/tests.html`. The suite contains 50 browser tests for catalogue data and reservation rules. Updated `AGENTS.md` to reflect the new project structure and browser test harness. Automated tests remain unverified because no browser executable was found in standard locations or on PATH, and Node is unavailable.

## 5. Implement Phase 3

**Purpose:** Add the class and session selection interface described in `PHASES.txt`.

**Prompt:**

> execute phase 3

**Resulting change:** Added `index.html`, `css/styles.css`, `js/ui.js`, `js/app.js`, and `tests/ui.test.js`; updated `tests/tests.html` to include the off-screen UI test sandbox; updated `AGENTS.md` to reflect the interface and test page. The browser suite now contains 62 tests. Automated results remain unverified because no browser executable or Node runtime is available in the environment.
