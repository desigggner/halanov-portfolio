const crypto = require("node:crypto");

const allowedEventTypes = new Set(["pageview", "click", "page_exit"]);
const availableRanges = {
  "7d": { id: "7d", label: "7 дней", days: 7 },
  "30d": { id: "30d", label: "30 дней", days: 30 },
  "90d": { id: "90d", label: "90 дней", days: 90 },
  all: { id: "all", label: "За всё время", days: null },
};

function sanitizeText(value, maxLength = 160) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function sanitizeIdentifier(value, fallbackPrefix) {
  const normalized = sanitizeText(value, 96).replace(/[^a-zA-Z0-9:_-]/g, "");

  if (normalized) {
    return normalized;
  }

  return `${fallbackPrefix}-${crypto.randomUUID()}`;
}

function sanitizeNumber(value, options = {}) {
  const min = Number.isFinite(options.min) ? options.min : 0;
  const max = Number.isFinite(options.max) ? options.max : Number.MAX_SAFE_INTEGER;
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return min;
  }

  return Math.min(Math.max(parsed, min), max);
}

function sanitizePath(value) {
  const normalized = sanitizeText(value, 240);
  return normalized.startsWith("/") ? normalized : "/";
}

function sanitizeUrl(value) {
  const normalized = sanitizeText(value, 320);

  if (!normalized) {
    return "";
  }

  try {
    const parsed = new URL(normalized);
    return parsed.toString();
  } catch (error) {
    return "";
  }
}

function sanitizeDimension(value) {
  const normalized = sanitizeText(value, 24);
  return /^\d{2,5}x\d{2,5}$/.test(normalized) ? normalized : "";
}

function decodeHeaderValue(value = "") {
  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function normalizeTheme(value) {
  return value === "dark" ? "dark" : "light";
}

function normalizeUtm(value = {}) {
  return {
    source: sanitizeText(value.source, 80),
    medium: sanitizeText(value.medium, 80),
    campaign: sanitizeText(value.campaign, 120),
    content: sanitizeText(value.content, 120),
    term: sanitizeText(value.term, 120),
  };
}

function detectBrowser(userAgent = "") {
  if (/edg\//i.test(userAgent)) {
    return "Edge";
  }

  if (/opr\//i.test(userAgent) || /opera/i.test(userAgent)) {
    return "Opera";
  }

  if (/samsungbrowser/i.test(userAgent)) {
    return "Samsung Internet";
  }

  if (/firefox|fxios/i.test(userAgent)) {
    return "Firefox";
  }

  if (/chrome|crios/i.test(userAgent) && !/edg\//i.test(userAgent)) {
    return "Chrome";
  }

  if (/safari/i.test(userAgent) && !/chrome|crios|android/i.test(userAgent)) {
    return "Safari";
  }

  return "Неизвестно";
}

function detectOperatingSystem(userAgent = "") {
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "iOS";
  }

  if (/android/i.test(userAgent)) {
    return "Android";
  }

  if (/windows/i.test(userAgent)) {
    return "Windows";
  }

  if (/mac os x|macintosh/i.test(userAgent)) {
    return "macOS";
  }

  if (/linux/i.test(userAgent)) {
    return "Linux";
  }

  return "Неизвестно";
}

function detectDeviceType(client = {}, userAgent = "") {
  const viewportWidth = sanitizeNumber(client.viewportWidth, { min: 0, max: 10000 });

  if (/ipad|tablet/i.test(userAgent) || (viewportWidth >= 768 && viewportWidth <= 1024)) {
    return "tablet";
  }

  if (/mobile|iphone|ipod|android/i.test(userAgent) || (viewportWidth > 0 && viewportWidth < 768)) {
    return "mobile";
  }

  return "desktop";
}

function readGeoFromHeaders(headers) {
  return {
    continent: sanitizeText(headers["x-vercel-ip-continent"] || "", 8),
    country: sanitizeText(headers["x-vercel-ip-country"] || "", 8),
    region: decodeHeaderValue(headers["x-vercel-ip-country-region"] || ""),
    city: decodeHeaderValue(headers["x-vercel-ip-city"] || ""),
    timezone: sanitizeText(headers["x-vercel-ip-timezone"] || "", 64),
    postalCode: sanitizeText(headers["x-vercel-ip-postal-code"] || "", 24),
  };
}

function createSourceLabel(referrer, utm) {
  if (utm.source) {
    return [utm.source, utm.medium].filter(Boolean).join(" / ");
  }

  if (!referrer) {
    return "Прямой";
  }

  try {
    return new URL(referrer).host;
  } catch (error) {
    return "Прямой";
  }
}

function normalizeAnalyticsEvent(req, body) {
  const type = sanitizeText(body?.type, 32);

  if (!allowedEventTypes.has(type)) {
    return null;
  }

  const userAgent = sanitizeText(req.headers["user-agent"] || "", 240);
  const geo = readGeoFromHeaders(req.headers);
  const client = body?.client || {};
  const utm = normalizeUtm(body?.acquisition?.utm);
  const referrer = sanitizeUrl(body?.page?.referrer || "");
  const viewportWidth = sanitizeNumber(client.viewportWidth, { min: 0, max: 10000 });
  const viewportHeight = sanitizeNumber(client.viewportHeight, { min: 0, max: 10000 });

  const normalizedEvent = {
    id: `evt-${Date.now().toString(36)}-${crypto.randomUUID()}`,
    type,
    timestamp: new Date().toISOString(),
    visitorId: sanitizeIdentifier(body?.visitorId, "visitor"),
    sessionId: sanitizeIdentifier(body?.sessionId, "session"),
    page: {
      path: sanitizePath(body?.page?.path || "/"),
      name: sanitizeText(body?.page?.name, 120),
      title: sanitizeText(body?.page?.title, 160),
      referrer,
      sourceLabel: createSourceLabel(referrer, utm),
    },
    acquisition: {
      utm,
    },
    client: {
      theme: normalizeTheme(client.theme),
      language: sanitizeText(client.language, 32),
      timezone: sanitizeText(client.timezone, 64),
      screen: sanitizeDimension(client.screen),
      viewport: sanitizeDimension(client.viewport),
      viewportWidth,
      viewportHeight,
      visitCount: sanitizeNumber(client.visitCount, { min: 1, max: 99999 }),
      isReturning: Boolean(client.isReturning) || sanitizeNumber(client.visitCount, { min: 0 }) > 1,
      browser: detectBrowser(userAgent),
      operatingSystem: detectOperatingSystem(userAgent),
      deviceType: detectDeviceType({ viewportWidth }, userAgent),
    },
    geo,
    details: {},
  };

  if (type === "click") {
    normalizedEvent.details = {
      targetCategory: sanitizeText(body?.details?.targetCategory, 80),
      targetLabel: sanitizeText(body?.details?.targetLabel, 180),
      href: sanitizeUrl(body?.details?.href || ""),
      section: sanitizeText(body?.details?.section, 80),
      caseId: sanitizeText(body?.details?.caseId, 80),
    };
  }

  if (type === "page_exit") {
    normalizedEvent.details = {
      engagementMs: sanitizeNumber(body?.details?.engagementMs, { min: 0, max: 1000 * 60 * 60 * 4 }),
      maxScrollPercent: sanitizeNumber(body?.details?.maxScrollPercent, { min: 0, max: 100 }),
    };
  }

  return normalizedEvent;
}

function getAnalyticsRange(rangeId) {
  return availableRanges[rangeId] || availableRanges["30d"];
}

function filterEventsByRange(events, range) {
  if (!range.days) {
    return events;
  }

  const now = Date.now();
  const minTimestamp = now - range.days * 24 * 60 * 60 * 1000;

  return events.filter((event) => {
    const timestamp = Date.parse(event.timestamp);
    return Number.isFinite(timestamp) && timestamp >= minTimestamp;
  });
}

function groupEventsBySession(events) {
  const sessions = new Map();

  for (const event of events) {
    const sessionId = event.sessionId || "session-unknown";
    const current = sessions.get(sessionId) || [];
    current.push(event);
    sessions.set(sessionId, current);
  }

  return sessions;
}

function incrementCounter(map, key, amount = 1, meta = undefined) {
  if (!key) {
    return;
  }

  const current = map.get(key) || { label: key, value: 0 };
  current.value += amount;

  if (meta && meta.hint) {
    current.hint = meta.hint;
  }

  map.set(key, current);
}

function sortCounterMap(map, limit = 8) {
  return Array.from(map.values())
    .sort((firstItem, secondItem) => secondItem.value - firstItem.value)
    .slice(0, limit);
}

function roundMetric(value, precision = 1) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function buildLocationLabel(event) {
  const city = event.geo?.city;
  const country = event.geo?.country;

  if (city && country) {
    return `${city}, ${country}`;
  }

  return city || country || "Не определено";
}

function buildDeviceLabel(event) {
  const typeMap = {
    desktop: "Desktop",
    mobile: "Mobile",
    tablet: "Tablet",
  };

  return typeMap[event.client?.deviceType] || "Desktop";
}

function buildAnalyticsReport(events, options = {}) {
  const range = getAnalyticsRange(options.range);
  const filteredEvents = filterEventsByRange(events, range)
    .filter(Boolean)
    .sort((firstEvent, secondEvent) => Date.parse(secondEvent.timestamp) - Date.parse(firstEvent.timestamp));
  const pageviewEvents = filteredEvents.filter((event) => event.type === "pageview");
  const clickEvents = filteredEvents.filter((event) => event.type === "click");
  const exitEvents = filteredEvents.filter((event) => event.type === "page_exit");
  const uniqueVisitors = new Set(pageviewEvents.map((event) => event.visitorId).filter(Boolean));
  const returningVisitors = new Set(
    pageviewEvents.filter((event) => event.client?.isReturning).map((event) => event.visitorId),
  );
  const sessionsMap = groupEventsBySession(filteredEvents);
  const topPages = new Map();
  const sources = new Map();
  const campaigns = new Map();
  const countries = new Map();
  const cities = new Map();
  const devices = new Map();
  const browsers = new Map();
  const operatingSystems = new Map();
  const languages = new Map();
  const timezones = new Map();
  const themes = new Map();
  const screens = new Map();
  const viewports = new Map();
  const interactions = new Map();
  const pageExitStats = new Map();

  for (const event of pageviewEvents) {
    const pageKey = event.page?.path || "/";
    const currentPage = topPages.get(pageKey) || {
      label: pageKey,
      value: 0,
      uniqueVisitors: new Set(),
    };

    currentPage.value += 1;
    currentPage.uniqueVisitors.add(event.visitorId);
    topPages.set(pageKey, currentPage);

    incrementCounter(sources, event.page?.sourceLabel || "Прямой");

    if (event.acquisition?.utm?.campaign) {
      incrementCounter(campaigns, event.acquisition.utm.campaign);
    }

    incrementCounter(countries, event.geo?.country || "Не определено");
    incrementCounter(cities, buildLocationLabel(event));
    incrementCounter(devices, buildDeviceLabel(event));
    incrementCounter(browsers, event.client?.browser || "Неизвестно");
    incrementCounter(operatingSystems, event.client?.operatingSystem || "Неизвестно");
    incrementCounter(languages, event.client?.language || "Не определено");
    incrementCounter(timezones, event.client?.timezone || event.geo?.timezone || "Не определено");
    incrementCounter(themes, event.client?.theme === "dark" ? "Тёмная" : "Светлая");
    incrementCounter(screens, event.client?.screen || "Не определено");
    incrementCounter(viewports, event.client?.viewport || "Не определено");
  }

  for (const event of clickEvents) {
    const label = event.details?.targetLabel || event.details?.targetCategory || "Клик";
    const hint = event.details?.targetCategory ? `Категория: ${event.details.targetCategory}` : "";
    incrementCounter(interactions, label, 1, { hint });
  }

  for (const event of exitEvents) {
    const pageKey = event.page?.path || "/";
    const pageStats = pageExitStats.get(pageKey) || {
      engagementMs: 0,
      maxScrollPercent: 0,
      count: 0,
    };

    pageStats.engagementMs += event.details?.engagementMs || 0;
    pageStats.maxScrollPercent += event.details?.maxScrollPercent || 0;
    pageStats.count += 1;
    pageExitStats.set(pageKey, pageStats);
  }

  const topPagesList = Array.from(topPages.values())
    .map((pageItem) => {
      const exitStats = pageExitStats.get(pageItem.label) || {
        engagementMs: 0,
        maxScrollPercent: 0,
        count: 0,
      };

      return {
        label: pageItem.label,
        value: pageItem.value,
        hint: [
          `уникальных: ${pageItem.uniqueVisitors.size}`,
          exitStats.count
            ? `средний скролл: ${roundMetric(exitStats.maxScrollPercent / exitStats.count, 0)}%`
            : "",
          exitStats.count
            ? `время: ${roundMetric(exitStats.engagementMs / exitStats.count / 1000, 0)} сек`
            : "",
        ]
          .filter(Boolean)
          .join(" • "),
      };
    })
    .sort((firstItem, secondItem) => secondItem.value - firstItem.value)
    .slice(0, 8);

  const sessionStats = Array.from(sessionsMap.values()).map((sessionEvents) => {
    const pageviewsInSession = sessionEvents.filter((event) => event.type === "pageview");
    const clicksInSession = sessionEvents.filter((event) => event.type === "click");
    const exitsInSession = sessionEvents.filter((event) => event.type === "page_exit");
    const totalEngagementMs = exitsInSession.reduce(
      (sum, event) => sum + (event.details?.engagementMs || 0),
      0,
    );
    const maxScrollPercent = exitsInSession.reduce(
      (maxValue, event) => Math.max(maxValue, event.details?.maxScrollPercent || 0),
      0,
    );

    return {
      pageviews: pageviewsInSession.length,
      clicks: clicksInSession.length,
      engagementMs: totalEngagementMs,
      maxScrollPercent,
    };
  });

  const sessionCount = sessionStats.length;
  const engagedSessions = sessionStats.filter(
    (session) =>
      session.engagementMs >= 15000 || session.maxScrollPercent >= 50 || session.clicks > 0,
  ).length;
  const bounceSessions = sessionStats.filter(
    (session) =>
      session.pageviews <= 1 && session.clicks === 0 && session.engagementMs < 15000,
  ).length;
  const totalEngagementMs = exitEvents.reduce(
    (sum, event) => sum + (event.details?.engagementMs || 0),
    0,
  );
  const totalScrollPercent = exitEvents.reduce(
    (sum, event) => sum + (event.details?.maxScrollPercent || 0),
    0,
  );

  return {
    range,
    generatedAt: new Date().toISOString(),
    summary: {
      pageviews: pageviewEvents.length,
      visitors: uniqueVisitors.size,
      sessions: sessionCount,
      returningVisitors: returningVisitors.size,
      clicks: clickEvents.length,
      avgEngagementSeconds: exitEvents.length
        ? roundMetric(totalEngagementMs / exitEvents.length / 1000, 0)
        : 0,
      avgScrollPercent: exitEvents.length
        ? roundMetric(totalScrollPercent / exitEvents.length, 0)
        : 0,
      avgPagesPerSession: sessionCount
        ? roundMetric(pageviewEvents.length / sessionCount, 1)
        : 0,
      bounceRatePercent: sessionCount
        ? roundMetric((bounceSessions / sessionCount) * 100, 0)
        : 0,
      engagedRatePercent: sessionCount
        ? roundMetric((engagedSessions / sessionCount) * 100, 0)
        : 0,
      eventsStored: events.length,
      eventsInRange: filteredEvents.length,
    },
    topPages: topPagesList,
    sources: sortCounterMap(sources, 8),
    campaigns: sortCounterMap(campaigns, 6),
    countries: sortCounterMap(countries, 8),
    cities: sortCounterMap(cities, 8),
    devices: sortCounterMap(devices, 6),
    browsers: sortCounterMap(browsers, 6),
    operatingSystems: sortCounterMap(operatingSystems, 6),
    languages: sortCounterMap(languages, 6),
    timezones: sortCounterMap(timezones, 6),
    themes: sortCounterMap(themes, 4),
    screens: sortCounterMap(screens, 6),
    viewports: sortCounterMap(viewports, 6),
    interactions: sortCounterMap(interactions, 10),
    recentVisits: pageviewEvents.slice(0, 14).map((event) => {
      const relatedExit = exitEvents.find(
        (exitEvent) =>
          exitEvent.sessionId === event.sessionId && exitEvent.page?.path === event.page?.path,
      );

      return {
        timestamp: event.timestamp,
        page: event.page?.path || "/",
        source: event.page?.sourceLabel || "Прямой",
        location: buildLocationLabel(event),
        device: buildDeviceLabel(event),
        browser: event.client?.browser || "Неизвестно",
        operatingSystem: event.client?.operatingSystem || "Неизвестно",
        theme: event.client?.theme === "dark" ? "Тёмная" : "Светлая",
        screen: event.client?.screen || "—",
        viewport: event.client?.viewport || "—",
        language: event.client?.language || "—",
        timezone: event.client?.timezone || event.geo?.timezone || "—",
        isReturning: Boolean(event.client?.isReturning),
        scrollPercent: relatedExit?.details?.maxScrollPercent || 0,
        engagementSeconds: relatedExit?.details?.engagementMs
          ? roundMetric(relatedExit.details.engagementMs / 1000, 0)
          : 0,
      };
    }),
    recentClicks: clickEvents.slice(0, 14).map((event) => ({
      timestamp: event.timestamp,
      page: event.page?.path || "/",
      target: event.details?.targetLabel || "Клик",
      category: event.details?.targetCategory || "interaction",
      href: event.details?.href || "",
    })),
  };
}

module.exports = {
  availableRanges,
  getAnalyticsRange,
  normalizeAnalyticsEvent,
  buildAnalyticsReport,
};
