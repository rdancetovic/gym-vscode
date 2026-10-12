(function (global) {
  "use strict";

  const sandbox = document.getElementById("sandbox");

  function withApp(run, state) {
    const host = document.createElement("div");
    sandbox.appendChild(host);
    const app = GymUI.mount(host, state || GymData.createInitialState());
    try {
      run(host, app);
    } finally {
      app.destroy();
      host.remove();
    }
  }

  function chooseClass(host, classId) {
    const input = host.querySelector('input[name="gym-class"][value="' + classId + '"]');
    input.click();
    return input;
  }

  function chooseSession(host, sessionId) {
    const input = host.querySelector('input[name="gym-session"][value="' + sessionId + '"]');
    input.click();
    return input;
  }

  function setParticipants(host, value) {
    const input = host.querySelector("[data-participant-input]");
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return input;
  }

  global.UiTestHelpers = Object.freeze({
    withApp: withApp,
    chooseClass: chooseClass,
    chooseSession: chooseSession,
    setParticipants: setParticipants
  });
})(globalThis);
