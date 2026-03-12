(function attachPortfolioStore(global) {
  const casesStorageKey = "portfolio-cases";
  const themeStorageKey = "portfolio-theme";

  const defaultCases = [
    {
      id: "invert",
      title: "Увеличил CTR за счет редизайна в приложении Invert",
      image: "./assets/invert-case-bg.png",
      column: "left",
      size: "medium",
      lightUi: true,
      status: "",
      featuredTitle: true,
      backgroundColor: "#16c46c",
    },
    {
      id: "market",
      title: "Интерфейсы для Яндекс Маркета",
      image: "./assets/10Q.png",
      column: "left",
      size: "medium",
      lightUi: false,
      status: "",
      featuredTitle: false,
      backgroundColor: "#e3e3e3",
    },
    {
      id: "storeez",
      title: "Дизайн iOS-приложения 12 Storeez",
      image: "./assets/pulse.png",
      column: "right",
      size: "tall",
      lightUi: true,
      status: "в работе",
      featuredTitle: false,
      backgroundColor: "#1d4cff",
    },
    {
      id: "avito",
      title: "Авито Подработка. Дизайн поиска сменных подработок",
      image: "./assets/szu.png",
      column: "right",
      size: "medium",
      lightUi: false,
      status: "",
      featuredTitle: false,
      backgroundColor: "#4d92eb",
    },
  ];

  function cloneDefaultCases() {
    return defaultCases.map((item) => ({ ...item }));
  }

  function createCaseId() {
    return `case-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeCase(item, fallback = {}) {
    return {
      id: typeof item?.id === "string" && item.id.trim() ? item.id : createCaseId(),
      title:
        typeof item?.title === "string" && item.title.trim()
          ? item.title.trim()
          : fallback.title || "Новый кейс",
      image: typeof item?.image === "string" ? item.image : fallback.image || "",
      column: item?.column === "right" ? "right" : "left",
      size: item?.size === "tall" ? "tall" : "medium",
      lightUi: Boolean(item?.lightUi),
      status: typeof item?.status === "string" ? item.status.trim() : "",
      featuredTitle: Boolean(item?.featuredTitle),
      backgroundColor:
        typeof item?.backgroundColor === "string" && item.backgroundColor.trim()
          ? item.backgroundColor.trim()
          : fallback.backgroundColor || "#d7dde7",
    };
  }

  function loadCases() {
    try {
      const storedCases = global.localStorage.getItem(casesStorageKey);

      if (!storedCases) {
        return cloneDefaultCases();
      }

      const parsedCases = JSON.parse(storedCases);

      if (!Array.isArray(parsedCases) || parsedCases.length === 0) {
        return cloneDefaultCases();
      }

      return parsedCases.map((item, index) => normalizeCase(item, defaultCases[index]));
    } catch (error) {
      return cloneDefaultCases();
    }
  }

  function saveCases(cases) {
    try {
      global.localStorage.setItem(casesStorageKey, JSON.stringify(cases));
      return true;
    } catch (error) {
      return false;
    }
  }

  global.PortfolioStore = {
    casesStorageKey,
    themeStorageKey,
    defaultCases,
    cloneDefaultCases,
    createCaseId,
    normalizeCase,
    loadCases,
    saveCases,
  };
})(window);
