const root = document.documentElement;
const toggleButton = document.querySelector(".theme-toggle");
const store = window.PortfolioStore;
const caseCard = window.PortfolioCaseCard;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const canHoverPrecisely = window.matchMedia("(hover: hover) and (pointer: fine)");

const caseColumns = {
  left: document.querySelector('[data-cases-column="left"]'),
  right: document.querySelector('[data-cases-column="right"]'),
};

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

function renderCases() {
  if (!store || !caseCard || !caseColumns.left || !caseColumns.right) {
    return;
  }

  const cases = store.loadCases();

  caseColumns.left.innerHTML = "";
  caseColumns.right.innerHTML = "";

  for (const caseItem of cases) {
    const column = caseItem.column === "right" ? caseColumns.right : caseColumns.left;
    column.append(caseCard.createCaseCard(caseItem));
  }

  setupCaseMotion();
}

function resetCaseBackgroundMotion(card) {
  card.style.setProperty("--case-bg-shift-x", "0px");
  card.style.setProperty("--case-bg-shift-y", "0px");
}

function setupCaseHoverMotion(cards) {
  if (!canHoverPrecisely.matches || prefersReducedMotion.matches) {
    for (const card of cards) {
      resetCaseBackgroundMotion(card);
    }

    return;
  }

  for (const card of cards) {
    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      const relativeX = (event.clientX - bounds.left) / bounds.width - 0.5;
      const relativeY = (event.clientY - bounds.top) / bounds.height - 0.5;
      const shiftX = relativeX * 12;
      const shiftY = relativeY * 12;

      card.style.setProperty("--case-bg-shift-x", `${shiftX.toFixed(2)}px`);
      card.style.setProperty("--case-bg-shift-y", `${shiftY.toFixed(2)}px`);
    });

    card.addEventListener("pointerleave", () => {
      resetCaseBackgroundMotion(card);
    });

    card.addEventListener("pointercancel", () => {
      resetCaseBackgroundMotion(card);
    });
  }
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
  setupCaseHoverMotion(cards);
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
