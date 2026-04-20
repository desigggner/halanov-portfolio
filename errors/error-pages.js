(function initErrorPages() {
  var root = document.documentElement;
  var nextFromQuery = new URLSearchParams(window.location.search).get("next");

  function isSafeNextPath(value) {
    return (
      typeof value === "string" &&
      value.startsWith("/") &&
      !value.startsWith("//") &&
      !value.startsWith("/auth") &&
      !value.startsWith("/api/")
    );
  }

  function applyTheme() {
    root.dataset.theme = "dark";
    root.style.colorScheme = "dark";
  }

  function resolveNextUrl() {
    return isSafeNextPath(nextFromQuery) ? nextFromQuery : "/";
  }

  function bindLoginLinks() {
    var loginUrl = new URL("/auth", window.location.origin);

    if (isSafeNextPath(nextFromQuery)) {
      loginUrl.searchParams.set("next", nextFromQuery);
    }

    document.querySelectorAll("[data-error-login-link]").forEach(function (link) {
      link.setAttribute("href", loginUrl.pathname + loginUrl.search);
    });
  }

  function bindNextLabels() {
    var nextPath = resolveNextUrl();
    var nextText = nextPath === "/" ? "главная страница" : nextPath;

    document.querySelectorAll("[data-error-next-wrap]").forEach(function (node) {
      node.hidden = !isSafeNextPath(nextFromQuery);
    });

    document.querySelectorAll("[data-error-next-path]").forEach(function (node) {
      node.textContent = nextText;
    });
  }

  function bindReloadButtons() {
    document.querySelectorAll("[data-error-reload-button]").forEach(function (button) {
      button.addEventListener("click", function () {
        window.location.reload();
      });
    });
  }

  function bindBackButtons() {
    document.querySelectorAll("[data-error-back-button]").forEach(function (button) {
      button.addEventListener("click", function () {
        try {
          if (document.referrer) {
            var previousUrl = new URL(document.referrer);

            if (previousUrl.origin === window.location.origin) {
              window.history.back();
              return;
            }
          }
        } catch (error) {
          // Ignore malformed referrer and use fallback below.
        }

        window.location.assign(button.getAttribute("data-fallback") || "/");
      });
    });
  }

  applyTheme();
  bindLoginLinks();
  bindNextLabels();
  bindReloadButtons();
  bindBackButtons();
})();
