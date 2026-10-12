# Development Guidelines

## Project purpose

Build a small web application for visitors to reserve places in predefined gym classes. Keep the experience simple and suitable for demonstration and review. The current project root contains requirements and support documents only; it does not yet contain application source code.

## Business rules

- Offer Yoga (€8/person), Pilates (€10/person), Functional Training (€12/person), and Spinning (€11/person), with the sessions and initial availability listed in `BRD.md` and `REQUIREMENTS.md`.
- Each session has a capacity of 10. A reservation must contain at least 1 participant and cannot exceed the session's current available places. Full sessions cannot be reserved.
- Calculate the total as participant count multiplied by the class price. Do not process payment.
- Require explicit confirmation for valid reservations. Show a useful summary before confirmation and clear success or validation feedback afterward.
- On confirmation, deduct the reserved places. Keep deductions for the current browser session, including after starting another reservation. Refreshing or reopening restores initial availability; availability need not synchronize across users or browsers.
- Reservations are anonymous. Do not require or collect personal, account, or payment information.
- Keep work within the BRD's scope. In particular, do not add accounts, backend or database storage, live multi-user availability, payments, or external integrations unless the requirements are changed.

## Structure and coding conventions

- The existing root files are `BRD.md`, `REQUIREMENTS.md`, and `Support-Case.md`. Keep these as the sources for business behavior and acceptance criteria.
- No implementation language, framework, source layout, formatting rules, or lint configuration is established yet. Follow conventions introduced by the chosen implementation and avoid documenting or assuming tools that are not present.
- Keep implementation focused on the reservation flow and avoid unnecessary dependencies or unrelated refactoring.

## Testing and verification

- No automated test suite or test-running command exists in the current project structure. Do not assume a particular test framework or invent a command.
- When implementation and test tooling are introduced, document and use the actual test command supplied by that tooling. Add focused tests for changed behavior.
- Verify changes against the acceptance criteria in `REQUIREMENTS.md`. In particular, test the support-case sequence: Yoga — Wednesday 19:00 starts with 6 places; confirming 2 leaves 4; starting another reservation without refreshing or closing the browser must still show 4. Also verify that refresh/reopening restores initial availability.
- Check the relevant flow for class/session selection, availability, participant limits, price calculation, summary edits, invalid reservations, confirmation, and starting another reservation.

## Change scope

- Make only changes needed for the requested work. Do not modify unrelated files or broaden scope beyond the BRD and approved requirements.
- Preserve existing user changes. Review the changes made for the task and ensure unrelated files are not included.

## Git practices

- Make small, meaningful commits with messages that describe one logical change.
- Keep each commit focused; do not include unrelated files or changes.
- Do not commit unless explicitly requested.
