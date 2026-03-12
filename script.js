const root = document.documentElement;
const toggleButton = document.querySelector(".theme-toggle");
const themeStorageKey = "portfolio-theme";
const casesStorageKey = "portfolio-cases";
const defaultAdminMessage = "Изменения сохраняются автоматически.";

const defaultCases = [
  {
    id: "invert",
    title: "Увеличил CTR за счет редизайна в приложении Invert",
    image: "./assets/invert-case-bg.png",
    column: "left",
    size: "medium",
    lightUi: true,
    status: "",
    featuredTitle: true,
    backgroundColor: "#16c46c",
  },
  {
    id: "market",
    title: "Интерфейсы для Яндекс Маркета",
    image: "./assets/10Q.png",
    column: "left",
    size: "medium",
    lightUi: false,
    status: "",
    featuredTitle: false,
    backgroundColor: "#e3e3e3",
  },
  {
    id: "storeez",
    title: "Дизайн iOS-приложения 12 Storeez",
    image: "./assets/pulse.png",
    column: "right",
    size: "tall",
    lightUi: true,
    status: "в работе",
    featuredTitle: false,
    backgroundColor: "#1d4cff",
  },
  {
    id: "avito",
    title: "Авито Подработка. Дизайн поиска сменных подработок",
    image: "./assets/szu.png",
    column: "right",
    size: "medium",
    lightUi: false,
    status: "",
    featuredTitle: false,
    backgroundColor: "#4d92eb",
  },
];

const caseColumns = {
  left: document.querySelector('[data-cases-column="left"]'),
  right: document.querySelector('[data-cases-column="right"]'),
};

const admin = {
  toggle: document.querySelector("[data-admin-toggle]"),
  sheet: document.querySelector("[data-admin-sheet]"),
  panel: document.getElementById("case-admin"),
  closeButtons: document.querySelectorAll("[data-admin-close]"),
  addButton: document.querySelector("[data-case-add]"),
  resetButton: document.querySelector("[data-cases-reset]"),
  editor: document.querySelector("[data-case-editor]"),
  message: document.querySelector("[data-admin-message]"),
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

const supportsWebp = (() => {
  const canvas = document.createElement("canvas");
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
})();

let adminMessageTimer = 0;
let cases = loadCases();

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

function cloneDefaultCases() {
  return defaultCases.map((item) => ({ ...item }));
}

function createCaseId() {
  return `case-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeCase(item, fallback = {}) {
  return {
    id: typeof item?.id === "string" && item.id.trim() ? item.id : createCaseId(),
    title:
      typeof item?.title === "string" && item.title.trim()
        ? item.title.trim()
        : fallback.title || "Новый кейс",
    image: typeof item?.image === "string" ? item.image : fallback.image || "",
    column: item?.column === "right" ? "right" : "left",
    size: item?.size === "tall" ? "tall" : "medium",
    lightUi: Boolean(item?.lightUi),
    status: typeof item?.status === "string" ? item.status.trim() : "",
    featuredTitle: Boolean(item?.featuredTitle),
    backgroundColor:
      typeof item?.backgroundColor === "string" && item.backgroundColor.trim()
        ? item.backgroundColor.trim()
        : fallback.backgroundColor || "#d7dde7",
  };
}

function loadCases() {
  try {
    const storedCases = localStorage.getItem(casesStorageKey);

    if (!storedCases) {
      return cloneDefaultCases();
    }

    const parsedCases = JSON.parse(storedCases);

    if (!Array.isArray(parsedCases) || parsedCases.length === 0) {
      return cloneDefaultCases();
    }

    return parsedCases.map((item, index) => normalizeCase(item, defaultCases[index]));
  } catch (error) {
    return cloneDefaultCases();
  }
}

function persistCases(options = {}) {
  const { silent = false } = options;

  try {
    localStorage.setItem(casesStorageKey, JSON.stringify(cases));

    if (!silent) {
      setAdminMessage("Изменения сохранены.");
    }

    return true;
  } catch (error) {
    setAdminMessage(
      "Не удалось сохранить изменения. Попробуй изображение меньшего размера.",
      true,
    );
    return false;
  }
}

function setAdminMessage(text = defaultAdminMessage, isError = false) {
  if (!admin.message) {
    return;
  }

  window.clearTimeout(adminMessageTimer);
  admin.message.textContent = text;
  admin.message.classList.toggle("is-error", isError);

  if (text !== defaultAdminMessage) {
    adminMessageTimer = window.setTimeout(() => {
      setAdminMessage(defaultAdminMessage);
    }, isError ? 4400 : 2600);
  }
}

function buildCaseBackground(caseItem) {
  if (!caseItem.image) {
    return caseItem.backgroundColor;
  }

  return `${caseItem.backgroundColor} url("${caseItem.image}") center center / cover no-repeat`;
}

function createCaseCard(caseItem) {
  const card = document.createElement("a");
  const top = document.createElement("div");
  const title = document.createElement("h3");
  const corner = document.createElement("span");

  card.className = "case-card case-card--managed";
  card.href = "#top";
  card.dataset.caseId = caseItem.id;
  card.style.background = buildCaseBackground(caseItem);

  if (caseItem.size === "tall") {
    card.classList.add("case-card--tall");
  }

  if (caseItem.lightUi) {
    card.classList.add("case-card--light-ui");
  }

  if (caseItem.status) {
    const status = document.createElement("span");
    status.className = "case-card__status";
    status.textContent = caseItem.status;
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

  if (caseItem.lightUi) {
    corner.classList.add("case-card__corner--light");
  }

  card.append(top, corner);

  return card;
}

function renderCases() {
  if (!caseColumns.left || !caseColumns.right) {
    return;
  }

  caseColumns.left.innerHTML = "";
  caseColumns.right.innerHTML = "";

  for (const caseItem of cases) {
    const column = caseItem.column === "right" ? caseColumns.right : caseColumns.left;
    column.append(createCaseCard(caseItem));
  }
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

function renderAdmin() {
  if (!admin.editor) {
    return;
  }

  admin.editor.innerHTML = cases
    .map((caseItem, index) => {
      const preview = caseItem.image
        ? `<img src="${escapeHtml(caseItem.image)}" alt="Превью кейса ${index + 1}" />`
        : "<span>Изображение не выбрано</span>";

      return `
        <section class="admin-case" data-case-id="${escapeHtml(caseItem.id)}">
          <div class="admin-case__header">
            <div>
              <p class="admin-case__eyebrow">Кейс ${index + 1}</p>
              <p class="admin-case__placement">
                ${caseItem.column === "right" ? "Правая колонка" : "Левая колонка"}
              </p>
            </div>

            <button
              class="admin-button admin-button--danger"
              type="button"
              data-case-remove
              ${cases.length === 1 ? "disabled" : ""}
            >
              Удалить
            </button>
          </div>

          <label class="admin-field">
            <span class="admin-field__label">Название</span>
            <input
              class="admin-input"
              type="text"
              data-field="title"
              value="${escapeHtml(caseItem.title)}"
              placeholder="Напиши название кейса"
            />
          </label>

          <label class="admin-field">
            <span class="admin-field__label">Тег справа сверху</span>
            <input
              class="admin-input"
              type="text"
              data-field="status"
              value="${escapeHtml(caseItem.status)}"
              placeholder="Например: в работе"
            />
          </label>

          <label class="admin-field">
            <span class="admin-field__label">Изображение</span>
            <input class="admin-input admin-input--file" type="file" accept="image/*" data-field="image" />
          </label>

          <div class="admin-case__preview ${caseItem.image ? "" : "is-empty"}">
            ${preview}
          </div>

          <div class="admin-case__toggles">
            <label class="admin-check">
              <input type="checkbox" data-field="lightUi" ${caseItem.lightUi ? "checked" : ""} />
              <span>Светлый текст и стрелка</span>
            </label>

            <label class="admin-check">
              <input type="checkbox" data-field="size" ${caseItem.size === "tall" ? "checked" : ""} />
              <span>Высокая карточка</span>
            </label>

            <label class="admin-check">
              <input type="checkbox" data-field="column" ${caseItem.column === "right" ? "checked" : ""} />
              <span>Правая колонка</span>
            </label>
          </div>

          <div class="admin-case__footer">
            <button class="admin-button admin-button--ghost" type="button" data-case-image-clear>
              Убрать фото
            </button>
          </div>
        </section>
      `;
    })
    .join("");
}

function getCaseIndex(caseId) {
  return cases.findIndex((caseItem) => caseItem.id === caseId);
}

function getNextColumn() {
  const leftCount = cases.filter((caseItem) => caseItem.column === "left").length;
  const rightCount = cases.length - leftCount;

  return leftCount <= rightCount ? "left" : "right";
}

function createEmptyCase() {
  return {
    id: createCaseId(),
    title: "Новый кейс",
    image: "",
    column: getNextColumn(),
    size: "medium",
    lightUi: false,
    status: "",
    featuredTitle: false,
    backgroundColor: "#d7dde7",
  };
}

function updateCase(caseId, patch) {
  const caseIndex = getCaseIndex(caseId);

  if (caseIndex === -1) {
    return;
  }

  cases[caseIndex] = {
    ...cases[caseIndex],
    ...patch,
  };

  persistCases({ silent: true });
  renderCases();
}

function openAdmin() {
  if (!admin.sheet || !admin.panel || !admin.toggle) {
    return;
  }

  admin.sheet.hidden = false;
  admin.toggle.setAttribute("aria-expanded", "true");
  document.body.classList.add("is-admin-open");
  setAdminMessage(defaultAdminMessage);
  admin.panel.focus();
}

function closeAdmin() {
  if (!admin.sheet || !admin.toggle) {
    return;
  }

  admin.sheet.hidden = true;
  admin.toggle.setAttribute("aria-expanded", "false");
  document.body.classList.remove("is-admin-open");
  admin.toggle.focus();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.readAsDataURL(file);
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Не удалось обработать изображение."));
    image.src = source;
  });
}

async function optimizeImage(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Нужен файл изображения.");
  }

  const imageSource = await readFileAsDataUrl(file);
  const image = await loadImage(imageSource);
  const maxSide = 1800;
  const largestSide = Math.max(image.width, image.height);
  const scale = largestSide > maxSide ? maxSide / largestSide : 1;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  if (!context) {
    return imageSource;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const outputType = supportsWebp ? "image/webp" : "image/jpeg";

  return canvas.toDataURL(outputType, 0.86);
}

async function handleImageUpload(input) {
  const caseCard = input.closest("[data-case-id]");
  const selectedFile = input.files && input.files[0];

  if (!caseCard || !selectedFile) {
    return;
  }

  const caseIndex = getCaseIndex(caseCard.dataset.caseId);

  if (caseIndex === -1) {
    return;
  }

  const previousImage = cases[caseIndex].image;

  try {
    setAdminMessage("Подготавливаю изображение...");

    cases[caseIndex].image = await optimizeImage(selectedFile);

    if (!persistCases({ silent: true })) {
      cases[caseIndex].image = previousImage;
      return;
    }

    renderCases();
    renderAdmin();
    setAdminMessage("Изображение обновлено.");
  } catch (error) {
    cases[caseIndex].image = previousImage;
    setAdminMessage(error.message || "Не удалось обновить изображение.", true);
  }
}

function handleAdminInput(event) {
  const field = event.target.dataset.field;
  const caseCard = event.target.closest("[data-case-id]");

  if (!field || !caseCard) {
    return;
  }

  const caseId = caseCard.dataset.caseId;

  if (field === "title") {
    updateCase(caseId, { title: event.target.value || "Новый кейс" });
  }

  if (field === "status") {
    updateCase(caseId, { status: event.target.value });
  }
}

function handleAdminChange(event) {
  const field = event.target.dataset.field;
  const caseCard = event.target.closest("[data-case-id]");

  if (!field || !caseCard) {
    return;
  }

  const caseId = caseCard.dataset.caseId;

  if (field === "image") {
    handleImageUpload(event.target);
    return;
  }

  if (field === "lightUi") {
    updateCase(caseId, { lightUi: event.target.checked });
  }

  if (field === "size") {
    updateCase(caseId, { size: event.target.checked ? "tall" : "medium" });
  }

  if (field === "column") {
    updateCase(caseId, { column: event.target.checked ? "right" : "left" });
    renderAdmin();
  }
}

function handleAdminClick(event) {
  const closeButton = event.target.closest("[data-admin-close]");
  const removeButton = event.target.closest("[data-case-remove]");
  const clearImageButton = event.target.closest("[data-case-image-clear]");

  if (closeButton) {
    closeAdmin();
    return;
  }

  if (removeButton) {
    const caseCard = removeButton.closest("[data-case-id]");

    if (!caseCard || cases.length === 1) {
      return;
    }

    cases = cases.filter((caseItem) => caseItem.id !== caseCard.dataset.caseId);

    if (!persistCases({ silent: true })) {
      cases = loadCases();
      return;
    }

    renderCases();
    renderAdmin();
    setAdminMessage("Кейс удалён.");
    return;
  }

  if (clearImageButton) {
    const caseCard = clearImageButton.closest("[data-case-id]");

    if (!caseCard) {
      return;
    }

    const caseIndex = getCaseIndex(caseCard.dataset.caseId);

    if (caseIndex === -1) {
      return;
    }

    const previousImage = cases[caseIndex].image;
    cases[caseIndex].image = "";

    if (!persistCases({ silent: true })) {
      cases[caseIndex].image = previousImage;
      return;
    }

    renderCases();
    renderAdmin();
    setAdminMessage("Изображение удалено.");
  }
}

function setupAdmin() {
  if (!admin.editor || !admin.toggle || !admin.addButton || !admin.resetButton) {
    return;
  }

  admin.toggle.addEventListener("click", () => {
    if (admin.sheet && !admin.sheet.hidden) {
      closeAdmin();
      return;
    }

    openAdmin();
  });

  admin.addButton.addEventListener("click", () => {
    cases = [...cases, createEmptyCase()];

    if (!persistCases({ silent: true })) {
      cases = loadCases();
      return;
    }

    renderCases();
    renderAdmin();
    setAdminMessage("Новый кейс добавлен.");

    const lastTitleInput = admin.editor.querySelector(
      '.admin-case:last-child [data-field="title"]',
    );

    if (lastTitleInput) {
      lastTitleInput.focus();
      lastTitleInput.select();
    }
  });

  admin.resetButton.addEventListener("click", () => {
    const confirmed = window.confirm("Сбросить все кейсы к текущему стартовому набору?");

    if (!confirmed) {
      return;
    }

    cases = cloneDefaultCases();

    if (!persistCases({ silent: true })) {
      cases = loadCases();
      return;
    }

    renderCases();
    renderAdmin();
    setAdminMessage("Кейсы сброшены к базовому набору.");
  });

  admin.closeButtons.forEach((button) => {
    button.addEventListener("click", closeAdmin);
  });

  admin.editor.addEventListener("input", handleAdminInput);
  admin.editor.addEventListener("change", handleAdminChange);
  admin.editor.addEventListener("click", handleAdminClick);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && admin.sheet && !admin.sheet.hidden) {
      closeAdmin();
    }
  });
}

if (toggleButton) {
  applyTheme(root.dataset.theme || "light");

  toggleButton.addEventListener("click", () => {
    const nextTheme = getNextTheme();

    localStorage.setItem(themeStorageKey, nextTheme);
    applyTheme(nextTheme);
  });
}

renderCases();
renderAdmin();
setupAdmin();
