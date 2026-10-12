# Development Guidelines

## Project purpose

Build a small web application for visitors to reserve places in predefined gym classes. Keep the experience simple and suitable for demonstration and review. The implementation includes catalogue data, reservation rules, class/session selection, participant selection, a live reservation summary, and in-memory booking confirmation.

## Business rules

- Offer Yoga (€8/person), Pilates (€10/person), Functional Training (€12/person), and Spinning (€11/person), with the sessions and initial availability listed in `BRD.md` and `REQUIREMENTS.md`.
- Each session has a capacity of 10. A reservation must contain at least 1 participant and cannot exceed the session's current available places. Full sessions cannot be reserved.
- Calculate the total as participant count multiplied by the class price. Do not process payment.
- Require explicit confirmation for valid reservations. Show a useful summary before confirmation and clear success or validation feedback afterward.
- On confirmation, deduct the reserved places. Keep deductions for the current browser session, including after starting another reservation. Refreshing or reopening restores initial availability; availability need not synchronize across users or browsers.
- Reservations are anonymous. Do not require or collect personal, account, or payment information.
- Keep work within the BRD's scope. In particular, do not add accounts, backend or database storage, live multi-user availability, payments, or external integrations unless the requirements are changed.

## Structure and coding conventions

- The root contains `BRD.md`, `REQUIREMENTS.md`, `Support-Case.md`, `PHASES.txt`, `PROMPTS.md`, and `index.html`, plus `css/`, `js/`, and `tests/`. Keep the BRD and requirements as sources for business behavior and acceptance criteria; use the phase and prompt records for project history.
- The implementation uses plain browser JavaScript without a build step or dependencies. No additional formatting or lint configuration is established. Follow the existing code style and avoid assuming tools that are not present.
- Keep implementation focused on the reservation flow and avoid unnecessary dependencies or unrelated refactoring.

## Testing and verification

- Automated tests run in the browser through `tests/tests.html`; open that file in a browser to run the suite. The application can be opened from `index.html`. There is no Node-based or command-line test runner in the project.
- Add focused tests for changed behavior and keep the browser test page loading the relevant test files.
- Verify changes against the acceptance criteria in `REQUIREMENTS.md`. In particular, test the support-case sequence: Yoga — Wednesday 19:00 starts with 6 places; confirming 2 leaves 4; starting another reservation without refreshing or closing the browser must still show 4. Also verify that refresh/reopening restores initial availability.
- Check the relevant flow for class/session selection, availability, participant limits, price calculation, summary edits, invalid reservations, confirmation, and starting another reservation.

## Change scope

- Make only changes needed for the requested work. Do not modify unrelated files or broaden scope beyond the BRD and approved requirements.
- Preserve existing user changes. Review the changes made for the task and ensure unrelated files are not included.

## Git practices

- Make small, meaningful commits with messages that describe one logical change.
- Keep each commit focused; do not include unrelated files or changes.
- Do not commit unless explicitly requested.
