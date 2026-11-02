# Requirements — Gym Reservation API Extension

**Status:** Approved by the user. This document consolidates the mandatory behavior in `BRD.md` and `BRD-Extension.md`. It does not choose technologies or resolve details the BRDs leave open.

## 1. Sources and precedence

The original BRD defines the reservation service. The extension BRD adds an API, file-backed persistence, reservation codes, lookup, and cancellation.

Where they conflict, **BRD-Extension.md takes precedence**. In particular:

- Reservations and availability persist after the application restarts; they no longer reset on refresh or reopening.
- Server-side API functionality and file storage are in scope.
- Cancellation is in scope.

All other original BRD requirements remain in effect, including the class catalogue, prices, sessions, capacity, reservation flow, pricing, anonymity, and no-payment rule.

## 2. Purpose and users

The application shall let a visitor reserve places in predefined gym classes, look up a reservation using its code, and cancel a reservation using its code.

Reservations are anonymous. No account, membership, or personal information is required. The reservation code is the only link between a visitor and a reservation.

The application shall not process payments.

## 3. Classes, sessions, prices, and capacity

The application shall provide these classes and prices:

| Class | Price per participant |
|---|---:|
| Yoga | €8 |
| Pilates | €10 |
| Functional Training | €12 |
| Spinning | €11 |

Each class has three predefined sessions. Each session has a maximum capacity of 10 participants.

| Class | Session | Session ID | Initial available places |
|---|---|---|---:|
| Yoga | Monday 18:00 | `YOGA-1` | 10 |
| Yoga | Wednesday 19:00 | `YOGA-2` | 6 |
| Yoga | Saturday 10:00 | `YOGA-3` | 2 |
| Pilates | Tuesday 18:00 | `PILATES-1` | 8 |
| Pilates | Thursday 19:00 | `PILATES-2` | 4 |
| Pilates | Saturday 11:30 | `PILATES-3` | 0 |
| Functional Training | Monday 19:30 | `FUNCTIONAL-1` | 5 |
| Functional Training | Wednesday 18:00 | `FUNCTIONAL-2` | 10 |
| Functional Training | Friday 18:30 | `FUNCTIONAL-3` | 3 |
| Spinning | Tuesday 19:30 | `SPINNING-1` | 7 |
| Spinning | Thursday 18:00 | `SPINNING-2` | 1 |
| Spinning | Sunday 10:00 | `SPINNING-3` | 10 |

A session with zero remaining places is full and cannot be reserved.

## 4. Reservation flow and business rules

### 4.1 Creating a reservation

A visitor shall be able to:

1. Select one of the four classes.
2. Select a predefined session for that class.
3. Select the number of participants.
4. Review the class, session, participant count, price per participant, and total price.
5. Explicitly confirm the reservation.
6. See a clear success confirmation.
7. Start another reservation.

Before confirmation, the visitor shall be able to change the selected class, session, or participant count.

### 4.2 Participant limits and price

- A reservation must be for at least one participant.
- The participant count must not exceed the session’s current remaining places.
- A full session cannot be reserved.
- The total price is participant count multiplied by the class price per participant.
- No payment is taken.

### 4.3 Confirmation and availability

A valid reservation shall be confirmed only following an explicit visitor action. On successful confirmation, the application shall:

- Create a reservation with status `Confirmed`.
- Assign it a unique reservation code.
- Calculate and return its price details.
- Deduct the reserved places from the session.
- Store the reservation and updated availability.
- Provide a confirmation that identifies the reservation, including its code.

Starting another reservation shall not discard confirmed availability changes.

Availability and reservations shall remain stored after an application restart. The original BRD’s reset-on-refresh/reopening behavior is overridden.

### 4.4 Lookup

A visitor shall be able to enter a reservation code and see the matching reservation’s class, session day and time, participant count, price per participant, total price, and status.

Status shall be `Confirmed` or `Cancelled`. If no reservation exists for a correctly formatted code, the visitor shall receive clear feedback.

### 4.5 Cancellation

A visitor shall be able to cancel the whole reservation using its code.

- Partial cancellation or reducing the participant count is not supported.
- Cancellation is allowed at any time; no cancellation time restriction is specified.
- On successful cancellation, the status becomes `Cancelled` and the reservation’s places return to the session.
- A cancelled reservation remains available for lookup.
- A cancelled reservation cannot be cancelled again; the visitor shall receive clear feedback.

## 5. REST API

The API shall exchange data in JSON and provide these four operations:

| Method and path | Purpose | Success status |
|---|---|---:|
| `GET /classes` | Return classes, prices, sessions, and current availability | 200 |
| `POST /reservations` | Create a reservation | 201 |
| `GET /reservations/{code}` | Look up a reservation | 200 |
| `DELETE /reservations/{code}` | Cancel a reservation | 200 |

The `{code}` path parameter is the reservation code, for example `GYM-004217`.

### 5.1 `GET /classes`

Returns all four classes and their three sessions, with current availability. It does not change stored data.

The response is a JSON array. Each class object shall contain:

| Field | Type | Meaning |
|---|---|---|
| `name` | text | Class name |
| `pricePerParticipant` | whole number | Price in euros for one participant |
| `sessions` | list of Session objects | The class’s three sessions |

Each Session object shall contain:

| Field | Type | Meaning |
|---|---|---|
| `sessionId` | text | Fixed session identifier from the session table in Section 3 |
| `day` | text | Day of the week in English |
| `time` | text | Start time in `HH:MM` format |
| `capacity` | whole number | Maximum capacity; always 10 |
| `remainingPlaces` | whole number | Current available places |

Example response (shortened to one class and one session):

```json
[
  {
    "name": "Yoga",
    "pricePerParticipant": 8,
    "sessions": [
      {
        "sessionId": "YOGA-2",
        "day": "Wednesday",
        "time": "19:00",
        "capacity": 10,
        "remainingPlaces": 6
      }
    ]
  }
]
```

### 5.2 `POST /reservations`

The request body shall contain:

| Field | Type | Requirement |
|---|---|---|
| `sessionId` | text | Required; identifier of the session to reserve |
| `participants` | whole number | Required; at least 1 and no greater than current remaining places |

A valid request creates a `Confirmed` reservation, assigns a unique code, calculates the total, deducts availability, stores the reservation and updated availability, and returns the reservation with status **201**.

The success response shall contain the Reservation fields defined in Section 5.5.

Example request:

```json
{
  "sessionId": "YOGA-2",
  "participants": 2
}
```

Example successful response:

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

### 5.3 `GET /reservations/{code}`

Returns the reservation matching the code with status **200**. It does not change stored data.

The response shall contain the Reservation fields defined in Section 5.5. It may return either `Confirmed` or `Cancelled` status.

### 5.4 `DELETE /reservations/{code}`

Cancels the reservation matching the code and returns the updated Reservation with status **200**.

For a reservation currently `Confirmed`, the API shall mark it `Cancelled`, return its places to the session, store both changes, and return the reservation.

A request to cancel a reservation that is already `Cancelled` shall return **409** and make no changes.

### 5.5 Reservation response fields

Responses from `POST /reservations`, `GET /reservations/{code}`, and `DELETE /reservations/{code}` shall contain:

| Field | Type | Meaning |
|---|---|---|
| `code` | text | Unique reservation code |
| `className` | text | Name of the reserved class |
| `sessionId` | text | Identifier of the reserved session |
| `day` | text | Day of the reserved session |
| `time` | text | Start time of the reserved session |
| `participants` | whole number | Number of reserved participants |
| `pricePerParticipant` | whole number | Price per participant in euros |
| `totalPrice` | whole number | Participant count × price per participant, in euros |
| `status` | text | `Confirmed` or `Cancelled` |

The BRD permits responses to contain additional fields, but responses must contain all fields listed above.

### 5.6 Reservation code

Every confirmed reservation shall receive a unique code in the format `GYM-` followed by exactly six digits. For example: `GYM-004217`.

The code shall be included in the confirmation and used for lookup and cancellation. The BRDs do not specify a code-generation algorithm.

## 6. API errors and validation

When an API operation cannot be completed, it shall return an error with the applicable HTTP status and a readable message. The exact JSON structure of error responses is not prescribed.

The extension BRD states that an operation which cannot be completed returns an error and changes nothing. This is a mandatory API behavior.

| Situation | Status | Example message from the extension BRD |
|---|---:|---|
| A required field is missing | 400 | `sessionId is required` |
| `sessionId` is not text or is empty | 400 | `sessionId must be non-empty text` |
| `participants` is not a whole number or is below 1 | 400 | `participants must be a whole number of at least 1` |
| Code does not match `GYM-` followed by 6 digits | 400 | `invalid reservation code` |
| Session identifier does not exist | 404 | `session not found` |
| Correctly formatted reservation code does not exist | 404 | `reservation not found` |
| Participants exceed remaining places, including a full session | 409 | `not enough places available` |
| Reservation has already been cancelled | 409 | `reservation already cancelled` |

When multiple errors apply, the API shall return the first error according to this order:

1. **400 — Invalid input.**
2. **404 — Session or reservation not found.**
3. **409 — Not enough places or reservation already cancelled.**

For example, an unknown session identifier combined with a participant count of zero shall return **400** because invalid input is checked before whether the session exists.

## 7. Persistence and request handling

- Reservations and session availability shall be stored in a file.
- After a restart, reservations and their statuses shall remain, and availability shall retain the effects of reservations and cancellations.
- If no data file exists when the application starts, it shall start with the initial availability in Section 3.
- The application is used by one visitor at a time, and requests are handled one after another. Simultaneous use by several visitors is outside scope.

The extension does not prescribe the file format or the timing of initial file creation.

## 8. Frontend integration

The user interface shall:

- Obtain classes, sessions, prices, and current availability from `GET /classes`.
- Create reservations through `POST /reservations` only after the visitor explicitly confirms a valid reservation.
- Show a pre-confirmation summary with class, session, participant count, unit price, and total price.
- Show the reservation code in the successful confirmation.
- Allow a visitor to enter a code, look up the reservation, and view all required reservation details and status.
- Allow a visitor to cancel a reservation by code and show the result.
- Give clear feedback when an API request cannot be completed, using the error status and readable message.
- Continue to support starting another reservation after a successful reservation.

The user interface shall display the class, day, and time to visitors; they do not need to see session identifiers.

The exact visual design is unspecified. No personal information, account information, or payment information shall be requested or collected.

## 9. Explicitly out of scope

The following exclusions are stated in the original BRD’s **Section 17** or the extension BRD’s **Section 9**:

| Exclusion | Source |
|---|---|
| User accounts | BRD §17; BRD-Extension §9 |
| Authentication | BRD §17; BRD-Extension §9 |
| Memberships | BRD §17 |
| Subscriptions | BRD §17 |
| Payment processing | BRD §17; BRD-Extension §9 |
| Discounts or promotions | BRD §17 |
| Database storage | BRD §17; BRD-Extension §9 |
| Live multi-user availability | BRD §17 |
| Simultaneous use by several visitors | BRD-Extension §6 |
| Waiting lists | BRD §17 |
| Personal-trainer scheduling | BRD §17 |
| Cancellation | BRD §17, overridden by BRD-Extension §§1–2 and added in §5 |
| Rescheduling | BRD §17; BRD-Extension §9 |
| Trainer management | BRD §17 |
| Email or SMS confirmation/messages | BRD §17; BRD-Extension §9 |
| Personal data | BRD-Extension §9 |
| External calendar integration | BRD §17 |
| External APIs | BRD §17 |
| Complex date or calendar calculations | BRD §17 |
| Reducing the number of participants in an existing reservation | BRD-Extension §9 |
| Time rules for cancellation | BRD-Extension §9 |
| Operations for gym staff | BRD-Extension §9 |

The original BRD also excludes backend or server-side functionality in **Section 17**. The extension explicitly overrides that exclusion for the API, stating in **BRD-Extension §2** that server-side functionality (the API) is now in scope. Likewise, cancellation is in scope under the extension despite the original exclusion. File storage is in scope; database storage remains explicitly out of scope.

## 10. Mandatory requirements and open implementation decisions

### Mandatory

The requirements described above are mandatory because they are stated in one or both BRDs, subject to the precedence rule in Section 1. This includes the four API operations, their success statuses and fields, the error statuses and validation order, unique reservation codes, file persistence, lookup, cancellation, and API-based frontend integration.

### Open implementation decisions

The BRDs do **not** prescribe:

- Programming language, framework, or internal project structure.
- API port or address.
- File format or internal storage organization.
- Reservation-code generation algorithm.
- Exact error-response JSON structure.
- Whether responses include additional fields; the BRD explicitly permits them.
- Deployment or hosting arrangements.

These remain implementation decisions. This document does not select among them or add requirements for them.
