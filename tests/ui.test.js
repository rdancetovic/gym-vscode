(function () {
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

  describe("Class and session selection UI", function () {
    it("shows all four classes and their prices", function () {
      withApp(function (host) {
        assert.equal(host.querySelectorAll(".class-option").length, 4);
        assert.isTrue(host.querySelector('[value="yoga"]').parentElement.textContent.includes("€8"));
        assert.isTrue(host.querySelector('[value="pilates"]').parentElement.textContent.includes("€10"));
        assert.isTrue(host.querySelector('[value="functional-training"]').parentElement.textContent.includes("€12"));
        assert.isTrue(host.querySelector('[value="spinning"]').parentElement.textContent.includes("€11"));
      });
    });
    it("shows the selected class's three sessions", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        assert.equal(host.querySelectorAll(".session-option").length, 3);
      });
    });
    it("shows each Yoga session day and time", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        const sessions = host.querySelector("[data-session-content]").textContent;
        assert.isTrue(sessions.includes("Monday") && sessions.includes("18:00"));
        assert.isTrue(sessions.includes("Wednesday") && sessions.includes("19:00"));
        assert.isTrue(sessions.includes("Saturday") && sessions.includes("10:00"));
      });
    });
    it("shows remaining places with singular and plural labels", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        assert.isTrue(host.querySelector('[value="yoga-wednesday-1900"]').parentElement.textContent.includes("6 places left"));
        chooseClass(host, "spinning");
        assert.isTrue(host.querySelector('[value="spinning-thursday-1800"]').parentElement.textContent.includes("1 place left"));
      });
    });
    it("keeps full sessions visible and disables their radio option", function () {
      withApp(function (host) {
        chooseClass(host, "pilates");
        const fullSession = host.querySelector('[value="pilates-saturday-1130"]');
        assert.isTrue(fullSession.disabled);
        assert.isTrue(fullSession.parentElement.classList.contains("is-full"));
        assert.isTrue(fullSession.parentElement.textContent.includes("Full"));
      });
    });
    it("highlights sessions with two or fewer places", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        assert.isTrue(host.querySelector('[value="yoga-saturday-1000"]').parentElement.classList.contains("is-low-availability"));
        chooseClass(host, "spinning");
        assert.isTrue(host.querySelector('[value="spinning-thursday-1800"]').parentElement.classList.contains("is-low-availability"));
      });
    });
    it("shows a no-places message when every session in a class is full", function () {
      const state = GymData.createInitialState();
      GymData.getClassById("yoga").sessions.forEach(function (session) { state.availability[session.id] = 0; });
      withApp(function (host) {
        chooseClass(host, "yoga");
        assert.isTrue(host.querySelector(".no-places-message").textContent.includes("No places available"));
      }, state);
    });
    it("shows the current class and session in Your selection", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        assert.isTrue(host.querySelector("[data-selection-value]").textContent.includes("Yoga"));
        chooseSession(host, "yoga-wednesday-1900");
        assert.equal(host.querySelector("[data-selection-value]").textContent, "Yoga · Wednesday 19:00");
      });
    });
    it("clears the session and resets participants when the class changes", function () {
      withApp(function (host, app) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        chooseClass(host, "pilates");
        assert.equal(app.getSelection().sessionId, null);
        assert.equal(app.getSelection().participants, 1);
        assert.equal(app.getSelection().classId, "pilates");
      });
    });
    it("uses real radio buttons for keyboard-accessible choices", function () {
      withApp(function (host) {
        assert.equal(host.querySelectorAll('input[type="radio"][name="gym-class"]').length, 4);
        chooseClass(host, "yoga");
        assert.equal(host.querySelectorAll('input[type="radio"][name="gym-session"]').length, 3);
      });
    });
    it("replaces the session list when another class is selected", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        chooseClass(host, "functional-training");
        assert.equal(host.querySelectorAll(".session-option").length, 3);
        assert.equal(host.querySelector('[value="functional-wednesday-1800"]').checked, false);
        assert.equal(host.querySelector('[value="yoga-wednesday-1900"]'), null);
      });
    });
    it("keeps reservation availability in memory without changing it during selection", function () {
      const state = GymData.createInitialState();
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        assert.equal(state.availability["yoga-wednesday-1900"], 6);
        assert.equal(GymData.createInitialState().availability["yoga-wednesday-1900"], 6);
      }, state);
    });
  });
})();
