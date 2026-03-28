const siteFooterMarkup = `
  <footer class="site-footer container" aria-labelledby="site-footer-title">
    <div class="site-footer__inner">
      <div class="site-footer__main site-footer__reveal">
        <div class="site-footer__avatar" aria-hidden="true">
          <img
            class="site-footer__avatar-fallback"
            src="./.figma-assets/99ddf8cb9e4200201fe9b07a6b34ed509081be54.png"
            alt=""
            width="200"
            height="200"
            loading="lazy"
            decoding="async"
          />
          <video
            class="site-footer__avatar-media"
            data-avatar-video
            data-video-src="./video/avatar2.mp4"
            autoplay
            muted
            loop
            playsinline
            preload="metadata"
            aria-hidden="true"
          ></video>
        </div>

        <div class="site-footer__lead">
          <div class="site-footer__contact">
            <p class="site-footer__eyebrow" id="site-footer-title">Напиши привет</p>
            <a class="site-footer__email site-footer__link-underline" href="mailto:desigggner@gmail.com">
              <span>desigggner@gmail.com</span>
            </a>
          </div>
          <a
            class="site-footer__telegram"
            href="https://t.me/desigggner"
            target="_blank"
            rel="noreferrer"
            aria-label="Написать в Telegram: desigggner"
          >
            <svg class="site-footer__telegram-icon" viewBox="0 0 49 40" aria-hidden="true">
              <path
                d="M4.2036 17.2565C16.9189 11.6859 25.3978 8.01341 29.6402 6.23905C41.7532 1.17288 44.2702 0.292835 45.9108 0.263465C46.2716 0.257384 47.0783 0.347301 47.6009 0.773698C48.0422 1.13374 48.1636 1.62011 48.2217 1.96146C48.2798 2.30282 48.3521 3.08045 48.2946 3.68806C47.6382 10.6233 44.798 27.4532 43.353 35.2207C42.7416 38.5074 41.5377 39.6095 40.3722 39.7173C37.8392 39.9517 35.9158 38.0341 33.4625 36.417C29.6236 33.8866 27.4549 32.3114 23.7286 29.8422C19.4222 26.9886 22.2139 25.4202 24.6681 22.857C25.3103 22.1862 36.4705 11.9789 36.6865 11.0529C36.7136 10.9371 36.7386 10.5054 36.4836 10.2775C36.2286 10.0495 35.8521 10.1275 35.5805 10.1895C35.1955 10.2773 29.0628 14.3533 17.1825 22.4174C15.4417 23.6193 13.865 24.205 12.4523 24.1743C10.895 24.1404 7.89924 23.2888 5.67221 22.5609C2.94067 21.668 0.769698 21.196 0.958741 19.6797C1.05721 18.8899 2.13883 18.0822 4.2036 17.2565Z"
                fill="currentColor"
              />
            </svg>
            <span class="site-footer__button-label">desigggner</span>
          </a>
        </div>
      </div>

      <div class="site-footer__grid">
        <section class="site-footer__column site-footer__reveal">
          <div class="site-footer__column-heading">
            <p class="site-footer__column-title">
              пишу о дизайне<br />
              и не только
            </p>
          </div>
          <div class="site-footer__column-body">
            <a
              class="site-footer__chip"
              href="https://t.me/desigggner"
              target="_blank"
              rel="noreferrer"
            >
              <img
                class="site-footer__channel-thumb"
                src="./.figma-assets/6f3a954066c51a3f3b42b6d8250633c60af3b42e.png"
                alt=""
                width="37"
                height="37"
                loading="lazy"
                decoding="async"
              />
              <span class="site-footer__link-underline">
                <span class="site-footer__button-label">телеграм-канал</span>
              </span>
            </a>
          </div>
        </section>

        <section class="site-footer__column site-footer__column--work site-footer__reveal">
          <div class="site-footer__column-heading">
            <p class="site-footer__column-title">рабочее</p>
          </div>
          <div class="site-footer__column-body">
            <div class="site-footer__chips">
              <button
                class="site-footer__chip site-footer__chip--disabled"
                type="button"
                disabled
                aria-disabled="true"
                title="Ссылку на LinkedIn добавлю отдельно"
              >
                <img
                  class="site-footer__chip-icon"
                  src="./assets/footer/linkedin.svg"
                  alt=""
                  width="32"
                  height="32"
                  loading="lazy"
                  decoding="async"
                />
                <span class="site-footer__button-label">linkedin</span>
              </button>
              <button
                class="site-footer__chip site-footer__chip--disabled"
                type="button"
                disabled
                aria-disabled="true"
                title="Резюме добавлю отдельно"
              >
                <img
                  class="site-footer__chip-icon"
                  src="./assets/footer/file-pdf.svg"
                  alt=""
                  width="32"
                  height="32"
                  loading="lazy"
                  decoding="async"
                />
                <span class="site-footer__button-label">резюме</span>
              </button>
            </div>
          </div>
        </section>

        <section class="site-footer__column site-footer__reveal">
          <div class="site-footer__column-heading">
            <p class="site-footer__column-title">еще можно сюда</p>
          </div>
          <div class="site-footer__column-body">
            <a class="site-footer__chip" href="tel:+79998049152">
              <span class="site-footer__link-underline">
                <span class="site-footer__button-label">+7 (999) 804-91-52</span>
              </span>
            </a>
          </div>
        </section>
      </div>
    </div>
  </footer>
`;

function loadDeferredFooterVideo(video) {
  if (!(video instanceof HTMLVideoElement) || video.dataset.videoLoaded === "true") {
    return false;
  }

  const videoSource = video.dataset.videoSrc || "";

  if (!videoSource) {
    return false;
  }

  video.src = videoSource;
  video.dataset.videoLoaded = "true";
  video.load();

  return true;
}

function setupFooterAvatarVideo(footer) {
  const avatarVideo = footer.querySelector("[data-avatar-video]");

  if (!(avatarVideo instanceof HTMLVideoElement)) {
    return;
  }

  avatarVideo.muted = true;
  avatarVideo.defaultMuted = true;

  const revealVideo = () => {
    avatarVideo.classList.add("is-ready");
  };

  const hideVideo = () => {
    avatarVideo.classList.remove("is-ready");
  };

  const attemptPlayback = () => {
    loadDeferredFooterVideo(avatarVideo);

    const playPromise = avatarVideo.play();

    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(revealVideo).catch(hideVideo);
      return;
    }

    revealVideo();
  };

  avatarVideo.addEventListener("loadeddata", attemptPlayback, { once: true });
  avatarVideo.addEventListener("playing", revealVideo, { once: true });
  avatarVideo.addEventListener("error", hideVideo);

  if (!("IntersectionObserver" in window)) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        attemptPlayback();
        observer.disconnect();
      });
    },
    {
      threshold: 0.01,
      rootMargin: "240px 0px",
    },
  );

  observer.observe(footer);
}

document.querySelectorAll("[data-site-footer]").forEach((placeholder) => {
  placeholder.insertAdjacentHTML("afterend", siteFooterMarkup);
  const footer = placeholder.nextElementSibling;

  if (footer instanceof HTMLElement) {
    setupFooterAvatarVideo(footer);
  }

  placeholder.remove();
});
