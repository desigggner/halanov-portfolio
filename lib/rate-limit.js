const { getClientIp } = require("./request-security");

const RATE_LIMIT_NAMESPACE = "portfolio:rate-limit:v1";
const memoryBuckets = new Map();
let nextSweepAt = 0;

function getUpstashConfig() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "",
  };
}

function hasUpstashConfig() {
  const config = getUpstashConfig();
  return Boolean(config.url && config.token);
}

function sweepExpiredBuckets(now) {
  if (now < nextSweepAt) {
    return;
  }

  for (const [key, bucket] of memoryBuckets.entries()) {
    if (bucket.resetAt <= now) {
      memoryBuckets.delete(key);
    }
  }

  nextSweepAt = now + 60_000;
}

function incrementMemoryBucket(key, windowMs) {
  const now = Date.now();
  sweepExpiredBuckets(now);

  const existingBucket = memoryBuckets.get(key);
  const bucket =
    existingBucket && existingBucket.resetAt > now
      ? existingBucket
      : { count: 0, resetAt: now + windowMs };

  bucket.count += 1;
  memoryBuckets.set(key, bucket);

  return {
    count: bucket.count,
    resetAt: bucket.resetAt,
    store: "memory",
  };
}

async function incrementUpstashBucket(key, windowMs) {
  const config = getUpstashConfig();
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const now = Date.now();
  const bucketId = Math.floor(now / windowMs);
  const bucketKey = `${RATE_LIMIT_NAMESPACE}:${key}:${bucketId}`;
  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", bucketKey],
      ["EXPIRE", bucketKey, String(windowSeconds + 5)],
    ]),
  });

  if (!response.ok) {
    throw new Error(`Upstash returned ${response.status}.`);
  }

  const payload = await response.json();
  const count = Number(payload?.[0]?.result || 0);

  if (!Number.isFinite(count)) {
    throw new Error("Upstash returned an invalid rate-limit payload.");
  }

  return {
    count,
    resetAt: (bucketId + 1) * windowMs,
    store: "upstash",
  };
}

async function consumeRateLimit(key, windowMs) {
  if (hasUpstashConfig()) {
    try {
      return await incrementUpstashBucket(key, windowMs);
    } catch (error) {
      return incrementMemoryBucket(key, windowMs);
    }
  }

  return incrementMemoryBucket(key, windowMs);
}

function buildRateLimitKey(name, req, keyParts = []) {
  const ip = getClientIp(req);

  return [name, ip, ...keyParts]
    .map((part) => String(part || "").trim().slice(0, 160))
    .filter(Boolean)
    .join(":");
}

async function enforceRateLimit(req, res, options = {}) {
  const limit = Math.max(1, Number.parseInt(options.limit, 10) || 10);
  const windowMs = Math.max(1000, Number.parseInt(options.windowMs, 10) || 60_000);
  const key = buildRateLimitKey(options.name || "default", req, options.keyParts || []);
  const result = await consumeRateLimit(key, windowMs);
  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  const remaining = Math.max(0, limit - result.count);

  res.setHeader("X-RateLimit-Limit", String(limit));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
  res.setHeader("X-RateLimit-Policy", `${limit};w=${Math.ceil(windowMs / 1000)}`);

  if (result.count <= limit) {
    return true;
  }

  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.status(429).json({
    ok: false,
    error: "Слишком много запросов. Повтори позже.",
    retryAfterSeconds,
  });

  return false;
}

module.exports = {
  enforceRateLimit,
};
