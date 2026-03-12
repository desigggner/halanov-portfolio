const crypto = require("crypto");

const adminAccessCookieName = "portfolio_admin_session";
const adminAccessMaxAgeSeconds = 60 * 60 * 12;
const defaultAdminAccessCredentials = {
  login: "admin",
  password: "portfolio2026",
};
const defaultAdminAccessSecret = "portfolio-admin-access-fallback-v1";

function resolveAdminAccessCredentials() {
  return {
    login: String(
      process.env.ADMIN_ACCESS_LOGIN || defaultAdminAccessCredentials.login,
    ).trim(),
    password: String(
      process.env.ADMIN_ACCESS_PASSWORD || defaultAdminAccessCredentials.password,
    ).trim(),
  };
}

function resolveAdminAccessSecret() {
  return String(process.env.ADMIN_ACCESS_SECRET || defaultAdminAccessSecret).trim();
}

function hasAdminAccessConfiguration() {
  const credentials = resolveAdminAccessCredentials();
  const secret = resolveAdminAccessSecret();

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
    .update(`${adminAccessCookieName}:${expiresAt}`)
    .digest("hex");
}

function createAdminSessionToken(options = {}) {
  const secret = String(options.secret || resolveAdminAccessSecret()).trim();

  if (!secret) {
    return "";
  }

  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const expiresAt = Math.floor(now / 1000) + adminAccessMaxAgeSeconds;

  return `${expiresAt}.${createSessionSignature(String(expiresAt), secret)}`;
}

function verifyAdminSessionToken(token, options = {}) {
  if (typeof token !== "string" || !token) {
    return false;
  }

  const secret = String(options.secret || resolveAdminAccessSecret()).trim();

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

function hasValidAdminSession(cookieHeader = "", options = {}) {
  const cookies = parseCookies(cookieHeader);
  return verifyAdminSessionToken(cookies[adminAccessCookieName], options);
}

function createAdminSessionCookie(options = {}) {
  const token = createAdminSessionToken(options);
  const attributes = [
    `${adminAccessCookieName}=${encodeURIComponent(token)}`,
    `Max-Age=${adminAccessMaxAgeSeconds}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Priority=High",
  ];

  if (options.secure) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

function clearAdminSessionCookie(options = {}) {
  const attributes = [
    `${adminAccessCookieName}=`,
    "Max-Age=0",
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Priority=High",
  ];

  if (options.secure) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

module.exports = {
  adminAccessCookieName,
  adminAccessMaxAgeSeconds,
  defaultAdminAccessCredentials,
  resolveAdminAccessCredentials,
  resolveAdminAccessSecret,
  hasAdminAccessConfiguration,
  parseCookies,
  createAdminSessionToken,
  verifyAdminSessionToken,
  hasValidAdminSession,
  createAdminSessionCookie,
  clearAdminSessionCookie,
};
