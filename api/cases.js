const {
  loadStoredCases,
  saveStoredCases,
  resetStoredCases,
} = require("../lib/cases-storage");
const { hasValidAdminSession, resolveAdminAccessSecret } = require("../lib/admin-access");
const { enforceRateLimit } = require("../lib/rate-limit");
const {
  isCrossSiteRequest,
  setCommonResponseHeaders,
  rejectCrossSiteRequest,
  ensureJsonRequest,
  parseJsonBody,
  PayloadTooLargeError,
} = require("../lib/request-security");

const casesBodyLimitBytes = 6 * 1024 * 1024;

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  setCommonResponseHeaders(res);

  const method = String(req.method || "").toUpperCase();
  const limitByMethod = {
    GET: { name: "cases-read", limit: 90, windowMs: 5 * 60 * 1000 },
    POST: { name: "cases-write", limit: 20, windowMs: 10 * 60 * 1000 },
    DELETE: { name: "cases-reset", limit: 10, windowMs: 10 * 60 * 1000 },
  };
  const rateLimitOptions = limitByMethod[method];

  if (!rateLimitOptions) {
    res.setHeader("Allow", "GET, POST, DELETE");
    res.status(405).json({ ok: false, error: "Метод не поддерживается." });
    return;
  }

  if (!(await enforceRateLimit(req, res, rateLimitOptions))) {
    return;
  }

  if (isCrossSiteRequest(req)) {
    rejectCrossSiteRequest(res);
    return;
  }

  if (method === "GET") {
    try {
      const { cases, storage } = await loadStoredCases();

      res.status(200).json({
        ok: true,
        cases,
        storage,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error?.message || "Не удалось загрузить кейсы.",
      });
    }

    return;
  }

  if (!hasValidAdminSession(req.headers.cookie || "", { secret: resolveAdminAccessSecret() })) {
    res.status(403).json({
      ok: false,
      error: "Требуется доступ администратора.",
    });
    return;
  }

  if (method === "DELETE") {
    try {
      const { cases, storage } = await resetStoredCases();

      res.status(200).json({
        ok: true,
        cases,
        storage,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error?.message || "Не удалось сбросить кейсы.",
      });
    }

    return;
  }

  if (!ensureJsonRequest(req, res)) {
    return;
  }

  try {
    const body = await parseJsonBody(req, { maxBytes: casesBodyLimitBytes });

    if (!Array.isArray(body?.cases)) {
      res.status(400).json({
        ok: false,
        error: "Ожидается массив кейсов.",
      });
      return;
    }

    const { cases, storage } = await saveStoredCases(body.cases);

    res.status(200).json({
      ok: true,
      cases,
      storage,
    });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      res.status(error.statusCode).json({ ok: false, error: error.message });
      return;
    }

    res.status(500).json({
      ok: false,
      error: error?.message || "Не удалось сохранить кейсы.",
    });
  }
};
