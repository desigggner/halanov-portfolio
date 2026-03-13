const store = window.PortfolioStore;
const caseCardRenderer = window.PortfolioCaseCard;
const adminAuthEndpoint = "/api/admin-auth";
const defaultAdminMessage = "Изменения кейса сохраняются по кнопке в карточке.";
const analyticsRanges = {
  "7d": "7 дней",
  "30d": "30 дней",
  "90d": "90 дней",
  all: "За всё время",
};
const comparableCaseFields = [
  "id",
  "title",
  "year",
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

const elements = {
  authView: document.querySelector("[data-auth-view]"),
  adminView: document.querySelector("[data-admin-view]"),
  loginForm: document.querySelector("[data-login-form]"),
  loginMessage: document.querySelector("[data-login-message]"),
  loginSubmit: document.querySelector('[data-login-form] button[type="submit"]'),
  addButton: document.querySelector("[data-case-add]"),
  resetButton: document.querySelector("[data-cases-reset]"),
  logoutButton: document.querySelector("[data-admin-logout]"),
  editor: document.querySelector("[data-case-editor]"),
  adminMessage: document.querySelector("[data-admin-message]"),
  analyticsMessage: document.querySelector("[data-analytics-message]"),
  analyticsSummary: document.querySelector("[data-analytics-summary]"),
  analyticsPages: document.querySelector("[data-analytics-pages]"),
  analyticsSources: document.querySelector("[data-analytics-sources]"),
  analyticsDevices: document.querySelector("[data-analytics-devices]"),
  analyticsGeo: document.querySelector("[data-analytics-geo]"),
  analyticsAudience: document.querySelector("[data-analytics-audience]"),
  analyticsInteractions: document.querySelector("[data-analytics-interactions]"),
  analyticsRecent: document.querySelector("[data-analytics-recent]"),
  analyticsRecentClicks: document.querySelector("[data-analytics-recent-clicks]"),
  analyticsRefresh: document.querySelector("[data-analytics-refresh]"),
  analyticsRangeButtons: Array.from(document.querySelectorAll("[data-analytics-range]")),
  adminTabButtons: Array.from(document.querySelectorAll("[data-admin-tab-button]")),
  adminTabPanels: Array.from(document.querySelectorAll("[data-admin-tab-panel]")),
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
let activeAdminTab = "cases";
let activeAnalyticsRange = "7d";
let analyticsRequestToken = 0;
let analyticsLoaded = false;
let authRequestInFlight = false;

function cloneCase(caseItem) {
  return { ...caseItem };
}

function cloneCases(items) {
  return items.map(cloneCase);
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

function setLoginState(isLoading) {
  if (elements.loginSubmit) {
    elements.loginSubmit.disabled = Boolean(isLoading);
  }
}

async function requestAdminAuth(method, body) {
  const options = {
    method,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      accept: "application/json",
    },
  };

  if (body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await fetch(adminAuthEndpoint, options);
  const payload = await response.json().catch(() => ({}));

  return { response, payload };
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

function formatNumber(value) {
  return new Intl.NumberFormat("ru-RU").format(Number(value) || 0);
}

function formatPercent(value) {
  return `${formatNumber(Math.round(Number(value) || 0))}%`;
}

function formatDuration(seconds) {
  const normalized = Math.max(0, Math.round(Number(seconds) || 0));

  if (normalized < 60) {
    return `${formatNumber(normalized)} сек`;
  }

  const minutes = Math.floor(normalized / 60);

  if (minutes < 60) {
    return `${formatNumber(minutes)} мин`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!remainingMinutes) {
    return `${formatNumber(hours)} ч`;
  }

  return `${formatNumber(hours)} ч ${formatNumber(remainingMinutes)} мин`;
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function setAnalyticsMessage(text = "", isError = false) {
  if (!elements.analyticsMessage) {
    return;
  }

  elements.analyticsMessage.textContent = text;
  elements.analyticsMessage.classList.toggle("is-error", isError);
}

function syncAnalyticsRangeButtons() {
  for (const button of elements.analyticsRangeButtons) {
    const isActive = button.dataset.analyticsRange === activeAnalyticsRange;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
}

function setActiveAdminTab(nextTab) {
  const normalizedTab = nextTab === "analytics" ? "analytics" : "cases";
  activeAdminTab = normalizedTab;

  for (const button of elements.adminTabButtons) {
    const isActive = button.dataset.adminTabButton === normalizedTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  }

  for (const panel of elements.adminTabPanels) {
    panel.hidden = panel.dataset.adminTabPanel !== normalizedTab;
  }

  if (normalizedTab === "analytics" && !analyticsLoaded) {
    loadAnalyticsReport({ silent: true });
  }
}

function renderAnalyticsEmptyState(text = "Статистика пока не собрана.") {
  const emptyMarkup = `<p class="admin-analytics__empty">${escapeHtml(text)}</p>`;

  if (elements.analyticsSummary) {
    elements.analyticsSummary.innerHTML = emptyMarkup;
  }

  for (const target of [
    elements.analyticsPages,
    elements.analyticsSources,
    elements.analyticsDevices,
    elements.analyticsGeo,
    elements.analyticsAudience,
    elements.analyticsInteractions,
    elements.analyticsRecent,
    elements.analyticsRecentClicks,
  ]) {
    if (target) {
      target.innerHTML = emptyMarkup;
    }
  }
}

function renderAnalyticsList(items, options = {}) {
  const emptyText = options.emptyText || "Пока пусто";
  const formatter = typeof options.formatter === "function" ? options.formatter : formatNumber;

  if (!Array.isArray(items) || !items.length) {
    return `<p class="admin-analytics__empty">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <ol class="admin-analytics__list">
      ${items
        .map((item) => {
          const hintMarkup = item.hint
            ? `<span class="admin-analytics__hint">${escapeHtml(item.hint)}</span>`
            : "";

          return `
            <li class="admin-analytics__list-item">
              <div class="admin-analytics__list-copy">
                <span class="admin-analytics__label">${escapeHtml(item.label || "—")}</span>
                ${hintMarkup}
              </div>
              <span class="admin-analytics__value">${escapeHtml(formatter(item.value))}</span>
            </li>
          `;
        })
        .join("")}
    </ol>
  `;
}

function renderAnalyticsSummary(summary, rangeLabel, storage) {
  if (!elements.analyticsSummary) {
    return;
  }

  const metrics = [
    { label: "Просмотры страниц", value: formatNumber(summary.pageviews) },
    { label: "Уникальные посетители", value: formatNumber(summary.visitors) },
    { label: "Сессии", value: formatNumber(summary.sessions) },
    { label: "Клики", value: formatNumber(summary.clicks) },
    { label: "Возвращаются", value: formatNumber(summary.returningVisitors) },
    { label: "Вовлечённые сессии", value: formatPercent(summary.engagedRatePercent) },
    { label: "Среднее вовлечение", value: formatDuration(summary.avgEngagementSeconds) },
    { label: "Средний скролл", value: formatPercent(summary.avgScrollPercent) },
    { label: "Страниц за сессию", value: String(summary.avgPagesPerSession || 0) },
    { label: "Bounce rate", value: formatPercent(summary.bounceRatePercent) },
  ];
  const storageText =
    storage?.mode === "upstash"
      ? "Redis / Upstash"
      : storage?.mode === "file"
        ? "Локальный файл"
        : "Память процесса";

  elements.analyticsSummary.innerHTML = `
    <div class="admin-analytics__summary-grid">
      ${metrics
        .map(
          (metric) => `
            <article class="admin-analytics__metric">
              <span class="admin-analytics__metric-value">${escapeHtml(metric.value)}</span>
              <span class="admin-analytics__metric-label">${escapeHtml(metric.label)}</span>
            </article>
          `,
        )
        .join("")}
    </div>
    <div class="admin-analytics__meta">
      <span>Период: ${escapeHtml(rangeLabel)}</span>
      <span>Событий в периоде: ${escapeHtml(formatNumber(summary.eventsInRange))}</span>
      <span>Событий в хранилище: ${escapeHtml(formatNumber(summary.eventsStored))}</span>
      <span>Хранилище: ${escapeHtml(storageText)}</span>
    </div>
  `;
}

function renderAnalyticsRecent(items) {
  if (!elements.analyticsRecent) {
    return;
  }

  if (!Array.isArray(items) || !items.length) {
    elements.analyticsRecent.innerHTML =
      '<p class="admin-analytics__empty">Последних визитов пока нет.</p>';
    return;
  }

  elements.analyticsRecent.innerHTML = `
    <div class="admin-analytics__recent">
      ${items
        .map(
          (item) => `
            <article class="admin-analytics__visit">
              <div class="admin-analytics__visit-row">
                <span class="admin-analytics__visit-time">${escapeHtml(formatDateTime(item.timestamp))}</span>
                <span class="admin-analytics__visit-badge ${item.isReturning ? "is-returning" : ""}">
                  ${item.isReturning ? "Возврат" : "Новый"}
                </span>
              </div>
              <div class="admin-analytics__visit-row">
                <span class="admin-analytics__visit-page">${escapeHtml(item.page || "/")}</span>
                <span class="admin-analytics__visit-source">${escapeHtml(item.source || "Прямой")}</span>
              </div>
              <div class="admin-analytics__visit-meta">
                <span>${escapeHtml(item.location || "Не определено")}</span>
                <span>${escapeHtml(item.device || "Device")} • ${escapeHtml(item.browser || "—")} • ${escapeHtml(item.operatingSystem || "—")}</span>
                <span>${escapeHtml(item.theme || "Светлая")} • ${escapeHtml(item.language || "—")} • ${escapeHtml(item.timezone || "—")}</span>
                <span>Viewport ${escapeHtml(item.viewport || "—")} • Screen ${escapeHtml(item.screen || "—")}</span>
                <span>Скролл ${escapeHtml(formatPercent(item.scrollPercent || 0))} • Время ${escapeHtml(formatDuration(item.engagementSeconds || 0))}</span>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderAnalyticsRecentClicks(items) {
  if (!elements.analyticsRecentClicks) {
    return;
  }

  if (!Array.isArray(items) || !items.length) {
    elements.analyticsRecentClicks.innerHTML =
      '<p class="admin-analytics__empty">Последних кликов пока нет.</p>';
    return;
  }

  elements.analyticsRecentClicks.innerHTML = `
    <ol class="admin-analytics__list">
      ${items
        .map(
          (item) => `
            <li class="admin-analytics__list-item">
              <div class="admin-analytics__list-copy">
                <span class="admin-analytics__label">${escapeHtml(item.target || "Клик")}</span>
                <span class="admin-analytics__hint">
                  ${escapeHtml(item.page || "/")} • ${escapeHtml(item.category || "interaction")}
                </span>
                ${
                  item.href
                    ? `<span class="admin-analytics__hint">${escapeHtml(item.href)}</span>`
                    : ""
                }
              </div>
              <span class="admin-analytics__value">${escapeHtml(formatDateTime(item.timestamp))}</span>
            </li>
          `,
        )
        .join("")}
    </ol>
  `;
}

function renderAnalyticsReport(report, rangeLabel) {
  analyticsLoaded = true;
  renderAnalyticsSummary(report.summary, rangeLabel, report.storage);

  if (elements.analyticsPages) {
    elements.analyticsPages.innerHTML = renderAnalyticsList(report.topPages, {
      emptyText: "Просмотров страниц пока нет.",
    });
  }

  if (elements.analyticsSources) {
    const sourceBlocks = [
      renderAnalyticsList(report.sources, {
        emptyText: "Источники трафика пока не собраны.",
      }),
      renderAnalyticsList(report.campaigns, {
        emptyText: "UTM-кампаний пока нет.",
      }),
    ];

    elements.analyticsSources.innerHTML = sourceBlocks
      .map((block, index) => `
        <div class="admin-analytics__stack">
          <p class="admin-analytics__stack-title">${index === 0 ? "Источники" : "Кампании"}</p>
          ${block}
        </div>
      `)
      .join("");
  }

  if (elements.analyticsDevices) {
    elements.analyticsDevices.innerHTML = `
      <div class="admin-analytics__stack">
        <p class="admin-analytics__stack-title">Устройства</p>
        ${renderAnalyticsList(report.devices, { emptyText: "Нет данных по устройствам." })}
      </div>
      <div class="admin-analytics__stack">
        <p class="admin-analytics__stack-title">Браузеры</p>
        ${renderAnalyticsList(report.browsers, { emptyText: "Нет данных по браузерам." })}
      </div>
      <div class="admin-analytics__stack">
        <p class="admin-analytics__stack-title">ОС</p>
        ${renderAnalyticsList(report.operatingSystems, { emptyText: "Нет данных по ОС." })}
      </div>
    `;
  }

  if (elements.analyticsGeo) {
    elements.analyticsGeo.innerHTML = `
      <div class="admin-analytics__stack">
        <p class="admin-analytics__stack-title">Страны</p>
        ${renderAnalyticsList(report.countries, { emptyText: "География ещё не определилась." })}
      </div>
      <div class="admin-analytics__stack">
        <p class="admin-analytics__stack-title">Города</p>
        ${renderAnalyticsList(report.cities, { emptyText: "Нет данных по городам." })}
      </div>
    `;
  }

  if (elements.analyticsAudience) {
    elements.analyticsAudience.innerHTML = `
      <div class="admin-analytics__stack">
        <p class="admin-analytics__stack-title">Язык</p>
        ${renderAnalyticsList(report.languages, { emptyText: "Нет данных по языкам." })}
      </div>
      <div class="admin-analytics__stack">
        <p class="admin-analytics__stack-title">Часовой пояс</p>
        ${renderAnalyticsList(report.timezones, { emptyText: "Нет данных по timezone." })}
      </div>
      <div class="admin-analytics__stack">
        <p class="admin-analytics__stack-title">Тема</p>
        ${renderAnalyticsList(report.themes, { emptyText: "Нет данных по теме." })}
      </div>
      <div class="admin-analytics__stack">
        <p class="admin-analytics__stack-title">Экраны</p>
        ${renderAnalyticsList(report.screens, { emptyText: "Нет данных по экранам." })}
      </div>
      <div class="admin-analytics__stack">
        <p class="admin-analytics__stack-title">Viewport</p>
        ${renderAnalyticsList(report.viewports, { emptyText: "Нет данных по viewport." })}
      </div>
    `;
  }

  if (elements.analyticsInteractions) {
    elements.analyticsInteractions.innerHTML = renderAnalyticsList(report.interactions, {
      emptyText: "Кликов по интерфейсу пока нет.",
    });
  }

  renderAnalyticsRecent(report.recentVisits);
  renderAnalyticsRecentClicks(report.recentClicks);
}

async function loadAnalyticsReport(options = {}) {
  if (!elements.analyticsSummary) {
    return;
  }

  analyticsRequestToken += 1;
  const requestToken = analyticsRequestToken;

  if (!options.silent) {
    setAnalyticsMessage("Собираю отчёт аналитики...");
  }

  try {
    const response = await fetch(`/api/analytics-report?range=${encodeURIComponent(activeAnalyticsRange)}`, {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        showAuthView();
        setLoginMessage("Сессия администратора истекла. Войди снова.", true);
        return;
      }

      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();

    if (analyticsRequestToken !== requestToken) {
      return;
    }

    if (!payload.ok) {
      throw new Error(payload.error || "Отчёт аналитики недоступен.");
    }

    if (!payload.summary?.eventsInRange) {
      analyticsLoaded = true;
      renderAnalyticsEmptyState("Пока нет посещений для выбранного периода.");
    } else {
      renderAnalyticsReport(payload, analyticsRanges[payload.range?.id] || analyticsRanges[activeAnalyticsRange]);
    }

    if (payload.storage?.warning) {
      setAnalyticsMessage(payload.storage.warning);
      return;
    }

    setAnalyticsMessage(`Аналитика обновлена. Период: ${analyticsRanges[payload.range?.id] || analyticsRanges[activeAnalyticsRange]}.`);
  } catch (error) {
    if (analyticsRequestToken !== requestToken) {
      return;
    }

    renderAnalyticsEmptyState("Не удалось загрузить отчёт аналитики.");
    setAnalyticsMessage(error?.message || "Не удалось загрузить аналитику.", true);
  }
}

function showAuthView() {
  if (elements.authView) {
    elements.authView.hidden = false;
  }

  if (elements.adminView) {
    elements.adminView.hidden = true;
  }

  setLoginState(false);
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
  setActiveAdminTab(activeAdminTab);
  syncAnalyticsRangeButtons();
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
    year: "",
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
          <div class="admin-case__layout">
            <div class="admin-case__controls">
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

              <div class="admin-case__panel">
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
                  <span class="admin-field__label">Год для списка</span>
                  <input
                    class="admin-input"
                    type="text"
                    inputmode="numeric"
                    maxlength="4"
                    data-field="year"
                    value="${escapeHtml(caseItem.year || "")}"
                    placeholder="Например: 2025"
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
              </div>
            </div>

            <div class="admin-case__preview-column">
              <p class="admin-case__preview-label">Превью карточки</p>
              <div class="admin-case__card-stage" data-card-preview></div>
            </div>
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
  const previousDraftCases = cloneCases(draftCases);
  const savedIndex = getCaseIndex(caseId, cases);
  const draftIndex = getCaseIndex(caseId, draftCases);
  const normalizedDraftCase = store
    ? store.normalizeCase(draftCase, savedIndex === -1 ? draftCase : cases[savedIndex])
    : cloneCase(draftCase);

  if (draftIndex !== -1) {
    draftCases[draftIndex] = cloneCase(normalizedDraftCase);
  }

  if (savedIndex === -1) {
    cases = [...cases, cloneCase(normalizedDraftCase)];
  } else {
    cases[savedIndex] = cloneCase(normalizedDraftCase);
  }

  if (!persistCases()) {
    cases = previousCases;
    draftCases = previousDraftCases;
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

  if (field === "year") {
    const normalizedInput = String(event.target.value || "")
      .replace(/[^\d]/g, "")
      .slice(0, 4);

    if (event.target.value !== normalizedInput) {
      event.target.value = normalizedInput;
    }

    updateDraftCase(caseId, { year: normalizedInput });
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

async function handleLogin(event) {
  event.preventDefault();

  if (!elements.loginForm || authRequestInFlight) {
    return;
  }

  const formData = new FormData(elements.loginForm);
  const login = String(formData.get("login") || "").trim();
  const password = String(formData.get("password") || "").trim();

  setLoginMessage("");
  setLoginState(true);
  authRequestInFlight = true;

  try {
    const { response, payload } = await requestAdminAuth("POST", {
      login,
      password,
    });

    if (!response.ok || !payload.ok) {
      setLoginMessage(payload.error || "Не удалось выполнить вход.", true);
      return;
    }

    cases = store ? store.loadCases() : [];
    draftCases = cloneCases(cases);
    elements.loginForm.reset();
    showAdminView();
  } catch (error) {
    setLoginMessage("Не удалось выполнить вход администратора.", true);
  } finally {
    authRequestInFlight = false;
    setLoginState(false);
  }
}

async function handleLogout() {
  if (authRequestInFlight) {
    return;
  }

  authRequestInFlight = true;
  let logoutFailed = false;

  try {
    const { response, payload } = await requestAdminAuth("DELETE");
    logoutFailed = !response.ok || !payload.ok;
  } catch (error) {
    logoutFailed = true;
  } finally {
    authRequestInFlight = false;
    setLoginState(false);
  }

  if (logoutFailed) {
    setAdminMessage("Не удалось завершить сессию администратора.", true);
    return;
  }

  showAuthView();
}

async function bootstrapAdminSession() {
  if (authRequestInFlight) {
    return;
  }

  authRequestInFlight = true;
  setLoginState(true);

  try {
    const { response, payload } = await requestAdminAuth("GET");

    if (!response.ok || !payload.ok || !payload.authenticated) {
      showAuthView();

      if (payload?.error) {
        setLoginMessage(payload.error, true);
      }

      return;
    }

    cases = store ? store.loadCases() : [];
    draftCases = cloneCases(cases);
    showAdminView();
  } catch (error) {
    showAuthView();
    setLoginMessage("Не удалось проверить доступ администратора.", true);
  } finally {
    authRequestInFlight = false;
    setLoginState(false);
  }
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

  if (elements.analyticsRefresh) {
    elements.analyticsRefresh.addEventListener("click", () => {
      analyticsLoaded = false;
      loadAnalyticsReport();
    });
  }

  for (const button of elements.analyticsRangeButtons) {
    button.addEventListener("click", () => {
      const nextRange = button.dataset.analyticsRange || "7d";

      if (nextRange === activeAnalyticsRange) {
        return;
      }

      activeAnalyticsRange = analyticsRanges[nextRange] ? nextRange : "7d";
      analyticsLoaded = false;
      syncAnalyticsRangeButtons();
      loadAnalyticsReport();
    });
  }

  for (const button of elements.adminTabButtons) {
    button.addEventListener("click", () => {
      setActiveAdminTab(button.dataset.adminTabButton);
    });
  }

  elements.editor.addEventListener("input", handleEditorInput);
  elements.editor.addEventListener("change", handleEditorChange);
  elements.editor.addEventListener("click", handleEditorClick);

  setActiveAdminTab(activeAdminTab);
  showAuthView();
  bootstrapAdminSession();
}

setupAdminPage();
