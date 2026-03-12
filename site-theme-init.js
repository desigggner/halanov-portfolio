(function initSiteTheme() {
  var root = document.documentElement;
  var currentScript = document.currentScript;
  var storedTheme = null;
  var prefersDark = false;
  var theme = "light";

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
})();
