(function (global) {
  "use strict";

  class ApiError extends Error {
    constructor(status, message) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  }

  async function request(path, options) {
    let response;
    try {
      response = await global.fetch(path, options);
    } catch (error) {
      const detail = error && error.message ? ": " + error.message : "";
      throw new Error("The request could not be completed" + detail + ".");
    }

    let body;
    try {
      body = await response.json();
    } catch (error) {
      if (!response.ok) {
        throw new ApiError(response.status, "The server returned an unreadable error response.");
      }
      throw new Error("The server returned invalid JSON.");
    }

    if (!response.ok) {
      const message = body && typeof body.message === "string" && body.message.trim()
        ? body.message
        : "The request was rejected.";
      throw new ApiError(response.status, message);
    }
    return body;
  }

  function isWholeNumber(value) {
    return Number.isInteger(value) && value >= 0;
  }

  function validateReservation(reservation, confirmedOnly) {
    if (!reservation || typeof reservation !== "object"
        || typeof reservation.code !== "string" || !/^GYM-[0-9]{6}$/.test(reservation.code)
        || typeof reservation.className !== "string" || reservation.className.trim() === ""
        || typeof reservation.sessionId !== "string" || reservation.sessionId.trim() === ""
        || typeof reservation.day !== "string" || reservation.day.trim() === ""
        || typeof reservation.time !== "string" || reservation.time.trim() === ""
        || !Number.isInteger(reservation.participants) || reservation.participants < 1
        || !isWholeNumber(reservation.pricePerParticipant)
        || !isWholeNumber(reservation.totalPrice)
        || (reservation.status !== "Confirmed" && reservation.status !== "Cancelled")
        || (confirmedOnly && reservation.status !== "Confirmed")) {
      throw new Error("The reservation response is missing required fields or has invalid field types.");
    }
    return reservation;
  }

  async function getClasses() {
    return request("/classes", { method: "GET", headers: { Accept: "application/json" } });
  }

  async function createReservation(requestBody) {
    const body = await request("/reservations", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    return validateReservation(body, true);
  }

  async function getReservation(code) {
    const body = await request("/reservations/" + encodeURIComponent(code), {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    return validateReservation(body, false);
  }

  global.GymApi = Object.freeze({
    ApiError: ApiError,
    getClasses: getClasses,
    createReservation: createReservation,
    getReservation: getReservation
  });
})(globalThis);
