(function (global) {
  "use strict";

  const data = global.GymData;

  function getRemaining(state, sessionId) {
    if (!state || !state.availability || !Object.prototype.hasOwnProperty.call(state.availability, sessionId)) {
      return null;
    }
    return state.availability[sessionId];
  }

  function isFull(state, sessionId) {
    const remaining = getRemaining(state, sessionId);
    return remaining !== null && remaining <= 0;
  }

  function isClassFull(state, classId) {
    const gymClass = data.getClassById(classId);
    return Boolean(gymClass && gymClass.sessions.every(function (session) {
      return isFull(state, session.id);
    }));
  }

  function calcTotal(classId, participants) {
    const gymClass = data.getClassById(classId);
    const count = Number(participants);
    if (!gymClass || !Number.isFinite(count)) return null;
    return count * gymClass.price;
  }

  function formatPrice(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value)) return null;
    return "€" + (Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2))));
  }

  function problem(code, message) {
    return { code: code, message: message };
  }

  function validate(draft, state) {
    const selection = draft || {};
    const currentState = state || data.createInitialState();
    const errors = [];
    const gymClass = data.getClassById(selection.classId);
    const foundSession = data.findSession(selection.sessionId);
    const participants = Number(selection.participants);

    if (!selection.classId) {
      errors.push(problem("NO_CLASS", "Choose a class."));
    } else if (!gymClass) {
      errors.push(problem("UNKNOWN_CLASS", "Select a valid class."));
    }

    if (!selection.sessionId) {
      errors.push(problem("NO_SESSION", "Choose a session."));
    } else if (!foundSession) {
      errors.push(problem("UNKNOWN_SESSION", "Select a valid session."));
    } else if (selection.classId && foundSession.classId !== selection.classId) {
      errors.push(problem("SESSION_CLASS_MISMATCH", "Choose a session for the selected class."));
    }

    if (foundSession) {
      const remaining = getRemaining(currentState, foundSession.session.id);
      if (remaining !== null && remaining <= 0) {
        errors.push(problem("SESSION_FULL", "This session is full."));
      }
    }

    if (Number.isFinite(participants) && participants < 1) {
      errors.push(problem("PARTICIPANTS_BELOW_MINIMUM", "Choose at least 1 participant."));
    }
    if (!Number.isInteger(participants)) {
      errors.push(problem("PARTICIPANTS_NOT_WHOLE_NUMBER", "Participant count must be a whole number."));
    }
    if (foundSession && Number.isFinite(participants)) {
      const remaining = getRemaining(currentState, foundSession.session.id);
      if (remaining !== null && participants > remaining) {
        errors.push(problem("PARTICIPANTS_EXCEED_REMAINING", "Only " + remaining + " places remaining."));
      }
    }

    return errors;
  }

  function confirm(draft, state) {
    const currentState = state || data.createInitialState();
    const errors = validate(draft, currentState);
    if (errors.length > 0) {
      return { ok: false, state: currentState, booking: null, errors: errors };
    }

    const gymClass = data.getClassById(draft.classId);
    const foundSession = data.findSession(draft.sessionId);
    const participants = Number(draft.participants);
    const total = calcTotal(gymClass.id, participants);
    const booking = {
      classId: gymClass.id,
      className: gymClass.name,
      sessionId: foundSession.session.id,
      day: foundSession.session.day,
      time: foundSession.session.time,
      participants: participants,
      priceEach: gymClass.price,
      total: total
    };
    const availability = Object.assign({}, currentState.availability);
    availability[foundSession.session.id] -= participants;
    const nextState = {
      availability: availability,
      bookings: currentState.bookings.concat(booking)
    };

    return { ok: true, state: nextState, booking: booking, errors: [] };
  }

  global.GymReservation = Object.freeze({
    getRemaining: getRemaining,
    isFull: isFull,
    isClassFull: isClassFull,
    calcTotal: calcTotal,
    formatPrice: formatPrice,
    validate: validate,
    confirm: confirm
  });
})(globalThis);
