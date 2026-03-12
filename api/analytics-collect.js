const { appendAnalyticsEvent } = require("../lib/analytics-storage");
const { normalizeAnalyticsEvent } = require("../lib/analytics-report");
const { enforceRateLimit } = require("../lib/rate-limit");
const {
  isCrossSiteRequest,
  setCommonResponseHeaders,
  rejectCrossSiteRequest,
  ensureJsonRequest,
  parseJsonBody,
  PayloadTooLargeError,
} = require("../lib/request-security");

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  setCommonResponseHeaders(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false, error: "Метод не поддерживается." });
    return;
  }

  if (
    !(await enforceRateLimit(req, res, {
      name: "analytics-collect",
      limit: 180,
      windowMs: 5 * 60 * 1000,
    }))
  ) {
    return;
  }

  if (isCrossSiteRequest(req)) {
    rejectCrossSiteRequest(res);
    return;
  }

  if (!ensureJsonRequest(req, res)) {
    return;
  }

  try {
    const body = await parseJsonBody(req, { maxBytes: 16 * 1024 });
    const event = normalizeAnalyticsEvent(req, body);

    if (!event) {
      res.status(400).json({ ok: false, error: "Событие не прошло валидацию." });
      return;
    }

    const storage = await appendAnalyticsEvent(event);
    res.status(200).json({ ok: true, storage });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      res.status(error.statusCode).json({ ok: false, error: error.message });
      return;
    }

    res.status(500).json({
      ok: false,
      error: error?.message || "Не удалось сохранить событие аналитики.",
    });
  }
};
