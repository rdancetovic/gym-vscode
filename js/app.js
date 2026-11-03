(function (global) {
  "use strict";

  function showLoading(root) {
    root.innerHTML = '<p class="api-feedback" role="status">Loading classes and current availability…</p>';
  }

  function showLoadFailure(root, error, retry) {
    root.innerHTML = [
      '<section class="api-load-error" aria-labelledby="load-error-heading">',
      '<h2 id="load-error-heading">Classes could not be loaded</h2>',
      '<p data-load-error role="alert"></p>',
      '<button class="confirm-button" type="button" data-retry-classes>Try again</button>',
      '</section>'
    ].join("");
    const message = error && error.message ? error.message : "The request could not be completed.";
    root.querySelector("[data-load-error]").textContent = error && Number.isInteger(error.status)
      ? "Request failed (HTTP " + error.status + "): " + message
      : message;
    root.querySelector("[data-retry-classes]").addEventListener("click", retry);
  }

  function start(root, api) {
    if (!root) throw new Error("An application root element is required.");
    const apiClient = api || global.GymApi;
    if (!apiClient || typeof apiClient.getClasses !== "function"
        || typeof apiClient.createReservation !== "function") {
      throw new Error("The Gym Reservation API client is unavailable.");
    }

    let app = null;
    let stopped = false;

    async function load() {
      showLoading(root);
      let state;
      try {
        const apiClasses = await apiClient.getClasses();
        state = global.GymData.createStateFromApi(apiClasses);
      } catch (error) {
        if (!stopped) {
          showLoadFailure(root, error, function () {
            load();
          });
        }
        return null;
      }
      if (stopped) return null;
      app = global.GymUI.mount(root, state, {
        createReservation: function (requestBody) {
          return apiClient.createReservation(requestBody);
        },
        loadClasses: function () {
          return apiClient.getClasses();
        },
        getReservation: typeof apiClient.getReservation === "function"
          ? function (code) { return apiClient.getReservation(code); }
          : null,
        cancelReservation: typeof apiClient.cancelReservation === "function"
          ? function (code) { return apiClient.cancelReservation(code); }
          : null
      });
      return app;
    }

    return load().then(function (loadedApp) {
      return {
        app: loadedApp,
        destroy: function () {
          stopped = true;
          if (app) app.destroy();
          root.textContent = "";
        }
      };
    });
  }

  global.GymApp = Object.freeze({ start: start });
})(globalThis);
