const store = window.PortfolioStore;
const caseCardRenderer = window.PortfolioCaseCard;
const authStorageKey = "portfolio-admin-auth";
const defaultAdminMessage = "Изменения кейса сохраняются по кнопке в карточке.";
const comparableCaseFields = [
  "id",
  "title",
  "image",
  "column",
  "size",
  "lightUi",
  "status",
  "featuredTitle",
  "backgroundColor",
  "category",
  "showOnHome",
];
const adminCredentials = {
  login: "admin",
  password: "portfolio2026",
};

const elements = {
  authView: document.querySelector("[data-auth-view]"),
  adminView: document.querySelector("[data-admin-view]"),
  loginForm: document.querySelector("[data-login-form]"),
  loginMessage: document.querySelector("[data-login-message]"),
  addButton: document.querySelector("[data-case-add]"),
  resetButton: document.querySelector("[data-cases-reset]"),
  logoutButton: document.querySelector("[data-admin-logout]"),
  editor: document.querySelector("[data-case-editor]"),
  adminMessage: document.querySelector("[data-admin-message]"),
  dashboardColumns: {
    left: document.querySelector('[data-admin-dashboard-column="left"]'),
    right: document.querySelector('[data-admin-dashboard-column="right"]'),
  },
};

const supportsWebp = (() => {
  const canvas = document.createElement("canvas");
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
})();

let adminMessageTimer = 0;
let cases = store ? store.loadCases() : [];
let draftCases = cloneCases(cases);

function cloneCase(caseItem) {
  return { ...caseItem };
}

function cloneCases(items) {
  return items.map(cloneCase);
}

function isAuthenticated() {
  return sessionStorage.getItem(authStorageKey) === "true";
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

function setLoginMessage(text = "", isError = false) {
  if (!elements.loginMessage) {
    return;
  }

  elements.loginMessage.textContent = text;
  elements.loginMessage.classList.toggle("is-error", isError);
}

function setAdminMessage(text = defaultAdminMessage, isError = false) {
  if (!elements.adminMessage) {
    return;
  }

  window.clearTimeout(adminMessageTimer);
  elements.adminMessage.textContent = text;
  elements.adminMessage.classList.toggle("is-error", isError);

  if (text !== defaultAdminMessage) {
    adminMessageTimer = window.setTimeout(() => {
      setAdminMessage(defaultAdminMessage);
    }, isError ? 4400 : 2600);
  }
}

function showAuthView() {
  if (elements.authView) {
    elements.authView.hidden = false;
  }

  if (elements.adminView) {
    elements.adminView.hidden = true;
  }

  setLoginMessage("");
}

function showAdminView() {
  if (elements.authView) {
    elements.authView.hidden = true;
  }

  if (elements.adminView) {
    elements.adminView.hidden = false;
  }

  renderWorkspace();
  setAdminMessage(defaultAdminMessage);
}

function persistCases() {
  if (!store) {
    return false;
  }

  const saved = store.saveCases(cases);

  if (!saved) {
    setAdminMessage(
      "Не удалось сохранить изменения. Попробуй изображение меньшего размера.",
      true,
    );
  }

  return saved;
}

function getCaseIndex(caseId, collection = draftCases) {
  return collection.findIndex((caseItem) => caseItem.id === caseId);
}

function getCaseById(caseId, collection = draftCases) {
  return collection.find((caseItem) => caseItem.id === caseId) || null;
}

function areCasesEqual(firstCase, secondCase) {
  if (!firstCase || !secondCase) {
    return false;
  }

  return comparableCaseFields.every((field) => firstCase[field] === secondCase[field]);
}

function isCaseDirty(caseId) {
  const draftCase = getCaseById(caseId, draftCases);
  const savedCase = getCaseById(caseId, cases);

  if (!draftCase) {
    return false;
  }

  if (!savedCase) {
    return true;
  }

  return !areCasesEqual(draftCase, savedCase);
}

function getCaseSaveState(caseId) {
  if (!getCaseById(caseId, cases)) {
    return {
      text: "Новый кейс ещё не сохранён.",
      dirty: true,
    };
  }

  if (isCaseDirty(caseId)) {
    return {
      text: "Есть несохранённые изменения.",
      dirty: true,
    };
  }

  return {
    text: "Все изменения сохранены.",
    dirty: false,
  };
}

function getNextColumn() {
  const leftCount = draftCases.filter((caseItem) => caseItem.column === "left").length;
  const rightCount = draftCases.length - leftCount;

  return leftCount <= rightCount ? "left" : "right";
}

function createEmptyCase() {
  return {
    id: store ? store.createCaseId() : `case-${Date.now()}`,
    title: "Новый кейс",
    image: "",
    column: getNextColumn(),
    size: "medium",
    lightUi: false,
    status: "",
    featuredTitle: false,
    backgroundColor: "#d7dde7",
    category: store?.defaultPortfolioCategory || "product",
    showOnHome: false,
  };
}

function getCaseEditorId(caseId) {
  return `case-editor-${caseId}`;
}

function getCasePlacementLabel(caseItem) {
  return caseItem.column === "right" ? "Правая колонка" : "Левая колонка";
}

function getCaseVisibilityLabel(caseItem) {
  return caseItem.showOnHome ? "Показывается на главной" : "Только страница портфолио";
}

function renderCategoryOptions(selectedCategory) {
  return (store?.portfolioCategories || [])
    .map((category) => {
      const selected = category.id === selectedCategory ? "selected" : "";

      return `
        <option value="${escapeHtml(category.id)}" ${selected}>
          ${escapeHtml(category.label)}
        </option>
      `;
    })
    .join("");
}

function createImagePreview(caseItem, index) {
  if (caseItem.image) {
    return `<img src="${escapeHtml(caseItem.image)}" alt="Превью кейса ${index + 1}" />`;
  }

  return "<span>Изображение не выбрано</span>";
}

function renderCasePreview(caseElement, caseItem) {
  if (!caseCardRenderer || !caseElement) {
    return;
  }

  const previewStage = caseElement.querySelector("[data-card-preview]");

  if (!previewStage) {
    return;
  }

  previewStage.innerHTML = "";
  previewStage.append(
    caseCardRenderer.createCaseCard(caseItem, {
      tagName: "div",
      extraClasses: ["admin-case__preview-card"],
      staticPreview: true,
    }),
  );
}

function syncDraftCaseView(caseId) {
  if (!elements.editor) {
    return;
  }

  const caseItem = getCaseById(caseId, draftCases);
  const caseElement = elements.editor.querySelector(`[data-case-id="${caseId}"]`);

  if (!caseItem || !caseElement) {
    return;
  }

  const placement = caseElement.querySelector("[data-case-placement]");
  const visibility = caseElement.querySelector("[data-case-visibility]");
  const saveButton = caseElement.querySelector("[data-case-save]");
  const saveState = caseElement.querySelector("[data-case-save-state]");
  const state = getCaseSaveState(caseId);

  if (placement) {
    placement.textContent = getCasePlacementLabel(caseItem);
  }

  if (visibility) {
    visibility.textContent = getCaseVisibilityLabel(caseItem);
  }

  if (saveButton) {
    saveButton.disabled = !state.dirty;
  }

  if (saveState) {
    saveState.textContent = state.text;
    saveState.classList.toggle("is-dirty", state.dirty);
  }

  renderCasePreview(caseElement, caseItem);
}

function renderDashboard() {
  const { left, right } = elements.dashboardColumns;

  if (!caseCardRenderer || !left || !right) {
    return;
  }

  const homeCases = cases.filter((caseItem) => caseItem.showOnHome);

  left.innerHTML = "";
  right.innerHTML = "";

  if (!homeCases.length) {
    left.innerHTML =
      '<p class="admin-dashboard__empty">На главной пока нет кейсов. Включи тоггл "Показать на главной" в нужной карточке и сохрани её.</p>';
    return;
  }

  homeCases.forEach((caseItem, index) => {
    const column = caseItem.column === "right" ? right : left;

    column.append(
      caseCardRenderer.createCaseCard(caseItem, {
        href: `#${getCaseEditorId(caseItem.id)}`,
        ariaLabel: `Перейти к настройкам кейса ${index + 1}`,
        extraClasses: ["admin-dashboard__card"],
      }),
    );
  });
}

function renderEditor() {
  if (!elements.editor) {
    return;
  }

  elements.editor.innerHTML = draftCases
    .map((caseItem, index) => {
      const saveState = getCaseSaveState(caseItem.id);

      return `
        <section
          class="admin-case"
          id="${escapeHtml(getCaseEditorId(caseItem.id))}"
          data-case-id="${escapeHtml(caseItem.id)}"
        >
          <div class="admin-case__header">
            <div>
              <p class="admin-case__eyebrow">Кейс ${index + 1}</p>
              <div class="admin-case__meta">
                <p class="admin-case__placement" data-case-placement>
                  ${getCasePlacementLabel(caseItem)}
                </p>
                <p class="admin-case__surface" data-case-visibility>
                  ${getCaseVisibilityLabel(caseItem)}
                </p>
              </div>
            </div>

            <button
              class="admin-button admin-button--danger"
              type="button"
              data-case-remove
              ${draftCases.length === 1 ? "disabled" : ""}
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
            <span class="admin-field__label">Категория в портфолио</span>
            <select class="admin-input" data-field="category">
              ${renderCategoryOptions(caseItem.category)}
            </select>
          </label>

          <label class="admin-field">
            <span class="admin-field__label">Изображение</span>
            <input
              class="admin-input admin-input--file"
              type="file"
              accept="image/*"
              data-field="image"
            />
          </label>

          <div class="admin-case__previews">
            <div class="admin-case__preview-panel">
              <p class="admin-case__preview-label">Фон</p>
              <div class="admin-case__preview ${caseItem.image ? "" : "is-empty"}">
                ${createImagePreview(caseItem, index)}
              </div>
            </div>

            <div class="admin-case__preview-panel">
              <p class="admin-case__preview-label">Карточка с текстом</p>
              <div class="admin-case__card-stage" data-card-preview></div>
            </div>
          </div>

          <div class="admin-case__toggles">
            <label class="admin-check">
              <input
                type="checkbox"
                data-field="showOnHome"
                ${caseItem.showOnHome ? "checked" : ""}
              />
              <span>Показать на главной</span>
            </label>

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

          <p
            class="admin-case__save-state ${saveState.dirty ? "is-dirty" : ""}"
            data-case-save-state
          >
            ${saveState.text}
          </p>

          <div class="admin-case__footer">
            <button
              class="admin-button"
              type="button"
              data-case-save
              ${saveState.dirty ? "" : "disabled"}
            >
              Сохранить изменения
            </button>

            <button class="admin-button admin-button--ghost" type="button" data-case-image-clear>
              Убрать фото
            </button>
          </div>
        </section>
      `;
    })
    .join("");

  elements.editor.querySelectorAll("[data-case-id]").forEach((caseElement) => {
    const caseItem = getCaseById(caseElement.dataset.caseId, draftCases);

    if (caseItem) {
      renderCasePreview(caseElement, caseItem);
    }
  });
}

function renderWorkspace() {
  renderDashboard();
  renderEditor();
}

function updateDraftCase(caseId, patch, options = {}) {
  const { rerender = false } = options;
  const caseIndex = getCaseIndex(caseId, draftCases);

  if (caseIndex === -1) {
    return;
  }

  draftCases[caseIndex] = {
    ...draftCases[caseIndex],
    ...patch,
  };

  if (rerender) {
    renderEditor();
    return;
  }

  syncDraftCaseView(caseId);
}

function saveCase(caseId) {
  const draftCase = getCaseById(caseId, draftCases);

  if (!draftCase) {
    return;
  }

  const previousCases = cloneCases(cases);
  const savedIndex = getCaseIndex(caseId, cases);

  if (savedIndex === -1) {
    cases = [...cases, cloneCase(draftCase)];
  } else {
    cases[savedIndex] = cloneCase(draftCase);
  }

  if (!persistCases()) {
    cases = previousCases;
    return;
  }

  renderWorkspace();
  setAdminMessage("Кейс сохранён.");
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

  const caseId = caseCard.dataset.caseId;
  const previousImage = getCaseById(caseId, draftCases)?.image || "";

  try {
    setAdminMessage("Подготавливаю изображение...");
    const optimizedImage = await optimizeImage(selectedFile);

    updateDraftCase(caseId, { image: optimizedImage }, { rerender: true });
    setAdminMessage("Изображение добавлено в черновик. Сохрани кейс.");
  } catch (error) {
    updateDraftCase(caseId, { image: previousImage }, { rerender: true });
    setAdminMessage(error.message || "Не удалось обновить изображение.", true);
  }
}

function handleEditorInput(event) {
  const field = event.target.dataset.field;
  const caseCard = event.target.closest("[data-case-id]");

  if (!field || !caseCard) {
    return;
  }

  const caseId = caseCard.dataset.caseId;

  if (field === "title") {
    updateDraftCase(caseId, { title: event.target.value || "Новый кейс" });
  }

  if (field === "status") {
    updateDraftCase(caseId, { status: event.target.value });
  }
}

function handleEditorChange(event) {
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
    updateDraftCase(caseId, { lightUi: event.target.checked });
  }

  if (field === "showOnHome") {
    updateDraftCase(caseId, { showOnHome: event.target.checked });
  }

  if (field === "size") {
    updateDraftCase(caseId, { size: event.target.checked ? "tall" : "medium" });
  }

  if (field === "column") {
    updateDraftCase(caseId, { column: event.target.checked ? "right" : "left" });
  }

  if (field === "category") {
    updateDraftCase(caseId, {
      category: store?.normalizeCategory(event.target.value) || event.target.value,
    });
  }
}

function handleEditorClick(event) {
  const saveButton = event.target.closest("[data-case-save]");
  const removeButton = event.target.closest("[data-case-remove]");
  const clearImageButton = event.target.closest("[data-case-image-clear]");

  if (saveButton) {
    const caseCard = saveButton.closest("[data-case-id]");

    if (!caseCard) {
      return;
    }

    saveCase(caseCard.dataset.caseId);
    return;
  }

  if (removeButton) {
    const caseCard = removeButton.closest("[data-case-id]");

    if (!caseCard || draftCases.length === 1) {
      return;
    }

    const caseId = caseCard.dataset.caseId;
    const savedCase = getCaseById(caseId, cases);

    if (!savedCase) {
      draftCases = draftCases.filter((caseItem) => caseItem.id !== caseId);
      renderEditor();
      setAdminMessage("Черновик кейса удалён.");
      return;
    }

    const previousCases = cloneCases(cases);
    const previousDraftCases = cloneCases(draftCases);

    cases = cases.filter((caseItem) => caseItem.id !== caseId);
    draftCases = draftCases.filter((caseItem) => caseItem.id !== caseId);

    if (!persistCases()) {
      cases = previousCases;
      draftCases = previousDraftCases;
      return;
    }

    renderWorkspace();
    setAdminMessage("Кейс удалён.");
    return;
  }

  if (clearImageButton) {
    const caseCard = clearImageButton.closest("[data-case-id]");

    if (!caseCard) {
      return;
    }

    updateDraftCase(caseCard.dataset.caseId, { image: "" }, { rerender: true });
    setAdminMessage("Изображение убрано из черновика. Сохрани кейс.");
  }
}

function handleLogin(event) {
  event.preventDefault();

  if (!elements.loginForm) {
    return;
  }

  const formData = new FormData(elements.loginForm);
  const login = String(formData.get("login") || "").trim();
  const password = String(formData.get("password") || "").trim();

  if (login === adminCredentials.login && password === adminCredentials.password) {
    sessionStorage.setItem(authStorageKey, "true");
    cases = store ? store.loadCases() : [];
    draftCases = cloneCases(cases);
    elements.loginForm.reset();
    setLoginMessage("");
    showAdminView();
    return;
  }

  setLoginMessage("Неверный логин или пароль.", true);
}

function handleLogout() {
  sessionStorage.removeItem(authStorageKey);
  showAuthView();
}

function setupAdminPage() {
  if (!store || !elements.loginForm || !elements.editor) {
    return;
  }

  elements.loginForm.addEventListener("submit", handleLogin);

  if (elements.addButton) {
    elements.addButton.addEventListener("click", () => {
      draftCases = [...draftCases, createEmptyCase()];
      renderEditor();
      setAdminMessage("Новый кейс добавлен как черновик. Сохрани его в карточке.");

      const lastTitleInput = elements.editor.querySelector(
        '.admin-case:last-child [data-field="title"]',
      );

      if (lastTitleInput) {
        lastTitleInput.focus();
        lastTitleInput.select();
      }
    });
  }

  if (elements.resetButton) {
    elements.resetButton.addEventListener("click", () => {
      const confirmed = window.confirm("Сбросить все кейсы к текущему стартовому набору?");

      if (!confirmed) {
        return;
      }

      const previousCases = cloneCases(cases);
      const previousDraftCases = cloneCases(draftCases);

      cases = store.cloneDefaultCases();
      draftCases = cloneCases(cases);

      if (!persistCases()) {
        cases = previousCases;
        draftCases = previousDraftCases;
        return;
      }

      renderWorkspace();
      setAdminMessage("Кейсы сброшены к базовому набору.");
    });
  }

  if (elements.logoutButton) {
    elements.logoutButton.addEventListener("click", handleLogout);
  }

  elements.editor.addEventListener("input", handleEditorInput);
  elements.editor.addEventListener("change", handleEditorChange);
  elements.editor.addEventListener("click", handleEditorClick);

  if (isAuthenticated()) {
    showAdminView();
  } else {
    showAuthView();
  }
}

setupAdminPage();
