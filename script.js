const root = document.documentElement;
root.classList.add("js-ready");
const store = window.PortfolioStore;
const caseCard = window.PortfolioCaseCard;
const themeStorageKey = store?.themeStorageKey || "portfolio-theme";
const casesStorageKey = store?.casesStorageKey;
const toggleButtons = Array.from(document.querySelectorAll(".theme-toggle"));
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileNavMedia = window.matchMedia("(max-width: 720px)");
const mobileNav = document.querySelector("[data-mobile-nav]");
const mobileNavSheet = document.getElementById("mobile-sections-sheet");
const mobileNavToggleButtons = Array.from(document.querySelectorAll("[data-mobile-nav-toggle]"));
const mobileNavCloseButtons = Array.from(document.querySelectorAll("[data-mobile-nav-close]"));
const mobileNavToggleLabels = Array.from(document.querySelectorAll("[data-mobile-nav-toggle-label]"));
const mobileNavLinks = Array.from(document.querySelectorAll(".site-mobile-nav__sheet-link"));

const caseColumns = {
  left: document.querySelector('[data-cases-column="left"]'),
  right: document.querySelector('[data-cases-column="right"]'),
};

let caseRevealObserver = null;
let casesSyncInFlight = false;
let isMobileNavOpen = false;

function initHeroIntro() {
  const hero = document.querySelector(".hero");
  const title = hero?.querySelector("[data-hero-title]");
  const titleText = title?.querySelector(".hero__title-text");
  const canvas = title?.querySelector(".hero__title-canvas");
  const profileItems = Array.from(hero?.querySelectorAll(".hero__intro-item") || []);

  if (!hero || !title || !titleText || !canvas || !profileItems.length) {
    return;
  }

  let hasAnimated = false;
  let frameId = 0;
  const profileTimers = [];

  const revealProfile = () => {
    profileItems.forEach((item, index) => {
      const timer = window.setTimeout(() => {
        item.classList.add("is-visible");
      }, 350 + index * 100);

      profileTimers.push(timer);
    });
  };

  const finish = () => {
    window.cancelAnimationFrame(frameId);

    for (const timer of profileTimers) {
      window.clearTimeout(timer);
    }

    titleText.style.opacity = "";
    titleText.style.filter = "";
    titleText.style.transform = "";
    canvas.width = 0;
    canvas.height = 0;
    hero.dataset.heroIntro = "done";
  };

  const runStatic = () => {
    hero.dataset.heroIntro = "done";

    profileItems.forEach((item) => {
      item.classList.add("is-visible");
    });
  };

  if (hasAnimated || prefersReducedMotion.matches || typeof canvas.getContext !== "function") {
    hasAnimated = true;
    runStatic();
    return;
  }

  const start = () => {
    if (hasAnimated) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      hasAnimated = true;
      runStatic();
      return;
    }

    hasAnimated = true;
    hero.dataset.heroIntro = "animating";

    const titleRect = title.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const deviceScale = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvasRect.width * deviceScale));
    const height = Math.max(1, Math.round(canvasRect.height * deviceScale));
    const computedStyle = window.getComputedStyle(title);
    const fontFamily = "Google Sans, sans-serif";
    const fontWeight = "600";
    const fontSize = Math.max(32, Math.round(parseFloat(computedStyle.fontSize) * deviceScale));
    const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 0.97;
    const text = titleText.textContent?.trim() || "";
    const revealDuration = 1100;
    const fadeStart = 220;
    const fadeDuration = 600;
    const spread = 3;
    const density = 4;

    const buffer = document.createElement("canvas");
    buffer.width = width;
    buffer.height = height;

    const bufferContext = buffer.getContext("2d");

    if (!bufferContext || !text) {
      runStatic();
      return;
    }

    canvas.width = width;
    canvas.height = height;

    bufferContext.clearRect(0, 0, width, height);
    bufferContext.fillStyle = "#ffffff";
    bufferContext.textAlign = "center";
    bufferContext.textBaseline = "middle";
    bufferContext.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    bufferContext.fillText(
      text,
      width / 2,
      height / 2 + ((titleRect.height - lineHeight) * deviceScale) / 2,
    );

    const { data } = bufferContext.getImageData(0, 0, width, height);
    const particles = [];
    const step = Math.max(4, Math.round(density * deviceScale));

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const alpha = data[(y * width + x) * 4 + 3];

        if (alpha < 120) {
          continue;
        }

        const progressOffset = x / width;

        particles.push({
          targetX: x,
          targetY: y,
          startX: x - (32 + progressOffset * 56 + Math.random() * 26) * deviceScale,
          startY: y + (Math.random() - 0.5) * 34 * spread,
          radius: (1.2 + Math.random() * 1.9) * deviceScale,
          alpha: 0.18 + Math.random() * 0.52,
          delay: progressOffset * 0.48,
        });
      }
    }

    const color = window.getComputedStyle(titleText).color;
    const startedAt = performance.now();

    revealProfile();

    const draw = (now) => {
      const elapsed = now - startedAt;
      const progress = Math.min(elapsed / revealDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const fadeProgress = Math.min(Math.max((elapsed - fadeStart) / fadeDuration, 0), 1);
      const fadeEased = 1 - Math.pow(1 - fadeProgress, 3);

      context.clearRect(0, 0, width, height);
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 18 * deviceScale * (1 - progress);

      for (const particle of particles) {
        const localProgress = Math.min(Math.max((progress - particle.delay) / (1 - particle.delay), 0), 1);

        if (localProgress <= 0) {
          continue;
        }

        const particleEased = 1 - Math.pow(1 - localProgress, 3);
        const x = particle.startX + (particle.targetX - particle.startX) * particleEased;
        const y = particle.startY + (particle.targetY - particle.startY) * particleEased;
        const particleOpacity = particle.alpha * (1 - localProgress * 0.55);

        context.globalAlpha = particleOpacity;
        context.beginPath();
        context.arc(x, y, particle.radius * (1 - localProgress * 0.38), 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 0.08 * (1 - progress);
      context.filter = `blur(${Math.max(0, 18 * (1 - eased))}px)`;
      context.fillRect(width * 0.12, height * 0.28, width * 0.76, height * 0.44);

      context.filter = "none";
      context.shadowBlur = 0;
      context.globalAlpha = 1;

      titleText.style.opacity = String(fadeEased);
      titleText.style.filter = `blur(${Math.max(0, 18 * (1 - fadeEased))}px)`;
      titleText.style.transform = `translateY(${Math.max(0, 18 * (1 - fadeEased))}px)`;

      if (progress < 1) {
        frameId = window.requestAnimationFrame(draw);
        return;
      }

      finish();
    };

    frameId = window.requestAnimationFrame(draw);
  };

  hero.dataset.heroIntro = "pending";

  const readyPromise =
    document.fonts && typeof document.fonts.ready?.then === "function"
      ? document.fonts.ready.catch(() => undefined)
      : Promise.resolve();

  readyPromise.then(() => {
    window.requestAnimationFrame(start);
  });
}

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

window.addEventListener("storage", (event) => {
  if (event.key === casesStorageKey) {
    renderCases();
  }

  if (event.key === themeStorageKey && event.newValue) {
    applyTheme(event.newValue);
  }
});

ensureTopOnInitialLoad();
bootstrapCases();
setupMobileNav();
initHeroIntro();
