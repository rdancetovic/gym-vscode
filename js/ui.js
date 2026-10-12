(function (global) {
  "use strict";

  const data = global.GymData;
  const reservation = global.GymReservation;

  function mount(root, state) {
    if (!root) throw new Error("A root element is required to mount the reservation UI.");

    const currentState = state || data.createInitialState();
    const selection = { classId: null, sessionId: null, participants: 1 };

    root.innerHTML = [
      '<p class="selection-line" aria-live="polite">',
      '  <span class="selection-label">Your selection</span>',
      '  <span class="selection-value" data-selection-value>No class selected</span>',
      '</p>',
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
      '</div>'
    ].join("");

    const classList = root.querySelector("[data-class-list]");
    const sessionHeading = root.querySelector("[data-session-heading]");
    const sessionContent = root.querySelector("[data-session-content]");
    const selectionValue = root.querySelector("[data-selection-value]");

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
        option.classList.toggle("is-selected", input.value === selection.classId);
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

    function renderSelection() {
      const gymClass = data.getClassById(selection.classId);
      if (!gymClass) {
        selectionValue.textContent = "No class selected";
        return;
      }
      if (!selection.sessionId) {
        selectionValue.textContent = gymClass.name + " · No session selected";
        return;
      }
      const found = data.findSession(selection.sessionId);
      selectionValue.textContent = gymClass.name + " · " + found.session.day + " " + found.session.time;
    }

    function render() {
      updateClassOptions();
      renderSessions();
      renderSelection();
    }

    function handleChange(event) {
      const target = event.target;
      if (target.matches('input[name="gym-class"]')) {
        selection.classId = target.value;
        selection.sessionId = null;
        selection.participants = 1;
        render();
      } else if (target.matches('input[name="gym-session"]') && !target.disabled) {
        selection.sessionId = target.value;
        render();
      }
    }

    data.classes.forEach(function (gymClass, index) {
      classList.appendChild(createClassOption(gymClass, index));
    });
    root.addEventListener("change", handleChange);
    render();

    return {
      getSelection: function () { return Object.assign({}, selection); },
      destroy: function () {
        root.removeEventListener("change", handleChange);
        root.textContent = "";
      }
    };
  }

  global.GymUI = Object.freeze({ mount: mount });
})(globalThis);
