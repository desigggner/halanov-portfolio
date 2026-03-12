const siteAccessCookieName = "portfolio_site_session";
const publicPaths = new Set(["/auth.html", "/api/site-auth"]);
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

async function createSessionSignature(expiresAt, secret) {
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
    new TextEncoder().encode(`${siteAccessCookieName}:${expiresAt}`),
  );

  return Array.from(new Uint8Array(signatureBuffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function hasValidSiteSession(cookieHeader = "", secret = "") {
  if (!secret) {
    return false;
  }

  const token = parseCookies(cookieHeader)[siteAccessCookieName];

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

  const expectedSignature = await createSessionSignature(expiresAt, secret);
  return signature === expectedSignature;
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

export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const siteAccessSecret = getSiteAccessSecret();
  const hasSession = await hasValidSiteSession(
    request.headers.get("cookie") || "",
    siteAccessSecret,
  );

  if (isAllowedStaticPath(pathname) || publicPaths.has(pathname)) {
    if (pathname === "/auth.html" && hasSession) {
      const nextUrl = url.searchParams.get("next");
      const destination = new URL(
        isSafeNextPath(nextUrl) ? nextUrl : "/",
        request.url,
      );

      return Response.redirect(destination, 302);
    }

    return;
  }

  if (hasSession) {
    return;
  }

  if (pathname.startsWith("/api/")) {
    return createUnauthorizedApiResponse();
  }

  const loginUrl = new URL("/auth.html", request.url);
  const nextTarget = `${pathname}${url.search}`;

  if (isSafeNextPath(nextTarget)) {
    loginUrl.searchParams.set("next", nextTarget);
  }

  return Response.redirect(loginUrl, 307);
}
