const { CHANNEL_INFO, fetchTelegramFeed } = require("../lib/telegram-feed");
const { enforceRateLimit } = require("../lib/rate-limit");
const { setCommonResponseHeaders } = require("../lib/request-security");

module.exports = async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query?.limit, 10) || 12, 1), 24);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  setCommonResponseHeaders(res, {
    cacheControl: "s-maxage=900, stale-while-revalidate=86400",
  });

  if (req.method !== "GET") {
    clearTimeout(timeoutId);
    res.setHeader("Allow", "GET");
    res.status(405).json({ ok: false, error: "Метод не поддерживается." });
    return;
  }

  if (
    !(await enforceRateLimit(req, res, {
      name: "media-feed",
      limit: 60,
      windowMs: 5 * 60 * 1000,
    }))
  ) {
    clearTimeout(timeoutId);
    return;
  }

  try {
    const feed = await fetchTelegramFeed({
      limit,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    res.status(200).json({
      ok: true,
      ...feed,
      fallbackUrl: CHANNEL_INFO.url,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    res.status(200).json({
      ok: false,
      channel: CHANNEL_INFO,
      posts: [],
      fallbackUrl: CHANNEL_INFO.url,
      error:
        error?.name === "AbortError"
          ? "Превышено время ожидания Telegram."
          : error?.message || "Не удалось загрузить посты Telegram.",
    });
  }
};
