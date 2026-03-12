const store = window.PortfolioStore;
const authStorageKey = "portfolio-admin-auth";
const defaultAdminMessage = "Изменения сохраняются автоматически.";
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
};

const supportsWebp = (() => {
  const canvas = document.createElement("canvas");
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
})();

let adminMessageTimer = 0;
let cases = store ? store.loadCases() : [];

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

  renderEditor();
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
    id: store ? store.createCaseId() : `case-${Date.now()}`,
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

function renderEditor() {
  if (!elements.editor) {
    return;
  }

  elements.editor.innerHTML = cases
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
            <input
              class="admin-input admin-input--file"
              type="file"
              accept="image/*"
              data-field="image"
            />
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

function updateCase(caseId, patch, options = {}) {
  const { rerender = true } = options;
  const caseIndex = getCaseIndex(caseId);

  if (caseIndex === -1) {
    return;
  }

  cases[caseIndex] = {
    ...cases[caseIndex],
    ...patch,
  };

  if (!persistCases()) {
    return;
  }

  if (rerender) {
    renderEditor();
  }

  setAdminMessage("Изменения сохранены.");
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

    if (!persistCases()) {
      cases[caseIndex].image = previousImage;
      return;
    }

    renderEditor();
    setAdminMessage("Изображение обновлено.");
  } catch (error) {
    cases[caseIndex].image = previousImage;
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
    updateCase(caseId, { title: event.target.value || "Новый кейс" }, { rerender: false });
  }

  if (field === "status") {
    updateCase(caseId, { status: event.target.value }, { rerender: false });
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
    updateCase(caseId, { lightUi: event.target.checked });
  }

  if (field === "size") {
    updateCase(caseId, { size: event.target.checked ? "tall" : "medium" });
  }

  if (field === "column") {
    updateCase(caseId, { column: event.target.checked ? "right" : "left" });
  }
}

function handleEditorClick(event) {
  const removeButton = event.target.closest("[data-case-remove]");
  const clearImageButton = event.target.closest("[data-case-image-clear]");

  if (removeButton) {
    const caseCard = removeButton.closest("[data-case-id]");

    if (!caseCard || cases.length === 1) {
      return;
    }

    cases = cases.filter((caseItem) => caseItem.id !== caseCard.dataset.caseId);

    if (!persistCases()) {
      cases = store ? store.loadCases() : cases;
      return;
    }

    renderEditor();
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

    if (!persistCases()) {
      cases[caseIndex].image = previousImage;
      return;
    }

    renderEditor();
    setAdminMessage("Изображение удалено.");
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
      cases = [...cases, createEmptyCase()];

      if (!persistCases()) {
        cases = store.loadCases();
        return;
      }

      renderEditor();
      setAdminMessage("Новый кейс добавлен.");

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

      cases = store.cloneDefaultCases();

      if (!persistCases()) {
        cases = store.loadCases();
        return;
      }

      renderEditor();
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
