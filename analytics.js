(function attachSiteAnalytics() {
  const endpoint = "/api/analytics-collect";
  const visitorStorageKey = "portfolio-analytics-visitor";
  const visitCountStorageKey = "portfolio-analytics-visit-count";
  const sessionStorageKey = "portfolio-analytics-session";
  const sessionVisitMarkerKey = "portfolio-analytics-visit-registered";
  const pageStartTime = Date.now();
  const pageTitle = document.title || "";

  let maxScrollPercent = 0;
  let engagementSent = false;

  function getOrCreateId(storage, key, prefix) {
    try {
      const existingValue = storage.getItem(key);

      if (existingValue) {
        return existingValue;
      }

      const nextValue =
        prefix + "-" + (window.crypto?.randomUUID ? window.crypto.randomUUID() : String(Date.now()));
      storage.setItem(key, nextValue);
      return nextValue;
    } catch (error) {
      return `${prefix}-${Date.now()}`;
    }
  }

  function getVisitCount() {
    try {
      if (sessionStorage.getItem(sessionVisitMarkerKey) === "true") {
        const currentCount = Number.parseInt(localStorage.getItem(visitCountStorageKey) || "1", 10);
        return Number.isFinite(currentCount) && currentCount > 0 ? currentCount : 1;
      }

      const previousCount = Number.parseInt(localStorage.getItem(visitCountStorageKey) || "0", 10);
      const nextCount = Number.isFinite(previousCount) ? previousCount + 1 : 1;
      localStorage.setItem(visitCountStorageKey, String(nextCount));
      sessionStorage.setItem(sessionVisitMarkerKey, "true");
      return nextCount;
    } catch (error) {
      return 1;
    }
  }

  function getTheme() {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }

  function getPageName() {
    if (window.location.pathname === "/portfolio" || window.location.pathname === "/portfolio.html") {
      return "portfolio";
    }

    if (window.location.pathname === "/media" || window.location.pathname === "/media.html") {
      return "media";
    }

    return "home";
  }

  function getUtmParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get("utm_source") || "",
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || "",
      content: params.get("utm_content") || "",
      term: params.get("utm_term") || "",
    };
  }

  function getBasePayload() {
    return {
      visitorId: analyticsContext.visitorId,
      sessionId: analyticsContext.sessionId,
      page: {
        path: window.location.pathname,
        name: getPageName(),
        title: pageTitle,
        referrer: document.referrer || "",
      },
      acquisition: {
        utm: getUtmParams(),
      },
      client: {
        theme: getTheme(),
        language: navigator.language || "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        screen: window.screen ? `${window.screen.width}x${window.screen.height}` : "",
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        visitCount: analyticsContext.visitCount,
        isReturning: analyticsContext.visitCount > 1,
      },
    };
  }

  function sendEvent(payload, useBeacon) {
    const body = JSON.stringify(payload);

    if (useBeacon && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(endpoint, blob);
      return;
    }

    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
  }

  function updateScrollDepth() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const documentHeight =
      document.documentElement.scrollHeight - document.documentElement.clientHeight;

    if (documentHeight <= 0) {
      maxScrollPercent = 100;
      return;
    }

    const nextValue = Math.min(100, Math.round((scrollTop / documentHeight) * 100));
    maxScrollPercent = Math.max(maxScrollPercent, nextValue);
  }

  function buildClickDetails(target) {
    const caseCard = target.closest(".case-card");

    if (target.closest(".theme-toggle")) {
      return {
        targetCategory: "theme",
        targetLabel: "Переключение темы",
        href: "",
        section: "header",
        caseId: "",
      };
    }

    if (target.closest(".contact-link")) {
      return {
        targetCategory: "contact",
        targetLabel: "Связаться",
        href: "",
        section: "header",
        caseId: "",
      };
    }

    if (target.closest(".nav-link")) {
      const link = target.closest(".nav-link");
      return {
        targetCategory: "navigation",
        targetLabel: (link.textContent || "").trim() || "Навигация",
        href: link.getAttribute("href") || "",
        section: "header",
        caseId: "",
      };
    }

    if (target.closest("[data-portfolio-filter]")) {
      const button = target.closest("[data-portfolio-filter]");
      return {
        targetCategory: "portfolio-filter",
        targetLabel: (button.textContent || "").trim() || "Фильтр портфолио",
        href: "",
        section: "portfolio",
        caseId: "",
      };
    }

    if (target.closest("[data-portfolio-layout-button]")) {
      const button = target.closest("[data-portfolio-layout-button]");
      return {
        targetCategory: "portfolio-layout",
        targetLabel: button.dataset.portfolioLayoutButton || "layout",
        href: "",
        section: "portfolio",
        caseId: "",
      };
    }

    if (target.closest(".cases-footer__button")) {
      const link = target.closest(".cases-footer__button");
      return {
        targetCategory: "cta",
        targetLabel: (link.textContent || "").trim() || "Смотреть портфолио",
        href: link.getAttribute("href") || "",
        section: "cases",
        caseId: "",
      };
    }

    if (caseCard) {
      return {
        targetCategory: "case",
        targetLabel:
          caseCard.querySelector(".case-card__title")?.textContent?.trim() || "Кейс",
        href: caseCard.getAttribute("href") || "",
        section: "cases",
        caseId: caseCard.dataset.caseId || "",
      };
    }

    if (target.closest(".media-post__link, .media-link-button, .media-feed-section__link")) {
      const link = target.closest(".media-post__link, .media-link-button, .media-feed-section__link");
      return {
        targetCategory: "media",
        targetLabel: (link.textContent || "").trim() || "Медиа",
        href: link.getAttribute("href") || "",
        section: "media",
        caseId: "",
      };
    }

    const clickable = target.closest("a, button");

    if (!clickable) {
      return null;
    }

    return {
      targetCategory: clickable.tagName.toLowerCase() === "a" ? "link" : "button",
      targetLabel: (clickable.textContent || "").trim().slice(0, 180) || "Интеракция",
      href: clickable.getAttribute("href") || "",
      section: clickable.closest("header") ? "header" : "page",
      caseId: "",
    };
  }

  function sendPageview() {
    sendEvent({
      type: "pageview",
      ...getBasePayload(),
    });
  }

  function sendEngagement() {
    if (engagementSent) {
      return;
    }

    engagementSent = true;
    updateScrollDepth();

    sendEvent(
      {
        type: "page_exit",
        ...getBasePayload(),
        details: {
          engagementMs: Date.now() - pageStartTime,
          maxScrollPercent,
        },
      },
      true,
    );
  }

  const analyticsContext = {
    visitorId: getOrCreateId(localStorage, visitorStorageKey, "visitor"),
    sessionId: getOrCreateId(sessionStorage, sessionStorageKey, "session"),
    visitCount: getVisitCount(),
  };

  document.addEventListener(
    "scroll",
    () => {
      updateScrollDepth();
    },
    { passive: true },
  );

  document.addEventListener("click", (event) => {
    const details = buildClickDetails(event.target);

    if (!details) {
      return;
    }

    sendEvent({
      type: "click",
      ...getBasePayload(),
      details,
    });
  });

  window.addEventListener("pagehide", sendEngagement);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      sendEngagement();
    }
  });

  updateScrollDepth();
  sendPageview();
})();
