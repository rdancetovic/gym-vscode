(function () {
  "use strict";

  const data = GymData;

  describe("Catalogue data", function () {
    it("contains the four required classes", function () {
      assert.deepEqual(data.classes.map(function (item) { return item.name; }), [
        "Yoga", "Pilates", "Functional Training", "Spinning"
      ]);
    });
    it("sets Yoga at €8 per participant", function () { assert.equal(data.getClassById("yoga").price, 8); });
    it("sets Pilates at €10 per participant", function () { assert.equal(data.getClassById("pilates").price, 10); });
    it("sets Functional Training at €12 per participant", function () { assert.equal(data.getClassById("functional-training").price, 12); });
    it("sets Spinning at €11 per participant", function () { assert.equal(data.getClassById("spinning").price, 11); });
    it("contains the three Yoga sessions and their initial places", function () {
      assert.deepEqual(data.getClassById("yoga").sessions.map(function (s) { return [s.day, s.time, s.initialPlaces]; }), [
        ["Monday", "18:00", 10], ["Wednesday", "19:00", 6], ["Saturday", "10:00", 2]
      ]);
    });
    it("contains the three Pilates sessions and their initial places", function () {
      assert.deepEqual(data.getClassById("pilates").sessions.map(function (s) { return [s.day, s.time, s.initialPlaces]; }), [
        ["Tuesday", "18:00", 8], ["Thursday", "19:00", 4], ["Saturday", "11:30", 0]
      ]);
    });
    it("contains the three Functional Training sessions and their initial places", function () {
      assert.deepEqual(data.getClassById("functional-training").sessions.map(function (s) { return [s.day, s.time, s.initialPlaces]; }), [
        ["Monday", "19:30", 5], ["Wednesday", "18:00", 10], ["Friday", "18:30", 3]
      ]);
    });
    it("contains the three Spinning sessions and their initial places", function () {
      assert.deepEqual(data.getClassById("spinning").sessions.map(function (s) { return [s.day, s.time, s.initialPlaces]; }), [
        ["Tuesday", "19:30", 7], ["Thursday", "18:00", 1], ["Sunday", "10:00", 10]
      ]);
    });
    it("defines exactly three sessions for each class", function () {
      assert.isTrue(data.classes.every(function (item) { return item.sessions.length === 3; }));
    });
    it("sets every session capacity to 10", function () { assert.equal(data.capacity, 10); });
    it("freezes the classes array", function () { assert.isTrue(Object.isFrozen(data.classes)); });
    it("freezes each class record", function () {
      assert.isTrue(data.classes.every(function (item) { return Object.isFrozen(item); }));
    });
    it("freezes session arrays and session records", function () {
      assert.isTrue(data.classes.every(function (item) {
        return Object.isFrozen(item.sessions) && item.sessions.every(Object.isFrozen);
      }));
    });
    it("creates availability for all 12 sessions", function () {
      assert.equal(Object.keys(data.createInitialState().availability).length, 12);
    });
    it("starts Yoga Wednesday with 6 places", function () {
      assert.equal(data.createInitialState().availability["yoga-wednesday-1900"], 6);
    });
    it("starts Pilates Saturday with no places", function () {
      assert.equal(data.createInitialState().availability["pilates-saturday-1130"], 0);
    });
    it("starts with no booking records", function () {
      assert.deepEqual(data.createInitialState().bookings, []);
    });
    it("returns independent initial states", function () {
      assert.notSame(data.createInitialState(), data.createInitialState());
      assert.notSame(data.createInitialState().availability, data.createInitialState().availability);
    });
    it("does not let state changes alter the catalogue", function () {
      const state = data.createInitialState();
      state.availability["yoga-wednesday-1900"] = 0;
      assert.equal(data.getClassById("yoga").sessions[1].initialPlaces, 6);
      assert.equal(data.createInitialState().availability["yoga-wednesday-1900"], 6);
    });
    it("finds a session with its owning class", function () {
      const found = data.findSession("spinning-thursday-1800");
      assert.equal(found.classId, "spinning");
      assert.equal(found.session.time, "18:00");
      assert.equal(data.findSession("unknown-session"), null);
    });
  });
})();
