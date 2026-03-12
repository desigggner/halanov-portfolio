const {
  resolveSiteAccessCredentials,
  resolveSiteAccessSecret,
  hasSiteAccessConfiguration,
  createSiteSessionCookie,
  clearSiteSessionCookie,
} = require("../lib/site-access");

function isSecureRequest(req) {
  return (
    req.headers["x-forwarded-proto"] === "https" ||
    req.headers["x-forwarded-ssl"] === "on" ||
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.VERCEL)
  );
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    req.on("error", reject);
  });
}

async function parseRequestBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const rawBody =
    typeof req.body === "string" && req.body
      ? req.body
      : await readRawBody(req);

  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    return {};
  }
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  const secure = isSecureRequest(req);

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

  if (!hasSiteAccessConfiguration()) {
    res.status(500).json({
      ok: false,
      error: "Авторизация сайта не настроена на сервере.",
    });
    return;
  }

  const body = await parseRequestBody(req);
  const login = String(body.login || "").trim();
  const password = String(body.password || "").trim();
  const credentials = resolveSiteAccessCredentials();
  const secret = resolveSiteAccessSecret();

  if (
    login !== credentials.login ||
    password !== credentials.password
  ) {
    res.status(401).json({ ok: false, error: "Неверный логин или пароль." });
    return;
  }

  res.setHeader("Set-Cookie", createSiteSessionCookie({ secure, secret }));
  res.status(200).json({ ok: true });
};
