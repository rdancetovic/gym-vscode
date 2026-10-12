(function () {
  "use strict";

  const helpers = UiTestHelpers;
  const withApp = helpers.withApp;
  const chooseClass = helpers.chooseClass;
  const chooseSession = helpers.chooseSession;
  const setParticipants = helpers.setParticipants;

  function confirmationMessage(host, participants) {
    chooseClass(host, "yoga");
    chooseSession(host, "yoga-wednesday-1900");
    if (participants !== undefined) setParticipants(host, participants);
    host.querySelector("[data-confirm]").click();
  }

  function containsReducedMotionRule() {
    function find(rules) {
      return Array.from(rules).some(function (rule) {
        if (rule.conditionText && rule.conditionText.includes("prefers-reduced-motion: reduce")) return true;
        return rule.cssRules ? find(rule.cssRules) : false;
      });
    }
    return Array.from(document.styleSheets).some(function (sheet) {
      try {
        return find(sheet.cssRules);
      } catch (error) {
        return false;
      }
    });
  }

  function contrastRatio(foreground, background) {
    function luminance(color) {
      const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(function (value) {
        const normalized = value / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    }
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);
    return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
      (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
  }

  describe("Accessibility and polish", function () {
    it("has one persistent live region", function () {
      withApp(function (host) { assert.equal(host.querySelectorAll("[data-live-region]").length, 1); });
    });
    it("configures the live region as polite and atomic", function () {
      withApp(function (host) {
        const liveRegion = host.querySelector("[data-live-region]");
        assert.equal(liveRegion.getAttribute("aria-live"), "polite");
        assert.equal(liveRegion.getAttribute("aria-atomic"), "true");
      });
    });
    it("does not announce anything on initial render", function () {
      withApp(function (host) { assert.equal(host.querySelector("[data-live-region]").textContent, ""); });
    });
    it("links Confirm to visible reasons without rebuilding a live status region", function () {
      withApp(function (host) {
        assert.equal(host.querySelector("[data-confirm]").getAttribute("aria-describedby"), "reservation-status");
        assert.equal(host.querySelector("[data-reservation-status]").id, "reservation-status");
        assert.equal(host.querySelector("[data-reservation-status]").getAttribute("role"), null);
      });
    });
    it("announces missing reservation information after a class is chosen", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        assert.equal(host.querySelector("[data-live-region]").textContent, "Before you can confirm: Choose a session.");
      });
    });
    it("announces readiness and total after a valid session is chosen", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-wednesday-1900");
        assert.equal(host.querySelector("[data-live-region]").textContent, "Ready to confirm. Total €8.");
      });
    });
    it("announces a changed total after the participant count changes", function () {
      withApp(function (host) {
        chooseClass(host, "functional-training");
        chooseSession(host, "functional-wednesday-1800");
        setParticipants(host, 3);
        assert.equal(host.querySelector("[data-live-region]").textContent, "Ready to confirm. Total €36.");
      });
    });
    it("announces validation problems for an invalid participant count", function () {
      withApp(function (host) {
        chooseClass(host, "pilates");
        chooseSession(host, "pilates-thursday-1900");
        setParticipants(host, 5);
        assert.isTrue(host.querySelector("[data-live-region]").textContent.includes("Only 4 places remaining."));
      });
    });
    it("announces automatic participant reductions and the new total", function () {
      withApp(function (host) {
        chooseClass(host, "yoga");
        chooseSession(host, "yoga-monday-1800");
        setParticipants(host, 8);
        chooseSession(host, "yoga-wednesday-1900");
        const announcement = host.querySelector("[data-live-region]").textContent;
        assert.isTrue(announcement.includes("reduced from 8 to 6"));
        assert.isTrue(announcement.includes("Ready to confirm. Total €48."));
      });
    });
    it("announces confirmation details and remaining availability", function () {
      withApp(function (host) {
        confirmationMessage(host, 2);
        const announcement = host.querySelector("[data-live-region]").textContent;
        assert.isTrue(announcement.includes("Reservation confirmed."));
        assert.isTrue(announcement.includes("2 places for Yoga on Wednesday 19:00"));
        assert.isTrue(announcement.includes("Total €16"));
        assert.isTrue(announcement.includes("4 places left in this session"));
      });
    });
    it("moves focus to the confirmation heading", function () {
      withApp(function (host) {
        confirmationMessage(host, 2);
        assert.same(document.activeElement, host.querySelector("[data-confirmation-heading]"));
      });
    });
    it("announces the reset and returns focus to the first class", function () {
      withApp(function (host) {
        confirmationMessage(host, 2);
        host.querySelector("[data-new-reservation]").click();
        assert.isTrue(host.querySelector("[data-live-region]").textContent.includes("Before you can confirm: Choose a class."));
        assert.same(document.activeElement, host.querySelector('input[name="gym-class"][value="yoga"]'));
      });
    });
    it("respects the reduced-motion system setting", function () {
      assert.isTrue(containsReducedMotionRule());
      withApp(function (host) {
        chooseClass(host, "pilates");
        const fullSession = host.querySelector('[value="pilates-saturday-1130"]');
        const sessionSurface = fullSession.parentElement.querySelector(".session-surface");
        const sessionTitle = fullSession.parentElement.querySelector(".session-title");
        const titleContrast = contrastRatio(getComputedStyle(sessionTitle).color, getComputedStyle(sessionSurface).backgroundColor);
        const fullStatus = fullSession.parentElement.querySelector(".session-status");
        const fullStatusContrast = contrastRatio(getComputedStyle(fullStatus).color, getComputedStyle(fullStatus).backgroundColor);
        const confirmButton = host.querySelector("[data-confirm]");
        const buttonContrast = contrastRatio(getComputedStyle(confirmButton).color, getComputedStyle(confirmButton).backgroundColor);
        assert.isTrue(titleContrast >= 4.5, "Full-session text contrast was " + titleContrast.toFixed(2));
        assert.isTrue(fullStatusContrast >= 4.5, "Full-status badge contrast was " + fullStatusContrast.toFixed(2));
        assert.isTrue(buttonContrast >= 4.5, "Disabled Confirm text contrast was " + buttonContrast.toFixed(2));
      });
    });
  });
})();
