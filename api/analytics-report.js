const { loadAnalyticsEvents } = require("../lib/analytics-storage");
const { buildAnalyticsReport, getAnalyticsRange } = require("../lib/analytics-report");
const { hasValidAdminSession, resolveAdminAccessSecret } = require("../lib/admin-access");
const { enforceRateLimit } = require("../lib/rate-limit");
const { setCommonResponseHeaders } = require("../lib/request-security");

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  setCommonResponseHeaders(res);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ ok: false, error: "Метод не поддерживается." });
    return;
  }

  if (
    !(await enforceRateLimit(req, res, {
      name: "analytics-report",
      limit: 30,
      windowMs: 5 * 60 * 1000,
    }))
  ) {
    return;
  }

  if (
    !hasValidAdminSession(req.headers.cookie || "", {
      secret: resolveAdminAccessSecret(),
    })
  ) {
    res.status(403).json({
      ok: false,
      error: "Требуется доступ администратора.",
    });
    return;
  }

  try {
    const range = getAnalyticsRange(req.query?.range || "30d");
    const { events, storage } = await loadAnalyticsEvents();
    const report = buildAnalyticsReport(events, { range: range.id });

    res.status(200).json({
      ok: true,
      storage,
      ...report,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error?.message || "Не удалось собрать отчёт аналитики.",
    });
  }
};
