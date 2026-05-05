document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_PREFIX = "tvm-status";
  const SECTION_DATA_PATHS = location.pathname.includes("/pages/")
    ? {
      games: "../assets/data/games.json",
      movies: "../assets/data/movies.json",
      recipes: "../assets/data/recipes.json",
    }
    : {
      games: "assets/data/games.json",
      movies: "assets/data/movies.json",
      recipes: "assets/data/recipes.json",
    };
  const IMAGE_BASE_PATH = location.pathname.includes("/pages/")
    ? "../assets/images/"
    : "assets/images/";
  const FALLBACK_IMAGE = `${IMAGE_BASE_PATH}placeholder.svg`;

  const STATUS_ENUM = {
    DONE: "DONE",
    UNDONE: "UNDONE",
    TRIED: "TRIED",
    NOT_TRIED: "NOT_TRIED",
  };

  const STATUS_BY_STORAGE = {
    done: STATUS_ENUM.DONE,
    undone: STATUS_ENUM.UNDONE,
    tried: STATUS_ENUM.TRIED,
    nottried: STATUS_ENUM.NOT_TRIED,
    [STATUS_ENUM.DONE]: STATUS_ENUM.DONE,
    [STATUS_ENUM.UNDONE]: STATUS_ENUM.UNDONE,
    [STATUS_ENUM.TRIED]: STATUS_ENUM.TRIED,
    [STATUS_ENUM.NOT_TRIED]: STATUS_ENUM.NOT_TRIED,
  };

  const SECTION_CONFIGS = {
    games: {
      countForms: { one: "игра", few: "игры", many: "игр" },
      defaultFilters: {
        mode: "all",
        performance: "all",
        radmin: "all",
        status: "all",
      },
      defaultStatus: STATUS_ENUM.UNDONE,
      statusFilterKey: "status",
      statusStates: {
        [STATUS_ENUM.DONE]: {
          filterValue: "done",
          label: "Пройдено",
          className: "tag-done",
          next: STATUS_ENUM.UNDONE,
          pressed: true,
        },
        [STATUS_ENUM.UNDONE]: {
          filterValue: "undone",
          label: "Не пройдено",
          className: "tag-undone",
          next: STATUS_ENUM.DONE,
          pressed: false,
        },
      },
    },
    movies: {
      countForms: { one: "фильм", few: "фильма", many: "фильмов" },
      defaultFilters: {
        genre: "all",
        quality: "all",
        status: "all",
      },
      defaultStatus: STATUS_ENUM.UNDONE,
      statusFilterKey: "status",
      statusStates: {
        [STATUS_ENUM.DONE]: {
          filterValue: "done",
          label: "Просмотрено",
          className: "tag-done",
          next: STATUS_ENUM.UNDONE,
          pressed: true,
        },
        [STATUS_ENUM.UNDONE]: {
          filterValue: "undone",
          label: "Не просмотрено",
          className: "tag-undone",
          next: STATUS_ENUM.DONE,
          pressed: false,
        },
      },
    },
    recipes: {
      countForms: { one: "рецепт", few: "рецепта", many: "рецептов" },
      defaultFilters: {
        category: "all",
        difficulty: "all",
        cooked: "all",
      },
      defaultStatus: STATUS_ENUM.NOT_TRIED,
      statusFilterKey: "cooked",
      statusStates: {
        [STATUS_ENUM.TRIED]: {
          filterValue: "tried",
          label: "Готовил",
          className: "tag-tried",
          next: STATUS_ENUM.NOT_TRIED,
          pressed: true,
        },
        [STATUS_ENUM.NOT_TRIED]: {
          filterValue: "nottried",
          label: "Не готовил",
          className: "tag-nottried",
          next: STATUS_ENUM.TRIED,
          pressed: false,
        },
      },
    },
    default: {
      countForms: { one: "элемент", few: "элемента", many: "элементов" },
      defaultFilters: {},
      defaultStatus: STATUS_ENUM.UNDONE,
      statusFilterKey: "status",
      statusStates: {
        [STATUS_ENUM.DONE]: {
          filterValue: "done",
          label: "Пройдено",
          className: "tag-done",
          next: STATUS_ENUM.UNDONE,
          pressed: true,
        },
        [STATUS_ENUM.UNDONE]: {
          filterValue: "undone",
          label: "Не пройдено",
          className: "tag-undone",
          next: STATUS_ENUM.DONE,
          pressed: false,
        },
      },
    },
  };

  const pathname = location.pathname.toLowerCase();
  const sectionKey = pathname.includes("/games")
    ? "games"
    : pathname.includes("/movies")
      ? "movies"
      : pathname.includes("/recipes")
        ? "recipes"
        : "default";
  const sectionConfig = SECTION_CONFIGS[sectionKey] || SECTION_CONFIGS.default;

  const container = document.getElementById("games-grid");
  const emptyState = document.getElementById("empty-state");
  const countEl = document.getElementById("count");
  const badgeEl = document.getElementById("badge-count");
  const searchInput = document.getElementById("search");
  const resetButton = document.getElementById("reset-filters");
  const menuToggle = document.getElementById("menu-toggle");
  const filtersMenu = document.getElementById("filters-menu");
  const customSelectElements = Array.from(document.querySelectorAll(".custom-select"));

  const selectStates = [];
  let catalogItems = [];
  let hasLoadError = false;

  if (!container || sectionKey === "default") {
    return;
  }

  initSelects();
  initSearchAndFocusHandlers();
  initMobileFilterPanel();
  applyUrlStateToFilters();
  persistFilterStateToUrl();
  hydrateFromCatalog();
  initPerformanceDiagnostics();

  /**
   * Загружает данные каталога из единого JSON и запускает первый рендер.
   */
  async function hydrateFromCatalog() {
    const dataPath = SECTION_DATA_PATHS[sectionKey];
    if (!dataPath) {
      const message = `Не настроен путь к данным для раздела: ${sectionKey}`;
      renderCatalogErrorState(message);
      console.error("[catalog] Unknown section key:", sectionKey);
      return;
    }

    try {
      const response = await fetch(dataPath);
      if (!response.ok) {
        throw new Error(`Catalog request failed (${response.status})`);
      }
      const payload = await response.json();
      const sectionItems = Array.isArray(payload) ? payload : [];
      if (!Array.isArray(sectionItems)) {
        throw new Error("Wrong catalog format in data file");
      }
      catalogItems = sectionItems.map((item, index) => normalizeCatalogItem(item, index));
      hydrateStatusesFromStorage();
      filterEverything();
    } catch (error) {
      hasLoadError = true;
      console.error("[catalog] Failed to load section data:", dataPath, error);
      renderCatalogErrorState(
        `Не удалось загрузить каталог. Проверьте подключение или файл ${dataPath}.`
      );
    }
  }

  /**
   * Приводит карточку из JSON к внутреннему формату с enum-статусом.
   */
  function normalizeCatalogItem(item, fallbackIndex) {
    const raw = item || {};
    const statusRaw = normalizeStatus(raw.status) || sectionConfig.defaultStatus;
    const tags = normalizeTags(raw.tags);
    const filterMeta = normalizeFilterMeta(raw.filterMeta || {});

    return {
      id: String(raw.id || `${sectionKey}-${fallbackIndex}`),
      section: sectionKey,
      title: String(raw.title || "Без названия"),
      description: String(raw.description || ""),
      status: statusRaw,
      image: String(raw.image || ""),
      imageAlt: String(raw.imageAlt || raw.title || "Изображение"),
      tags,
      meta: raw.meta || {},
      filterMeta,
    };
  }

  /**
   * Извлекает массив тегов в формате [{ key, label }, ...].
   */
  function normalizeTags(rawTags) {
    const raw = Array.isArray(rawTags) ? rawTags : [];
    return raw
      .map((tag) => {
        if (typeof tag === "string") {
          return { key: tag, label: tag };
        }
        if (tag && typeof tag === "object") {
          const key = String(tag.key || "").trim();
          const label = String(tag.label || tag.name || key || "Тег").trim();
          return { key, label };
        }
        return null;
      })
      .filter(Boolean);
  }

  /**
   * Строго приводит фильтро-метаданные к строковым значениям.
   */
  function normalizeFilterMeta(rawFilterMeta) {
    const out = {};
    Object.entries(rawFilterMeta).forEach(([key, value]) => {
      if (value == null) return;
      const normalized = String(value).trim();
      if (normalized) {
        out[key] = normalized.toLowerCase();
      }
    });
    return out;
  }

  function initSelects() {
    customSelectElements.forEach((select, selectIndex) => {
      const trigger = select.querySelector(".select-trigger");
      const optionsContainer = select.querySelector(".select-options");
      const options = Array.from(select.querySelectorAll(".option"));

      if (!trigger || !optionsContainer || options.length === 0) {
        return;
      }

      const filterName = select.getAttribute("data-filter") || `filter-${selectIndex}`;
      const labelBase = trigger.dataset.selectLabel || "Фильтр";
      const optionsId = `${sectionKey}-${filterName}-${selectIndex}-options`;
      const state = {
        select,
        trigger,
        optionsContainer,
        options,
        filterName,
        labelBase,
        activeIndex: 0,
        open: false,
      };

      selectStates.push(state);
      optionsContainer.id = optionsId;
      state.select.dataset.filter = filterName;

      trigger.setAttribute("role", "button");
      trigger.setAttribute("tabindex", "0");
      trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-haspopup", "listbox");
      trigger.setAttribute("aria-controls", optionsId);

      optionsContainer.setAttribute("role", "listbox");
      optionsContainer.setAttribute("aria-label", `${labelBase}`);
      optionsContainer.setAttribute("aria-hidden", "true");

      options.forEach((option, optionIndex) => {
        const value = option.getAttribute("data-value") || "all";
        option.setAttribute("role", "option");
        option.setAttribute("tabindex", "-1");
        option.setAttribute("aria-selected", "false");
        option.id = `${optionsId}-option-${optionIndex}`;

        if (option.classList.contains("active")) {
          state.activeIndex = optionIndex;
        }

        option.addEventListener("click", (event) => {
          event.preventDefault();
          selectOption(state, optionIndex);
          closeSelect(state);
          persistFilterStateToUrl();
          filterEverything();
        });

        option.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectOption(state, optionIndex);
            closeSelect(state);
            persistFilterStateToUrl();
            filterEverything();
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            focusNextOption(state, +1);
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            focusNextOption(state, -1);
            return;
          }

          if (event.key === "Home") {
            event.preventDefault();
            focusOption(state, 0);
            return;
          }

          if (event.key === "End") {
            event.preventDefault();
            focusOption(state, state.options.length - 1);
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            closeSelect(state);
            state.trigger.focus();
          }
        });
      });

      const initialOption = state.options[state.activeIndex] || state.options[0];
      if (initialOption) {
        setSelectLabel(state, (initialOption.textContent || "").trim());
        setSelectOptionState(state, state.activeIndex);
      }

      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (state.open) {
          closeSelect(state);
        } else {
          openSelect(state);
        }
      });

      trigger.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (state.open) {
            closeSelect(state);
          } else {
            openSelect(state);
          }
          return;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          openSelect(state);
          focusOption(state, state.activeIndex);
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          openSelect(state, true);
          focusOption(state, state.options.length - 1);
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          closeSelect(state);
        }
      });
    });
  }

  function setSelectLabel(state, label) {
    const labelNode = state.trigger.querySelector(".select-label") || state.trigger;
    const text = String(label).trim();
    labelNode.textContent = text;
    state.trigger.setAttribute("aria-label", `${state.labelBase}: ${text}`);
  }

  function setSelectOptionState(state, optionIndex) {
    state.options.forEach((option, index) => {
      const isActive = index === optionIndex;
      option.classList.toggle("active", isActive);
      option.setAttribute("aria-selected", isActive ? "true" : "false");
      option.tabIndex = isActive ? 0 : -1;
    });
    state.activeIndex = optionIndex;
    const selected = state.options[optionIndex];
    const value = selected?.getAttribute("data-value") || "all";
    const label = (selected?.textContent || "").trim();
    setSelectLabel(state, label);
    state.select.setAttribute("data-value", value);
  }

  function selectOption(state, optionIndex) {
    setSelectOptionState(state, optionIndex);
  }

  function openSelect(state, focusLast = false) {
    closeAllSelects();
    state.open = true;
    state.select.classList.add("open");
    state.trigger.setAttribute("aria-expanded", "true");
    state.optionsContainer.setAttribute("aria-hidden", "false");
    const index = focusLast
      ? Math.max(0, state.options.length - 1)
      : state.activeIndex;
    focusOption(state, index);
  }

  function closeSelect(state) {
    state.open = false;
    state.select.classList.remove("open");
    state.trigger.setAttribute("aria-expanded", "false");
    state.optionsContainer.setAttribute("aria-hidden", "true");
    state.options.forEach((option, index) => {
      option.tabIndex = index === state.activeIndex ? 0 : -1;
    });
  }

  function closeAllSelects() {
    selectStates.forEach((state) => {
      if (state.open) {
        closeSelect(state);
      }
    });
  }

  function focusOption(state, index) {
    const option = state.options[index];
    if (!option) return;

    state.options.forEach((opt, i) => {
      opt.tabIndex = i === index ? 0 : -1;
    });
    option.focus();
  }

  function focusNextOption(state, delta) {
    const current = state.options.findIndex((option) => option.tabIndex === 0);
    const total = state.options.length;
    if (total === 0) return;
    const nextIndex = (current + delta + total) % total;
    focusOption(state, nextIndex);
  }

  function initSearchAndFocusHandlers() {
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        persistFilterStateToUrl();
        filterEverything();
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", (event) => {
        event.preventDefault();
        resetFilters();
      });
    }

    document.addEventListener("click", (event) => {
      const statusTarget = event.target.closest(".status-toggle");
      if (statusTarget) {
        event.preventDefault();
        toggleStatus(statusTarget);
        return;
      }
      if (!event.target.closest(".custom-select")) {
        closeAllSelects();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeAllSelects();
        closeFiltersPanel();
        return;
      }

      const statusTarget = event.target.closest?.(".status-toggle");
      if (statusTarget && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        toggleStatus(statusTarget);
      }
    });

  }

  function initMobileFilterPanel() {
    if (!menuToggle || !filtersMenu) return;

    filtersMenu.setAttribute("role", "region");
    filtersMenu.setAttribute("aria-label", "Фильтры");
    menuToggle.setAttribute("aria-expanded", String(filtersMenu.classList.contains("active")));

    menuToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (menuToggle.classList.contains("active")) {
        closeFiltersPanel();
      } else {
        openFiltersPanel();
      }
    });
  }

  function openFiltersPanel() {
    menuToggle.classList.add("active");
    filtersMenu.classList.add("active");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Закрыть фильтры");
  }

  function closeFiltersPanel() {
    menuToggle.classList.remove("active");
    filtersMenu.classList.remove("active");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Открыть фильтры");
  }

  function applyUrlStateToFilters() {
    const params = new URLSearchParams(location.search);
    const q = (params.get("q") || "").trim();
    if (searchInput) {
      searchInput.value = q;
    }

    selectStates.forEach((state) => {
      const filterName = state.filterName;
      const defaultValue = sectionConfig.defaultFilters[filterName] || "all";
      const rawValue = (params.get(filterName) || defaultValue).trim().toLowerCase();
      const optionIndex = state.options.findIndex(
        (option) => (option.getAttribute("data-value") || "all").toLowerCase() === rawValue
      );
      const targetIndex = optionIndex !== -1 ? optionIndex : 0;
      setSelectOptionState(state, targetIndex);
    });
  }

  function getActiveFilters() {
    const result = {};
    selectStates.forEach((state) => {
      const filterName = state.filterName;
      const active = state.options[state.activeIndex];
      const value = (active?.getAttribute("data-value") || "all").toLowerCase();
      if (filterName) {
        result[filterName] = value;
      }
    });
    return result;
  }

  function persistFilterStateToUrl() {
    const params = new URLSearchParams();
    const q = (searchInput?.value || "").trim();
    if (q) {
      params.set("q", q);
    }

    getActiveFilters();
    Object.entries(getActiveFilters()).forEach(([filterName, value]) => {
      const defaultValue = (sectionConfig.defaultFilters[filterName] || "all").toLowerCase();
      if (value && value !== defaultValue) {
        params.set(filterName, value);
      }
    });

    const nextUrl = new URL(location.href);
    nextUrl.search = params.toString();
    history.replaceState({}, "", nextUrl);
  }

  function filterEverything() {
    if (hasLoadError) {
      renderCatalogErrorState("Не удалось загрузить каталог. Проверьте подключение или файл assets/data/catalog.json.");
      return;
    }

    const searchText = (searchInput?.value || "").toLowerCase().trim();
    const activeFilters = getActiveFilters();

    const filtered = catalogItems.filter((item) => {
      if (!item) return false;

      const searchArea = `${item.title} ${item.description} ${item.tags.map((tag) => tag.label).join(" ")} ${item.meta?.runtime || ""}`
        .toLowerCase();

      if (searchText && !searchArea.includes(searchText)) {
        return false;
      }

      for (const [filterName, value] of Object.entries(activeFilters)) {
        const compareTo = getFilterValue(item, filterName);
        if (value === "all" || !compareTo) {
          continue;
        }
        if (compareTo !== value) {
          return false;
        }
      }
      return true;
    });

    renderCards(filtered);
    updateCounters(filtered.length);
  }

  function getFilterValue(item, filterName) {
    if (filterName === sectionConfig.statusFilterKey) {
      const state = getStatusMeta(item.status);
      return state?.filterValue || "";
    }

    const raw = item.filterMeta[filterName];
    return raw ? String(raw).trim().toLowerCase() : "";
  }

  function renderCards(items) {
    container.innerHTML = "";
    if (!items.length) {
      showEmptyState();
      return;
    }

    const html = items.map(renderCardMarkup).join("");
    container.insertAdjacentHTML("beforeend", html);
    bindImageFallbacks();
    hideEmptyState();
    hideErrorState();

    const cardBadges = container.querySelectorAll(".status-toggle");
    cardBadges.forEach((statusNode) => {
      const status = statusNode.getAttribute("data-state") || sectionConfig.defaultStatus;
      const meta = getStatusMeta(status);
      if (!meta) return;
      statusNode.className = `tag ${meta.className} status-toggle`;
      statusNode.textContent = meta.label;
      statusNode.setAttribute("aria-label", `Статус: ${meta.label}`);
      statusNode.setAttribute("aria-pressed", String(Boolean(meta.pressed)));
      statusNode.setAttribute("role", "button");
      statusNode.setAttribute("tabindex", "0");
    });
  }

  function showEmptyState() {
    hideErrorState();
    if (emptyState) {
      emptyState.style.display = "grid";
      emptyState.querySelector("p").textContent = "Ничего не найдено";
    }
  }

  function hideEmptyState() {
    if (emptyState) {
      emptyState.style.display = "none";
    }
  }

  function renderCardMarkup(item) {
    const statusMeta = getStatusMeta(item.status);
    const badge = renderMetaBadge(item);
    const tags = item.tags.map((tag) => {
      const tagKey = escapeHtmlAttr(tag.key);
      const tagLabel = escapeHtml(tag.label);
      return `<span class="tag tag-${tagKey}">${tagLabel}</span>`;
    }).join("");

    const statusLabel = escapeHtml(statusMeta.label);
    const statusClass = escapeHtmlAttr(statusMeta.className);
    const imageUrl = resolveImage(item.image);
    const srcset = `${imageUrl} 640w, ${imageUrl} 960w, ${imageUrl} 1280w`;

    return `
      <article class="game-card" data-item-id="${escapeHtmlAttr(item.id)}" data-section="${escapeHtmlAttr(item.section)}" data-status="${escapeHtmlAttr(item.status)}" data-tags="${escapeHtmlAttr(item.tags.map((tag) => tag.key).join(" "))}">
        <div class="card-image">
          <img
            src="${escapeHtmlAttr(imageUrl)}"
            srcset="${escapeHtmlAttr(srcset)}"
            sizes="(max-width: 1100px) 100vw, (max-width: 1400px) 48vw, 33vw"
            alt="${escapeHtmlAttr(item.imageAlt)}"
            loading="lazy"
            decoding="async"
            data-catalog-card-image="1"
          />
          ${badge}
        </div>
        <div class="card-content">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <div class="tags">
            ${tags}
            <span class="tag ${statusClass} status-toggle" data-state="${escapeHtmlAttr(item.status)}" role="button" tabindex="0" aria-pressed="${escapeHtmlAttr(String(Boolean(statusMeta.pressed)))}" aria-label="Статус: ${statusLabel}">
              ${statusLabel}
            </span>
          </div>
        </div>
      </article>
    `;
  }

  function renderMetaBadge(item) {
    if (item.section === "recipes" && item.meta && item.meta.runtime) {
      return `
        <span class="badge-year recipe-time">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          ${escapeHtml(String(item.meta.runtime))}
        </span>
      `;
    }

    if (item.meta && item.meta.year) {
      return `<span class="badge-year">${escapeHtml(String(item.meta.year))}</span>`;
    }

    return "";
  }

  function hydrateStatusesFromStorage() {
    catalogItems.forEach((item) => {
      const saved = safeStorageGet(storageKey(item.id));
      const normalized = normalizeStatus(saved);
      if (normalized && sectionConfig.statusStates[normalized]) {
        item.status = normalized;
      }
    });
  }

  function toggleStatus(node) {
    const card = node.closest(".game-card");
    const itemId = card?.getAttribute("data-item-id") || "";
    const item = catalogItems.find((entry) => entry.id === itemId);
    if (!item) return;

    const state = getStatusMeta(item.status);
    if (!state?.next) return;

    item.status = state.next;
    persistStatus(item.id, item.status);
    renderCards(
      catalogItems.filter((entry) => {
        const activeFilters = getActiveFilters();
        const searchText = (searchInput?.value || "").toLowerCase().trim();
        const searchArea = `${entry.title} ${entry.description} ${entry.tags.map((tag) => tag.label).join(" ")} ${entry.meta?.runtime || ""}`
          .toLowerCase();
        if (searchText && !searchArea.includes(searchText)) {
          return false;
        }
        return Object.entries(activeFilters).every(([filterName, value]) => {
          const compareTo = getFilterValue(entry, filterName);
          return value === "all" || !compareTo || compareTo === value;
        });
      })
    );
  }

  function updateCounters(total) {
    if (countEl) {
      countEl.textContent = String(total);
    }
    if (badgeEl) {
      badgeEl.textContent = pluralCount(total, sectionConfig.countForms);
    }
  }

  function pluralCount(value, forms) {
    const n = Number(value) || 0;
    const mod10 = n % 10;
    const mod100 = n % 100;

    if (mod100 >= 11 && mod100 <= 14) {
      return `${n} ${forms.many}`;
    }
    if (mod10 === 1) {
      return `${n} ${forms.one}`;
    }
    if (mod10 >= 2 && mod10 <= 4) {
      return `${n} ${forms.few}`;
    }
    return `${n} ${forms.many}`;
  }

  function getStatusMeta(status) {
    return sectionConfig.statusStates[status] || sectionConfig.statusStates[sectionConfig.defaultStatus];
  }

  function normalizeStatus(value) {
    if (!value) return "";
    return STATUS_BY_STORAGE[(String(value).toLowerCase())] || "";
  }

  function persistStatus(itemId, status) {
    safeStorageSet(storageKey(itemId), status);
  }

  function storageKey(itemId) {
    return `${STORAGE_PREFIX}:${sectionKey}:${itemId}`;
  }

  function renderCatalogErrorState(text) {
    if (!container) return;
    hideEmptyState();
    const state = getOrCreateErrorStateNode();
    const messageNode = state.querySelector("p");
    if (messageNode) {
      messageNode.textContent = text;
    }
    container.innerHTML = "";
    container.appendChild(state);
    updateCounters(0);
  }

  function getOrCreateErrorStateNode() {
    const existing = container.querySelector(".catalog-error");
    if (existing) {
      return existing;
    }
    const errorNode = document.createElement("div");
    errorNode.className = "empty-state catalog-error";
    errorNode.setAttribute("role", "status");
    errorNode.setAttribute("aria-live", "polite");
    errorNode.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <p></p>
    `;
    return errorNode;
  }

  function hideErrorState() {
    const node = container.querySelector(".catalog-error");
    if (node) {
      node.remove();
    }
  }

  function resetFilters() {
    selectStates.forEach((state) => {
      const filterName = state.filterName;
      const resetValue = sectionConfig.defaultFilters[filterName] || "all";
      const optionIndex = state.options.findIndex(
        (option) => (option.getAttribute("data-value") || "all") === resetValue
      );
      setSelectOptionState(state, optionIndex !== -1 ? optionIndex : 0);
    });

    if (searchInput) {
      searchInput.value = "";
    }
    persistFilterStateToUrl();
    filterEverything();
  }

  function bindImageFallbacks() {
    const images = container.querySelectorAll("img[data-catalog-card-image]");
    images.forEach((img) => {
      const handleError = () => {
        if (img.dataset.fallbacked === "1") {
          return;
        }
        img.dataset.fallbacked = "1";
        img.src = FALLBACK_IMAGE;
      };

      img.addEventListener("error", handleError);
      if (img.complete && img.naturalWidth === 0) {
        handleError();
      }
    });
  }

  function resolveImage(imageName) {
    if (!imageName) {
      return FALLBACK_IMAGE;
    }
    const normalized = String(imageName).trim().replace(/^\/+/, "");
    if (/^(https?:\/\/|data:|blob:|\/)/i.test(normalized)) {
      return encodeURI(normalized);
    }
    return encodeURI(`${IMAGE_BASE_PATH}${normalized}`);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeHtmlAttr(value) {
    return escapeHtml(value);
  }

  function safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // localStorage unavailable in this environment.
    }
  }

  function initPerformanceDiagnostics() {
    if (typeof window === "undefined" || typeof performance === "undefined") {
      return;
    }

    const perfState = {
      lcp: 0,
      cls: 0,
      fid: 0,
      inp: 0,
    };

    const navTiming = performance.getEntriesByType("navigation")[0];
    if (navTiming) {
      const domLoaded = Math.round(
        (navTiming.domContentLoadedEventEnd || 0) - (navTiming.fetchStart || 0)
      );
      if (!Number.isNaN(domLoaded)) {
        console.log("[perf] DOMContentLoaded:", domLoaded);
      }
    } else if (performance.timing) {
      const legacy = performance.timing;
      const domLoaded = legacy.domContentLoadedEventEnd - legacy.navigationStart;
      if (!Number.isNaN(domLoaded)) {
        console.log("[perf] DOMContentLoaded:", domLoaded);
      }
    }

    if (!("PerformanceObserver" in window)) return;

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries.at(-1);
        if (lastEntry) {
          perfState.lcp = Math.round(lastEntry.startTime);
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch (error) {
      // LCP observer unavailable.
    }

    try {
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            perfState.cls += entry.value;
          }
        });
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
    } catch (error) {
      // CLS observer unavailable.
    }

    try {
      const firstInputObserver = new PerformanceObserver((list) => {
        const entry = list.getEntries().at(0);
        if (!entry) return;
        perfState.fid = Math.round(entry.processingStart - entry.startTime);
      });
      firstInputObserver.observe({ type: "first-input", buffered: true });
    } catch (error) {
      // first-input observer unavailable.
    }

    try {
      const inpObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.interactionId && Number.isFinite(entry.duration)) {
            perfState.inp = Math.max(perfState.inp, Math.round(entry.duration));
          }
        });
      });
      inpObserver.observe({ type: "event", buffered: true, durationThreshold: 0 });
    } catch (error) {
      // INP observer unavailable.
    }

    const reportPerf = () => {
      console.log("[perf] LCP:", perfState.lcp);
      console.log("[perf] CLS:", Math.round(perfState.cls * 1000) / 1000);
      if (perfState.fid) {
        console.log("[perf] FID:", perfState.fid);
      }
      if (perfState.inp) {
        console.log("[perf] INP:", perfState.inp);
      }
    };

    window.addEventListener("pagehide", reportPerf, { once: true });
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "hidden") {
          reportPerf();
        }
      },
      { once: true }
    );
  }
});
