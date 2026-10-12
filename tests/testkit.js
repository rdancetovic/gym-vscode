(function (global) {
  "use strict";

  const tests = [];
  let currentSuite = "";

  function describe(name, register) {
    const previousSuite = currentSuite;
    currentSuite = previousSuite ? previousSuite + " / " + name : name;
    register();
    currentSuite = previousSuite;
  }

  function it(name, run) {
    tests.push({ name: currentSuite + " / " + name, run: run });
  }

  function fail(message) {
    throw new Error(message || "Assertion failed");
  }

  const assert = {
    equal: function (actual, expected, message) {
      if (actual !== expected) {
        fail(message || "Expected " + JSON.stringify(expected) + ", received " + JSON.stringify(actual));
      }
    },
    deepEqual: function (actual, expected, message) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        fail(message || "Expected " + JSON.stringify(expected) + ", received " + JSON.stringify(actual));
      }
    },
    isTrue: function (actual, message) {
      if (actual !== true) fail(message || "Expected true, received " + JSON.stringify(actual));
    },
    isFalse: function (actual, message) {
      if (actual !== false) fail(message || "Expected false, received " + JSON.stringify(actual));
    },
    same: function (actual, expected, message) {
      if (actual !== expected) fail(message || "Expected the same reference");
    },
    notSame: function (actual, expected, message) {
      if (actual === expected) fail(message || "Expected different references");
    },
    includes: function (actual, expected, message) {
      if (!actual.includes(expected)) fail(message || "Expected array to include " + expected);
    },
    excludes: function (actual, expected, message) {
      if (actual.includes(expected)) fail(message || "Expected array not to include " + expected);
    }
  };

  function run() {
    const results = document.getElementById("results");
    const summary = document.getElementById("summary");
    let passed = 0;
    let failed = 0;
    results.textContent = "";

    tests.forEach(function (test) {
      const row = document.createElement("li");
      try {
        test.run();
        passed += 1;
        row.textContent = "PASS  " + test.name;
        row.dataset.result = "pass";
      } catch (error) {
        failed += 1;
        row.textContent = "FAIL  " + test.name + " — " + error.message;
        row.dataset.result = "fail";
      }
      results.appendChild(row);
    });

    summary.textContent = failed === 0
      ? "All " + passed + " tests passed"
      : passed + " passed; " + failed + " failed";
    summary.dataset.failed = String(failed);
    return { passed: passed, failed: failed };
  }

  global.describe = describe;
  global.it = it;
  global.assert = assert;
  global.runTests = run;
})(globalThis);
