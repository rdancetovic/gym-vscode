(function (global) {
  "use strict";

  const classes = [
    {
      id: "yoga",
      name: "Yoga",
      price: 8,
      sessions: [
        { id: "yoga-monday-1800", day: "Monday", time: "18:00", initialPlaces: 10 },
        { id: "yoga-wednesday-1900", day: "Wednesday", time: "19:00", initialPlaces: 6 },
        { id: "yoga-saturday-1000", day: "Saturday", time: "10:00", initialPlaces: 2 }
      ]
    },
    {
      id: "pilates",
      name: "Pilates",
      price: 10,
      sessions: [
        { id: "pilates-tuesday-1800", day: "Tuesday", time: "18:00", initialPlaces: 8 },
        { id: "pilates-thursday-1900", day: "Thursday", time: "19:00", initialPlaces: 4 },
        { id: "pilates-saturday-1130", day: "Saturday", time: "11:30", initialPlaces: 0 }
      ]
    },
    {
      id: "functional-training",
      name: "Functional Training",
      price: 12,
      sessions: [
        { id: "functional-monday-1930", day: "Monday", time: "19:30", initialPlaces: 5 },
        { id: "functional-wednesday-1800", day: "Wednesday", time: "18:00", initialPlaces: 10 },
        { id: "functional-friday-1830", day: "Friday", time: "18:30", initialPlaces: 3 }
      ]
    },
    {
      id: "spinning",
      name: "Spinning",
      price: 11,
      sessions: [
        { id: "spinning-tuesday-1930", day: "Tuesday", time: "19:30", initialPlaces: 7 },
        { id: "spinning-thursday-1800", day: "Thursday", time: "18:00", initialPlaces: 1 },
        { id: "spinning-sunday-1000", day: "Sunday", time: "10:00", initialPlaces: 10 }
      ]
    }
  ];

  function freezeRecursively(value) {
    Object.keys(value).forEach(function (key) {
      const child = value[key];
      if (child && typeof child === "object" && !Object.isFrozen(child)) {
        freezeRecursively(child);
      }
    });
    return Object.freeze(value);
  }

  function getClassById(classId) {
    return classes.find(function (gymClass) {
      return gymClass.id === classId;
    }) || null;
  }

  function findSession(sessionId) {
    for (const gymClass of classes) {
      const session = gymClass.sessions.find(function (item) {
        return item.id === sessionId;
      });
      if (session) {
        return { classId: gymClass.id, className: gymClass.name, session: session };
      }
    }
    return null;
  }

  function createInitialState() {
    const availability = {};
    classes.forEach(function (gymClass) {
      gymClass.sessions.forEach(function (session) {
        availability[session.id] = session.initialPlaces;
      });
    });
    return { availability: availability, bookings: [] };
  }

  freezeRecursively(classes);
  global.GymData = Object.freeze({
    capacity: 10,
    classes: classes,
    getClassById: getClassById,
    findSession: findSession,
    createInitialState: createInitialState
  });
})(globalThis);
