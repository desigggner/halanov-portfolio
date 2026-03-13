const root = document.documentElement;
const toggleButton = document.querySelector(".theme-toggle");
const store = window.PortfolioStore;
const caseCard = window.PortfolioCaseCard;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const caseColumns = {
  left: document.querySelector('[data-cases-column="left"]'),
  right: document.querySelector('[data-cases-column="right"]'),
};

let caseRevealObserver = null;
let casesSyncInFlight = false;

function applyTheme(theme) {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  if (toggleButton) {
    toggleButton.setAttribute("aria-pressed", String(theme === "dark"));
    toggleButton.setAttribute(
      "aria-label",
      theme === "dark"
        ? "Переключить на светлую тему"
        : "Переключить на тёмную тему",
    );
  }
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

function renderCases(nextCases = store?.loadCases() || []) {
  if (!store || !caseCard || !caseColumns.left || !caseColumns.right) {
    return;
  }

  const cases = nextCases.filter((caseItem) => caseItem.showOnHome);

  caseColumns.left.innerHTML = "";
  caseColumns.right.innerHTML = "";

  if (!cases.length) {
    if (caseRevealObserver) {
      caseRevealObserver.disconnect();
      caseRevealObserver = null;
    }

    caseColumns.left.innerHTML =
      '<p class="cases-empty">На главной пока нет выбранных кейсов. Включи показ в админке.</p>';
    return;
  }

  for (const [index, caseItem] of cases.entries()) {
    const column = caseItem.column === "right" ? caseColumns.right : caseColumns.left;
    column.append(
      caseCard.createCaseCard(caseItem, {
        imageLoading: index < 2 ? "eager" : "lazy",
        imageFetchPriority: index === 0 ? "high" : "auto",
      }),
    );
  }

  setupCaseMotion();
}

async function syncCasesFromServer() {
  if (!store?.loadCasesFromServer || casesSyncInFlight) {
    return false;
  }

  casesSyncInFlight = true;

  try {
    const result = await store.loadCasesFromServer();
    renderCases(result.cases || []);
    return true;
  } catch (error) {
    return false;
  } finally {
    casesSyncInFlight = false;
  }
}

async function bootstrapCases() {
  const hasCasesCache = typeof store?.hasCasesCache === "function" && store.hasCasesCache();

  if (!hasCasesCache) {
    const synced = await syncCasesFromServer();

    if (synced) {
      return;
    }
  }

  renderCases();
  syncCasesFromServer();
}

function setupCaseReveal(cards) {
  if (caseRevealObserver) {
    caseRevealObserver.disconnect();
    caseRevealObserver = null;
  }

  const revealAll = prefersReducedMotion.matches || !("IntersectionObserver" in window);

  for (const [index, card] of cards.entries()) {
    card.style.setProperty("--case-reveal-delay", `${index * 110}ms`);

    if (revealAll) {
      card.classList.remove("is-reveal-pending");
      card.classList.add("is-revealed");
    } else {
      card.classList.remove("is-revealed");
      card.classList.add("is-reveal-pending");
    }
  }

  if (revealAll) {
    return;
  }

  caseRevealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }

        const delay = entry.target.style.getPropertyValue("--case-reveal-delay") || "0ms";

        entry.target.style.transitionDelay = delay;
        entry.target.classList.remove("is-reveal-pending");
        entry.target.classList.add("is-revealed");
        caseRevealObserver.unobserve(entry.target);

        window.setTimeout(() => {
          entry.target.style.transitionDelay = "";
        }, 900);
      }
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -10% 0px",
    },
  );

  for (const card of cards) {
    caseRevealObserver.observe(card);
  }
}

function setupCaseMotion() {
  const cards = Array.from(document.querySelectorAll(".case-card"));

  if (!cards.length) {
    return;
  }

  setupCaseReveal(cards);
}

if (toggleButton && store) {
  applyTheme(root.dataset.theme || "light");

  toggleButton.addEventListener("click", () => {
    const nextTheme = getNextTheme();

    localStorage.setItem(store.themeStorageKey, nextTheme);
    applyTheme(nextTheme);
  });
}

window.addEventListener("storage", (event) => {
  if (!store) {
    return;
  }

  if (event.key === store.casesStorageKey) {
    renderCases();
  }

  if (event.key === store.themeStorageKey && event.newValue) {
    applyTheme(event.newValue);
  }
});

ensureTopOnInitialLoad();
bootstrapCases();
