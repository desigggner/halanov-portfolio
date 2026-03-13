const root = document.documentElement;
const toggleButton = document.querySelector(".theme-toggle");

const elements = {
  status: document.querySelector("[data-media-status]"),
  feed: document.querySelector("[data-media-feed]"),
  fallback: document.querySelector("[data-media-fallback]"),
};
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let mediaVideoObserver = null;

function applyTheme(theme) {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  if (toggleButton) {
    toggleButton.setAttribute("aria-pressed", String(theme === "dark"));
    toggleButton.setAttribute(
      "aria-label",
      theme === "dark"
        ? "Переключить на светлую тему"
        : "Переключить на тёмную тему",
    );
  }
}

function getNextTheme() {
  return root.dataset.theme === "dark" ? "light" : "dark";
}

function shouldResetScrollOnLoad() {
  const navigationEntry =
    typeof performance !== "undefined" && typeof performance.getEntriesByType === "function"
      ? performance.getEntriesByType("navigation")[0]
      : null;

  return !window.location.hash && navigationEntry?.type !== "back_forward";
}

function ensureTopOnInitialLoad() {
  if (!shouldResetScrollOnLoad()) {
    return;
  }

  const resetScroll = () => {
    window.scrollTo(0, 0);

    window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);

      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    });
  };

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  if (document.readyState === "complete") {
    resetScroll();
    return;
  }

  window.addEventListener("load", resetScroll, { once: true });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return map[char];
  });
}

function setStatus(text, isError = false) {
  if (!elements.status) {
    return;
  }

  elements.status.textContent = text;
  elements.status.classList.toggle("is-error", isError);
}

function formatDate(isoString) {
  if (!isoString) {
    return "";
  }

  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateTime(isoString) {
  if (!isoString) {
    return "";
  }

  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getPostSortValue(post) {
  const publishedTimestamp = Date.parse(post?.publishedAt || "");

  if (Number.isFinite(publishedTimestamp)) {
    return publishedTimestamp;
  }

  const numericId = Number.parseInt(post?.id, 10);
  return Number.isFinite(numericId) ? numericId : 0;
}

function sortPostsByNewest(posts) {
  return [...posts].sort((firstPost, secondPost) => {
    const timestampDelta = getPostSortValue(secondPost) - getPostSortValue(firstPost);

    if (timestampDelta !== 0) {
      return timestampDelta;
    }

    return String(secondPost?.id || "").localeCompare(String(firstPost?.id || ""), "ru");
  });
}

function createPostTitle(text) {
  const firstMeaningfulLine = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstMeaningfulLine) {
    return "Пост в Telegram";
  }

  if (firstMeaningfulLine.length <= 96) {
    return firstMeaningfulLine;
  }

  return `${firstMeaningfulLine.slice(0, 95).trimEnd()}…`;
}

function createPostExcerpt(text, title) {
  const normalizedText = String(text || "").trim();

  if (!normalizedText) {
    return "";
  }

  if (normalizedText === title) {
    return "";
  }

  if (normalizedText.length <= 320) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, 319).trimEnd()}…`;
}

function createPostCoverMarkup(post, title) {
  if (post.video) {
    const posterMarkup = post.image
      ? `
          <img
            class="media-post__cover-fallback"
            src="${escapeHtml(post.image)}"
            alt="${escapeHtml(title)}"
            loading="lazy"
            referrerpolicy="no-referrer"
          />
        `
      : "";
    const posterAttribute = post.image ? ` poster="${escapeHtml(post.image)}"` : "";

    return `
      <div class="media-post__cover media-post__cover--video" data-media-cover>
        ${posterMarkup}
        <video
          class="media-post__preview"
          src="${escapeHtml(post.video)}"
          ${posterAttribute}
          autoplay
          muted
          loop
          playsinline
          preload="metadata"
          data-media-video
          referrerpolicy="no-referrer"
          aria-label="${escapeHtml(title)}"
        ></video>
        <a
          class="media-post__cover-action"
          href="${escapeHtml(post.url)}"
          target="_blank"
          rel="noreferrer"
        >
          Смотреть в Telegram
        </a>
      </div>
    `;
  }

  if (post.hasUnsupportedMedia && post.image) {
    return `
      <div class="media-post__cover media-post__cover--video media-post__cover--unsupported">
        <img
          class="media-post__cover-fallback"
          src="${escapeHtml(post.image)}"
          alt="${escapeHtml(title)}"
          loading="lazy"
          referrerpolicy="no-referrer"
        />
        <div class="media-post__unsupported-copy">
          <span class="media-post__unsupported-badge">Видео</span>
          <p class="media-post__unsupported-note">
            Telegram не отдал браузерный preview для этого поста.
          </p>
          <a
            class="media-post__cover-action"
            href="${escapeHtml(post.url)}"
            target="_blank"
            rel="noreferrer"
          >
            Открыть видео в Telegram
          </a>
        </div>
      </div>
    `;
  }

  if (post.image) {
    return `
      <div class="media-post__cover">
        <img
          src="${escapeHtml(post.image)}"
          alt="${escapeHtml(title)}"
          loading="lazy"
          referrerpolicy="no-referrer"
        />
      </div>
    `;
  }

  return "";
}

function createPostMarkup(post) {
  const title = createPostTitle(post.text);
  const excerpt = createPostExcerpt(post.text, title);
  const publishedAt = formatDate(post.publishedAt);
  const coverMarkup = createPostCoverMarkup(post, title);
  const viewsMarkup = post.views
    ? `<span class="media-post__views">${escapeHtml(post.views)} просмотров</span>`
    : "";

  return `
    <article class="media-post">
      ${coverMarkup}

      <div class="media-post__content">
        <div class="media-post__meta">
          <span class="media-post__channel">@desiggggner</span>
          <span class="media-post__date">${escapeHtml(publishedAt)}</span>
        </div>

        <h3 class="media-post__title">${escapeHtml(title)}</h3>
        ${excerpt ? `<p class="media-post__excerpt">${escapeHtml(excerpt)}</p>` : ""}
      </div>

      <div class="media-post__footer">
        <a
          class="media-post__link"
          href="${escapeHtml(post.url)}"
          target="_blank"
          rel="noreferrer"
        >
          Читать пост
        </a>
        ${viewsMarkup}
      </div>
    </article>
  `;
}

function markVideoReady(event) {
  const cover = event.currentTarget.closest("[data-media-cover]");

  if (cover) {
    cover.classList.add("is-ready");
    cover.classList.remove("is-broken");
  }
}

function markVideoBroken(event) {
  const cover = event.currentTarget.closest("[data-media-cover]");

  if (cover) {
    cover.classList.add("is-broken");
    cover.classList.remove("is-ready");
  }
}

function pauseObservedVideo(video) {
  if (video) {
    video.pause();
  }
}

function resetVideoPreviews() {
  if (!mediaVideoObserver) {
    return;
  }

  mediaVideoObserver.disconnect();
  mediaVideoObserver = null;
}

function setupVideoPreviews() {
  resetVideoPreviews();

  const videos = Array.from(document.querySelectorAll("[data-media-video]"));

  if (!videos.length) {
    return;
  }

  for (const video of videos) {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.loop = true;
    video.controls = false;
    video.disablePictureInPicture = true;
    video.disableRemotePlayback = true;
    video.tabIndex = -1;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("muted", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("loop", "");
    video.setAttribute("controlslist", "nodownload nofullscreen noremoteplayback");
    video.removeAttribute("controls");
    video.addEventListener("loadeddata", markVideoReady, { once: true });
    video.addEventListener("loadedmetadata", markVideoReady, { once: true });
    video.addEventListener("loadedmetadata", () => {
      const playPromise = video.play();

      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    });
    video.addEventListener("error", markVideoBroken, { once: true });
    video.load();
  }

  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    return;
  }

  mediaVideoObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target;

        if (entry.isIntersecting) {
          const playPromise = video.play();

          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {});
          }
        } else {
          pauseObservedVideo(video);
        }
      }
    },
    {
      threshold: 0.35,
    },
  );

  for (const video of videos) {
    mediaVideoObserver.observe(video);
  }
}

function renderPosts(posts) {
  if (!elements.feed) {
    return;
  }

  elements.feed.innerHTML = sortPostsByNewest(posts).map(createPostMarkup).join("");
  setupVideoPreviews();
}

function showFallback() {
  resetVideoPreviews();

  if (elements.fallback) {
    elements.fallback.hidden = false;
  }

  if (elements.feed) {
    elements.feed.innerHTML = "";
  }
}

function hideFallback() {
  if (elements.fallback) {
    elements.fallback.hidden = true;
  }
}

async function loadFeed() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 9000);

  try {
    setStatus("Подключаю ленту Telegram...");

    const response = await fetch("/api/media-feed?limit=12", {
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();

    if (!payload.ok || !Array.isArray(payload.posts) || !payload.posts.length) {
      throw new Error(payload.error || "Список постов пуст.");
    }

    clearTimeout(timeoutId);
    hideFallback();
    renderPosts(payload.posts);

    const updatedLabel = formatDateTime(payload.fetchedAt);
    setStatus(
      updatedLabel ? `Лента обновлена ${updatedLabel}.` : "Лента Telegram подключена.",
    );
  } catch (error) {
    clearTimeout(timeoutId);
    showFallback();
    setStatus(
      error?.name === "AbortError"
        ? "Telegram долго отвечает. Открой канал напрямую."
        : "Не удалось загрузить ленту автоматически. Открой канал напрямую.",
      true,
    );
  }
}

if (toggleButton) {
  applyTheme(root.dataset.theme || "light");

  toggleButton.addEventListener("click", () => {
    const nextTheme = getNextTheme();

    localStorage.setItem("portfolio-theme", nextTheme);
    applyTheme(nextTheme);
  });
}

window.addEventListener("storage", (event) => {
  if (event.key === "portfolio-theme" && event.newValue) {
    applyTheme(event.newValue);
  }
});

ensureTopOnInitialLoad();
loadFeed();
