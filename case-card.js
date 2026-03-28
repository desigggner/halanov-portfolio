(function attachPortfolioCaseCard(global) {
  const defaultCaseImageSizes =
    "(max-width: 767px) calc(100vw - 48px), (max-width: 1180px) calc(50vw - 42px), 520px";
  const prefetchedPageUrls = new Set();
  const optimizedCaseImageMap = {
    "./assets/invert-case-bg.png": {
      src: "./assets/invert-case-bg.jpg",
      srcSet: "./assets/invert-case-bg-700.jpg 700w, ./assets/invert-case-bg.jpg 1034w",
      sizes: defaultCaseImageSizes,
      width: 1034,
      height: 1124,
    },
    "./assets/invert-case-bg.jpg": {
      src: "./assets/invert-case-bg.jpg",
      srcSet: "./assets/invert-case-bg-700.jpg 700w, ./assets/invert-case-bg.jpg 1034w",
      sizes: defaultCaseImageSizes,
      width: 1034,
      height: 1124,
    },
    "./assets/10Q.png": {
      src: "./assets/10Q.jpg",
      srcSet: "./assets/10Q-700.jpg 700w, ./assets/10Q.jpg 1034w",
      sizes: defaultCaseImageSizes,
      width: 1034,
      height: 1124,
    },
    "./assets/10Q.jpg": {
      src: "./assets/10Q.jpg",
      srcSet: "./assets/10Q-700.jpg 700w, ./assets/10Q.jpg 1034w",
      sizes: defaultCaseImageSizes,
      width: 1034,
      height: 1124,
    },
    "./assets/pulse.png": {
      src: "./assets/pulse.jpg",
      srcSet: "./assets/pulse-700.jpg 700w, ./assets/pulse.jpg 1034w",
      sizes: defaultCaseImageSizes,
      width: 1034,
      height: 1470,
    },
    "./assets/pulse.jpg": {
      src: "./assets/pulse.jpg",
      srcSet: "./assets/pulse-700.jpg 700w, ./assets/pulse.jpg 1034w",
      sizes: defaultCaseImageSizes,
      width: 1034,
      height: 1470,
    },
    "./assets/szu.png": {
      src: "./assets/szu.jpg",
      srcSet: "./assets/szu-700.jpg 700w, ./assets/szu.jpg 1034w",
      sizes: defaultCaseImageSizes,
      width: 1034,
      height: 1124,
    },
    "./assets/szu.jpg": {
      src: "./assets/szu.jpg",
      srcSet: "./assets/szu-700.jpg 700w, ./assets/szu.jpg 1034w",
      sizes: defaultCaseImageSizes,
      width: 1034,
      height: 1124,
    },
  };
  const arrowIcon = `
    <svg viewBox="0 0 46 46" focusable="false" fill="none">
      <path
        d="M14.8493 30.4056L30.4056 14.8492"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M17.6777 14.8492H30.4056V27.5771"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;

  let pagePrefetchObserver = null;

  function resolveInternalPageUrl(href) {
    if (typeof href !== "string" || !href.trim() || !global.location) {
      return null;
    }

    try {
      const url = new URL(href, global.location.href);

      if (url.origin !== global.location.origin) {
        return null;
      }

      return url;
    } catch (error) {
      return null;
    }
  }

  function prefetchPage(urlLike) {
    const url = typeof urlLike === "string" ? resolveInternalPageUrl(urlLike) : urlLike;

    if (!url || prefetchedPageUrls.has(url.href) || !document.head) {
      return;
    }

    prefetchedPageUrls.add(url.href);

    const prefetchLink = document.createElement("link");
    prefetchLink.rel = "prefetch";
    prefetchLink.href = url.href;
    prefetchLink.as = "document";
    document.head.append(prefetchLink);

    if (typeof fetch === "function") {
      const scheduleFetch =
        typeof global.requestIdleCallback === "function"
          ? global.requestIdleCallback.bind(global)
          : (callback) => global.setTimeout(callback, 180);

      scheduleFetch(() => {
        fetch(url.href, {
          credentials: "same-origin",
          cache: "force-cache",
        }).catch(() => {});
      });
    }
  }

  function observeCardPrefetch(card, href) {
    const url = resolveInternalPageUrl(href);

    if (!url) {
      return;
    }

    const triggerPrefetch = () => {
      prefetchPage(url);
    };

    card.addEventListener("pointerenter", triggerPrefetch, { once: true });
    card.addEventListener("focus", triggerPrefetch, { once: true });
    card.addEventListener("touchstart", triggerPrefetch, { once: true, passive: true });

    if (!("IntersectionObserver" in global)) {
      return;
    }

    if (!pagePrefetchObserver) {
      pagePrefetchObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            const observedHref = entry.target.dataset.prefetchHref || "";

            prefetchPage(observedHref);
            pagePrefetchObserver.unobserve(entry.target);
          });
        },
        {
          rootMargin: "220px 0px",
          threshold: 0.01,
        },
      );
    }

    card.dataset.prefetchHref = url.href;
    pagePrefetchObserver.observe(card);
  }

  function resolveCaseImageAsset(image) {
    if (typeof image !== "string" || !image.trim()) {
      return null;
    }

    return optimizedCaseImageMap[image] || {
      src: image,
      srcSet: "",
      sizes: defaultCaseImageSizes,
      width: 0,
      height: 0,
    };
  }

  function resolveCaseVideoAsset(video) {
    if (typeof video !== "string" || !video.trim()) {
      return null;
    }

    return {
      src: video.trim(),
    };
  }

  function normalizeImageLoading(value, fallback) {
    return value === "eager" ? "eager" : fallback;
  }

  function normalizeFetchPriority(value) {
    if (value === "high" || value === "low") {
      return value;
    }

    return "auto";
  }

  function buildCaseBackground(caseItem) {
    return caseItem.backgroundColor || "transparent";
  }

  function parseCaseStatus(statusText) {
    const normalized =
      typeof statusText === "string" ? statusText.replace(/\s+/g, " ").trim() : "";

    if (!normalized) {
      return null;
    }

    const accentMatch = normalized.match(/^([+\-−]?\d+(?:[.,]\d+)?%?)(?:\s+)(.+)$/u);

    if (!accentMatch) {
      return {
        accent: "",
        label: normalized,
      };
    }

    return {
      accent: accentMatch[1],
      label: accentMatch[2],
    };
  }

  function appendCaseStatusContent(element, statusText) {
    const status = parseCaseStatus(statusText);

    if (!status || !element) {
      return;
    }

    if (!status.accent) {
      element.textContent = status.label;
      return;
    }

    const accent = document.createElement("span");
    accent.className = "case-card__status-accent";
    accent.textContent = status.accent;

    const label = document.createElement("span");
    label.className = "case-card__status-label";
    label.textContent = status.label;

    element.append(accent, label);
  }

  function createCaseCard(caseItem, options = {}) {
    const {
      tagName = "a",
      href,
      ariaLabel = "",
      extraClasses = [],
      dataset = {},
      staticPreview = false,
      imageLoading,
      imageFetchPriority = "auto",
      imageSizes = "",
    } = options;
    const card = document.createElement(tagName);
    const top = document.createElement("div");
    const title = document.createElement("h3");
    const corner = document.createElement("span");
    const imageAsset = resolveCaseImageAsset(caseItem.image);
    const videoAsset = resolveCaseVideoAsset(caseItem.video);
    const cardHref = typeof href === "string" && href.trim() ? href.trim() : caseItem.path || "#top";
    const hasLightUi = Boolean(caseItem.lightUi);
    const baseTextColor = hasLightUi ? "#ffffff" : "#333037";
    const baseCornerColor = hasLightUi ? "rgba(255, 255, 255, 0.7)" : "rgba(51, 48, 55, 0.78)";
    const activeCornerColor = "#111111";

    card.className = "case-card case-card--managed";
    card.style.setProperty("--case-card-bg", buildCaseBackground(caseItem));
    card.style.setProperty("--case-bg-scale", "1");
    card.style.setProperty("--case-bg-shift-x", "0px");
    card.style.setProperty("--case-bg-shift-y", "0px");
    card.style.setProperty("--case-text-color", baseTextColor);
    card.style.setProperty("--case-corner-color", baseCornerColor);
    card.style.setProperty("--case-corner-active-color", activeCornerColor);

    if (tagName.toLowerCase() === "a") {
      card.href = cardHref;
      observeCardPrefetch(card, cardHref);
    }

    if (ariaLabel) {
      card.setAttribute("aria-label", ariaLabel);
    }

    if (caseItem.id) {
      card.dataset.caseId = caseItem.id;
    }

    for (const [key, value] of Object.entries(dataset)) {
      card.dataset[key] = value;
    }

    for (const className of extraClasses) {
      if (className) {
        card.classList.add(className);
      }
    }

    if (staticPreview) {
      card.classList.add("case-card--static");
    }

    if (caseItem.size === "tall") {
      card.classList.add("case-card--tall");
    }

    if (hasLightUi) {
      card.classList.add("case-card--light-ui");
    }

    if (videoAsset?.src) {
      const media = document.createElement("video");
      const attemptPlay = () => {
        const playPromise = media.play();

        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      };

      media.className = "case-card__media";
      media.src = videoAsset.src;
      media.poster = imageAsset?.src || "";
      media.autoplay = true;
      media.loop = true;
      media.muted = true;
      media.defaultMuted = true;
      media.controls = false;
      media.playsInline = true;
      media.preload = "auto";
      media.disablePictureInPicture = true;
      media.disableRemotePlayback = true;
      media.tabIndex = -1;
      media.setAttribute("aria-hidden", "true");
      media.setAttribute("autoplay", "");
      media.setAttribute("loop", "");
      media.setAttribute("playsinline", "");
      media.setAttribute("webkit-playsinline", "");
      media.setAttribute("muted", "");
      media.setAttribute("controlslist", "nodownload nofullscreen noremoteplayback");
      media.removeAttribute("controls");
      media.addEventListener("loadedmetadata", attemptPlay);
      media.addEventListener("loadeddata", attemptPlay);
      media.addEventListener("canplay", attemptPlay);

      card.append(media);
    } else if (imageAsset?.src) {
      const media = document.createElement("img");
      const fetchPriority = normalizeFetchPriority(imageFetchPriority);

      media.className = "case-card__media";
      media.src = imageAsset.src;
      media.alt = "";
      media.setAttribute("aria-hidden", "true");
      media.loading = normalizeImageLoading(imageLoading, staticPreview ? "eager" : "lazy");
      media.decoding = "async";

      if (fetchPriority !== "auto") {
        media.setAttribute("fetchpriority", fetchPriority);
      }

      if (imageAsset.srcSet) {
        media.srcset = imageAsset.srcSet;
        media.sizes = imageSizes || imageAsset.sizes || defaultCaseImageSizes;
      }

      if (imageAsset.width && imageAsset.height) {
        media.width = imageAsset.width;
        media.height = imageAsset.height;
      }

      card.append(media);
    }

    if (caseItem.status) {
      const status = document.createElement("span");
      status.className = "case-card__status";
      appendCaseStatusContent(status, caseItem.status);
      card.dataset.hasStatus = "true";
      card.append(status);
    }

    top.className = "case-card__top";

    title.className = "case-card__title";
    title.textContent = caseItem.title;

    if (caseItem.featuredTitle) {
      title.classList.add("case-card__title--invert");
    }

    top.append(title);

    corner.className = "case-card__corner";
    corner.setAttribute("aria-hidden", "true");
    corner.innerHTML = arrowIcon;

    if (hasLightUi) {
      corner.classList.add("case-card__corner--light");
    }

    card.append(top, corner);

    return card;
  }

  global.PortfolioCaseCard = {
    arrowIcon,
    buildCaseBackground,
    createCaseCard,
  };
})(window);
