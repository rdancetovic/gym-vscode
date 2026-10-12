(function () {
  "use strict";

  const helpers = UiTestHelpers;
  const withApp = helpers.withApp;
  const chooseClass = helpers.chooseClass;
  const chooseSession = helpers.chooseSession;
  const setParticipants = helpers.setParticipants;

  describe("Participants and live reservation summary", function () {
    it("disables participant controls until an available session is selected", function () {
      withApp(function (host) {
        assert.isTrue(host.querySelector("[data-participant-input]").disabled);
        assert.isTrue(host.querySelector("[data-increase]").disabled);
        assert.isTrue(host.querySelector("[data-decrease]").disabled);
      });
    });
    it("enables participant controls at one after selecting a session", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        assert.equal(host.querySelector("[data-participant-input]").value, "1");
        assert.isFalse(host.querySelector("[data-participant-input]").disabled);
        assert.isFalse(host.querySelector("[data-increase]").disabled);
      });
    });
    it("increases participants and refreshes the summary", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        host.querySelector("[data-increase]").click();
        assert.equal(host.querySelector("[data-participant-input]").value, "2");
        assert.equal(host.querySelector("[data-summary-participants]").textContent, "2");
      });
    });
    it("decreases participants", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        host.querySelector("[data-increase]").click();
        host.querySelector("[data-decrease]").click();
        assert.equal(host.querySelector("[data-participant-input]").value, "1");
      });
    });
    it("does not allow the decrement control below one", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        assert.isTrue(host.querySelector("[data-decrease]").disabled);
        host.querySelector("[data-decrease]").click();
        assert.equal(host.querySelector("[data-participant-input]").value, "1");
      });
    });
    it("caps the increment control at remaining availability", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-saturday-1000");
        host.querySelector("[data-increase]").click();
        assert.equal(host.querySelector("[data-participant-input]").value, "2");
        assert.isTrue(host.querySelector("[data-increase]").disabled);
      });
    });
    it("allows direct entry and displays the typed participant count", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        setParticipants(host, 4);
        assert.equal(host.querySelector("[data-participant-input]").value, "4");
        assert.equal(host.querySelector("[data-summary-participants]").textContent, "4");
      });
    });
    it("rejects zero participants with an explanatory message", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        setParticipants(host, 0);
        assert.isTrue(host.querySelector("[data-status-problems]").textContent.includes("at least 1 participant"));
        assert.isTrue(host.querySelector("[data-confirm]").disabled);
      });
    });
    it("rejects negative participant counts", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        setParticipants(host, -2);
        assert.isTrue(host.querySelector("[data-status-problems]").textContent.includes("at least 1 participant"));
        assert.isTrue(host.querySelector("[data-confirm]").disabled);
      });
    });
    it("rejects fractional participant counts", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        setParticipants(host, 1.5);
        assert.isTrue(host.querySelector("[data-status-problems]").textContent.includes("whole number"));
        assert.isTrue(host.querySelector("[data-confirm]").disabled);
      });
    });
    it("rejects participant counts above remaining places", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        setParticipants(host, 7);
        assert.isTrue(host.querySelector("[data-confirm]").disabled);
      });
    });
    it("shows the remaining-place validation message", function () {
      withApp(function (host) {
        chooseClass(host, "pilates");
        chooseSession(host, "pilates-thursday-1900");
        setParticipants(host, 5);
        assert.isTrue(host.querySelector("[data-status-problems]").textContent.includes("Only 4 places remaining"));
        assert.isTrue(host.querySelector("[data-confirm]").disabled);
      });
    });
    it("shows the selected class and session in the reservation summary", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        assert.equal(host.querySelector("[data-summary-class]").textContent, "Yoga");
        assert.equal(host.querySelector("[data-summary-session]").textContent, "Wednesday 19:00");
      });
    });
    it("shows participants and unit price in the summary", function () {
      withApp(function (host) {
        chooseClass(host, "functional-training");
        chooseSession(host, "functional-wednesday-1800");
        assert.equal(host.querySelector("[data-summary-participants]").textContent, "1");
        assert.equal(host.querySelector("[data-summary-unit-price]").textContent, "€12");
      });
    });
    it("calculates the total from participant count and class price", function () {
      withApp(function (host) {
        chooseClass(host, "functional-training");
        chooseSession(host, "functional-wednesday-1800");
        setParticipants(host, 3);
        assert.equal(host.querySelector("[data-summary-total]").textContent, "€36");
      });
    });
    it("updates the total live when the participant count changes", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        setParticipants(host, 4);
        assert.equal(host.querySelector("[data-summary-total]").textContent, "€32");
      });
    });
    it("confirms a valid reservation and updates availability", function () {
      const state = GymData.createInitialState();
      withApp(function (host, app) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        assert.isTrue(host.querySelector("[data-reservation-status]").classList.contains("is-valid"));
        assert.equal(host.querySelector("[data-status-heading]").textContent, "Ready to confirm");
        host.querySelector("[data-confirm]").click();
        assert.isFalse(host.querySelector("[data-confirmation]").hidden);
        assert.equal(app.getState().availability["yoga-wednesday-1900"], 5);
        assert.equal(state.availability["yoga-wednesday-1900"], 6);
      }, state);
    });
    it("lists missing selection problems and disables confirmation", function () {
      withApp(function (host) {
        const problems = host.querySelector("[data-status-problems]").textContent;
        assert.isTrue(problems.includes("Choose a class"));
        assert.isTrue(problems.includes("Choose a session"));
        assert.isTrue(host.querySelector("[data-confirm]").disabled);
      });
    });
    it("reduces participants when changing to a session with fewer places", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-monday-1800");
        setParticipants(host, 8);
        chooseSession(host, "yoga-wednesday-1900");
        assert.equal(host.querySelector("[data-participant-input]").value, "6");
        assert.isTrue(host.querySelector("[data-reduction-message]").textContent.includes("reduced from 8 to 6"));
      });
    });
    it("keeps the participant count when changing to a session with more places", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        setParticipants(host, 3);
        chooseSession(host, "yoga-monday-1800");
        assert.equal(host.querySelector("[data-participant-input]").value, "3");
        assert.isTrue(host.querySelector("[data-reduction-message]").hidden);
      });
    });
    it("resets participant count and summary session when changing classes", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        setParticipants(host, 4);
        chooseClass(host, "pilates");
        assert.equal(host.querySelector("[data-participant-input]").value, "1");
        assert.equal(host.querySelector("[data-summary-session]").textContent, "—");
      });
    });
  });
})();
