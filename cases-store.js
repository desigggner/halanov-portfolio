(function attachPortfolioStore(global) {
  const casesStorageKey = "portfolio-cases";
  const casesApiEndpoint = "/api/cases";
  const themeStorageKey = "portfolio-theme";
  const defaultPortfolioCategory = "product";
  const builtInCaseImageAliases = {
    "./assets/invert-case-bg.png": "./assets/invert-case-bg.jpg",
    "./assets/10Q.png": "./assets/10Q.jpg",
    "./assets/pulse.png": "./assets/pulse.jpg",
    "./assets/szu.png": "./assets/szu.jpg",
  };
  const portfolioCategories = [
    { id: "product", label: "Продуктовый дизайн" },
    { id: "sites", label: "Сайты" },
    { id: "apps", label: "Приложения" },
    { id: "branding", label: "Фирменный стиль" },
    { id: "research", label: "Исследования" },
  ];

  const defaultCases = [
    {
      id: "invert",
      title: "Увеличил CTR за счет редизайна в приложении Invert",
      year: "",
      image: "./assets/invert-case-bg.jpg",
      column: "left",
      size: "medium",
      lightUi: true,
      status: "",
      featuredTitle: true,
      backgroundColor: "#16c46c",
      category: "apps",
      showOnHome: true,
    },
    {
      id: "market",
      title: "Интерфейсы для Яндекс Маркета",
      year: "",
      image: "./assets/10Q.jpg",
      column: "left",
      size: "medium",
      lightUi: false,
      status: "",
      featuredTitle: false,
      backgroundColor: "#e3e3e3",
      category: "product",
      showOnHome: true,
    },
    {
      id: "storeez",
      title: "Дизайн iOS-приложения 12 Storeez",
      year: "",
      image: "./assets/pulse.jpg",
      column: "right",
      size: "tall",
      lightUi: true,
      status: "в работе",
      featuredTitle: false,
      backgroundColor: "#1d4cff",
      category: "apps",
      showOnHome: true,
    },
    {
      id: "avito",
      title: "Авито Подработка. Дизайн поиска сменных подработок",
      year: "",
      image: "./assets/szu.jpg",
      video: "./assets/szu.mov",
      column: "right",
      size: "medium",
      lightUi: false,
      status: "",
      featuredTitle: false,
      backgroundColor: "#4d92eb",
      category: "product",
      showOnHome: true,
    },
  ];

  function cloneDefaultCases() {
    return defaultCases.map((item) => ({ ...item }));
  }

  function createCaseId() {
    return `case-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function sanitizeCaseText(value, fallback = "", maxLength = 160) {
    if (typeof value !== "string") {
      return fallback;
    }

    const normalized = value.replace(/\s+/g, " ").trim().slice(0, maxLength);
    return normalized || fallback;
  }

  function sanitizeCaseId(value) {
    const normalized = sanitizeCaseText(value, "", 80).replace(/[^a-zA-Z0-9:_-]/g, "");
    return normalized || createCaseId();
  }

  function normalizeCaseImage(image, fallback = "") {
    if (typeof image !== "string") {
      return fallback;
    }

    const normalized = builtInCaseImageAliases[image.trim()] || image.trim();

    if (!normalized) {
      return "";
    }

    if (
      normalized.startsWith("data:image/") ||
      normalized.startsWith("./") ||
      normalized.startsWith("../") ||
      normalized.startsWith("/")
    ) {
      return normalized.slice(0, 2_000_000);
    }

    return fallback;
  }

  function normalizeCaseVideo(video, fallback = "") {
    if (typeof video !== "string") {
      return fallback;
    }

    const normalized = video.trim();

    if (!normalized) {
      return "";
    }

    if (
      normalized.startsWith("data:video/") ||
      normalized.startsWith("./") ||
      normalized.startsWith("../") ||
      normalized.startsWith("/")
    ) {
      return normalized.slice(0, 2_000_000);
    }

    return fallback;
  }

  function normalizeCaseColor(color, fallback = "#d7dde7") {
    const normalized = sanitizeCaseText(color, "", 12);
    return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(normalized)
      ? normalized
      : fallback;
  }

  function normalizeCategory(category, fallback = defaultPortfolioCategory) {
    const selectedCategory =
      typeof category === "string" && category.trim() ? category.trim() : fallback;

    return portfolioCategories.some((item) => item.id === selectedCategory)
      ? selectedCategory
      : fallback;
  }

  function normalizeCaseYear(year, fallback = "") {
    const fallbackYear =
      typeof fallback === "number" && Number.isFinite(fallback)
        ? String(Math.trunc(fallback))
        : typeof fallback === "string"
          ? fallback.trim()
          : "";

    if (typeof year === "number" && Number.isFinite(year)) {
      return String(Math.trunc(year));
    }

    if (typeof year === "string") {
      const trimmedYear = year.trim();

      if (/^\d{4}$/.test(trimmedYear)) {
        return trimmedYear;
      }
    }

    return /^\d{4}$/.test(fallbackYear) ? fallbackYear : "";
  }

  function resolveDefaultCaseFallback(item, index) {
    if (item?.id) {
      const matchedCase = defaultCases.find((caseItem) => caseItem.id === item.id);

      if (matchedCase) {
        return matchedCase;
      }
    }

    return defaultCases[index] || {};
  }

  function normalizeCase(item, fallback = {}) {
    const normalizedImage = normalizeCaseImage(item?.image, fallback.image || "");
    const normalizedVideo = normalizeCaseVideo(item?.video, "");
    const shouldUseFallbackVideo =
      !normalizedVideo &&
      normalizedImage &&
      normalizedImage === (fallback.image || "") &&
      Boolean(fallback.video);

    return {
      id: sanitizeCaseId(item?.id),
      title: sanitizeCaseText(item?.title, fallback.title || "Новый кейс", 180),
      year: normalizeCaseYear(item?.year, fallback.year || ""),
      image: normalizedImage,
      video: normalizedVideo || (shouldUseFallbackVideo ? normalizeCaseVideo(fallback.video, "") : ""),
      column: item?.column === "right" ? "right" : "left",
      size: item?.size === "tall" ? "tall" : "medium",
      lightUi: Boolean(item?.lightUi),
      status: sanitizeCaseText(item?.status, "", 64),
      featuredTitle: Boolean(item?.featuredTitle),
      backgroundColor: normalizeCaseColor(
        item?.backgroundColor,
        fallback.backgroundColor || "#d7dde7",
      ),
      category: normalizeCategory(item?.category, fallback.category || defaultPortfolioCategory),
      showOnHome:
        typeof item?.showOnHome === "boolean"
          ? item.showOnHome
          : fallback.showOnHome ?? true,
    };
  }

  function normalizeCases(items, options = {}) {
    if (!Array.isArray(items)) {
      return options.allowEmpty ? [] : cloneDefaultCases();
    }

    const normalizedCases = items.map((item, index) =>
      normalizeCase(item, resolveDefaultCaseFallback(item, index)),
    );

    if (normalizedCases.length || options.allowEmpty) {
      return normalizedCases;
    }

    return cloneDefaultCases();
  }

  function loadCases() {
    try {
      const storedCases = global.localStorage.getItem(casesStorageKey);

      if (!storedCases) {
        return cloneDefaultCases();
      }

      const parsedCases = JSON.parse(storedCases);

      if (!Array.isArray(parsedCases)) {
        return cloneDefaultCases();
      }

      return normalizeCases(parsedCases, { allowEmpty: true });
    } catch (error) {
      return cloneDefaultCases();
    }
  }

  function hasCasesCache() {
    try {
      return global.localStorage.getItem(casesStorageKey) !== null;
    } catch (error) {
      return false;
    }
  }

  function saveCases(cases) {
    try {
      global.localStorage.setItem(
        casesStorageKey,
        JSON.stringify(normalizeCases(cases, { allowEmpty: true })),
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  function syncCasesCache(cases) {
    const normalizedCases = normalizeCases(cases, { allowEmpty: true });
    saveCases(normalizedCases);
    return normalizedCases;
  }

  async function requestCases(method, body) {
    const options = {
      method,
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        accept: "application/json",
      },
    };

    if (body) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    const response = await global.fetch(casesApiEndpoint, options);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok) {
      const error = new Error(payload?.error || `HTTP ${response.status}`);

      error.statusCode = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  async function loadCasesFromServer() {
    const payload = await requestCases("GET");

    return {
      cases: syncCasesCache(payload.cases),
      storage: payload.storage || null,
    };
  }

  async function persistCasesToServer(cases) {
    const payload = await requestCases("POST", {
      cases: normalizeCases(cases, { allowEmpty: true }),
    });

    return {
      cases: syncCasesCache(payload.cases),
      storage: payload.storage || null,
    };
  }

  async function resetCasesOnServer() {
    const payload = await requestCases("DELETE");

    return {
      cases: syncCasesCache(payload.cases),
      storage: payload.storage || null,
    };
  }

  global.PortfolioStore = {
    casesStorageKey,
    casesApiEndpoint,
    themeStorageKey,
    defaultPortfolioCategory,
    portfolioCategories,
    defaultCases,
    cloneDefaultCases,
    createCaseId,
    normalizeCategory,
    normalizeCaseYear,
    normalizeCase,
    normalizeCases,
    hasCasesCache,
    loadCases,
    saveCases,
    loadCasesFromServer,
    persistCasesToServer,
    resetCasesOnServer,
  };
})(window);
