# Business Requirements Document — Gym Class Reservation

## 1. Purpose

The Gym Class Reservation application allows visitors to a local gym to reserve places in predefined group exercise sessions.

The application should make it easy for a visitor to:

- choose a gym class;
- choose one of its available sessions;
- choose the number of participants;
- review the reservation and total price;
- confirm the reservation;
- start another reservation if needed.

The application is intended as a simple web-based reservation service for demonstration and review.

---

## 2. Intended User

The intended user is any visitor who wants to reserve one or more places in a group gym class.

No gym membership is required.

The application does not require a user account.

---

## 3. Available Classes

The gym offers four group classes.

| Class | Price per participant |
|---|---:|
| Yoga | €8 |
| Pilates | €10 |
| Functional Training | €12 |
| Spinning | €11 |

Each class has three predefined sessions.

---

## 4. Class Sessions

Each session has a maximum capacity of **10 participants**.

The initial availability is shown below.

### Yoga

| Session | Initial available places |
|---|---:|
| Monday 18:00 | 10 |
| Wednesday 19:00 | 6 |
| Saturday 10:00 | 2 |

### Pilates

| Session | Initial available places |
|---|---:|
| Tuesday 18:00 | 8 |
| Thursday 19:00 | 4 |
| Saturday 11:30 | 0 |

### Functional Training

| Session | Initial available places |
|---|---:|
| Monday 19:30 | 5 |
| Wednesday 18:00 | 10 |
| Friday 18:30 | 3 |

### Spinning

| Session | Initial available places |
|---|---:|
| Tuesday 19:30 | 7 |
| Thursday 18:00 | 1 |
| Sunday 10:00 | 10 |

A session with no remaining places cannot be reserved.

---

## 5. Reservation Flow

The application should allow the user to complete a reservation through the following general flow:

1. Choose a class.
2. Choose one of the sessions for that class.
3. Choose the number of participants.
4. Review the reservation.
5. Confirm the reservation.
6. See a reservation confirmation.
7. Start another reservation if desired.

Before confirmation, the user should be able to change the selected class, session, or number of participants.

---

## 6. Choosing a Class

The user must be able to select one of the four available gym classes.

When a class is selected, the application should make the sessions for that class available for selection.

The user should be able to change the selected class before confirming the reservation.

---

## 7. Choosing a Session

The user must be able to choose one of the predefined sessions for the selected class.

The application should show enough information for the user to understand:

- the session day and time;
- whether places are still available;
- how many places remain.

A full session cannot be reserved.

---

## 8. Number of Participants

A reservation must be for at least **1 participant**.

The maximum number of participants that can be reserved is the number of places currently remaining in the selected session.

For example:

- if 10 places remain, the user may reserve from 1 to 10 places;
- if 4 places remain, the user may reserve from 1 to 4 places;
- if no places remain, the session cannot be reserved.

The application must not allow the user to confirm a reservation that exceeds the remaining capacity.

---

## 9. Price Calculation

Each class has a fixed price per participant.

The total reservation price is:

**number of participants × price per participant**

The application should calculate the total price automatically.

No payment is made through the application.

---

## 10. Reservation Summary

Before confirmation, the user should be able to review the reservation.

The summary should show:

- selected class;
- selected session;
- number of participants;
- price per participant;
- total price.

The user should still be able to change the reservation before confirming it.

---

## 11. Confirmation

A valid reservation must be explicitly confirmed by the user.

After confirmation, the application should clearly indicate that the reservation was successful.

The confirmation should provide enough information for the user to understand what was reserved.

No email, SMS, printed ticket, or external confirmation is required.

---

## 12. Availability After Confirmation

When a reservation is confirmed, the number of reserved places must be deducted from the remaining availability of that session.

Example:

If a session has 6 places available and the user confirms a reservation for 2 participants, that session should then show 4 places available.

Updated availability should remain in effect while the application remains open in the current browser session.

Refreshing or reopening the application restores the initial availability listed in this BRD.

The application does not need to synchronize availability between different users or different browsers.

---

## 13. Starting Another Reservation

After a successful reservation, the user should be able to start another reservation.

The application should return to a state in which another reservation can be created.

Availability changes from reservations already confirmed during the current browser session must remain in effect.

---

## 14. Invalid or Incomplete Reservations

The application must not confirm a reservation when the required information is incomplete or invalid.

Examples include:

- no class has been selected;
- no session has been selected;
- the number of participants is below 1;
- the number of participants exceeds the remaining places;
- the selected session has no available places.

The user should receive enough feedback to understand that the reservation cannot yet be confirmed.

---

## 15. User Interface Requirements

The application should provide a simple and understandable interface.

The user should be able to:

- identify the available classes;
- identify sessions for the selected class;
- understand session availability;
- select the number of participants;
- review the reservation;
- confirm a valid reservation;
- understand when a reservation cannot be confirmed;
- see the reservation confirmation;
- start another reservation.

The exact visual design is not specified.

---

## 16. Personal Data

The application must not require or collect personal information.

This includes:

- name;
- email address;
- telephone number;
- postal address;
- account information;
- payment information.

The reservation is anonymous.

---

## 17. Scope

The application includes only the gym-class reservation functionality described in this BRD.

The following are outside scope:

- user accounts;
- authentication;
- memberships;
- subscriptions;
- payment processing;
- discounts or promotions;
- database storage;
- backend or server-side functionality;
- live multi-user availability;
- waiting lists;
- personal-trainer scheduling;
- cancellation;
- rescheduling;
- trainer management;
- email or SMS confirmation;
- external calendar integration;
- external APIs;
- complex date or calendar calculations.

---

## 18. Implementation Freedom

This BRD defines the required business behavior.

It does not prescribe:

- programming language;
- framework;
- file structure;
- internal implementation;
- state-management approach;
- automated-test technology;
- test-document format;
- project-plan format.

Implementation and project-working decisions should be made separately.

---

## 19. Delivery Expectation

The result should be a small web application that can be demonstrated and reviewed against the requirements in this BRD.

The application should be simple enough for a reviewer to understand the main reservation flow and verify representative behavior.
