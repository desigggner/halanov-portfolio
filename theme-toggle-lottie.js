const themeToggleLottieButtons = Array.from(document.querySelectorAll(".theme-toggle"));
const themeToggleReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const themeToggleHoverMedia = window.matchMedia("(hover: hover) and (pointer: fine)");
const themeToggleAnimationPaths = {
  sun: "/public/lottie/sun.json",
  moon: "/public/lottie/moon.json",
};
const themeToggleAnimations = new WeakMap();

function getThemeToggleIconType(icon) {
  if (icon.classList.contains("theme-toggle__icon--sun")) {
    return "sun";
  }

  if (icon.classList.contains("theme-toggle__icon--moon")) {
    return "moon";
  }

  return "";
}

function syncThemeToggleAnimationColor(icon) {
  const animationRoot = icon.querySelector(".theme-toggle__lottie svg");

  if (!(animationRoot instanceof SVGElement)) {
    return;
  }

  animationRoot.style.display = "block";
  animationRoot.style.width = "100%";
  animationRoot.style.height = "100%";
  animationRoot.style.overflow = "visible";
  animationRoot.setAttribute("aria-hidden", "true");
  animationRoot.setAttribute("focusable", "false");

  animationRoot.querySelectorAll("[stroke]").forEach((node) => {
    node.setAttribute("stroke", "currentColor");
  });

  animationRoot.querySelectorAll("[fill]").forEach((node) => {
    if (node.getAttribute("fill") !== "none") {
      node.setAttribute("fill", "currentColor");
    }
  });
}

function createThemeToggleAnimation(icon) {
  const type = getThemeToggleIconType(icon);

  if (
    !type ||
    themeToggleReducedMotion.matches ||
    typeof window.lottie?.loadAnimation !== "function"
  ) {
    return null;
  }

  const existingAnimation = themeToggleAnimations.get(icon);

  if (existingAnimation) {
    return existingAnimation;
  }

  const container = document.createElement("span");
  container.className = "theme-toggle__lottie";
  container.setAttribute("aria-hidden", "true");
  icon.prepend(container);

  const animation = window.lottie.loadAnimation({
    container,
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: themeToggleAnimationPaths[type],
    rendererSettings: {
      progressiveLoad: true,
      preserveAspectRatio: "xMidYMid meet",
    },
  });

  const state = {
    animation,
    ready: false,
  };

  animation.addEventListener("DOMLoaded", () => {
    state.ready = true;
    syncThemeToggleAnimationColor(icon);
    animation.goToAndStop(0, true);
    icon.classList.add("is-lottie-ready");
  });

  animation.addEventListener("complete", () => {
    animation.goToAndStop(0, true);
  });

  animation.addEventListener("data_failed", () => {
    container.remove();
    themeToggleAnimations.delete(icon);
  });

  themeToggleAnimations.set(icon, state);
  return state;
}

function playThemeToggleIcon(icon) {
  const state = createThemeToggleAnimation(icon);

  if (!state?.ready) {
    return;
  }

  state.animation.goToAndStop(0, true);
  state.animation.play();
}

function resetThemeToggleIcon(icon) {
  const state = themeToggleAnimations.get(icon);

  if (!state?.ready) {
    return;
  }

  state.animation.goToAndStop(0, true);
}

function getVisibleThemeToggleIcon(button) {
  const icons = Array.from(button.querySelectorAll(".theme-toggle__icon"));

  return (
    icons.find((icon) => {
      if (!(icon instanceof HTMLElement)) {
        return false;
      }

      const styles = window.getComputedStyle(icon);
      return styles.display !== "none" && styles.visibility !== "hidden";
    }) || null
  );
}

function setupThemeToggleIcon(icon) {
  createThemeToggleAnimation(icon);

  icon.addEventListener("pointerenter", (event) => {
    if (!themeToggleHoverMedia.matches || event.pointerType === "touch") {
      return;
    }

    playThemeToggleIcon(icon);
  });

  icon.addEventListener("pointerleave", () => {
    resetThemeToggleIcon(icon);
  });
}

function setupThemeToggleButton(button) {
  const icons = Array.from(button.querySelectorAll(".theme-toggle__icon"));

  icons.forEach((icon) => {
    if (icon instanceof HTMLElement) {
      setupThemeToggleIcon(icon);
    }
  });

  button.addEventListener("click", () => {
    if (themeToggleReducedMotion.matches || themeToggleHoverMedia.matches) {
      return;
    }

    window.requestAnimationFrame(() => {
      const activeIcon = getVisibleThemeToggleIcon(button);

      if (activeIcon) {
        playThemeToggleIcon(activeIcon);
      }
    });
  });
}

if (themeToggleLottieButtons.length) {
  themeToggleLottieButtons.forEach((button) => {
    setupThemeToggleButton(button);
  });
}
