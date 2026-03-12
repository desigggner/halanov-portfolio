const CHANNEL_INFO = {
  handle: "desiggggner",
  title: "@desiggggner",
  url: "https://t.me/desiggggner",
  publicFeedUrl: "https://t.me/s/desiggggner",
};

const HTML_ENTITY_MAP = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeHtmlEntities(value = "") {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code) => {
    const normalizedCode = code.toLowerCase();

    if (normalizedCode[0] === "#") {
      const isHex = normalizedCode[1] === "x";
      const numericValue = Number.parseInt(
        normalizedCode.slice(isHex ? 2 : 1),
        isHex ? 16 : 10,
      );

      return Number.isNaN(numericValue) ? entity : String.fromCodePoint(numericValue);
    }

    return HTML_ENTITY_MAP[normalizedCode] || entity;
  });
}

function normalizeUrl(value = "") {
  const decoded = decodeHtmlEntities(value).trim();

  if (!decoded) {
    return "";
  }

  if (decoded.startsWith("//")) {
    return `https:${decoded}`;
  }

  if (decoded.startsWith("/")) {
    return `https://t.me${decoded}`;
  }

  return decoded;
}

function extractMatch(pattern, input) {
  const match = input.match(pattern);
  return match ? match[1].trim() : "";
}

function stripHtml(value = "") {
  const normalized = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return decodeHtmlEntities(normalized)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function createExcerpt(value, maxLength = 280) {
  if (!value) {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function extractImage(block) {
  const photoMatch = extractMatch(
    /tgme_widget_message_photo_wrap[\s\S]*?background-image:url\('([^']+)'\)/i,
    block,
  );

  if (photoMatch) {
    return normalizeUrl(photoMatch);
  }

  const videoMatch = extractMatch(
    /tgme_widget_message_video_thumb[\s\S]*?background-image:url\('([^']+)'\)/i,
    block,
  );

  return normalizeUrl(videoMatch);
}

function parsePostBlock(block) {
  const postPath = extractMatch(/data-post="([^"]+)"/i, block);

  if (!postPath) {
    return null;
  }

  const publishedAt = extractMatch(/<time[^>]+datetime="([^"]+)"/i, block);
  const postUrl =
    normalizeUrl(extractMatch(/tgme_widget_message_date[^>]+href="([^"]+)"/i, block)) ||
    `https://t.me/${postPath}`;
  const textHtml = extractMatch(
    /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    block,
  );
  const text = stripHtml(textHtml);
  const image = extractImage(block);
  const views = decodeHtmlEntities(
    extractMatch(/tgme_widget_message_views">([^<]+)</i, block),
  );
  const id = postPath.split("/").pop() || postPath;

  return {
    id,
    url: postUrl,
    publishedAt,
    image,
    views,
    text,
    excerpt: createExcerpt(text),
  };
}

function parseTelegramFeed(html) {
  return html
    .split('<div class="tgme_widget_message_wrap')
    .slice(1)
    .map((chunk) => `<div class="tgme_widget_message_wrap${chunk}`)
    .map(parsePostBlock)
    .filter(Boolean);
}

async function fetchTelegramFeed(options = {}) {
  const limit = Math.min(Math.max(Number.parseInt(options.limit, 10) || 12, 1), 24);
  const response = await fetch(CHANNEL_INFO.publicFeedUrl, {
    method: "GET",
    redirect: "follow",
    signal: options.signal,
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
      pragma: "no-cache",
      "cache-control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`Telegram returned ${response.status}.`);
  }

  const html = await response.text();
  const posts = parseTelegramFeed(html).slice(0, limit);

  if (!posts.length) {
    throw new Error("Не удалось разобрать посты канала.");
  }

  return {
    channel: CHANNEL_INFO,
    posts,
    fetchedAt: new Date().toISOString(),
    source: "telegram-public-feed",
  };
}

module.exports = {
  CHANNEL_INFO,
  fetchTelegramFeed,
};
