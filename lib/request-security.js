const DEFAULT_BODY_LIMIT_BYTES = 16 * 1024;

class PayloadTooLargeError extends Error {
  constructor(maxBytes = DEFAULT_BODY_LIMIT_BYTES) {
    super(`Размер запроса превышает допустимые ${maxBytes} байт.`);
    this.name = "PayloadTooLargeError";
    this.maxBytes = maxBytes;
    this.statusCode = 413;
  }
}

function readHeader(req, name) {
  const value = req?.headers?.[name];

  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return typeof value === "string" ? value : "";
}

function isSecureRequest(req) {
  return (
    readHeader(req, "x-forwarded-proto") === "https" ||
    readHeader(req, "x-forwarded-ssl") === "on" ||
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.VERCEL)
  );
}

function getRequestHost(req) {
  return (
    readHeader(req, "x-forwarded-host") ||
    readHeader(req, "host")
  ).trim();
}

function getClientIp(req) {
  const candidates = [
    readHeader(req, "x-vercel-forwarded-for"),
    readHeader(req, "x-forwarded-for"),
    readHeader(req, "cf-connecting-ip"),
    readHeader(req, "x-real-ip"),
    readHeader(req, "fastly-client-ip"),
  ];

  for (const candidate of candidates) {
    const value = candidate
      .split(",")
      .map((part) => part.trim())
      .find(Boolean);

    if (value) {
      return value.replace(/[^a-fA-F0-9:.,]/g, "").slice(0, 128) || "unknown";
    }
  }

  return "unknown";
}

function isCrossSiteRequest(req) {
  const secFetchSite = readHeader(req, "sec-fetch-site").toLowerCase();

  if (
    secFetchSite &&
    secFetchSite !== "same-origin" &&
    secFetchSite !== "same-site" &&
    secFetchSite !== "none"
  ) {
    return true;
  }

  const origin = readHeader(req, "origin");
  const host = getRequestHost(req);

  if (!origin || !host) {
    return false;
  }

  try {
    return new URL(origin).host !== host;
  } catch (error) {
    return true;
  }
}

function setCommonResponseHeaders(res, options = {}) {
  const cacheControl = options.cacheControl || "no-store";

  res.setHeader("Cache-Control", cacheControl);
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  );
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Origin-Agent-Cluster", "?1");
}

function rejectCrossSiteRequest(res) {
  res.status(403).json({
    ok: false,
    error: "Кросс-доменные запросы запрещены.",
  });

  return false;
}

function ensureJsonRequest(req, res) {
  const method = String(req.method || "").toUpperCase();

  if (!["POST", "PUT", "PATCH"].includes(method)) {
    return true;
  }

  const contentType = readHeader(req, "content-type").toLowerCase();

  if (contentType && !contentType.includes("application/json")) {
    res.status(415).json({
      ok: false,
      error: "Ожидается JSON-запрос.",
    });
    return false;
  }

  return true;
}

function readRawBody(req, maxBytes = DEFAULT_BODY_LIMIT_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let exceeded = false;

    req.on("data", (chunk) => {
      if (exceeded) {
        return;
      }

      totalBytes += chunk.length;

      if (totalBytes > maxBytes) {
        exceeded = true;
        reject(new PayloadTooLargeError(maxBytes));
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on("end", () => {
      if (exceeded) {
        return;
      }

      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    req.on("error", (error) => {
      if (!exceeded) {
        reject(error);
      }
    });
  });
}

async function parseJsonBody(req, options = {}) {
  const maxBytes = Number.isFinite(options.maxBytes)
    ? options.maxBytes
    : DEFAULT_BODY_LIMIT_BYTES;
  const fallbackValue = options.fallbackValue || {};

  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const rawBody =
    typeof req.body === "string" && req.body
      ? req.body
      : await readRawBody(req, maxBytes);

  if (!rawBody) {
    return fallbackValue;
  }

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    return fallbackValue;
  }
}

module.exports = {
  DEFAULT_BODY_LIMIT_BYTES,
  PayloadTooLargeError,
  readHeader,
  isSecureRequest,
  getRequestHost,
  getClientIp,
  isCrossSiteRequest,
  setCommonResponseHeaders,
  rejectCrossSiteRequest,
  ensureJsonRequest,
  parseJsonBody,
};
