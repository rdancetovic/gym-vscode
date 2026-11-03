(function () {
  "use strict";

  function apiCatalogue() {
    return GymData.classes.map(function (gymClass) {
      return {
        name: gymClass.name,
        pricePerParticipant: gymClass.price,
        sessions: gymClass.sessions.map(function (session) {
          return {
            sessionId: session.id.toUpperCase(),
            day: session.day,
            time: session.time,
            capacity: 10,
            remainingPlaces: session.initialPlaces
          };
        })
      };
    });
  }

  function reservationResponse(sessionId) {
    return {
      code: "GYM-004217",
      className: "Yoga",
      sessionId: sessionId,
      day: "Wednesday",
      time: "19:00",
      participants: 2,
      pricePerParticipant: 13,
      totalPrice: 26,
      status: "Confirmed",
      extraField: "permitted"
    };
  }

  async function waitForUi() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await Promise.resolve();
    }
  }

  async function withHost(run) {
    const host = document.createElement("div");
    document.getElementById("sandbox").appendChild(host);
    try {
      await run(host);
    } finally {
      host.textContent = "";
      host.remove();
    }
  }

  describe("Live API integration", function () {
    it("loads and displays classes, prices, sessions, and availability from GET /classes", async function () {
      const classes = apiCatalogue();
      await withHost(async function (host) {
        const handle = await GymApp.start(host, {
          getClasses: async function () { return classes; },
          createReservation: async function () { throw new Error("POST should not run during startup."); }
        });
        try {
          assert.equal(host.querySelectorAll(".class-option").length, 4);
          assert.isTrue(host.textContent.includes("€8 / participant"));
          assert.isTrue(host.textContent.includes("€10 / participant"));
          assert.isTrue(host.textContent.includes("€12 / participant"));
          assert.isTrue(host.textContent.includes("€11 / participant"));
          const yoga = host.querySelector('[data-class-list] input[value="yoga"]');
          yoga.click();
          assert.isTrue(host.querySelector("[data-session-content]").textContent.includes("Wednesday"));
          assert.isTrue(host.querySelector("[data-session-content]").textContent.includes("19:00"));
          assert.isFalse(host.querySelector("[data-session-content]").textContent.includes("YOGA-WEDNESDAY-1900"));
          host.querySelector('[data-class-list] input[value="pilates"]').click();
          assert.isTrue(host.querySelector('[value="PILATES-SATURDAY-1130"]').disabled);
        } finally {
          handle.destroy();
        }
      });
    });

    it("submits only after explicit confirmation and renders server details with refreshed availability", async function () {
      const classes = apiCatalogue();
      const sessionId = "YOGA-WEDNESDAY-1900";
      classes[0].pricePerParticipant = 13;
      classes[0].sessions[1].sessionId = sessionId;
      classes[0].sessions[1].remainingPlaces = 3;
      let requests = 0;
      let submittedBody = null;
      await withHost(async function (host) {
        const handle = await GymApp.start(host, {
          getClasses: async function () {
            requests += 1;
            if (requests === 1) return classes;
            const refreshed = apiCatalogue();
            refreshed[0].sessions[1].sessionId = sessionId;
            refreshed[0].sessions[1].remainingPlaces = 1;
            return refreshed;
          },
          createReservation: async function (requestBody) {
            submittedBody = requestBody;
            return reservationResponse(sessionId);
          }
        });
        try {
          assert.equal(submittedBody, null, "reservation is not submitted before confirmation");
          host.querySelector('[data-class-list] input[value="yoga"]').click();
          host.querySelector('[data-session-content] input[value="' + sessionId + '"]').click();
          host.querySelector("[data-participant-input]").value = "4";
          host.querySelector("[data-participant-input]").dispatchEvent(new Event("input", { bubbles: true }));
          assert.isTrue(host.querySelector("[data-confirm]").disabled,
            "selection larger than live remaining places cannot be confirmed");
          host.querySelector("[data-participant-input]").value = "2";
          host.querySelector("[data-participant-input]").dispatchEvent(new Event("input", { bubbles: true }));
          assert.equal(host.querySelector("[data-summary-unit-price]").textContent, "€13");
          assert.equal(host.querySelector("[data-summary-total]").textContent, "€26");
          assert.isFalse(host.querySelector("[data-confirm]").disabled);
          host.querySelector("[data-confirm]").click();
          await waitForUi();

          assert.deepEqual(submittedBody, { sessionId: sessionId, participants: 2 });
          assert.equal(host.querySelector("[data-confirmation-code]").textContent, "GYM-004217");
          assert.equal(host.querySelector("[data-confirmation-class]").textContent, "Yoga");
          assert.equal(host.querySelector("[data-confirmation-status]").textContent, "Confirmed");
          assert.equal(host.querySelector("[data-confirmation-unit-price]").textContent, "€13");
          assert.equal(host.querySelector("[data-confirmation-total]").textContent, "€26");
          assert.isTrue(host.querySelector("[data-confirmation]").textContent.includes("Wednesday 19:00"));
          assert.equal(requests, 2, "availability is reloaded after successful submission");
          host.querySelector("[data-new-reservation]").click();
          host.querySelector('[data-class-list] input[value="yoga"]').click();
          assert.isTrue(host.querySelector('[data-session-content] input[value="' + sessionId + '"]').parentElement.textContent.includes("1 place left"));
        } finally {
          handle.destroy();
        }
      });
    });

    it("keeps the form open and shows the API message when reservation submission fails", async function () {
      const classes = apiCatalogue();
      await withHost(async function (host) {
        const handle = await GymApp.start(host, {
          getClasses: async function () { return classes; },
          createReservation: async function () {
            const error = new Error("not enough places available");
            error.status = 409;
            throw error;
          }
        });
        try {
          host.querySelector('[data-class-list] input[value="yoga"]').click();
          host.querySelector('[data-session-content] input[value="YOGA-WEDNESDAY-1900"]').click();
          host.querySelector("[data-confirm]").click();
          await waitForUi();
          assert.isFalse(host.querySelector("[data-reservation-form]").hidden);
          assert.isTrue(host.querySelector("[data-confirmation]").hidden);
          assert.isTrue(host.querySelector("[data-api-feedback]").textContent.includes("HTTP 409"));
          assert.isTrue(host.querySelector("[data-api-feedback]").textContent.includes("not enough places available"));
        } finally {
          handle.destroy();
        }
      });
    });

    it("does not display hard-coded availability when catalogue loading fails and supports retry", async function () {
      const classes = apiCatalogue();
      let requests = 0;
      await withHost(async function (host) {
        await GymApp.start(host, {
          getClasses: async function () {
            requests += 1;
            if (requests === 1) throw new GymApi.ApiError(503, "catalogue unavailable");
            return classes;
          },
          createReservation: async function () { throw new Error("not expected"); }
        });
        assert.equal(host.querySelectorAll(".class-option").length, 0);
        assert.isTrue(host.textContent.includes("HTTP 503"));
        assert.isTrue(host.textContent.includes("catalogue unavailable"));
        host.querySelector("[data-retry-classes]").click();
        await waitForUi();
        assert.equal(host.querySelectorAll(".class-option").length, 4);
        assert.equal(requests, 2);
      });
    });

    it("does not mount the form when the catalogue response is malformed", async function () {
      await withHost(async function (host) {
        await GymApp.start(host, {
          getClasses: async function () { return [{ name: "Yoga", sessions: [] }]; },
          createReservation: async function () { throw new Error("not expected"); }
        });
        assert.equal(host.querySelectorAll(".class-option").length, 0);
        assert.isTrue(host.textContent.includes("Classes could not be loaded"));
        assert.isTrue(host.textContent.includes("invalid class"));
      });
    });

    it("uses the documented relative API paths and POST body", async function () {
      const originalFetch = globalThis.fetch;
      const calls = [];
      globalThis.fetch = async function (path, options) {
        calls.push({ path: path, options: options });
        return {
          ok: true,
          status: 200,
          json: async function () {
            return reservationResponse("YOGA-2");
          }
        };
      };
      try {
        await GymApi.getClasses();
        await GymApi.createReservation({ sessionId: "YOGA-2", participants: 2 });
        assert.equal(calls[0].path, "/classes");
        assert.equal(calls[0].options.method, "GET");
        assert.equal(calls[1].path, "/reservations");
        assert.equal(calls[1].options.method, "POST");
        assert.deepEqual(JSON.parse(calls[1].options.body), { sessionId: "YOGA-2", participants: 2 });
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("preserves HTTP status and readable API error messages", async function () {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async function () {
        return {
          ok: false,
          status: 409,
          json: async function () { return { message: "not enough places available" }; }
        };
      };
      try {
        let capturedError = null;
        try {
          await GymApi.createReservation({ sessionId: "YOGA-2", participants: 2 });
        } catch (error) {
          capturedError = error;
        }
        assert.equal(capturedError.status, 409);
        assert.equal(capturedError.message, "not enough places available");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("looks up a reservation at the documented code path", async function () {
      const originalFetch = globalThis.fetch;
      const calls = [];
      globalThis.fetch = async function (path, options) {
        calls.push({ path: path, options: options });
        return {
          ok: true,
          status: 200,
          json: async function () { return reservationResponse("YOGA-2"); }
        };
      };
      try {
        await GymApi.getReservation("GYM-004217");
        assert.equal(calls[0].path, "/reservations/GYM-004217");
        assert.equal(calls[0].options.method, "GET");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("accepts Cancelled status from reservation lookup", async function () {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async function () {
        return {
          ok: true,
          status: 200,
          json: async function () {
            const cancelled = reservationResponse("YOGA-2");
            cancelled.status = "Cancelled";
            return cancelled;
          }
        };
      };
      try {
        const found = await GymApi.getReservation("GYM-004217");
        assert.equal(found.status, "Cancelled");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("sends cancellation to the documented code path and requires Cancelled status", async function () {
      const originalFetch = globalThis.fetch;
      const calls = [];
      globalThis.fetch = async function (path, options) {
        calls.push({ path: path, options: options });
        return {
          ok: true,
          status: 200,
          json: async function () {
            const cancelled = reservationResponse("YOGA-2");
            cancelled.status = "Cancelled";
            return cancelled;
          }
        };
      };
      try {
        const cancelled = await GymApi.cancelReservation("GYM-004217");
        assert.equal(calls[0].path, "/reservations/GYM-004217");
        assert.equal(calls[0].options.method, "DELETE");
        assert.equal(cancelled.status, "Cancelled");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("looks up and displays every field for a confirmed reservation", async function () {
      const found = Object.assign(reservationResponse("YOGA-2"), {
        pricePerParticipant: 8,
        totalPrice: 16
      });
      await withHost(async function (host) {
        const handle = await GymApp.start(host, {
          getClasses: async function () { return apiCatalogue(); },
          createReservation: async function () { throw new Error("not expected"); },
          getReservation: async function (code) {
            assert.equal(code, "GYM-004217");
            return found;
          }
        });
        try {
          host.querySelector("[data-lookup-code]").value = "GYM-004217";
          host.querySelector("[data-lookup-form]").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          await waitForUi();
          assert.isFalse(host.querySelector("[data-lookup-result]").hidden);
          assert.equal(host.querySelector("[data-lookup-result-code]").textContent, "GYM-004217");
          assert.equal(host.querySelector("[data-lookup-result-class]").textContent, "Yoga");
          assert.equal(host.querySelector("[data-lookup-result-session]").textContent, "Wednesday 19:00");
          assert.equal(host.querySelector("[data-lookup-result-participants]").textContent, "2");
          assert.equal(host.querySelector("[data-lookup-result-unit-price]").textContent, "€8");
          assert.equal(host.querySelector("[data-lookup-result-total]").textContent, "€16");
          assert.equal(host.querySelector("[data-lookup-result-status]").textContent, "Confirmed");
        } finally {
          handle.destroy();
        }
      });
    });

    it("rejects malformed reservation codes before making an API request", async function () {
      let requests = 0;
      await withHost(async function (host) {
        const handle = await GymApp.start(host, {
          getClasses: async function () { return apiCatalogue(); },
          createReservation: async function () { throw new Error("not expected"); },
          getReservation: async function () { requests += 1; }
        });
        try {
          host.querySelector("[data-lookup-code]").value = "GYM-12AB56";
          host.querySelector("[data-lookup-form]").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          assert.isTrue(host.querySelector("[data-lookup-feedback]").textContent.includes("GYM-123456"));
          assert.isTrue(host.querySelector("[data-lookup-feedback]").getAttribute("role") === "alert");
          assert.equal(requests, 0);
        } finally {
          handle.destroy();
        }
      });
    });

    it("shows the API message for an unknown reservation code", async function () {
      await withHost(async function (host) {
        const handle = await GymApp.start(host, {
          getClasses: async function () { return apiCatalogue(); },
          createReservation: async function () { throw new Error("not expected"); },
          getReservation: async function () { throw new GymApi.ApiError(404, "reservation not found"); }
        });
        try {
          host.querySelector("[data-lookup-code]").value = "GYM-999999";
          host.querySelector("[data-lookup-form]").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          await waitForUi();
          assert.isTrue(host.querySelector("[data-lookup-feedback]").textContent.includes("HTTP 404"));
          assert.isTrue(host.querySelector("[data-lookup-feedback]").textContent.includes("reservation not found"));
          assert.isTrue(host.querySelector("[data-lookup-result]").hidden);
        } finally {
          handle.destroy();
        }
      });
    });

    it("displays a cancelled reservation and its status", async function () {
      const cancelled = reservationResponse("YOGA-2");
      cancelled.status = "Cancelled";
      let cancellationRequests = 0;
      await withHost(async function (host) {
        const handle = await GymApp.start(host, {
          getClasses: async function () { return apiCatalogue(); },
          createReservation: async function () { throw new Error("not expected"); },
          getReservation: async function () { return cancelled; },
          cancelReservation: async function () { cancellationRequests += 1; }
        });
        try {
          host.querySelector("[data-lookup-code]").value = "GYM-004217";
          host.querySelector("[data-lookup-form]").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          await waitForUi();
          assert.equal(host.querySelector("[data-lookup-result-status]").textContent, "Cancelled");
          assert.equal(host.querySelector("[data-lookup-result-code]").textContent, "GYM-004217");
          assert.isTrue(host.querySelector("[data-cancel-reservation]").hidden);
          assert.equal(cancellationRequests, 0);
        } finally {
          handle.destroy();
        }
      });
    });

    it("cancels a confirmed reservation once and refreshes session availability", async function () {
      const initialClasses = apiCatalogue();
      initialClasses[0].sessions[1].remainingPlaces = 4;
      const cancelled = Object.assign(reservationResponse("YOGA-2"), { status: "Cancelled" });
      let classesRequests = 0;
      let cancellationRequests = 0;
      let resolveCancellation;
      await withHost(async function (host) {
        const handle = await GymApp.start(host, {
          getClasses: async function () {
            classesRequests += 1;
            return classesRequests === 1 ? initialClasses : apiCatalogue();
          },
          createReservation: async function () { throw new Error("not expected"); },
          getReservation: async function () { return reservationResponse("YOGA-2"); },
          cancelReservation: function (code) {
            assert.equal(code, "GYM-004217");
            cancellationRequests += 1;
            return new Promise(function (resolve) { resolveCancellation = resolve; });
          }
        });
        try {
          host.querySelector("[data-lookup-code]").value = "GYM-004217";
          host.querySelector("[data-lookup-form]").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          await waitForUi();
          const cancelButton = host.querySelector("[data-cancel-reservation]");
          assert.isFalse(cancelButton.hidden);
          cancelButton.click();
          assert.isTrue(cancelButton.disabled);
          assert.equal(cancelButton.textContent, "Cancelling…");
          cancelButton.dispatchEvent(new Event("click", { bubbles: true }));
          assert.equal(cancellationRequests, 1);
          resolveCancellation(cancelled);
          await waitForUi();

          assert.equal(host.querySelector("[data-lookup-result-status]").textContent, "Cancelled");
          assert.isTrue(host.querySelector("[data-cancel-reservation]").hidden);
          assert.isTrue(host.querySelector("[data-lookup-feedback]").textContent.includes("was cancelled"));
          assert.equal(classesRequests, 2);
          host.querySelector('[data-class-list] input[value="yoga"]').click();
          assert.isTrue(host.querySelector('[data-session-content] input[value="YOGA-WEDNESDAY-1900"]').parentElement.textContent.includes("6 places left"));
        } finally {
          handle.destroy();
        }
      });
    });

    it("updates confirmation-screen availability after cancellation", async function () {
      const initialClasses = apiCatalogue();
      initialClasses[0].sessions[1].remainingPlaces = 4;
      const booking = Object.assign(reservationResponse("YOGA-WEDNESDAY-1900"), {
        participants: 1,
        pricePerParticipant: 8,
        totalPrice: 8
      });
      const cancelled = Object.assign(booking, { status: "Cancelled" });
      let classesRequests = 0;
      await withHost(async function (host) {
        const handle = await GymApp.start(host, {
          getClasses: async function () {
            classesRequests += 1;
            return classesRequests < 3 ? initialClasses : apiCatalogue();
          },
          createReservation: async function () { return Object.assign({}, booking, { status: "Confirmed" }); },
          getReservation: async function () { return Object.assign({}, booking, { status: "Confirmed" }); },
          cancelReservation: async function () { return cancelled; }
        });
        try {
          host.querySelector('[data-class-list] input[value="yoga"]').click();
          host.querySelector('[data-session-content] input[value="YOGA-WEDNESDAY-1900"]').click();
          host.querySelector("[data-confirm]").click();
          await waitForUi();
          assert.isTrue(host.querySelector("[data-confirmation-availability]").textContent.includes("4 places left"));

          host.querySelector("[data-lookup-code]").value = "GYM-004217";
          host.querySelector("[data-lookup-form]").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          await waitForUi();
          host.querySelector("[data-cancel-reservation]").click();
          await waitForUi();

          assert.isTrue(host.querySelector("[data-confirmation-availability]").textContent.includes("6 places left"));
        } finally {
          handle.destroy();
        }
      });
    });

    it("reports cancellation 404 and 409 API errors without changing the displayed reservation", async function () {
      const cases = [
        { status: 404, message: "reservation not found" },
        { status: 409, message: "reservation already cancelled" }
      ];
      for (const testCase of cases) {
        await withHost(async function (host) {
          const handle = await GymApp.start(host, {
            getClasses: async function () { return apiCatalogue(); },
            createReservation: async function () { throw new Error("not expected"); },
            getReservation: async function () { return reservationResponse("YOGA-2"); },
            cancelReservation: async function () { throw new GymApi.ApiError(testCase.status, testCase.message); }
          });
          try {
            host.querySelector("[data-lookup-code]").value = "GYM-004217";
            host.querySelector("[data-lookup-form]").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
            await waitForUi();
            host.querySelector("[data-cancel-reservation]").click();
            await waitForUi();
            assert.isTrue(host.querySelector("[data-lookup-feedback]").textContent.includes("HTTP " + testCase.status));
            assert.isTrue(host.querySelector("[data-lookup-feedback]").textContent.includes(testCase.message));
            assert.equal(host.querySelector("[data-lookup-result-status]").textContent, "Confirmed");
            assert.isFalse(host.querySelector("[data-cancel-reservation]").disabled);
          } finally {
            handle.destroy();
          }
        });
      }
    });
  });
})();
