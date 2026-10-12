# Test Plan — Gym Class Reservation

## Run the tests

Open `tests/tests.html` in a browser. A successful run displays **All 112 tests passed**. Each test result is listed on the page. There is no Node-based or command-line test runner.

Open `index.html` in a browser to exercise the application manually. Reservations are held in page memory only; refreshing or reopening starts with the initial availability again.

## Automated test inventory

| Test file | Coverage | Tests |
|---|---|---:|
| `tests/data.test.js` | Class catalogue, prices, session schedule, initial availability, frozen catalogue, fresh state | 21 |
| `tests/reservation.test.js` | Availability lookups, full checks, totals, validation, immutable confirmation, accumulated deductions | 29 |
| `tests/ui.test.js` | Class/session selection, status labels, full and low availability, selection reset | 12 |
| `tests/participants.test.js` | Participant controls, summary, total, validation, session-change adjustment | 21 |
| `tests/confirm.test.js` | Confirmation, deductions, repeat bookings, reset, focus, anonymous flow | 16 |
| `tests/a11y.test.js` | Live announcements, descriptions, focus, reduced-motion rule | 13 |
| **Total** |  | **112** |

## Requirement traceability

| Requirement | Verification |
|---|---|
| FR-001, FR-021 | Manual M1 and M13; `tests/confirm.test.js` checks that personal/payment fields are absent. |
| FR-002 | `tests/data.test.js` checks catalogue prices; `tests/ui.test.js` checks displayed class prices. |
| FR-003 | `tests/data.test.js` checks capacity, all 12 initial places, and session inventory. |
| FR-004 | `tests/ui.test.js` checks class selection. |
| FR-005 | `tests/ui.test.js` checks class-specific session options and list replacement. |
| FR-006 | `tests/ui.test.js` checks day/time and availability labels. |
| FR-007 | `tests/data.test.js`, `tests/reservation.test.js`, and `tests/ui.test.js` check full sessions and rejection. |
| FR-008 | `tests/reservation.test.js` and `tests/participants.test.js` check minimum, integer, and remaining-place bounds. |
| FR-009 | `tests/reservation.test.js` and `tests/participants.test.js` check price calculation and display. |
| FR-010, FR-011 | `tests/participants.test.js` checks summary fields, live changes, and selection edits. |
| FR-012 | `tests/reservation.test.js` and `tests/participants.test.js` check invalid drafts and feedback. |
| FR-013, FR-014 | `tests/confirm.test.js` checks explicit valid confirmation and confirmation details. |
| FR-015 | `tests/reservation.test.js` and `tests/confirm.test.js` check deductions. |
| FR-016, FR-019 | `tests/confirm.test.js` and manual M9 check retained availability after starting another reservation. |
| FR-017 | `tests/data.test.js`, `tests/confirm.test.js`, and manual M10 check fresh initial availability after reset/reload. |
| FR-018 | This is an explicit scope limit: availability is held in one page’s memory and is not synchronized between browsers. |
| FR-020 | `tests/ui.test.js`, `tests/participants.test.js`, `tests/confirm.test.js`, and manual M1–M12 cover the user flow. |
| FR-022 | Scope exclusion; verify changes against `REQUIREMENTS.md` and do not add excluded features. |

The session inventory and support-case finding are covered by the FR-003 and FR-016 checks. The support-platform response requested in `Support-Case.md` is a support task, not an application test requirement. Browser tests and the reported scenario verify expected behavior; they do not diagnose an implementation root cause beyond the behavior under test.

## Manual checks

| ID | Check | Expected result |
|---|---|---|
| M1 | Open `index.html` in a fresh page without making a selection. | Class and session choices are visible; the participant controls and Confirm are disabled; no reservation is selected; the hidden live region is empty. |
| M2 | Select each class and compare all sessions with the Session Inventory in `REQUIREMENTS.md`. | All four classes and their three day/time sessions display the listed initial places. Prices are Yoga €8, Pilates €10, Functional Training €12, and Spinning €11. |
| M3 | Inspect Yoga Saturday 10:00, Pilates Saturday 11:30, and Spinning Thursday 18:00. | Yoga Saturday (2) and Spinning Thursday (1) are highlighted as low availability. Pilates Saturday is visible as Full and cannot be selected. |
| M4 | Select Yoga, then Wednesday 19:00; switch to Pilates. | The review reflects Yoga — Wednesday 19:00 first. Changing class clears the session and resets participants to 1. |
| M5 | Select Yoga Wednesday and use the decrement, number field, and increment controls. | The minimum is 1; values must be whole numbers; the maximum is the current remaining places (6 initially). Controls cannot move outside those bounds. |
| M6 | Select Yoga Monday, set 8 participants, then select Yoga Wednesday. Also try switching from Wednesday (6) to Monday (10) with 3 participants. | The first change reduces the count to 6 and explains the reduction. The second preserves 3. |
| M7 | Check live summary examples: Functional Training, 3 participants; Yoga, 2 participants. | Summary shows class, session, participants, unit price, and total. Totals are €36 and €16 respectively and update when the participant count changes. |
| M8 | Try 0, a negative value, a fraction, or more participants than remaining places. | Each invalid value has an understandable reason in the visible status; Confirm is disabled. |
| M9 | Select Yoga Wednesday, 2 participants, and confirm. Then choose Make another reservation and select Yoga Wednesday again without refreshing. | Confirmation identifies Yoga — Wednesday 19:00, 2 participants, €8 each, €16 total, and 4 places left; it says no payment is taken. The new reservation still shows 4 places. |
| M10 | Reserve the last Spinning Thursday place (1 participant). | Confirmation says the session is now full. Starting another reservation shows that session as Full and unavailable. |
| M11 | Continue confirming reservations for one session until full; fill each session in a class. | Every booking deducts from the current balance; a full session cannot be booked again. A class with every session full shows “No places available”. |
| M12 | After confirming at least one booking, refresh or reopen `index.html`. | Availability resets to the initial Session Inventory values; for Yoga Wednesday it returns to 6. |
| M13 | Use keyboard-only navigation and inspect announcements, both system themes, reduced motion, and a 390px-wide phone viewport. | Native radio choices work with keyboard; focus moves to the confirmation heading and returns to the first class after starting another reservation. A persistent polite live region announces changes but is empty on page load; Confirm is described by the visible validation text. Text contrast is at least 4.5:1 for normal text and 3:1 for large text in both themes. Reduced motion is respected. At 390px, class options are two columns, sessions stack, primary action buttons are full-width, and there is no horizontal overflow. No personal/payment inputs, forms, network calls, or browser storage are present. |

## Accessibility contrast checks

Contrast is calculated as `(L1 + 0.05) / (L2 + 0.05)`, where `L1` is the lighter relative luminance. Check rendered text against its immediate background in both system themes, including normal, selected, disabled, full, low-availability, validation, confirmation, and button states. Required minimums are 4.5:1 for normal text and 3:1 for large text. Disabled-control exemptions do not replace checks for meaningful disabled-state labels.

The final integrated-browser contrast sweep measured a minimum of **4.51:1 in light mode** and **5.82:1 in dark mode** across the rendered initial, selection, validation, and confirmation flows. The automated suite separately asserts contrast for full-session text, the Full badge, and disabled Confirm.

## Known limits

- Availability is in-memory only. It resets on refresh/reopen and is not shared across users, tabs, or browsers.
- The browser test suite verifies DOM semantics and configured announcements, not the spoken output of every browser/screen-reader combination. M13 requires an assistive-technology spot check when available.
- Automated contrast assertions cover the full-session label and disabled Confirm control; the broader contrast matrix and phone checks remain manual acceptance checks and do not certify WCAG conformance or every viewport.
- The app does not process payment or collect personal data, and it has no backend or persistent booking storage.
