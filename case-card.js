(function attachPortfolioCaseCard(global) {
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

  function buildCaseBackground(caseItem) {
    if (!caseItem.image) {
      return caseItem.backgroundColor;
    }

    return `${caseItem.backgroundColor} url("${caseItem.image}") center center / cover no-repeat`;
  }

  function createCaseCard(caseItem, options = {}) {
    const {
      tagName = "a",
      href = "#top",
      ariaLabel = "",
      extraClasses = [],
      dataset = {},
      staticPreview = false,
    } = options;
    const card = document.createElement(tagName);
    const top = document.createElement("div");
    const title = document.createElement("h3");
    const corner = document.createElement("span");
    const hasLightUi = Boolean(caseItem.lightUi);
    const baseTextColor = hasLightUi ? "#ffffff" : "#333037";
    const baseCornerColor = hasLightUi ? "rgba(255, 255, 255, 0.7)" : "rgba(51, 48, 55, 0.78)";
    const activeCornerColor = "#111111";

    card.className = "case-card case-card--managed";
    card.style.setProperty("--case-card-base", caseItem.backgroundColor || "transparent");
    card.style.setProperty("--case-card-bg", buildCaseBackground(caseItem));
    card.style.setProperty("--case-bg-scale", "1");
    card.style.setProperty("--case-bg-shift-x", "0px");
    card.style.setProperty("--case-bg-shift-y", "0px");
    card.style.setProperty("--case-text-color", baseTextColor);
    card.style.setProperty("--case-corner-color", baseCornerColor);
    card.style.setProperty("--case-corner-active-color", activeCornerColor);

    if (tagName.toLowerCase() === "a") {
      card.href = href;
    }

    if (ariaLabel) {
      card.setAttribute("aria-label", ariaLabel);
    }

    if (caseItem.id) {
      card.dataset.caseId = caseItem.id;
    }

    for (const [key, value] of Object.entries(dataset)) {
      card.dataset[key] = value;
    }

    for (const className of extraClasses) {
      if (className) {
        card.classList.add(className);
      }
    }

    if (staticPreview) {
      card.classList.add("case-card--static");
    }

    if (caseItem.size === "tall") {
      card.classList.add("case-card--tall");
    }

    if (hasLightUi) {
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

    if (hasLightUi) {
      corner.classList.add("case-card__corner--light");
    }

    card.append(top, corner);

    return card;
  }

  global.PortfolioCaseCard = {
    arrowIcon,
    buildCaseBackground,
    createCaseCard,
  };
})(window);
