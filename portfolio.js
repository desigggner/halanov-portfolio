const root = document.documentElement;
const toggleButton = document.querySelector(".theme-toggle");
const store = window.PortfolioStore;
const caseCard = window.PortfolioCaseCard;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const portfolioColumns = {
  left: document.querySelector('[data-portfolio-column="left"]'),
  right: document.querySelector('[data-portfolio-column="right"]'),
};

const portfolioElements = {
  totalText: document.querySelector("[data-portfolio-total-text]"),
  yearsText: document.querySelector("[data-portfolio-years-text]"),
  activeText: document.querySelector("[data-portfolio-active-text]"),
  filters: document.querySelector("[data-portfolio-filters]"),
  empty: document.querySelector("[data-portfolio-empty]"),
};

let activeCategory = "all";
let caseRevealObserver = null;

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

function pluralize(value, forms) {
  const normalized = Math.abs(value) % 100;
  const lastDigit = normalized % 10;

  if (normalized > 10 && normalized < 20) {
    return forms[2];
  }

  if (lastDigit > 1 && lastDigit < 5) {
    return forms[1];
  }

  if (lastDigit === 1) {
    return forms[0];
  }

  return forms[2];
}

function getExperienceYears() {
  return Math.max(0, new Date().getFullYear() - 2014);
}

function getFilterCategories() {
  return [{ id: "all", label: "Все" }, ...(store?.portfolioCategories || [])];
}

function renderStats(cases) {
  if (!portfolioElements.totalText || !portfolioElements.yearsText || !portfolioElements.activeText) {
    return;
  }

  const totalCases = cases.length;
  const activeCases = cases.filter((caseItem) => caseItem.status.trim()).length;
  const experienceYears = getExperienceYears();

  portfolioElements.totalText.textContent = `${totalCases} ${pluralize(totalCases, [
    "проект",
    "проекта",
    "проектов",
  ])} за`;
  portfolioElements.yearsText.textContent = `${experienceYears} ${pluralize(experienceYears, [
    "год",
    "года",
    "лет",
  ])},`;
  portfolioElements.activeText.textContent = `${activeCases} — в работе`;
}

function renderFilters(cases) {
  if (!portfolioElements.filters) {
    return;
  }

  const categories = getFilterCategories();
  const categoryIds = new Set(categories.map((category) => category.id));

  if (!categoryIds.has(activeCategory)) {
    activeCategory = "all";
  }

  portfolioElements.filters.innerHTML = categories
    .map((category) => {
      const isActive = category.id === activeCategory;
      const hasCases =
        category.id === "all" || cases.some((caseItem) => caseItem.category === category.id);

      return `
        <button
          class="portfolio-filter ${isActive ? "is-active" : ""}"
          type="button"
          data-portfolio-filter="${category.id}"
          aria-pressed="${isActive}"
          ${hasCases ? "" : 'data-is-empty="true"'}
        >
          ${category.label}
        </button>
      `;
    })
    .join("");
}

function getVisibleCases(cases) {
  if (activeCategory === "all") {
    return cases;
  }

  return cases.filter((caseItem) => caseItem.category === activeCategory);
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
  const cards = Array.from(document.querySelectorAll("[data-portfolio-grid] .case-card"));

  if (!cards.length) {
    return;
  }

  setupCaseReveal(cards);
}

function renderCases() {
  if (!store || !caseCard || !portfolioColumns.left || !portfolioColumns.right) {
    return;
  }

  const cases = store.loadCases();

  renderStats(cases);
  renderFilters(cases);

  const visibleCases = getVisibleCases(cases);

  portfolioColumns.left.innerHTML = "";
  portfolioColumns.right.innerHTML = "";

  if (!visibleCases.length) {
    if (caseRevealObserver) {
      caseRevealObserver.disconnect();
      caseRevealObserver = null;
    }

    if (portfolioElements.empty) {
      portfolioElements.empty.hidden = false;
    }

    return;
  }

  if (portfolioElements.empty) {
    portfolioElements.empty.hidden = true;
  }

  for (const caseItem of visibleCases) {
    const column = caseItem.column === "right" ? portfolioColumns.right : portfolioColumns.left;
    column.append(caseCard.createCaseCard(caseItem));
  }

  setupCaseMotion();
}

if (toggleButton && store) {
  applyTheme(root.dataset.theme || "light");

  toggleButton.addEventListener("click", () => {
    const nextTheme = getNextTheme();

    localStorage.setItem(store.themeStorageKey, nextTheme);
    applyTheme(nextTheme);
  });
}

if (portfolioElements.filters) {
  portfolioElements.filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-portfolio-filter]");

    if (!button) {
      return;
    }

    activeCategory = button.dataset.portfolioFilter || "all";
    renderCases();
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
renderCases();
