(function initSiteTheme() {
  var root = document.documentElement;
  var currentScript = document.currentScript;
  var storedTheme = null;
  var prefersDark = false;
  var theme = "light";
  var pathname = window.location.pathname;
  var cleanPath = pathname;
  var defaultTitle = "Galanov Lead Product Designer";
  var hiddenTitle = "Окей, я жду✋";
  var visibleReturnTitle = "Ты вернулся!🎉";
  var titleResetDelay = 2500;
  var titleResetTimerId = 0;
  var hasBeenHidden = document.visibilityState === "hidden";

  if (pathname === "/index.html") {
    cleanPath = "/";
  } else if (pathname === "/about.html") {
    cleanPath = "/about";
  } else if (pathname === "/portfolio.html") {
    cleanPath = "/portfolio";
  } else if (pathname === "/media.html") {
    cleanPath = "/media";
  } else if (pathname === "/auth.html") {
    cleanPath = "/auth";
  } else if (pathname === "/admin/index.html") {
    cleanPath = "/admin";
  }

  if (cleanPath !== pathname && window.history && typeof window.history.replaceState === "function") {
    window.history.replaceState(
      window.history.state,
      "",
      cleanPath + window.location.search + window.location.hash,
    );
  }

  try {
    storedTheme = window.localStorage.getItem("portfolio-theme");
  } catch (error) {
    storedTheme = null;
  }

  try {
    prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch (error) {
    prefersDark = false;
  }

  theme = storedTheme || (prefersDark ? "dark" : "light");

  if (
    currentScript &&
    currentScript.dataset.scrollRestoration === "manual" &&
    !window.location.hash &&
    "scrollRestoration" in window.history
  ) {
    window.history.scrollRestoration = "manual";
  }

  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  function clearTitleResetTimer() {
    if (!titleResetTimerId) {
      return;
    }

    window.clearTimeout(titleResetTimerId);
    titleResetTimerId = 0;
  }

  function setDocumentTitle(nextTitle) {
    if (document.title === nextTitle) {
      return;
    }

    document.title = nextTitle;
  }

  function handleVisibilityChange() {
    clearTitleResetTimer();

    if (document.visibilityState === "hidden") {
      hasBeenHidden = true;
      setDocumentTitle(hiddenTitle);
      return;
    }

    if (hasBeenHidden) {
      setDocumentTitle(visibleReturnTitle);

      titleResetTimerId = window.setTimeout(function resetTitle() {
        titleResetTimerId = 0;
        setDocumentTitle(defaultTitle);
      }, titleResetDelay);

      hasBeenHidden = false;
      return;
    }

    setDocumentTitle(defaultTitle);
  }

  function cleanupTitleVisibility(event) {
    if (event && event.persisted) {
      return;
    }

    clearTitleResetTimer();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pagehide", cleanupTitleVisibility);
  }

  handleVisibilityChange();
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", cleanupTitleVisibility);
})();
