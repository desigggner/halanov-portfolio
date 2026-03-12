const siteAccessCookieName = "portfolio_site_session";
const adminAccessCookieName = "portfolio_admin_session";
const publicPaths = new Set([
  "/auth",
  "/auth.html",
  "/api/site-auth",
  "/site-theme-init.js",
  "/site-auth.js",
]);
const adminPublicPaths = new Set([
  "/admin",
  "/admin/",
  "/admin/index.html",
  "/api/admin-auth",
]);
const hexAlphabet = /^[a-f0-9]{64}$/i;

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

function getSiteAccessSecret() {
  return String(process.env.SITE_ACCESS_SECRET || "").trim();
}

function getAdminAccessSecret() {
  return String(process.env.ADMIN_ACCESS_SECRET || "").trim();
}

async function createSessionSignature(cookieName, expiresAt, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${cookieName}:${expiresAt}`),
  );

  return Array.from(new Uint8Array(signatureBuffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function timingSafeEqual(firstValue = "", secondValue = "") {
  if (firstValue.length !== secondValue.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < firstValue.length; index += 1) {
    mismatch |= firstValue.charCodeAt(index) ^ secondValue.charCodeAt(index);
  }

  return mismatch === 0;
}

async function hasValidSession(cookieHeader = "", options = {}) {
  const secret = String(options.secret || "").trim();
  const cookieName = String(options.cookieName || "").trim();

  if (!secret) {
    return false;
  }

  const token = parseCookies(cookieHeader)[cookieName];

  if (typeof token !== "string" || !token) {
    return false;
  }

  const [expiresAt, signature] = token.split(".");

  if (!/^\d+$/.test(expiresAt) || !hexAlphabet.test(signature || "")) {
    return false;
  }

  if (Number.parseInt(expiresAt, 10) <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = await createSessionSignature(cookieName, expiresAt, secret);
  return timingSafeEqual(signature, expectedSignature);
}

function isAllowedStaticPath(pathname) {
  return (
    pathname.startsWith("/.well-known/") ||
    pathname === "/favicon.ico"
  );
}

function isSafeNextPath(value) {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/auth") &&
    !value.startsWith("/api/")
  );
}

function createUnauthorizedApiResponse() {
  return Response.json(
    {
      ok: false,
      error: "Требуется авторизация.",
    },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function createForbiddenApiResponse() {
  return Response.json(
    {
      ok: false,
      error: "Требуется доступ администратора.",
    },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function isAdminProtectedPath(pathname) {
  return pathname === "/api/analytics-report";
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const siteAccessSecret = getSiteAccessSecret();
  const adminAccessSecret = getAdminAccessSecret();
  const hasSiteSession = await hasValidSession(
    request.headers.get("cookie") || "",
    {
      cookieName: siteAccessCookieName,
      secret: siteAccessSecret,
    },
  );
  const hasAdminSession = await hasValidSession(
    request.headers.get("cookie") || "",
    {
      cookieName: adminAccessCookieName,
      secret: adminAccessSecret,
    },
  );

  if (isAllowedStaticPath(pathname) || publicPaths.has(pathname)) {
    if (pathname === "/auth.html" && hasSiteSession) {
      const nextUrl = url.searchParams.get("next");
      const destination = new URL(
        isSafeNextPath(nextUrl) ? nextUrl : "/",
        request.url,
      );

      return Response.redirect(destination, 302);
    }

    if (pathname === "/auth" && hasSiteSession) {
      const nextUrl = url.searchParams.get("next");
      const destination = new URL(
        isSafeNextPath(nextUrl) ? nextUrl : "/",
        request.url,
      );

      return Response.redirect(destination, 302);
    }

    return;
  }

  if (!hasSiteSession) {
    if (pathname.startsWith("/api/")) {
      return createUnauthorizedApiResponse();
    }

    const loginUrl = new URL("/auth", request.url);
    const nextTarget = `${pathname}${url.search}`;

    if (isSafeNextPath(nextTarget)) {
      loginUrl.searchParams.set("next", nextTarget);
    }

    return Response.redirect(loginUrl, 307);
  }

  if (adminPublicPaths.has(pathname)) {
    return;
  }

  if (isAdminProtectedPath(pathname) && !hasAdminSession) {
    if (pathname.startsWith("/api/")) {
      return createForbiddenApiResponse();
    }

    return Response.redirect(new URL("/admin", request.url), 307);
  }
}
