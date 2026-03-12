const {
  resolveSiteAccessCredentials,
  resolveSiteAccessSecret,
  hasSiteAccessConfiguration,
  createSiteSessionCookie,
  clearSiteSessionCookie,
} = require("../lib/site-access");
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

  const secure = isSecureRequest(req);

  if (
    !(await enforceRateLimit(req, res, {
      name: req.method === "DELETE" ? "site-auth-logout" : "site-auth-login",
      limit: req.method === "DELETE" ? 30 : 8,
      windowMs: 10 * 60 * 1000,
    }))
  ) {
    return;
  }

  if (isCrossSiteRequest(req)) {
    rejectCrossSiteRequest(res);
    return;
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearSiteSessionCookie({ secure }));
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, DELETE");
    res.status(405).json({ ok: false, error: "Метод не поддерживается." });
    return;
  }

  if (!ensureJsonRequest(req, res)) {
    return;
  }

  if (!hasSiteAccessConfiguration()) {
    res.status(500).json({
      ok: false,
      error: "Авторизация сайта не настроена на сервере.",
    });
    return;
  }

  try {
    const body = await parseJsonBody(req, { maxBytes: 4096 });
    const login = String(body.login || "").trim();
    const password = String(body.password || "").trim();
    const credentials = resolveSiteAccessCredentials();
    const secret = resolveSiteAccessSecret();

    if (login !== credentials.login || password !== credentials.password) {
      res.status(401).json({ ok: false, error: "Неверный логин или пароль." });
      return;
    }

    res.setHeader("Set-Cookie", createSiteSessionCookie({ secure, secret }));
    res.status(200).json({ ok: true });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      res.status(error.statusCode).json({ ok: false, error: error.message });
      return;
    }

    res.status(500).json({
      ok: false,
      error: error?.message || "Не удалось выполнить вход.",
    });
  }
};
