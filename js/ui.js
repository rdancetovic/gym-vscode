(function (global) {
  "use strict";

  const data = global.GymData;
  const reservation = global.GymReservation;

  function mount(root, state) {
    if (!root) throw new Error("A root element is required to mount the reservation UI.");

    let currentState = state || data.createInitialState();
    const selection = { classId: null, sessionId: null, participants: 1 };
    let reductionMessage = "";
    let screen = "form";
    let lastBooking = null;

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
      '  </section>',
      '</div>',
      '</div>',
      '<section class="confirmation-screen" data-confirmation hidden></section>',
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
    const liveRegion = root.querySelector("[data-live-region]");

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
      const gymClass = data.getClassById(selection.classId);
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
        input.disabled = isFull;
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
      participantNote.textContent = hasAvailableSession
        ? "Choose between 1 and " + remaining + " participants."
        : "Choose an available session to set the participant count.";
      reductionMessageElement.textContent = reductionMessage;
      reductionMessageElement.hidden = !reductionMessage;
    }

    function renderSummary() {
      const gymClass = data.getClassById(selection.classId);
      const foundSession = selection.sessionId ? data.findSession(selection.sessionId) : null;
      const summaryValues = {
        "[data-summary-class]": gymClass ? gymClass.name : "—",
        "[data-summary-session]": foundSession ? foundSession.session.day + " " + foundSession.session.time : "—",
        "[data-summary-participants]": foundSession ? String(selection.participants) : "—",
        "[data-summary-unit-price]": gymClass ? reservation.formatPrice(gymClass.price) : "—",
        "[data-summary-total]": gymClass && foundSession
          ? reservation.formatPrice(reservation.calcTotal(gymClass.id, selection.participants))
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
      confirmButton.disabled = !isValid;
    }

    function announceStatus() {
      if (screen === "confirmation" && lastBooking) {
        const remaining = reservation.getRemaining(currentState, lastBooking.sessionId);
        const placesMessage = remaining === 0
          ? "This session is now full."
          : remaining + (remaining === 1 ? " place left in this session." : " places left in this session.");
        liveRegion.textContent = "Reservation confirmed. You reserved " + lastBooking.participants +
          (lastBooking.participants === 1 ? " place for " : " places for ") + lastBooking.className + " on " +
          lastBooking.day + " " + lastBooking.time + ". Total " + reservation.formatPrice(lastBooking.total) + ". " + placesMessage;
        return;
      }

      const problems = reservation.validate(selection, currentState);
      if (problems.length > 0) {
        liveRegion.textContent = "Before you can confirm: " + problems.map(function (problem) {
          return problem.message;
        }).join(" ");
        return;
      }

      const total = reservation.calcTotal(selection.classId, selection.participants);
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
      const remaining = reservation.getRemaining(currentState, booking.sessionId);
      const placesMessage = remaining === 0
        ? "This session is now full."
        : remaining + (remaining === 1 ? " place left in this session." : " places left in this session.");

      formContent.hidden = true;
      confirmationContent.hidden = false;
      confirmationContent.innerHTML = [
        '<p class="confirmation-eyebrow">RESERVATION COMPLETE</p>',
        '<h2 class="confirmation-heading" data-confirmation-heading tabindex="-1">Reservation confirmed</h2>',
        '<p class="confirmation-message">You reserved ' + booking.participants + (booking.participants === 1 ? ' place for ' : ' places for ') + booking.className + ' on ' + booking.day + ' ' + booking.time + '.</p>',
        '<dl class="confirmation-summary">',
        '  <div><dt>Class</dt><dd>' + booking.className + '</dd></div>',
        '  <div><dt>Session</dt><dd>' + booking.day + ' ' + booking.time + '</dd></div>',
        '  <div><dt>Participants</dt><dd>' + booking.participants + '</dd></div>',
        '  <div><dt>Price per participant</dt><dd>' + reservation.formatPrice(booking.priceEach) + '</dd></div>',
        '  <div><dt>Total</dt><dd>' + reservation.formatPrice(booking.total) + '</dd></div>',
        '</dl>',
        '<p class="confirmation-availability" data-confirmation-availability>' + placesMessage + '</p>',
        '<p class="no-payment-note">No payment is taken in this app.</p>',
        '<button class="confirm-button" type="button" data-new-reservation>Make another reservation</button>'
      ].join("");
      confirmationContent.querySelector("[data-confirmation-heading]").focus();
      announceStatus();
    }

    function startAnotherReservation() {
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
      if (screen !== "form") return;
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
      if (screen !== "form") return;
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
      if (screen !== "form") return;
      if (target.matches("[data-decrease]") && !target.disabled) {
        selection.participants = Math.max(1, Number(selection.participants) - 1);
      } else if (target.matches("[data-increase]") && !target.disabled) {
        const remaining = reservation.getRemaining(currentState, selection.sessionId);
        selection.participants = Math.min(remaining, Number(selection.participants) + 1);
      } else if (target.matches("[data-confirm]") && !target.disabled) {
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
      } else {
        return;
      }
      reductionMessage = "";
      render({ announce: true });
    }

    data.classes.forEach(function (gymClass, index) {
      classList.appendChild(createClassOption(gymClass, index));
    });
    root.addEventListener("change", handleChange);
    root.addEventListener("input", handleInput);
    root.addEventListener("click", handleClick);
    render();

    return {
      getSelection: function () { return Object.assign({}, selection); },
      getState: function () { return currentState; },
      destroy: function () {
        root.removeEventListener("change", handleChange);
        root.removeEventListener("input", handleInput);
        root.removeEventListener("click", handleClick);
        root.textContent = "";
      }
    };
  }

  global.GymUI = Object.freeze({ mount: mount });
})(globalThis);
