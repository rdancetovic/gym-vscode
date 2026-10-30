# Support Case — Gym Class Reservation

## Incoming Message

**From:** Client Service Agent  
**Subject:** Places not available after a cancellation

Hello,

A visitor called the gym reception about the **Pilates class on Thursday at 19:00**.

On Monday, the visitor saw **4 places available** in this session and reserved **3 places**. The confirmation showed the reservation code **GYM-004318**.

On Tuesday morning, the visitor cancelled the reservation with this code. The application showed the reservation with status **Cancelled**.

After that, a friend of the visitor wanted to reserve **4 places** for a group in the same session. The application showed only **1 place available** and did not accept 4 participants.

To be sure, the visitor tried to cancel the reservation once more and received the message **"reservation already cancelled"**.

The application was restarted on Tuesday evening. The session still shows 1 place available.

Can you please check what happened? The friend wants to know whether the group can still come on Thursday.

Thanks.

---

## Evidence from the Development Team

The development team added these excerpts from the application. The table shows the requests made by the visitor and the friend.

### Requests to the API

| Day and time | Request | Status | Result |
|---|---|---|---|
| Monday 10:05 | `GET /classes` | 200 | `PILATES-2`: `remainingPlaces` 4 |
| Monday 10:07 | `POST /reservations` with `{ "sessionId": "PILATES-2", "participants": 3 }` | 201 | reservation `GYM-004318`, status `Confirmed` |
| Monday 10:07 | `GET /classes` | 200 | `PILATES-2`: `remainingPlaces` 1 |
| Tuesday 09:40 | `DELETE /reservations/GYM-004318` | 200 | reservation `GYM-004318`, status `Cancelled` |
| Tuesday 09:41 | `GET /classes` | 200 | `PILATES-2`: `remainingPlaces` 1 |
| Tuesday 09:44 | `POST /reservations` with `{ "sessionId": "PILATES-2", "participants": 4 }` | 409 | `not enough places available` |
| Tuesday 09:46 | `DELETE /reservations/GYM-004318` | 409 | `reservation already cancelled` |
| Tuesday 20:15 | `GET /classes` (after the restart) | 200 | `PILATES-2`: `remainingPlaces` 1 |

### Response to the cancellation on Tuesday 09:40

```json
{
  "code": "GYM-004318",
  "className": "Pilates",
  "sessionId": "PILATES-2",
  "day": "Thursday",
  "time": "19:00",
  "participants": 3,
  "pricePerParticipant": 10,
  "totalPrice": 30,
  "status": "Cancelled"
}
```

### Data file on Tuesday 20:15 (excerpt)

The excerpt shows all stored reservations and the stored availability of the sessions that have reservations.

```json
{
  "reservations": [
    { "code": "GYM-004312", "sessionId": "PILATES-1", "participants": 3, "status": "Confirmed" },
    { "code": "GYM-004318", "sessionId": "PILATES-2", "participants": 3, "status": "Cancelled" },
    { "code": "GYM-004321", "sessionId": "SPINNING-1", "participants": 1, "status": "Confirmed" }
  ],
  "sessions": [
    { "sessionId": "PILATES-1", "capacity": 10, "remainingPlaces": 5 },
    { "sessionId": "PILATES-2", "capacity": 10, "remainingPlaces": 1 },
    { "sessionId": "SPINNING-1", "capacity": 10, "remainingPlaces": 6 }
  ]
}
```

---

## Support Task

Investigate the reported behavior using `BRD.md`, `BRD-Extension.md`, and the evidence above.

Decide whether the report should result in:

- a response explaining the expected behavior or an available resolution;
- a request for additional information;
- or an escalation to another team.

Your conclusion must be based on the evidence and the BRDs, not only on the AI tool's explanation.

Prepare the final response, clarification request, or escalation text that would be entered into the client support platform.
