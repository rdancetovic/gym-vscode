# Requirements — Gym Class Reservation

## Sources and scope

This document consolidates the business and functional requirements in `BRD.md` and the reported availability behavior in `Support-Case.md`. The BRD defines expected behavior; the support case supplies a concrete scenario to test against it.

## Requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-001 | The application shall let a visitor reserve places in a predefined group exercise session. No membership or user account shall be required. | A visitor can use the reservation flow without signing in or providing membership details. |
| FR-002 | The application shall offer Yoga (€8 per participant), Pilates (€10), Functional Training (€12), and Spinning (€11). | The four classes and their respective prices are available for selection and used in price calculation. |
| FR-003 | Each class shall have the predefined sessions and initial available places listed below. Each session has a maximum capacity of 10 participants. | On a fresh application start, every session shows its specified initial availability. A session with 0 places is treated as full. |
| FR-004 | The user shall be able to select one of the four classes. | Selecting a class makes that class’s sessions available for selection. |
| FR-005 | The user shall be able to select a predefined session belonging to the selected class. | A session from another class cannot be selected as the current class’s session. |
| FR-006 | The application shall show each session’s day, time, whether places are available, and the number of places remaining. | The displayed availability reflects the current remaining places, including 0 for a full session. |
| FR-007 | A session with no remaining places shall not be reservable. | A full session cannot be confirmed as a reservation. |
| FR-008 | A reservation shall be for at least 1 participant and no more participants than the selected session’s current remaining places. | The accepted participant count is bounded by 1 and the current remaining availability; an over-capacity reservation cannot be confirmed. |
| FR-009 | The application shall calculate total price as participant count multiplied by the selected class’s price per participant. No payment shall be taken. | The displayed total equals the participant count × unit price. The application does not process payment. |
| FR-010 | Before confirmation, the application shall show a reservation summary containing class, session, participant count, price per participant, and total price. | All five values are shown for the reservation being reviewed. |
| FR-011 | Before confirmation, the user shall be able to change the selected class, session, or participant count. | Changes are reflected in the summary and recalculated total before confirmation. |
| FR-012 | The application shall reject incomplete or invalid reservations, including missing class or session, fewer than 1 participant, more participants than remaining places, or a full session. It shall give feedback sufficient to explain why confirmation is unavailable. | Each listed invalid state prevents confirmation and provides understandable feedback. |
| FR-013 | A valid reservation shall require explicit user confirmation. | No reservation is confirmed before the user takes an explicit confirmation action. |
| FR-014 | After a valid reservation is confirmed, the application shall clearly indicate success and provide enough information to understand what was reserved. | The confirmation identifies the confirmed reservation sufficiently for the user to understand it. No email, SMS, printed ticket, or external confirmation is required. |
| FR-015 | On confirmation, the application shall deduct the reserved participant count from that session’s remaining availability. | If 6 places remain and 2 are confirmed, the session shows 4 places afterward. |
| FR-016 | Availability deductions shall remain in effect while the application remains open in the current browser session, including after the user starts another reservation. | In the support-case scenario, Yoga — Wednesday 19:00 starts at 6; confirming 2 changes it to 4; selecting “Start another reservation” and selecting Yoga again still shows 4, without refreshing or closing the browser. Subsequent confirmed reservations deduct from the then-current availability. |
| FR-017 | Refreshing or reopening the application shall restore the initial availability listed in this document. | After refresh or reopening, all sessions return to their listed initial availability. |
| FR-018 | The application is not required to synchronize availability between different users or different browsers. | Availability changes in one browser are not required to appear in another user’s browser. |
| FR-019 | After a successful reservation, the user shall be able to start another reservation and return to a state where a new reservation can be created. Starting another reservation shall not discard confirmed availability changes from the current browser session. | The user can begin another reservation; prior confirmed deductions remain visible during that browser session. |
| FR-020 | The application shall provide a simple, understandable web interface supporting class selection, session selection, availability review, participant selection, reservation review, confirmation, error feedback, confirmation display, and starting another reservation. The exact visual design is unspecified. | A reviewer can complete and inspect the reservation flow and its representative states. |
| FR-021 | The reservation shall be anonymous. The application shall not require or collect a name, email address, telephone number, postal address, account information, or payment information. | None of the listed personal or account/payment data is requested or collected. |
| FR-022 | The application shall include only the gym-class reservation functionality described in the BRD; the following are outside scope. | User accounts, authentication, memberships, subscriptions, payment processing, discounts or promotions, database storage, backend or server-side functionality, live multi-user availability, waiting lists, personal-trainer scheduling, cancellation, rescheduling, trainer management, email or SMS confirmation, external calendar integration, external APIs, and complex date or calendar calculations are outside scope. |

## Session inventory

| Class | Price per participant | Session | Initial available places |
|---|---:|---|---:|
| Yoga | €8 | Monday 18:00 | 10 |
| Yoga | €8 | Wednesday 19:00 | 6 |
| Yoga | €8 | Saturday 10:00 | 2 |
| Pilates | €10 | Tuesday 18:00 | 8 |
| Pilates | €10 | Thursday 19:00 | 4 |
| Pilates | €10 | Saturday 11:30 | 0 |
| Functional Training | €12 | Monday 19:30 | 5 |
| Functional Training | €12 | Wednesday 18:00 | 10 |
| Functional Training | €12 | Friday 18:30 | 3 |
| Spinning | €11 | Tuesday 19:30 | 7 |
| Spinning | €11 | Thursday 18:00 | 1 |
| Spinning | €11 | Sunday 10:00 | 10 |

## Support-case finding

The reported reset to 6 places after starting another reservation is not expected behavior under FR-016 and FR-019. The BRD requires the confirmed deduction to remain during the current browser session. The reported sequence (6 available, confirm 2, then 4, start another reservation without refreshing or closing the browser, then 6) therefore describes behavior that violates the stated requirement. The client reports reproducing the same result when trying the steps a second time.

## Support-task deliverable

The support case asks for an evidence-based decision to respond that the behavior is expected, request more information, or escalate, and for the resulting text to be prepared for the client support platform. This is a support workflow deliverable, not an application requirement. The supplied documents describe the reported behavior but do not include independent application evidence or a test run, so they do not establish the defect's root cause.

## Ambiguities and evidence limits

- The provided documents establish the expected behavior and describe the observed behavior, but do not include independent application evidence, implementation details, or a test run. The defect’s root cause cannot be determined from these documents alone.
- The BRD defines reset behavior for refresh/reopening and persistence during the current browser session, but does not further define browser-session lifecycle details. The support case’s specific no-refresh/no-close scenario is clear and is captured in FR-016.
