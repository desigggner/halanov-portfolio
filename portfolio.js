const root = document.documentElement;
const store = window.PortfolioStore;
const caseCard = window.PortfolioCaseCard;
const casesStorageKey = store?.casesStorageKey;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const layoutStorageKey = "portfolio-layout";
const mobileNavMedia = window.matchMedia("(max-width: 720px)");
const mobileNav = document.querySelector("[data-mobile-nav]");
const mobileNavSheet = document.getElementById("mobile-sections-sheet");
const mobileNavToggleButtons = Array.from(document.querySelectorAll("[data-mobile-nav-toggle]"));
const mobileNavCloseButtons = Array.from(document.querySelectorAll("[data-mobile-nav-close]"));
const mobileNavToggleLabels = Array.from(document.querySelectorAll("[data-mobile-nav-toggle-label]"));
const mobileNavLinks = Array.from(document.querySelectorAll(".site-mobile-nav__sheet-link"));

const portfolioColumns = {
  left: document.querySelector('[data-portfolio-column="left"]'),
  right: document.querySelector('[data-portfolio-column="right"]'),
};

const portfolioElements = {
  totalText: document.querySelector("[data-portfolio-total-text]"),
  yearsText: document.querySelector("[data-portfolio-years-text]"),
  activeText: document.querySelector("[data-portfolio-active-text]"),
  filters: document.querySelector("[data-portfolio-filters]"),
  grid: document.querySelector("[data-portfolio-grid]"),
  list: document.querySelector("[data-portfolio-list]"),
  listBody: document.querySelector("[data-portfolio-list-body]"),
  layoutButtons: Array.from(document.querySelectorAll("[data-portfolio-layout-button]")),
  empty: document.querySelector("[data-portfolio-empty]"),
};

let activeCategory = "all";
let activeLayout = loadLayoutPreference();
let caseRevealObserver = null;
let casesSyncInFlight = false;
let backgroundSyncTimerId = 0;
let isMobileNavOpen = false;

function applyTheme() {
  root.dataset.theme = "dark";
  root.style.colorScheme = "dark";
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

function normalizeLayout(layout) {
  return layout === "list" ? "list" : "grid";
}

function loadLayoutPreference() {
  try {
    return normalizeLayout(window.localStorage.getItem(layoutStorageKey));
  } catch (error) {
    return "grid";
  }
}

function syncLayoutState() {
  for (const button of portfolioElements.layoutButtons) {
    const isActive = button.dataset.portfolioLayoutButton === activeLayout;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }

  if (portfolioElements.grid) {
    portfolioElements.grid.hidden = activeLayout !== "grid";
  }

  if (portfolioElements.list) {
    portfolioElements.list.hidden = activeLayout !== "list";
  }
}

function setActiveLayout(layout, { persist = true } = {}) {
  activeLayout = normalizeLayout(layout);
  syncLayoutState();

  if (!persist) {
    return;
  }

  try {
    window.localStorage.setItem(layoutStorageKey, activeLayout);
  } catch (error) {
    return;
  }
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

function getCategoryLabel(categoryId) {
  return (
    (store?.portfolioCategories || []).find((category) => category.id === categoryId)?.label ||
    "Без категории"
  );
}

function disconnectCaseReveal() {
  if (!caseRevealObserver) {
    return;
  }

  caseRevealObserver.disconnect();
  caseRevealObserver = null;
}

function setupCaseReveal(cards) {
  disconnectCaseReveal();

  const revealAll = prefersReducedMotion.matches || !("IntersectionObserver" in window);

  for (const [index, cardElement] of cards.entries()) {
    cardElement.style.setProperty("--case-reveal-delay", `${index * 110}ms`);

    if (revealAll) {
      cardElement.classList.remove("is-reveal-pending");
      cardElement.classList.add("is-revealed");
    } else {
      cardElement.classList.remove("is-revealed");
      cardElement.classList.add("is-reveal-pending");
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

  for (const cardElement of cards) {
    caseRevealObserver.observe(cardElement);
  }
}

function setupCaseMotion() {
  const cards = Array.from(document.querySelectorAll("[data-portfolio-grid] .case-card"));

  if (!cards.length) {
    disconnectCaseReveal();
    return;
  }

  setupCaseReveal(cards);
}

function createListCell(label, value, className = "", isMuted = false) {
  const cell = document.createElement("div");
  const cellLabel = document.createElement("span");
  const cellValue = document.createElement(
    className === "portfolio-list__cell--title" ? "h3" : "span",
  );

  cell.className = `portfolio-list__cell ${className}`.trim();
  cellLabel.className = "portfolio-list__label";
  cellLabel.textContent = label;

  cellValue.className =
    className === "portfolio-list__cell--title"
      ? "portfolio-list__value portfolio-list__value--title"
      : "portfolio-list__value";
  cellValue.textContent = value;

  if (isMuted) {
    cellValue.classList.add("portfolio-list__value--muted");
  }

  cell.append(cellLabel, cellValue);

  return cell;
}

function createCaseListRow(caseItem) {
  const tagName = caseItem.path ? "a" : "article";
  const row = document.createElement(tagName);
  const year = caseItem.year || "—";
  const status = caseItem.status || "—";

  row.className = "portfolio-list__row";

  if (tagName === "a") {
    row.href = caseItem.path;
    row.setAttribute("aria-label", `Открыть кейс ${caseItem.title}`);
  }

  row.append(
    createListCell("Год", year, "portfolio-list__cell--year", year === "—"),
    createListCell(
      "Категория",
      getCategoryLabel(caseItem.category),
      "portfolio-list__cell--category",
    ),
    createListCell("Кейс", caseItem.title, "portfolio-list__cell--title"),
    createListCell("Статус", status, "portfolio-list__cell--status", status === "—"),
  );

  return row;
}

function renderCases(nextCases = store?.loadCases() || []) {
  if (
    !store ||
    !caseCard ||
    !portfolioColumns.left ||
    !portfolioColumns.right ||
    !portfolioElements.grid ||
    !portfolioElements.list ||
    !portfolioElements.listBody
  ) {
    return;
  }

  const cases = nextCases;

  renderStats(cases);
  renderFilters(cases);

  const visibleCases = getVisibleCases(cases);

  portfolioColumns.left.innerHTML = "";
  portfolioColumns.right.innerHTML = "";
  portfolioElements.listBody.innerHTML = "";

  if (!visibleCases.length) {
    disconnectCaseReveal();
    portfolioElements.grid.hidden = true;
    portfolioElements.list.hidden = true;

    if (portfolioElements.empty) {
      portfolioElements.empty.hidden = false;
    }

    return;
  }

  if (portfolioElements.empty) {
    portfolioElements.empty.hidden = true;
  }

  syncLayoutState();

  if (activeLayout === "list") {
    disconnectCaseReveal();

    for (const caseItem of visibleCases) {
      portfolioElements.listBody.append(createCaseListRow(caseItem));
    }

    return;
  }

  for (const [index, caseItem] of visibleCases.entries()) {
    const column = caseItem.column === "right" ? portfolioColumns.right : portfolioColumns.left;
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

function scheduleBackgroundCasesSync() {
  if (backgroundSyncTimerId) {
    window.clearTimeout(backgroundSyncTimerId);
    backgroundSyncTimerId = 0;
  }

  const runSync = () => {
    backgroundSyncTimerId = 0;
    syncCasesFromServer();
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(runSync, { timeout: 1800 });
    return;
  }

  backgroundSyncTimerId = window.setTimeout(runSync, 220);
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
  scheduleBackgroundCasesSync();
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

for (const button of portfolioElements.layoutButtons) {
  button.addEventListener("click", () => {
    const nextLayout = button.dataset.portfolioLayoutButton || "grid";

    if (nextLayout === activeLayout) {
      return;
    }

    setActiveLayout(nextLayout);
    renderCases();
  });
}

window.addEventListener("storage", (event) => {
  if (event.key === casesStorageKey) {
    renderCases();
  }

  if (event.key === layoutStorageKey) {
    setActiveLayout(event.newValue || "grid", { persist: false });
    renderCases();
  }
});

applyTheme();
ensureTopOnInitialLoad();
syncLayoutState();
bootstrapCases();
setupMobileNav();
