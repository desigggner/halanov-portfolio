const fs = require("node:fs/promises");
const path = require("node:path");

const CASES_STORAGE_KEY = "portfolio:cases:v1";
const MAX_CASES_COUNT = 60;
const fileStorePath = path.join(process.cwd(), ".cases", "cases.json");
const defaultPortfolioCategory = "product";
const builtInCaseImageAliases = {
  "./assets/invert-case-bg.png": "./assets/invert-case-bg.jpg",
  "./assets/10Q.png": "./assets/10Q.jpg",
  "./assets/pulse.png": "./assets/pulse.jpg",
  "./assets/szu.png": "./assets/szu.jpg",
};
const builtInCaseVideoAliases = {
  "./assets/szu.mov": "./assets/szu.mp4",
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
    video: "./assets/invert-case-bg.mp4",
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
    video: "./assets/szu.mp4",
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

let memoryCases = cloneDefaultCases();

function cloneDefaultCases() {
  return defaultCases.map((item) => ({ ...item }));
}

function getUpstashConfig() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "",
  };
}

function hasUpstashConfig() {
  const config = getUpstashConfig();
  return Boolean(config.url && config.token);
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

function getStorageInfo(mode, persistent, warning = "") {
  return {
    mode,
    persistent,
    warning,
  };
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

  if (normalized) {
    return normalized;
  }

  return `case-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

  const normalized = builtInCaseVideoAliases[video.trim()] || video.trim();

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
  const shouldUseFallbackVideo = !normalizedVideo && Boolean(fallback.video);

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

  const normalized = items
    .slice(0, MAX_CASES_COUNT)
    .map((item, index) => normalizeCase(item, resolveDefaultCaseFallback(item, index)));

  if (normalized.length || options.allowEmpty) {
    return normalized;
  }

  return cloneDefaultCases();
}

async function executeUpstashPipeline(commands) {
  const config = getUpstashConfig();
  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    throw new Error(`Upstash returned ${response.status}.`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload)) {
    throw new Error("Upstash returned an invalid payload.");
  }

  for (const item of payload) {
    if (item?.error) {
      throw new Error(item.error);
    }
  }

  return payload;
}

async function ensureLocalStoreFile() {
  await fs.mkdir(path.dirname(fileStorePath), { recursive: true });

  try {
    await fs.access(fileStorePath);
  } catch (error) {
    await fs.writeFile(fileStorePath, JSON.stringify(cloneDefaultCases(), null, 2), "utf8");
  }
}

async function loadCasesFromFile() {
  await ensureLocalStoreFile();

  try {
    const rawValue = await fs.readFile(fileStorePath, "utf8");
    return JSON.parse(rawValue);
  } catch (error) {
    return cloneDefaultCases();
  }
}

async function saveCasesToFile(cases) {
  await ensureLocalStoreFile();
  await fs.writeFile(fileStorePath, JSON.stringify(cases, null, 2), "utf8");
}

async function loadCasesFromUpstash() {
  const payload = await executeUpstashPipeline([["GET", CASES_STORAGE_KEY]]);
  const rawValue = payload[0]?.result;

  if (!rawValue) {
    return {
      cases: cloneDefaultCases(),
      storage: getStorageInfo("upstash", true),
    };
  }

  try {
    return {
      cases: normalizeCases(JSON.parse(rawValue), { allowEmpty: true }),
      storage: getStorageInfo("upstash", true),
    };
  } catch (error) {
    return {
      cases: cloneDefaultCases(),
      storage: getStorageInfo("upstash", true),
    };
  }
}

async function saveCasesToUpstash(cases) {
  const normalizedCases = normalizeCases(cases, { allowEmpty: true });

  await executeUpstashPipeline([["SET", CASES_STORAGE_KEY, JSON.stringify(normalizedCases)]]);

  return {
    cases: normalizedCases,
    storage: getStorageInfo("upstash", true),
  };
}

async function loadCasesFromFileStore() {
  return {
    cases: normalizeCases(await loadCasesFromFile(), { allowEmpty: true }),
    storage: getStorageInfo("file", true),
  };
}

async function saveCasesToFileStore(cases) {
  const normalizedCases = normalizeCases(cases, { allowEmpty: true });
  await saveCasesToFile(normalizedCases);

  return {
    cases: normalizedCases,
    storage: getStorageInfo("file", true),
  };
}

function loadCasesFromMemory() {
  return {
    cases: normalizeCases(memoryCases, { allowEmpty: true }),
    storage: getStorageInfo(
      "memory",
      false,
      "На продакшене без Redis кейсы хранятся только в памяти процесса. После деплоя или перезапуска они могут пропасть. Добавь Upstash/Vercel KV REST env.",
    ),
  };
}

function saveCasesToMemory(cases) {
  memoryCases = normalizeCases(cases, { allowEmpty: true });

  return {
    cases: normalizeCases(memoryCases, { allowEmpty: true }),
    storage: getStorageInfo(
      "memory",
      false,
      "На продакшене без Redis кейсы хранятся только в памяти процесса. После деплоя или перезапуска они могут пропасть. Добавь Upstash/Vercel KV REST env.",
    ),
  };
}

async function loadStoredCases() {
  if (hasUpstashConfig()) {
    return loadCasesFromUpstash();
  }

  if (!isVercelRuntime()) {
    return loadCasesFromFileStore();
  }

  return loadCasesFromMemory();
}

async function saveStoredCases(cases) {
  if (hasUpstashConfig()) {
    return saveCasesToUpstash(cases);
  }

  if (!isVercelRuntime()) {
    return saveCasesToFileStore(cases);
  }

  return saveCasesToMemory(cases);
}

async function resetStoredCases() {
  return saveStoredCases(cloneDefaultCases());
}

module.exports = {
  CASES_STORAGE_KEY,
  MAX_CASES_COUNT,
  defaultCases,
  cloneDefaultCases,
  normalizeCase,
  normalizeCases,
  loadStoredCases,
  saveStoredCases,
  resetStoredCases,
};
