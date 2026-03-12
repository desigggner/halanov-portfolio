const crypto = require("crypto");

const siteAccessCookieName = "portfolio_site_session";
const siteAccessMaxAgeSeconds = 60 * 60 * 24 * 30;

function resolveSiteAccessCredentials() {
  return {
    login: String(process.env.SITE_ACCESS_LOGIN || "").trim(),
    password: String(process.env.SITE_ACCESS_PASSWORD || "").trim(),
  };
}

function resolveSiteAccessSecret() {
  return String(process.env.SITE_ACCESS_SECRET || "").trim();
}

function hasSiteAccessConfiguration() {
  const credentials = resolveSiteAccessCredentials();
  const secret = resolveSiteAccessSecret();

  return Boolean(credentials.login && credentials.password && secret);
}

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .reduce((cookies, chunk) => {
      const separatorIndex = chunk.indexOf("=");

      if (separatorIndex === -1) {
        return cookies;
      }

      const key = chunk.slice(0, separatorIndex).trim();
      const value = chunk.slice(separatorIndex + 1).trim();

      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function createSessionSignature(expiresAt, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${siteAccessCookieName}:${expiresAt}`)
    .digest("hex");
}

function createSiteSessionToken(options = {}) {
  const secret = String(options.secret || resolveSiteAccessSecret()).trim();

  if (!secret) {
    return "";
  }

  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const expiresAt = Math.floor(now / 1000) + siteAccessMaxAgeSeconds;

  return `${expiresAt}.${createSessionSignature(String(expiresAt), secret)}`;
}

function verifySiteSessionToken(token, options = {}) {
  if (typeof token !== "string" || !token) {
    return false;
  }

  const secret = String(options.secret || resolveSiteAccessSecret()).trim();

  if (!secret) {
    return false;
  }

  const [expiresAt, signature] = token.split(".");

  if (!/^\d+$/.test(expiresAt) || !/^[a-f0-9]{64}$/i.test(signature || "")) {
    return false;
  }

  if (Number.parseInt(expiresAt, 10) <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = createSessionSignature(expiresAt, secret);
  const providedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  return (
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

function hasValidSiteSession(cookieHeader = "", options = {}) {
  const cookies = parseCookies(cookieHeader);
  return verifySiteSessionToken(cookies[siteAccessCookieName], options);
}

function createSiteSessionCookie(options = {}) {
  const token = createSiteSessionToken(options);
  const attributes = [
    `${siteAccessCookieName}=${encodeURIComponent(token)}`,
    `Max-Age=${siteAccessMaxAgeSeconds}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (options.secure) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

function clearSiteSessionCookie(options = {}) {
  const attributes = [
    `${siteAccessCookieName}=`,
    "Max-Age=0",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (options.secure) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

module.exports = {
  siteAccessCookieName,
  siteAccessMaxAgeSeconds,
  resolveSiteAccessCredentials,
  resolveSiteAccessSecret,
  hasSiteAccessConfiguration,
  parseCookies,
  createSiteSessionToken,
  verifySiteSessionToken,
  hasValidSiteSession,
  createSiteSessionCookie,
  clearSiteSessionCookie,
};
