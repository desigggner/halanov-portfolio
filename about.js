const root = document.documentElement;
root.classList.add("js-ready");

const themeStorageKey = "portfolio-theme";
const toggleButtons = Array.from(document.querySelectorAll(".theme-toggle"));
const revealElements = Array.from(document.querySelectorAll("[data-reveal]"));
const currentYearElement = document.querySelector("[data-current-year]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileNavMedia = window.matchMedia("(max-width: 720px)");
const mobileNav = document.querySelector("[data-mobile-nav]");
const mobileNavSheet = document.getElementById("mobile-sections-sheet");
const mobileNavToggleButtons = Array.from(document.querySelectorAll("[data-mobile-nav-toggle]"));
const mobileNavCloseButtons = Array.from(document.querySelectorAll("[data-mobile-nav-close]"));
const mobileNavToggleLabels = Array.from(document.querySelectorAll("[data-mobile-nav-toggle-label]"));
const mobileNavLinks = Array.from(document.querySelectorAll(".site-mobile-nav__sheet-link"));

let isMobileNavOpen = false;

function applyTheme(theme) {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  toggleButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(theme === "dark"));
    button.setAttribute(
      "aria-label",
      theme === "dark"
        ? "Переключить на светлую тему"
        : "Переключить на тёмную тему",
    );
  });
}

function getNextTheme() {
  return root.dataset.theme === "dark" ? "light" : "dark";
}

function shouldResetScrollOnLoad() {
  const navigationEntry =
    typeof performance !== "undefined" && typeof performance.getEntriesByType === "function"
      ? performance.getEntriesByType("navigation")[0]
      : null;

  return !window.location.hash && navigationEntry?.type !== "back_forward";
}

function ensureTopOnInitialLoad() {
  if (!shouldResetScrollOnLoad()) {
    return;
  }

  const resetScroll = () => {
    window.scrollTo(0, 0);

    window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);

      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    });
  };

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  if (document.readyState === "complete") {
    resetScroll();
    return;
  }

  window.addEventListener("load", resetScroll, { once: true });
}

function revealAll() {
  revealElements.forEach((element) => {
    element.classList.add("is-visible");
  });
}

function setupRevealObserver() {
  if (!revealElements.length) {
    return;
  }

  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    revealAll();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -8% 0px",
    },
  );

  revealElements.forEach((element) => {
    observer.observe(element);
  });
}

function syncMobileNavState() {
  document.body.classList.toggle("is-mobile-nav-open", isMobileNavOpen);

  mobileNavToggleButtons.forEach((button) => {
    button.classList.toggle("is-open", isMobileNavOpen);
    button.setAttribute("aria-expanded", String(isMobileNavOpen));
  });

  mobileNavToggleLabels.forEach((label) => {
    label.textContent = isMobileNavOpen ? "Закрыть" : "Разделы";
  });

  if (mobileNavSheet) {
    mobileNavSheet.setAttribute("aria-hidden", String(!isMobileNavOpen));
  }
}

function closeMobileNav() {
  if (!isMobileNavOpen) {
    return;
  }

  isMobileNavOpen = false;
  syncMobileNavState();
}

function toggleMobileNav() {
  if (!mobileNav || !mobileNavMedia.matches) {
    return;
  }

  isMobileNavOpen = !isMobileNavOpen;
  syncMobileNavState();
}

function setupMobileNav() {
  if (!mobileNav) {
    return;
  }

  syncMobileNavState();

  mobileNavToggleButtons.forEach((button) => {
    button.addEventListener("click", toggleMobileNav);
  });

  mobileNavCloseButtons.forEach((button) => {
    button.addEventListener("click", closeMobileNav);
  });

  mobileNavLinks.forEach((link) => {
    link.addEventListener("click", closeMobileNav);
  });

  const handleViewportChange = (event) => {
    if (!event.matches) {
      closeMobileNav();
    }
  };

  if (typeof mobileNavMedia.addEventListener === "function") {
    mobileNavMedia.addEventListener("change", handleViewportChange);
  } else if (typeof mobileNavMedia.addListener === "function") {
    mobileNavMedia.addListener(handleViewportChange);
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileNav();
    }
  });
}

if (toggleButtons.length) {
  applyTheme(root.dataset.theme || "light");

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextTheme = getNextTheme();

      localStorage.setItem(themeStorageKey, nextTheme);
      applyTheme(nextTheme);
    });
  });
}

if (currentYearElement) {
  currentYearElement.textContent = String(new Date().getFullYear());
}

window.addEventListener("storage", (event) => {
  if (event.key === themeStorageKey && event.newValue) {
    applyTheme(event.newValue);
  }
});

ensureTopOnInitialLoad();
setupRevealObserver();
setupMobileNav();
