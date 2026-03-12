const root = document.documentElement;
const toggleButton = document.querySelector(".theme-toggle");

const elements = {
  status: document.querySelector("[data-media-status]"),
  feed: document.querySelector("[data-media-feed]"),
  fallback: document.querySelector("[data-media-fallback]"),
};

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

function createPostMarkup(post) {
  const title = createPostTitle(post.text);
  const excerpt = createPostExcerpt(post.text, title);
  const publishedAt = formatDate(post.publishedAt);
  const imageMarkup = post.image
    ? `
        <div class="media-post__cover">
          <img src="${escapeHtml(post.image)}" alt="${escapeHtml(title)}" loading="lazy" />
        </div>
      `
    : "";
  const viewsMarkup = post.views
    ? `<span class="media-post__views">${escapeHtml(post.views)} просмотров</span>`
    : "";

  return `
    <article class="media-post">
      ${imageMarkup}

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

function renderPosts(posts) {
  if (!elements.feed) {
    return;
  }

  elements.feed.innerHTML = posts.map(createPostMarkup).join("");
}

function showFallback() {
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
