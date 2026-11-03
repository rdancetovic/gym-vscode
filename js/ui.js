(function (global) {
  "use strict";

  const data = global.GymData;
  const reservation = global.GymReservation;

  function mount(root, state, api) {
    if (!root) throw new Error("A root element is required to mount the reservation UI.");

    let currentState = state || data.createInitialState();
    const apiClient = api || {};
    const selection = { classId: null, sessionId: null, participants: 1 };
    let reductionMessage = "";
    let screen = "form";
    let lastBooking = null;
    let submissionPending = false;
    let availabilityRefreshing = false;
    let apiFeedback = "";
    let availabilityRefreshError = "";
    let lookupPending = false;

    root.innerHTML = [
      '<div data-reservation-form>',
      '<div class="selection-columns">',
      '  <section class="selection-section" aria-labelledby="class-legend">',
      '    <fieldset>',
      '      <legend id="class-legend"><span class="step-label">01</span> Class</legend>',
      '      <div class="class-grid" data-class-list></div>',
      '    </fieldset>',
      '  </section>',
      '  <section class="selection-section" aria-labelledby="session-legend">',
      '    <fieldset>',
      '      <legend id="session-legend"><span class="step-label">02</span> <span data-session-heading>Session</span></legend>',
      '      <div data-session-content><p class="no-class-message">No class selected</p></div>',
      '    </fieldset>',
      '  </section>',
      '</div>',
      '<div class="reservation-details">',
      '  <section class="participant-section" aria-labelledby="participants-heading">',
      '    <h2 id="participants-heading"><span class="step-label">03</span> Number of participants</h2>',
      '    <div class="participant-control" data-participant-controls>',
      '      <button type="button" data-decrease aria-label="Decrease participants" disabled>−</button>',
      '      <label class="visually-hidden" for="participant-count">Number of participants</label>',
      '      <input id="participant-count" data-participant-input type="number" min="1" step="any" value="1" disabled>',
      '      <button type="button" data-increase aria-label="Increase participants" disabled>+</button>',
      '    </div>',
      '    <p class="participant-note" data-participant-note>Choose a session to set the participant count.</p>',
      '    <p class="reduction-message" data-reduction-message hidden></p>',
      '  </section>',
      '  <section class="summary-section" aria-labelledby="summary-heading">',
      '    <h2 id="summary-heading"><span class="step-label">04</span> Review your reservation</h2>',
      '    <dl class="summary-grid">',
      '      <div><dt>Class</dt><dd data-summary-class>—</dd></div>',
      '      <div><dt>Session</dt><dd data-summary-session>—</dd></div>',
      '      <div><dt>Participants</dt><dd data-summary-participants>—</dd></div>',
      '      <div><dt>Price per participant</dt><dd data-summary-unit-price>—</dd></div>',
      '      <div class="summary-total"><dt>Total</dt><dd data-summary-total>—</dd></div>',
      '    </dl>',
      '    <div class="reservation-status is-invalid" id="reservation-status" data-reservation-status>',
      '      <p class="status-heading" data-status-heading>Before you can confirm:</p>',
      '      <ul data-status-problems></ul>',
      '    </div>',
      '    <button class="confirm-button" type="button" data-confirm aria-describedby="reservation-status" disabled>Confirm reservation</button>',
      '    <p class="api-feedback" data-api-feedback role="alert" hidden></p>',
      '  </section>',
      '</div>',
      '</div>',
      '<section class="confirmation-screen" data-confirmation hidden></section>',
      '<section class="reservation-lookup" aria-labelledby="lookup-heading">',
      '  <h2 id="lookup-heading">Find a reservation</h2>',
      '  <form class="lookup-form" data-lookup-form novalidate>',
      '    <label class="lookup-field">Reservation code',
      '      <input data-lookup-code type="text" inputmode="text" maxlength="10" autocomplete="off" autocapitalize="characters" spellcheck="false" pattern="GYM-[0-9]{6}">',
      '    </label>',
      '    <button class="confirm-button" type="submit" data-lookup-submit>Look up reservation</button>',
      '  </form>',
      '  <p class="api-feedback" data-lookup-feedback role="alert" hidden></p>',
      '  <section class="lookup-result" data-lookup-result aria-labelledby="lookup-result-heading" aria-live="polite" hidden>',
      '    <h3 id="lookup-result-heading">Reservation details</h3>',
      '    <dl class="confirmation-summary lookup-summary">',
      '      <div><dt>Reservation code</dt><dd data-lookup-result-code></dd></div>',
      '      <div><dt>Class</dt><dd data-lookup-result-class></dd></div>',
      '      <div><dt>Session</dt><dd data-lookup-result-session></dd></div>',
      '      <div><dt>Participants</dt><dd data-lookup-result-participants></dd></div>',
      '      <div><dt>Price per participant</dt><dd data-lookup-result-unit-price></dd></div>',
      '      <div><dt>Total</dt><dd data-lookup-result-total></dd></div>',
      '      <div><dt>Status</dt><dd data-lookup-result-status></dd></div>',
      '    </dl>',
      '  </section>',
      '</section>',
      '<p class="visually-hidden" data-live-region aria-live="polite" aria-atomic="true"></p>'
    ].join("");

    const formContent = root.querySelector("[data-reservation-form]");
    const confirmationContent = root.querySelector("[data-confirmation]");
    const classList = root.querySelector("[data-class-list]");
    const sessionHeading = root.querySelector("[data-session-heading]");
    const sessionContent = root.querySelector("[data-session-content]");
    const participantInput = root.querySelector("[data-participant-input]");
    const participantNote = root.querySelector("[data-participant-note]");
    const reductionMessageElement = root.querySelector("[data-reduction-message]");
    const confirmButton = root.querySelector("[data-confirm]");
    const apiFeedbackElement = root.querySelector("[data-api-feedback]");
    const liveRegion = root.querySelector("[data-live-region]");
    const lookupForm = root.querySelector("[data-lookup-form]");
    const lookupCodeInput = root.querySelector("[data-lookup-code]");
    const lookupSubmitButton = root.querySelector("[data-lookup-submit]");
    const lookupFeedback = root.querySelector("[data-lookup-feedback]");
    const lookupResult = root.querySelector("[data-lookup-result]");

    function createClassOption(gymClass, index) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      const surface = document.createElement("span");
      const indexText = document.createElement("span");
      const name = document.createElement("span");
      const price = document.createElement("span");
      const unavailable = document.createElement("span");
      const isFull = reservation.isClassFull(currentState, gymClass.id);

      label.className = "class-option";
      input.type = "radio";
      input.name = "gym-class";
      input.value = gymClass.id;
      input.disabled = submissionPending;
      input.setAttribute("aria-label", gymClass.name + ", " + reservation.formatPrice(gymClass.price) + " per participant");
      surface.className = "class-surface";
      indexText.className = "class-index";
      indexText.textContent = String(index + 1).padStart(2, "0");
      name.className = "class-name";
      name.textContent = gymClass.name;
      price.className = "class-price";
      price.textContent = reservation.formatPrice(gymClass.price) + " / participant";
      unavailable.className = "class-unavailable";
      unavailable.textContent = isFull ? "No places available" : "";
      unavailable.hidden = !isFull;
      surface.append(indexText, name, price, unavailable);
      label.append(input, surface);
      return label;
    }

    function updateClassOptions() {
      classList.querySelectorAll(".class-option").forEach(function (option) {
        const input = option.querySelector("input");
        const unavailable = option.querySelector(".class-unavailable");
        const isFull = reservation.isClassFull(currentState, input.value);
        input.checked = input.value === selection.classId;
        option.classList.toggle("is-selected", input.value === selection.classId);
        unavailable.textContent = isFull ? "No places available" : "";
        unavailable.hidden = !isFull;
      });
    }

    function renderSessions() {
      const gymClass = data.getClassById(selection.classId, currentState);
      sessionContent.textContent = "";
      if (!gymClass) {
        sessionHeading.textContent = "Session";
        const message = document.createElement("p");
        message.className = "no-class-message";
        message.textContent = "No class selected";
        sessionContent.appendChild(message);
        return;
      }

      sessionHeading.textContent = gymClass.name + " sessions";
      if (reservation.isClassFull(currentState, gymClass.id)) {
        const message = document.createElement("p");
        message.className = "no-places-message";
        message.textContent = "No places available";
        sessionContent.appendChild(message);
      }

      const list = document.createElement("div");
      list.className = "session-list";
      gymClass.sessions.forEach(function (session) {
        const remaining = reservation.getRemaining(currentState, session.id);
        const isFull = remaining === null || remaining <= 0;
        const label = document.createElement("label");
        const input = document.createElement("input");
        const surface = document.createElement("span");
        const main = document.createElement("span");
        const title = document.createElement("span");
        const time = document.createElement("span");
        const status = document.createElement("span");

        label.className = "session-option";
        if (isFull) label.classList.add("is-full");
        if (!isFull && remaining <= 2) label.classList.add("is-low-availability");
        if (selection.sessionId === session.id) label.classList.add("is-selected");
        input.type = "radio";
        input.name = "gym-session";
        input.value = session.id;
        input.disabled = isFull || submissionPending;
        input.setAttribute("aria-label", session.day + " " + session.time + ", " + (isFull ? "Full" : remaining + " places left"));
        input.checked = selection.sessionId === session.id;
        surface.className = "session-surface";
        main.className = "session-main";
        title.className = "session-title";
        title.textContent = session.day;
        time.className = "session-time";
        time.textContent = session.time;
        status.className = "session-status";
        status.textContent = isFull ? "Full" : remaining + (remaining === 1 ? " place left" : " places left");
        main.append(title, time);
        surface.append(main, status);
        label.append(input, surface);
        list.appendChild(label);
      });
      sessionContent.appendChild(list);
    }

    function renderParticipants(preserveInput) {
      const remaining = selection.sessionId ? reservation.getRemaining(currentState, selection.sessionId) : null;
      const hasAvailableSession = remaining !== null && remaining > 0;
      const decreaseButton = root.querySelector("[data-decrease]");
      const increaseButton = root.querySelector("[data-increase]");

      participantInput.disabled = !hasAvailableSession;
      participantInput.max = hasAvailableSession ? String(remaining) : "";
      if (!preserveInput || document.activeElement !== participantInput) {
        participantInput.value = String(selection.participants);
      }
      decreaseButton.disabled = !hasAvailableSession || Number(selection.participants) <= 1;
      increaseButton.disabled = !hasAvailableSession || Number(selection.participants) >= remaining;
      if (submissionPending) {
        decreaseButton.disabled = true;
        increaseButton.disabled = true;
      }
      participantInput.disabled = submissionPending || !hasAvailableSession;
      participantNote.textContent = hasAvailableSession
        ? "Choose between 1 and " + remaining + " participants."
        : "Choose an available session to set the participant count.";
      reductionMessageElement.textContent = reductionMessage;
      reductionMessageElement.hidden = !reductionMessage;
    }

    function renderSummary() {
      const gymClass = data.getClassById(selection.classId, currentState);
      const foundSession = selection.sessionId ? data.findSession(selection.sessionId, currentState) : null;
      const summaryValues = {
        "[data-summary-class]": gymClass ? gymClass.name : "—",
        "[data-summary-session]": foundSession ? foundSession.session.day + " " + foundSession.session.time : "—",
        "[data-summary-participants]": foundSession ? String(selection.participants) : "—",
        "[data-summary-unit-price]": gymClass ? reservation.formatPrice(gymClass.price) : "—",
        "[data-summary-total]": gymClass && foundSession
          ? reservation.formatPrice(reservation.calcTotal(gymClass.id, selection.participants, currentState))
          : "—"
      };
      Object.keys(summaryValues).forEach(function (selector) {
        root.querySelector(selector).textContent = summaryValues[selector];
      });

      const problems = reservation.validate(selection, currentState);
      const problemList = root.querySelector("[data-status-problems]");
      const status = root.querySelector("[data-reservation-status]");
      const statusHeading = root.querySelector("[data-status-heading]");
      const isValid = problems.length === 0;
      problemList.textContent = "";
      status.classList.toggle("is-valid", isValid);
      status.classList.toggle("is-invalid", !isValid);
      statusHeading.textContent = isValid ? "Ready to confirm" : "Before you can confirm:";
      problems.forEach(function (problem) {
        const item = document.createElement("li");
        item.textContent = problem.message;
        problemList.appendChild(item);
      });
      confirmButton.disabled = !isValid || submissionPending;
      confirmButton.textContent = submissionPending ? "Submitting reservation…" : "Confirm reservation";
      apiFeedbackElement.textContent = apiFeedback;
      apiFeedbackElement.hidden = !apiFeedback;
    }

    function errorMessage(error) {
      if (error && Number.isInteger(error.status)) {
        return "Request failed (HTTP " + error.status + "): " + error.message;
      }
      return error && error.message ? error.message : "The request could not be completed.";
    }

    function announceStatus() {
      if (screen === "confirmation" && lastBooking) {
        const total = lastBooking.totalPrice === undefined ? lastBooking.total : lastBooking.totalPrice;
        const placesMessage = availabilityRefreshing
          ? " Availability is refreshing."
          : availabilityRefreshError
            ? " Availability could not be refreshed."
            : " " + availabilityText(lastBooking.sessionId);
        liveRegion.textContent = "Reservation confirmed. You reserved " + lastBooking.participants +
          (lastBooking.participants === 1 ? " place for " : " places for ") + lastBooking.className + " on " +
          lastBooking.day + " " + lastBooking.time + ". Total " +
          reservation.formatPrice(total === undefined ? 0 : total) + "." + placesMessage;
        return;
      }

      const problems = reservation.validate(selection, currentState);
      if (problems.length > 0) {
        liveRegion.textContent = "Before you can confirm: " + problems.map(function (problem) {
          return problem.message;
        }).join(" ");
        return;
      }

      const total = reservation.calcTotal(selection.classId, selection.participants, currentState);
      const readyMessage = "Ready to confirm. Total " + reservation.formatPrice(total) + ".";
      liveRegion.textContent = reductionMessage ? reductionMessage + " " + readyMessage : readyMessage;
    }

    function render(options) {
      const settings = options || {};
      formContent.hidden = screen !== "form";
      confirmationContent.hidden = screen !== "confirmation";
      updateClassOptions();
      renderSessions();
      renderParticipants(settings.preserveParticipantInput);
      renderSummary();
      if (settings.announce) announceStatus();
    }

    function renderConfirmation() {
      const booking = lastBooking;
      const priceEach = booking.pricePerParticipant === undefined ? booking.priceEach : booking.pricePerParticipant;
      const total = booking.totalPrice === undefined ? booking.total : booking.totalPrice;

      formContent.hidden = true;
      confirmationContent.hidden = false;
      confirmationContent.innerHTML = [
        '<p class="confirmation-eyebrow">RESERVATION COMPLETE</p>',
        '<h2 class="confirmation-heading" data-confirmation-heading tabindex="-1">Reservation confirmed</h2>',
        '<p class="confirmation-message" data-confirmation-message></p>',
        '<dl class="confirmation-summary">',
        '  <div><dt>Reservation code</dt><dd data-confirmation-code></dd></div>',
        '  <div><dt>Class</dt><dd data-confirmation-class></dd></div>',
        '  <div><dt>Session</dt><dd data-confirmation-session></dd></div>',
        '  <div><dt>Status</dt><dd data-confirmation-status></dd></div>',
        '  <div><dt>Participants</dt><dd data-confirmation-participants></dd></div>',
        '  <div><dt>Price per participant</dt><dd data-confirmation-unit-price></dd></div>',
        '  <div><dt>Total</dt><dd data-confirmation-total></dd></div>',
        '</dl>',
        '<p class="confirmation-availability" data-confirmation-availability></p>',
        '<p class="api-feedback" data-refresh-error role="status" hidden></p>',
        '<p class="no-payment-note">No payment is taken in this app.</p>',
        '<button class="confirm-button" type="button" data-new-reservation disabled>Make another reservation</button>'
      ].join("");
      confirmationContent.querySelector("[data-confirmation-message]").textContent =
        "You reserved " + booking.participants + (booking.participants === 1 ? " place for " : " places for ") +
        booking.className + " on " + booking.day + " " + booking.time + ".";
      confirmationContent.querySelector("[data-confirmation-code]").textContent = booking.code || "—";
      confirmationContent.querySelector("[data-confirmation-class]").textContent = booking.className;
      confirmationContent.querySelector("[data-confirmation-session]").textContent = booking.day + " " + booking.time;
      confirmationContent.querySelector("[data-confirmation-status]").textContent = booking.status || "Confirmed";
      confirmationContent.querySelector("[data-confirmation-participants]").textContent = String(booking.participants);
      confirmationContent.querySelector("[data-confirmation-unit-price]").textContent =
        reservation.formatPrice(priceEach);
      confirmationContent.querySelector("[data-confirmation-total]").textContent =
        reservation.formatPrice(total);
      confirmationContent.querySelector("[data-confirmation-availability]").textContent =
        availabilityRefreshing ? "Refreshing availability…" : availabilityText(booking.sessionId);
      const refreshError = confirmationContent.querySelector("[data-refresh-error]");
      refreshError.textContent = availabilityRefreshError;
      refreshError.hidden = !availabilityRefreshError;
      const newReservationButton = confirmationContent.querySelector("[data-new-reservation]");
      newReservationButton.disabled = availabilityRefreshing || Boolean(availabilityRefreshError);
      newReservationButton.textContent = availabilityRefreshing ? "Refreshing availability…" : "Make another reservation";
      confirmationContent.querySelector("[data-confirmation-heading]").focus();
      announceStatus();
    }

    function availabilityText(sessionId) {
      const remaining = reservation.getRemaining(currentState, sessionId);
      if (remaining === null) return "Current availability is unavailable.";
      if (remaining === 0) return "This session is now full.";
      return remaining + (remaining === 1 ? " place left in this session." : " places left in this session.");
    }

    function updateConfirmationAvailability() {
      confirmationContent.querySelector("[data-confirmation-availability]").textContent =
        availabilityRefreshing
          ? "Refreshing availability…"
          : availabilityRefreshError
            ? "Availability could not be refreshed."
            : availabilityText(lastBooking.sessionId);
      const refreshError = confirmationContent.querySelector("[data-refresh-error]");
      refreshError.textContent = availabilityRefreshError;
      refreshError.hidden = !availabilityRefreshError;
      const newReservationButton = confirmationContent.querySelector("[data-new-reservation]");
      newReservationButton.disabled = availabilityRefreshing || Boolean(availabilityRefreshError);
      newReservationButton.textContent = availabilityRefreshing
        ? "Refreshing availability…"
        : "Make another reservation";
      announceStatus();
    }

    async function submitReservation() {
      if (submissionPending) return;
      const errors = reservation.validate(selection, currentState);
      if (errors.length > 0) {
        render({ announce: true });
        return;
      }

      if (typeof apiClient.createReservation !== "function") {
        const result = reservation.confirm(selection, currentState);
        if (!result.ok) {
          render({ announce: true });
          return;
        }
        currentState = result.state;
        lastBooking = result.booking;
        screen = "confirmation";
        renderConfirmation();
        return;
      }

      submissionPending = true;
      apiFeedback = "";
      render();
      try {
        const booking = await apiClient.createReservation({
          sessionId: selection.sessionId,
          participants: Number(selection.participants)
        });
        lastBooking = booking;
        screen = "confirmation";
        submissionPending = false;
        availabilityRefreshing = typeof apiClient.loadClasses === "function";
        availabilityRefreshError = "";
        renderConfirmation();

        if (availabilityRefreshing) {
          try {
            const refreshedState = data.createStateFromApi(await apiClient.loadClasses());
            refreshedState.bookings = currentState.bookings.concat(booking);
            currentState = refreshedState;
            availabilityRefreshing = false;
          } catch (error) {
            availabilityRefreshing = false;
            availabilityRefreshError = "Reservation confirmed, but availability could not be refreshed: " +
              errorMessage(error) + " Reload the page before making another reservation.";
          }
          updateConfirmationAvailability();
        }
      } catch (error) {
        submissionPending = false;
        apiFeedback = errorMessage(error);
        render({ announce: true });
      }
    }

    async function submitLookup(event) {
      event.preventDefault();
      if (lookupPending) return;

      const code = lookupCodeInput.value.trim();
      lookupResult.hidden = true;
      lookupFeedback.textContent = "";
      lookupFeedback.hidden = true;
      if (!/^GYM-[0-9]{6}$/.test(code)) {
        lookupFeedback.textContent = "Enter a reservation code in the format GYM-123456.";
        lookupFeedback.hidden = false;
        return;
      }
      if (typeof apiClient.getReservation !== "function") {
        lookupFeedback.textContent = "Reservation lookup is unavailable.";
        lookupFeedback.hidden = false;
        return;
      }

      lookupPending = true;
      lookupCodeInput.disabled = true;
      lookupSubmitButton.disabled = true;
      lookupSubmitButton.textContent = "Searching…";
      try {
        const found = await apiClient.getReservation(code);
        root.querySelector("[data-lookup-result-code]").textContent = found.code;
        root.querySelector("[data-lookup-result-class]").textContent = found.className;
        root.querySelector("[data-lookup-result-session]").textContent = found.day + " " + found.time;
        root.querySelector("[data-lookup-result-participants]").textContent = String(found.participants);
        root.querySelector("[data-lookup-result-unit-price]").textContent = reservation.formatPrice(found.pricePerParticipant);
        root.querySelector("[data-lookup-result-total]").textContent = reservation.formatPrice(found.totalPrice);
        root.querySelector("[data-lookup-result-status]").textContent = found.status;
        lookupResult.hidden = false;
      } catch (error) {
        lookupFeedback.textContent = errorMessage(error);
        lookupFeedback.hidden = false;
      } finally {
        lookupPending = false;
        lookupCodeInput.disabled = false;
        lookupSubmitButton.disabled = false;
        lookupSubmitButton.textContent = "Look up reservation";
      }
    }

    function startAnotherReservation() {
      if (availabilityRefreshing || availabilityRefreshError) return;
      screen = "form";
      lastBooking = null;
      selection.classId = null;
      selection.sessionId = null;
      selection.participants = 1;
      reductionMessage = "";
      render({ announce: true });
      classList.querySelector('input[name="gym-class"]').focus();
    }

    function handleChange(event) {
      if (screen !== "form" || submissionPending) return;
      const target = event.target;
      if (target.matches('input[name="gym-class"]')) {
        selection.classId = target.value;
        selection.sessionId = null;
        selection.participants = 1;
        reductionMessage = "";
        render({ announce: true });
      } else if (target.matches('input[name="gym-session"]') && !target.disabled) {
        const previousCount = Number(selection.participants);
        const remaining = reservation.getRemaining(currentState, target.value);
        selection.sessionId = target.value;
        reductionMessage = "";
        if (Number.isFinite(previousCount) && previousCount > remaining) {
          selection.participants = remaining;
          reductionMessage = "Participants were reduced from " + previousCount + " to " + remaining + " to fit the places remaining.";
        }
        render({ announce: true });
      }
    }

    function handleInput(event) {
      if (screen !== "form" || submissionPending) return;
      if (!event.target.matches("[data-participant-input]")) return;
      selection.participants = event.target.value === "" ? "" : Number(event.target.value);
      reductionMessage = "";
      render({ preserveParticipantInput: true, announce: true });
    }

    function handleClick(event) {
      const target = event.target;
      if (screen === "confirmation" && target.matches("[data-new-reservation]")) {
        startAnotherReservation();
        return;
      }
      if (screen !== "form" || submissionPending) return;
      if (target.matches("[data-decrease]") && !target.disabled) {
        selection.participants = Math.max(1, Number(selection.participants) - 1);
      } else if (target.matches("[data-increase]") && !target.disabled) {
        const remaining = reservation.getRemaining(currentState, selection.sessionId);
        selection.participants = Math.min(remaining, Number(selection.participants) + 1);
      } else if (target.matches("[data-confirm]") && !target.disabled) {
        submitReservation();
        return;
      } else {
        return;
      }
      reductionMessage = "";
      render({ announce: true });
    }

    data.getClasses(currentState).forEach(function (gymClass, index) {
      classList.appendChild(createClassOption(gymClass, index));
    });
    root.addEventListener("change", handleChange);
    root.addEventListener("input", handleInput);
    root.addEventListener("click", handleClick);
    lookupForm.addEventListener("submit", submitLookup);
    render();

    return {
      getSelection: function () { return Object.assign({}, selection); },
      getState: function () { return currentState; },
      destroy: function () {
        root.removeEventListener("change", handleChange);
        root.removeEventListener("input", handleInput);
        root.removeEventListener("click", handleClick);
        lookupForm.removeEventListener("submit", submitLookup);
        root.textContent = "";
      }
    };
  }

  global.GymUI = Object.freeze({ mount: mount });
})(globalThis);
