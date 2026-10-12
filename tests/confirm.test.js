(function () {
  "use strict";

  const helpers = UiTestHelpers;
  const withApp = helpers.withApp;
  const chooseClass = helpers.chooseClass;
  const chooseSession = helpers.chooseSession;
  const setParticipants = helpers.setParticipants;

  function selectYogaWednesday(host, participants) {
    chooseClass(host, "yoga");
    chooseSession(host, "yoga-wednesday-1900");
    if (participants !== undefined) setParticipants(host, participants);
  }

  function confirm(host) {
    host.querySelector("[data-confirm]").click();
  }

  describe("Reservation confirmation", function () {
    it("shows the success message and no-payment notice", function () {
      withApp(function (host) {
        selectYogaWednesday(host, 2);
        confirm(host);
        assert.equal(host.querySelector("[data-confirmation-heading]").textContent, "Reservation confirmed");
        assert.isTrue(host.querySelector(".confirmation-message").textContent.includes("You reserved 2 places for Yoga on Wednesday 19:00."));
        assert.equal(host.querySelector(".no-payment-note").textContent, "No payment is taken in this app.");
      });
    });
    it("replaces the reservation form with the confirmation view", function () {
      withApp(function (host) {
        selectYogaWednesday(host, 2);
        confirm(host);
        assert.isTrue(host.querySelector("[data-reservation-form]").hidden);
        assert.isFalse(host.querySelector("[data-confirmation]").hidden);
        assert.equal(host.querySelector("[data-new-reservation]").textContent, "Make another reservation");
      });
    });
    it("shows all booking details and calculated price", function () {
      withApp(function (host) {
        selectYogaWednesday(host, 2);
        confirm(host);
        const summary = host.querySelector(".confirmation-summary");
        assert.isTrue(summary.textContent.includes("Yoga"));
        assert.isTrue(summary.textContent.includes("Wednesday 19:00"));
        assert.isTrue(summary.textContent.includes("2"));
        assert.isTrue(summary.textContent.includes("€8"));
        assert.isTrue(summary.textContent.includes("€16"));
      });
    });
    it("deducts confirmed places and shows the remaining balance", function () {
      withApp(function (host, app) {
        selectYogaWednesday(host, 2);
        confirm(host);
        assert.equal(app.getState().availability["yoga-wednesday-1900"], 4);
        assert.equal(host.querySelector("[data-confirmation-availability]").textContent, "4 places left in this session.");
      });
    });
    it("starts an empty reservation and keeps the updated availability", function () {
      withApp(function (host, app) {
        selectYogaWednesday(host, 2);
        confirm(host);
        host.querySelector("[data-new-reservation]").click();
        assert.isTrue(host.querySelector("[data-confirmation]").hidden);
        assert.equal(app.getSelection().classId, null);
        assert.equal(app.getSelection().sessionId, null);
        assert.equal(app.getSelection().participants, 1);
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        assert.isTrue(host.querySelector('[value="yoga-wednesday-1900"]').parentElement.textContent.includes("4 places left"));
      });
    });
    it("accumulates bookings and deductions across reservations", function () {
      withApp(function (host, app) {
        selectYogaWednesday(host, 2);
        confirm(host);
        host.querySelector("[data-new-reservation]").click();
        selectYogaWednesday(host, 3);
        confirm(host);
        assert.equal(app.getState().bookings.length, 2);
        assert.equal(app.getState().availability["yoga-wednesday-1900"], 1);
      });
    });
    it("reports when the last place makes a session full", function () {
      withApp(function (host) {
        chooseClass(host, "spinning");
        chooseSession(host, "spinning-thursday-1800");
        confirm(host);
        assert.equal(host.querySelector("[data-confirmation-availability]").textContent, "This session is now full.");
        assert.isTrue(host.querySelector(".confirmation-message").textContent.startsWith("You reserved 1 place for Spinning"));
      });
    });
    it("shows the session as full after starting another reservation", function () {
      withApp(function (host) {
        chooseClass(host, "spinning");
        chooseSession(host, "spinning-thursday-1800");
        confirm(host);
        host.querySelector("[data-new-reservation]").click();
        chooseClass(host, "spinning");
        const fullOption = host.querySelector('[value="spinning-thursday-1800"]');
        assert.isTrue(fullOption.disabled);
        assert.isTrue(fullOption.parentElement.textContent.includes("Full"));
      });
    });
    it("reports a whole class as unavailable after its final session fills", function () {
      const state = GymData.createInitialState();
      state.availability["yoga-monday-1800"] = 0;
      state.availability["yoga-saturday-1000"] = 0;
      state.availability["yoga-wednesday-1900"] = 1;
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        confirm(host);
        host.querySelector("[data-new-reservation]").click();
        assert.isTrue(host.querySelector('[value="yoga"]').parentElement.textContent.includes("No places available"));
        chooseClass(host, "yoga");
        assert.isTrue(host.querySelector(".no-places-message").textContent.includes("No places available"));
      }, state);
    });
    it("does not book twice if the confirmation action is repeated", function () {
      withApp(function (host, app) {
        selectYogaWednesday(host, 2);
        const confirmButton = host.querySelector("[data-confirm]");
        confirmButton.click();
        confirmButton.click();
        assert.equal(app.getState().bookings.length, 1);
        assert.equal(app.getState().availability["yoga-wednesday-1900"], 4);
      });
    });
    it("does not book an invalid reservation through the UI", function () {
      withApp(function (host, app) {
        selectYogaWednesday(host, 7);
        const confirmButton = host.querySelector("[data-confirm]");
        assert.isTrue(confirmButton.disabled);
        confirmButton.click();
        assert.equal(app.getState().bookings.length, 0);
        assert.equal(app.getState().availability["yoga-wednesday-1900"], 6);
      });
    });
    it("rejects invalid direct confirmation through the reservation rule", function () {
      const state = GymData.createInitialState();
      const result = GymReservation.confirm({
        classId: "yoga", sessionId: "yoga-wednesday-1900", participants: 7
      }, state);
      assert.isFalse(result.ok);
      assert.equal(result.state.availability["yoga-wednesday-1900"], 6);
      assert.equal(result.state.bookings.length, 0);
    });
    it("restores initial availability in a fresh application state", function () {
      const state = GymData.createInitialState();
      withApp(function (host) {
        selectYogaWednesday(host, 2);
        confirm(host);
        assert.equal(host.querySelector("[data-confirmation-availability]").textContent, "4 places left in this session.");
      }, state);
      assert.equal(GymData.createInitialState().availability["yoga-wednesday-1900"], 6);
    });
    it("moves keyboard focus to the confirmation heading", function () {
      withApp(function (host) {
        selectYogaWednesday(host, 2);
        confirm(host);
        assert.same(document.activeElement, host.querySelector("[data-confirmation-heading]"));
      });
    });
    it("returns keyboard focus to the first class after starting another reservation", function () {
      withApp(function (host) {
        selectYogaWednesday(host, 2);
        confirm(host);
        host.querySelector("[data-new-reservation]").click();
        assert.same(document.activeElement, host.querySelector('input[name="gym-class"][value="yoga"]'));
      });
    });
    it("collects no personal or payment fields", function () {
      withApp(function (host) {
        assert.equal(host.querySelectorAll("form").length, 0);
        assert.equal(host.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="password"]').length, 0);
        assert.equal(host.querySelectorAll('input[type="radio"]').length, 4);
        assert.equal(host.querySelectorAll('input[type="number"]').length, 1);
      });
    });
  });
})();
