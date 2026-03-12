const fs = require("node:fs/promises");
const path = require("node:path");

const ANALYTICS_EVENTS_KEY = "portfolio:analytics:events:v1";
const MAX_ANALYTICS_EVENTS = 5000;
const fileStorePath = path.join(process.cwd(), ".analytics", "events.json");

let memoryEvents = [];

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
    eventLimit: MAX_ANALYTICS_EVENTS,
  };
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

async function appendEventToUpstash(event) {
  await executeUpstashPipeline([
    ["LPUSH", ANALYTICS_EVENTS_KEY, JSON.stringify(event)],
    ["LTRIM", ANALYTICS_EVENTS_KEY, "0", String(MAX_ANALYTICS_EVENTS - 1)],
  ]);

  return getStorageInfo("upstash", true);
}

async function loadEventsFromUpstash(limit = MAX_ANALYTICS_EVENTS) {
  const normalizedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || MAX_ANALYTICS_EVENTS, 1), MAX_ANALYTICS_EVENTS);
  const payload = await executeUpstashPipeline([
    ["LRANGE", ANALYTICS_EVENTS_KEY, "0", String(normalizedLimit - 1)],
  ]);
  const rawEvents = Array.isArray(payload[0]?.result) ? payload[0].result : [];

  return {
    events: rawEvents
      .map((item) => {
        try {
          return JSON.parse(item);
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean),
    storage: getStorageInfo("upstash", true),
  };
}

async function ensureLocalStoreFile() {
  await fs.mkdir(path.dirname(fileStorePath), { recursive: true });

  try {
    await fs.access(fileStorePath);
  } catch (error) {
    await fs.writeFile(fileStorePath, "[]", "utf8");
  }
}

async function loadEventsFromFile() {
  await ensureLocalStoreFile();

  try {
    const rawValue = await fs.readFile(fileStorePath, "utf8");
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

async function saveEventsToFile(events) {
  await ensureLocalStoreFile();
  await fs.writeFile(fileStorePath, JSON.stringify(events, null, 2), "utf8");
}

async function appendEventToFile(event) {
  const events = await loadEventsFromFile();

  events.unshift(event);
  await saveEventsToFile(events.slice(0, MAX_ANALYTICS_EVENTS));

  return getStorageInfo("file", true);
}

async function loadEventsFromFileStore(limit = MAX_ANALYTICS_EVENTS) {
  const normalizedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || MAX_ANALYTICS_EVENTS, 1), MAX_ANALYTICS_EVENTS);
  const events = await loadEventsFromFile();

  return {
    events: events.slice(0, normalizedLimit),
    storage: getStorageInfo("file", true),
  };
}

function appendEventToMemory(event) {
  memoryEvents.unshift(event);
  memoryEvents = memoryEvents.slice(0, MAX_ANALYTICS_EVENTS);

  return getStorageInfo(
    "memory",
    false,
    "На продакшене без Redis аналитика хранится только в памяти процесса. Для постоянной статистики добавь Upstash/Vercel KV REST env.",
  );
}

function loadEventsFromMemory(limit = MAX_ANALYTICS_EVENTS) {
  const normalizedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || MAX_ANALYTICS_EVENTS, 1), MAX_ANALYTICS_EVENTS);

  return {
    events: memoryEvents.slice(0, normalizedLimit),
    storage: getStorageInfo(
      "memory",
      false,
      "На продакшене без Redis аналитика хранится только в памяти процесса. Для постоянной статистики добавь Upstash/Vercel KV REST env.",
    ),
  };
}

async function appendAnalyticsEvent(event) {
  if (hasUpstashConfig()) {
    return appendEventToUpstash(event);
  }

  if (!isVercelRuntime()) {
    return appendEventToFile(event);
  }

  return appendEventToMemory(event);
}

async function loadAnalyticsEvents(options = {}) {
  const limit = options.limit || MAX_ANALYTICS_EVENTS;

  if (hasUpstashConfig()) {
    return loadEventsFromUpstash(limit);
  }

  if (!isVercelRuntime()) {
    return loadEventsFromFileStore(limit);
  }

  return loadEventsFromMemory(limit);
}

module.exports = {
  ANALYTICS_EVENTS_KEY,
  MAX_ANALYTICS_EVENTS,
  appendAnalyticsEvent,
  loadAnalyticsEvents,
};
