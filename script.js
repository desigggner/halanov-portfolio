const root = document.documentElement;
const toggleButton = document.querySelector(".theme-toggle");
const store = window.PortfolioStore;

const caseColumns = {
  left: document.querySelector('[data-cases-column="left"]'),
  right: document.querySelector('[data-cases-column="right"]'),
};

const arrowIcon = `
  <svg viewBox="0 0 46 46" focusable="false" fill="none">
    <path
      d="M14.8493 30.4056L30.4056 14.8492"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M17.6777 14.8492H30.4056V27.5771"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
`;

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

function buildCaseBackground(caseItem) {
  if (!caseItem.image) {
    return caseItem.backgroundColor;
  }

  return `${caseItem.backgroundColor} url("${caseItem.image}") center center / cover no-repeat`;
}

function createCaseCard(caseItem) {
  const card = document.createElement("a");
  const top = document.createElement("div");
  const title = document.createElement("h3");
  const corner = document.createElement("span");

  card.className = "case-card case-card--managed";
  card.href = "#top";
  card.dataset.caseId = caseItem.id;
  card.style.background = buildCaseBackground(caseItem);

  if (caseItem.size === "tall") {
    card.classList.add("case-card--tall");
  }

  if (caseItem.lightUi) {
    card.classList.add("case-card--light-ui");
  }

  if (caseItem.status) {
    const status = document.createElement("span");
    status.className = "case-card__status";
    status.textContent = caseItem.status;
    card.dataset.hasStatus = "true";
    card.append(status);
  }

  top.className = "case-card__top";

  title.className = "case-card__title";
  title.textContent = caseItem.title;

  if (caseItem.featuredTitle) {
    title.classList.add("case-card__title--invert");
  }

  top.append(title);

  corner.className = "case-card__corner";
  corner.setAttribute("aria-hidden", "true");
  corner.innerHTML = arrowIcon;

  if (caseItem.lightUi) {
    corner.classList.add("case-card__corner--light");
  }

  card.append(top, corner);

  return card;
}

function renderCases() {
  if (!store || !caseColumns.left || !caseColumns.right) {
    return;
  }

  const cases = store.loadCases();

  caseColumns.left.innerHTML = "";
  caseColumns.right.innerHTML = "";

  for (const caseItem of cases) {
    const column = caseItem.column === "right" ? caseColumns.right : caseColumns.left;
    column.append(createCaseCard(caseItem));
  }
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

renderCases();
