const {
  resolveAdminAccessCredentials,
  resolveAdminAccessSecret,
  hasAdminAccessConfiguration,
  hasValidAdminSession,
  createAdminSessionCookie,
  clearAdminSessionCookie,
} = require("../lib/admin-access");
const { enforceRateLimit } = require("../lib/rate-limit");
const {
  isSecureRequest,
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

  const limitByMethod = {
    GET: { name: "admin-auth-status", limit: 60, windowMs: 5 * 60 * 1000 },
    POST: { name: "admin-auth-login", limit: 5, windowMs: 10 * 60 * 1000 },
    DELETE: { name: "admin-auth-logout", limit: 30, windowMs: 10 * 60 * 1000 },
  };
  const rateLimitOptions = limitByMethod[String(req.method || "").toUpperCase()];

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

  const secure = isSecureRequest(req);

  if (req.method === "GET") {
    if (!hasAdminAccessConfiguration()) {
      res.status(503).json({
        ok: false,
        error: "Доступ администратора не настроен на сервере.",
      });
      return;
    }

    res.status(200).json({
      ok: true,
      authenticated: hasValidAdminSession(req.headers.cookie || "", {
        secret: resolveAdminAccessSecret(),
      }),
    });
    return;
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearAdminSessionCookie({ secure }));
    res.status(200).json({ ok: true });
    return;
  }

  if (!ensureJsonRequest(req, res)) {
    return;
  }

  if (!hasAdminAccessConfiguration()) {
    res.status(500).json({
      ok: false,
      error: "Доступ администратора не настроен на сервере.",
    });
    return;
  }

  try {
    const body = await parseJsonBody(req, { maxBytes: 4096 });
    const login = String(body.login || "").trim();
    const password = String(body.password || "").trim();
    const credentials = resolveAdminAccessCredentials();
    const secret = resolveAdminAccessSecret();

    if (login !== credentials.login || password !== credentials.password) {
      res.status(401).json({ ok: false, error: "Неверный логин или пароль." });
      return;
    }

    res.setHeader("Set-Cookie", createAdminSessionCookie({ secure, secret }));
    res.status(200).json({ ok: true });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      res.status(error.statusCode).json({ ok: false, error: error.message });
      return;
    }

    res.status(500).json({
      ok: false,
      error: error?.message || "Не удалось выполнить вход администратора.",
    });
  }
};
