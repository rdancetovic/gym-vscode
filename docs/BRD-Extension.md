# Business Requirements Document — Gym Class Reservation: Reservation API Extension

## 1. Purpose

This document is a **change request** for the Gym Class Reservation application described in `BRD.md`.

The gym wants reservations to remain after the application is closed. Visitors want to look up a reservation and cancel it when they no longer need it.

This extension adds:

- a REST API that holds the classes, sessions, availability, and reservations;
- storage of this data in a file;
- a reservation code for every confirmed reservation;
- looking up a reservation by its code;
- cancelling a reservation by its code;
- a user interface that uses the API.

---

## 2. Relationship to the Original BRD

This extension BRD **applies when it conflicts with `BRD.md`**.

It replaces these rules of `BRD.md`:

- **Availability after confirmation (Section 12):** availability no longer resets when the page is refreshed or the application is reopened. Reservations and availability are stored and remain in effect.
- **Scope (Section 17):** server-side functionality (the API) and storage in a file are now in scope. Cancellation is now in scope.

All other rules of `BRD.md` remain valid, including the classes, sessions, capacity, prices, the reservation flow, the validation rules, the user-interface requirements, and the rule that no personal data is collected.

---

## 3. Reservation Code

Every confirmed reservation receives a **unique reservation code**.

The code has the format `GYM-` followed by **6 digits**, for example `GYM-004217`.

The confirmation must show the reservation code. The visitor needs the code to look up or cancel the reservation.

---

## 4. Looking Up a Reservation

The visitor can enter a reservation code and see the reservation:

- class;
- session day and time;
- number of participants;
- price per participant;
- total price;
- status.

The status is **Confirmed** or **Cancelled**.

If no reservation exists for the code, the visitor receives clear feedback.

---

## 5. Cancelling a Reservation

The visitor can cancel a reservation by its code.

- Only the **whole reservation** can be cancelled. Reducing the number of participants is not possible.
- A reservation can be cancelled **at any time**.
- After cancellation, the reserved places **return to the session**.
- A cancelled reservation can still be looked up. Its status is **Cancelled**.
- A cancelled reservation cannot be cancelled again. The visitor receives clear feedback.

Example: a session has 4 places available. The visitor cancels a reservation for 2 participants in that session. The session then has 6 places available.

---

## 6. Storage

Reservations and availability are stored in a **file**.

After the application restarts:

- all reservations remain, with their status (Confirmed or Cancelled);
- availability remains as it was before the restart, including changes made by reservations and cancellations.

When the application starts and no data file exists, it starts with the initial availability listed in `BRD.md`.

The application is used by **one visitor at a time**, and requests are handled one after another. Simultaneous use by several visitors is out of scope.

---

## 7. User Interface

The user interface:

- gets the classes, sessions, prices, and availability from the API;
- creates reservations through the API;
- shows the reservation code in the confirmation;
- allows the visitor to enter a reservation code, see the reservation, and cancel it;
- shows clear feedback when a request cannot be completed.

The reservation flow and the user-interface requirements of `BRD.md` remain valid.

---

## 8. Personal Data

The application still must not require or collect personal information.

The reservation code is the only link between the visitor and the reservation.

---

## 9. Scope

The following remain outside scope:

- user accounts and authentication;
- database storage;
- simultaneous use by several visitors;
- reducing the number of participants in a reservation;
- rescheduling;
- time rules for cancellation;
- operations for gym staff;
- payment processing;
- email or SMS messages;
- personal data.

---

## 10. Implementation Freedom

This document does not prescribe:

- programming language;
- framework;
- file format of the storage;
- port or address of the API;
- internal structure of the application.

---

## Annex — API Behavior

This annex describes how the API must behave. It is the common reference for everyone who builds, tests, or uses the API.

The API exchanges data in JSON format. A **request** is what is sent to the API. A **response** is what the API sends back. Every response has an HTTP **status** that tells whether the request succeeded.

---

### A.1 Operations

**Purpose:** the operations are the four requests that the API accepts. Each operation serves one business need: showing the classes, making a reservation, looking up a reservation, or cancelling it.

**Usage:** the user interface calls `GET /classes` to show the classes, sessions, prices, and remaining places. It calls `POST /reservations` when the visitor confirms a reservation, `GET /reservations/{code}` when the visitor enters a reservation code, and `DELETE /reservations/{code}` when the visitor cancels the reservation. The success status tells the user interface that the request was completed.

| Operation | Business need | Success status |
|---|---|---|
| `GET /classes` | Show classes, sessions, prices, and remaining places | 200 |
| `POST /reservations` | Make a reservation | 201 |
| `GET /reservations/{code}` | Look up a reservation by its code | 200 |
| `DELETE /reservations/{code}` | Cancel a reservation by its code | 200 |

In `{code}`, the reservation code is placed into the address, for example `GET /reservations/GYM-004217`.

---

### A.2 Operation Behavior

**Purpose:** the operation behavior is what each operation does with the stored reservations and availability when it succeeds.

**Usage:** every operation works with the current stored data: at first the initial availability from `BRD.md`, later the data changed by earlier operations, also after a restart. For example, after a reservation, `GET /classes` returns the reduced number of remaining places, and the user interface shows it.

**`GET /classes`**

Returns all four classes with their price per participant and their three sessions. For each session, it returns the current number of remaining places. It does not change anything.

**`POST /reservations`**

Creates a reservation for one session. The request contains the session identifier and the number of participants.

When the request is valid and enough places remain, the API:

1. creates the reservation with status `Confirmed`;
2. gives it a new, unique reservation code;
3. calculates the total price (number of participants × price per participant);
4. reduces the remaining places of the session by the number of participants;
5. stores the reservation and the new availability;
6. returns the reservation.

**`GET /reservations/{code}`**

Returns the reservation with this code, with status `Confirmed` or `Cancelled`. It does not change anything.

**`DELETE /reservations/{code}`**

Cancels the reservation with this code. When the reservation has status `Confirmed`, the API:

1. changes its status to `Cancelled`;
2. returns its places to the session;
3. stores the change;
4. returns the reservation.

When the API cannot complete a request, it returns an error as described in A.6 and changes nothing.

---

### A.3 Session Identifiers

**Purpose:** a session identifier is a short, fixed name for one session, that is, one class on one day at one time.

**Usage:** the user interface gets the session identifiers from `GET /classes`. When the visitor chooses a session, the user interface sends its identifier in the reservation request. The API returns the identifier in every reservation. Visitors do not need to see the identifiers; the user interface shows the class, day, and time instead.

| Class | Session | Session identifier |
|---|---|---|
| Yoga | Monday 18:00 | `YOGA-1` |
| Yoga | Wednesday 19:00 | `YOGA-2` |
| Yoga | Saturday 10:00 | `YOGA-3` |
| Pilates | Tuesday 18:00 | `PILATES-1` |
| Pilates | Thursday 19:00 | `PILATES-2` |
| Pilates | Saturday 11:30 | `PILATES-3` |
| Functional Training | Monday 19:30 | `FUNCTIONAL-1` |
| Functional Training | Wednesday 18:00 | `FUNCTIONAL-2` |
| Functional Training | Friday 18:30 | `FUNCTIONAL-3` |
| Spinning | Tuesday 19:30 | `SPINNING-1` |
| Spinning | Thursday 18:00 | `SPINNING-2` |
| Spinning | Sunday 10:00 | `SPINNING-3` |

---

### A.4 Data Fields

**Purpose:** data fields are the named values that the API receives and returns, for example the price per participant or the number of remaining places. The API uses four groups of fields: Class, Session, Reservation request, and Reservation.

**Usage:** the user interface reads the fields of the responses to show the classes, sessions, and reservations to the visitor. It fills the fields of the reservation request from the visitor's choices. The "Meaning and use" column below explains each field.

Field names must be used exactly as written, including upper- and lower-case letters. "Text" means a JSON string; "whole number" means a JSON number without decimals. Responses may contain additional fields, but they must contain all fields listed here.

**Class** — appears in the response of `GET /classes`, once for each class.

| Field | Type | Meaning and use |
|---|---|---|
| `name` | text | Name of the class, for example `Yoga`. Shown to the visitor. |
| `pricePerParticipant` | whole number | Price for one participant, in euros. Shown to the visitor and used to calculate the total price. |
| `sessions` | list of sessions | The three sessions of the class (see Session). |

**Session** — appears inside each class in the response of `GET /classes`.

| Field | Type | Meaning and use |
|---|---|---|
| `sessionId` | text | Session identifier from A.3. Used to name the session in a reservation request. |
| `day` | text | Day of the week in English, for example `Monday`. Shown to the visitor. |
| `time` | text | Start time in the format `HH:MM`, for example `18:00`. Shown to the visitor. |
| `capacity` | whole number | Maximum number of participants in the session. It is always 10. |
| `remainingPlaces` | whole number | Places still available. Shown to the visitor; a session with 0 cannot be reserved. |

**Reservation request** — the content sent with `POST /reservations`.

| Field | Type | Meaning and use |
|---|---|---|
| `sessionId` | text | The session to reserve, named by its identifier from A.3. |
| `participants` | whole number | Number of participants to reserve. At least 1, and not more than the remaining places. |

**Reservation** — returned by `POST /reservations`, `GET /reservations/{code}`, and `DELETE /reservations/{code}`.

| Field | Type | Meaning and use |
|---|---|---|
| `code` | text | Reservation code, for example `GYM-004217`. Shown to the visitor, who needs it to look up or cancel the reservation. |
| `className` | text | Name of the reserved class. |
| `sessionId` | text | Identifier of the reserved session. |
| `day` | text | Day of the reserved session. |
| `time` | text | Start time of the reserved session. |
| `participants` | whole number | Number of reserved participants. |
| `pricePerParticipant` | whole number | Price for one participant, in euros. |
| `totalPrice` | whole number | Participants × price per participant, in euros. |
| `status` | text | `Confirmed` for an active reservation; `Cancelled` after cancellation. |

---

### A.5 Examples

**Purpose:** the examples are requests and responses with realistic values, one for each operation.

**Usage:** the examples show the data exchanged in one reservation and its cancellation. The user interface sends the session identifier and the number of participants, receives the reservation, and shows its code to the visitor. After the reservation, the API returns 4 remaining places for `YOGA-2`; after the cancellation, 6 again. The values are examples only; real codes and remaining places depend on earlier reservations.

`GET /classes` — response 200 (shortened to one class and one session):

```json
[
  {
    "name": "Yoga",
    "pricePerParticipant": 8,
    "sessions": [
      { "sessionId": "YOGA-2", "day": "Wednesday", "time": "19:00", "capacity": 10, "remainingPlaces": 6 }
    ]
  }
]
```

`POST /reservations` — request:

```json
{ "sessionId": "YOGA-2", "participants": 2 }
```

Response 201:

```json
{
  "code": "GYM-004217",
  "className": "Yoga",
  "sessionId": "YOGA-2",
  "day": "Wednesday",
  "time": "19:00",
  "participants": 2,
  "pricePerParticipant": 8,
  "totalPrice": 16,
  "status": "Confirmed"
}
```

`GET /reservations/GYM-004217` — response 200:

```json
{
  "code": "GYM-004217",
  "className": "Yoga",
  "sessionId": "YOGA-2",
  "day": "Wednesday",
  "time": "19:00",
  "participants": 2,
  "pricePerParticipant": 8,
  "totalPrice": 16,
  "status": "Confirmed"
}
```

`DELETE /reservations/GYM-004217` — response 200:

```json
{
  "code": "GYM-004217",
  "className": "Yoga",
  "sessionId": "YOGA-2",
  "day": "Wednesday",
  "time": "19:00",
  "participants": 2,
  "pricePerParticipant": 8,
  "totalPrice": 16,
  "status": "Cancelled"
}
```

---

### A.6 Errors

**Purpose:** an error is the answer of the API to a request it cannot complete. Each error has a status and a readable message.

**Usage:** the user interface uses the status and the message to recognize why the request failed, and gives the visitor clear feedback, for example that not enough places remain or that no reservation exists for the entered code.

| Situation | Status | Example message |
|---|---|---|
| A required field is missing | 400 | `sessionId is required` |
| The session identifier is not text or is empty | 400 | `sessionId must be non-empty text` |
| The number of participants is not a whole number or is below 1 | 400 | `participants must be a whole number of at least 1` |
| The reservation code does not have the format `GYM-` followed by 6 digits | 400 | `invalid reservation code` |
| The session identifier does not exist | 404 | `session not found` |
| The reservation code has the correct format but does not exist | 404 | `reservation not found` |
| The number of participants is greater than the remaining places (including a full session) | 409 | `not enough places available` |
| The reservation is already cancelled | 409 | `reservation already cancelled` |

Each error response contains a readable message. The exact structure of error responses is not prescribed.

When more than one error applies, the API checks in this order and returns the first error found:

1. invalid input (400);
2. session or reservation not found (404);
3. not enough places, or reservation already cancelled (409).

Example: a request with an unknown session identifier and 0 participants returns 400.

