(function () {
  "use strict";

  const rules = GymReservation;
  const data = GymData;
  const freshState = function () { return data.createInitialState(); };
  const yogaWednesday = "yoga-wednesday-1900";
  const spinningThursday = "spinning-thursday-1800";
  const draft = function (overrides) {
    return Object.assign({ classId: "yoga", sessionId: yogaWednesday, participants: 2 }, overrides || {});
  };
  const codes = function (errors) { return errors.map(function (error) { return error.code; }); };

  describe("Reservation rules", function () {
    it("reads the initial remaining places", function () {
      assert.equal(rules.getRemaining(freshState(), yogaWednesday), 6);
    });
    it("reads updated availability from state", function () {
      const state = freshState();
      state.availability[yogaWednesday] = 3;
      assert.equal(rules.getRemaining(state, yogaWednesday), 3);
    });
    it("returns null for an unknown session", function () {
      assert.equal(rules.getRemaining(freshState(), "unknown-session"), null);
    });
    it("recognizes a session with no places as full", function () {
      assert.isTrue(rules.isFull(freshState(), "pilates-saturday-1130"));
    });
    it("recognizes a session with places as not full", function () {
      assert.isFalse(rules.isFull(freshState(), yogaWednesday));
    });
    it("recognizes a class that still has an available session", function () {
      assert.isFalse(rules.isClassFull(freshState(), "yoga"));
    });
    it("recognizes a class after all its sessions fill", function () {
      const state = freshState();
      data.getClassById("yoga").sessions.forEach(function (session) {
        state.availability[session.id] = 0;
      });
      assert.isTrue(rules.isClassFull(state, "yoga"));
    });
    it("calculates totals using each class price", function () {
      assert.equal(rules.calcTotal("yoga", 2), 16);
      assert.equal(rules.calcTotal("functional-training", 3), 36);
      assert.equal(rules.calcTotal("spinning", 1), 11);
    });
    it("formats a whole-euro total", function () { assert.equal(rules.formatPrice(36), "€36"); });
    it("reports a missing class", function () {
      assert.includes(codes(rules.validate(draft({ classId: "" }), freshState())), "NO_CLASS");
    });
    it("reports a missing session", function () {
      assert.includes(codes(rules.validate(draft({ sessionId: "" }), freshState())), "NO_SESSION");
    });
    it("reports an unknown class", function () {
      assert.includes(codes(rules.validate(draft({ classId: "boxing" }), freshState())), "UNKNOWN_CLASS");
    });
    it("reports an unknown session", function () {
      assert.includes(codes(rules.validate(draft({ sessionId: "unknown-session" }), freshState())), "UNKNOWN_SESSION");
    });
    it("reports a session that belongs to another class", function () {
      assert.includes(codes(rules.validate(draft({ sessionId: spinningThursday }), freshState())), "SESSION_CLASS_MISMATCH");
    });
    it("rejects a full session", function () {
      assert.includes(codes(rules.validate({ classId: "pilates", sessionId: "pilates-saturday-1130", participants: 1 }, freshState())), "SESSION_FULL");
    });
    it("rejects fewer than one participant", function () {
      assert.includes(codes(rules.validate(draft({ participants: 0 }), freshState())), "PARTICIPANTS_BELOW_MINIMUM");
    });
    it("rejects fractional participant counts", function () {
      assert.includes(codes(rules.validate(draft({ participants: 1.5 }), freshState())), "PARTICIPANTS_NOT_WHOLE_NUMBER");
    });
    it("rejects a missing participant count", function () {
      assert.includes(codes(rules.validate(draft({ participants: undefined }), freshState())), "PARTICIPANTS_NOT_WHOLE_NUMBER");
    });
    it("rejects a booking larger than remaining availability", function () {
      assert.includes(codes(rules.validate(draft({ participants: 7 }), freshState())), "PARTICIPANTS_EXCEED_REMAINING");
    });
    it("accepts a reservation at exact session capacity", function () {
      assert.deepEqual(rules.validate(draft({ participants: 6 }), freshState()), []);
    });
    it("accepts one participant for Spinning Thursday", function () {
      assert.deepEqual(rules.validate({ classId: "spinning", sessionId: spinningThursday, participants: 1 }, freshState()), []);
    });
    it("returns no problems for a valid reservation", function () {
      assert.deepEqual(rules.validate(draft(), freshState()), []);
    });
    it("deducts confirmed places and returns a successful booking", function () {
      const state = freshState();
      const result = rules.confirm(draft(), state);
      assert.isTrue(result.ok);
      assert.equal(result.state.availability[yogaWednesday], 4);
      assert.equal(result.booking.participants, 2);
    });
    it("returns a new state without changing the previous state", function () {
      const state = freshState();
      const result = rules.confirm(draft(), state);
      assert.notSame(result.state, state);
      assert.notSame(result.state.availability, state.availability);
      assert.equal(state.availability[yogaWednesday], 6);
    });
    it("records the full booking summary", function () {
      const result = rules.confirm(draft(), freshState());
      assert.deepEqual(result.booking, {
        classId: "yoga", className: "Yoga", sessionId: yogaWednesday,
        day: "Wednesday", time: "19:00", participants: 2, priceEach: 8, total: 16
      });
    });
    it("does not book an invalid reservation", function () {
      const state = freshState();
      const result = rules.confirm(draft({ participants: 7 }), state);
      assert.isFalse(result.ok);
      assert.same(result.state, state);
      assert.equal(result.state.availability[yogaWednesday], 6);
      assert.equal(result.booking, null);
    });
    it("allows successive bookings only until the session is full", function () {
      let state = freshState();
      state = rules.confirm(draft({ participants: 2 }), state).state;
      state = rules.confirm(draft({ participants: 2 }), state).state;
      const lastBooking = rules.confirm(draft({ participants: 2 }), state);
      assert.isTrue(lastBooking.ok);
      assert.equal(lastBooking.state.availability[yogaWednesday], 0);
      const rejected = rules.confirm(draft({ participants: 1 }), lastBooking.state);
      assert.isFalse(rejected.ok);
      assert.includes(codes(rejected.errors), "SESSION_FULL");
    });
    it("returns every applicable validation problem", function () {
      const errors = rules.validate({ classId: "", sessionId: "", participants: 0 }, freshState());
      assert.includes(codes(errors), "NO_CLASS");
      assert.includes(codes(errors), "NO_SESSION");
      assert.includes(codes(errors), "PARTICIPANTS_BELOW_MINIMUM");
    });
    it("restoring a fresh state restores initial availability", function () {
      const changedState = rules.confirm(draft(), freshState()).state;
      assert.equal(changedState.availability[yogaWednesday], 4);
      assert.equal(freshState().availability[yogaWednesday], 6);
    });
  });
})();
