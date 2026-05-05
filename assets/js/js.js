document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_PREFIX = "tvm-status";
  const SECTION_CONFIGS = {
    games: {
      countForms: { one: "игра", few: "игры", many: "игр" },
      statusMap: {
        done: { label: "Пройдено", className: "tag-done", next: "undone", pressed: true },
        undone: { label: "Не пройдено", className: "tag-undone", next: "done", pressed: false }
      }
    },
    movies: {
      countForms: { one: "фильм", few: "фильма", many: "фильмов" },
      statusMap: {
        done: { label: "Просмотрено", className: "tag-done", next: "undone", pressed: true },
        undone: { label: "Не просмотрено", className: "tag-undone", next: "done", pressed: false }
      }
    },
    recipes: {
      countForms: { one: "рецепт", few: "рецепта", many: "рецептов" },
      statusMap: {
        tried: { label: "Готовил", className: "tag-tried", next: "nottried", pressed: true },
        nottried: { label: "Не готовил", className: "tag-nottried", next: "tried", pressed: false }
      }
    },
    default: {
      countForms: { one: "элемент", few: "элемента", many: "элементов" },
      statusMap: {
        done: { label: "Пройдено", className: "tag-done", next: "undone", pressed: true },
        undone: { label: "Не пройдено", className: "tag-undone", next: "done", pressed: false }
      }
    }
  };

  const pathname = location.pathname.toLowerCase();
  const sectionKey = pathname.includes("/games")
    ? "games"
    : pathname.includes("/movies")
      ? "movies"
      : pathname.includes("/recipes")
        ? "recipes"
        : "default";
  const sectionConfig = SECTION_CONFIGS[sectionKey];
  const statusMap = sectionConfig.statusMap;
  const statusOrder = Object.keys(statusMap);

  const customSelectElements = Array.from(document.querySelectorAll(".custom-select"));
  const searchInput = document.getElementById("search");
  const allCards = Array.from(document.querySelectorAll(".game-card"));
  const emptyState = document.getElementById("empty-state");
  const countEl = document.getElementById("count");
  const badgeEl = document.getElementById("badge-count");
  const menuToggle = document.getElementById("menu-toggle");
  const filtersMenu = document.getElementById("filters-menu");
  const fallbackImage = pathname.includes("/pages/")
    ? "../assets/images/placeholder.svg"
    : "assets/images/placeholder.svg";

  const cardIdByElement = new WeakMap();
  const selectStates = [];

  initImageFallbacks();
  initSelects();
  initMobileFilterPanel();
  initStatusToggleHandlers();
  hydrateStatuses();

  if (searchInput) {
    searchInput.addEventListener("input", filterEverything);
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

  filterEverything();
  initPerformanceDiagnostics();

  function initImageFallbacks() {
    const cards = document.querySelectorAll(".game-card img");

    cards.forEach((img) => {
      const onImageError = () => {
        if (img.dataset.fallbacked === "1") {
          return;
        }
        img.dataset.fallbacked = "1";
        img.src = fallbackImage;
      };

      img.addEventListener("error", onImageError);

      if (img.complete && img.naturalWidth === 0) {
        onImageError();
      }
    });
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
        optionsId,
        activeIndex: 0,
        open: false,
      };

      selectStates.push(state);
      optionsContainer.id = optionsId;

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
          filterEverything();
        });

        option.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectOption(state, optionIndex);
            closeSelect(state);
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
        const initialLabel = (initialOption.textContent || "").trim();
        state.select.setAttribute("data-value", initialOption.getAttribute("data-value") || "all");
        setSelectLabel(state, initialLabel);
        state.options[state.activeIndex].classList.add("active");
        state.options[state.activeIndex].setAttribute("aria-selected", "true");
        state.options[state.activeIndex].setAttribute("tabindex", "0");
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
    const text = label.trim();
    labelNode.textContent = text;
    state.trigger.setAttribute("aria-label", `${state.labelBase}: ${text}`);
  }

  function selectOption(state, optionIndex) {
    const value = state.options[optionIndex].getAttribute("data-value") || "all";
    const label = (state.options[optionIndex].textContent || "").trim();

    state.options.forEach((option, index) => {
      const isActive = index === optionIndex;
      option.classList.toggle("active", isActive);
      option.setAttribute("aria-selected", isActive ? "true" : "false");
      option.tabIndex = isActive ? 0 : -1;
      if (isActive) {
        option.focus();
      }
    });

    state.activeIndex = optionIndex;
    setSelectLabel(state, label);
    state.select.setAttribute("data-value", value);
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

  function getActiveFilters() {
    const result = {};
    selectStates.forEach((state) => {
      const activeOption = state.options[state.activeIndex];
      const filterName = state.filterName;
      const value = activeOption?.getAttribute("data-value") || "all";
      if (filterName) {
        result[filterName] = value;
      }
    });
    return result;
  }

  function filterEverything() {
    const searchText = (searchInput?.value || "").toLowerCase().trim();
    const activeFilters = getActiveFilters();
    let visible = 0;

    allCards.forEach((card) => {
      const title = (card.querySelector("h3")?.textContent || "").toLowerCase();
      const tags = (card.getAttribute("data-tags") || "")
        .split(" ")
        .filter(Boolean);

      let isVisible = title.includes(searchText);

      if (isVisible) {
        for (const [filterName, value] of Object.entries(activeFilters)) {
          if (value !== "all" && !tags.includes(value)) {
            isVisible = false;
            break;
          }
        }
      }

      if (isVisible) {
        card.style.display = "";
        card.style.animation = "none";
        requestAnimationFrame(() => {
          card.style.animation = "";
        });
        visible += 1;
      } else {
        card.style.display = "none";
      }
    });

    if (countEl) {
      countEl.textContent = String(visible);
    }

    if (badgeEl) {
      badgeEl.textContent = pluralCount(visible, sectionConfig.countForms);
    }

    if (emptyState) {
      emptyState.style.display = visible === 0 ? "block" : "none";
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

  function initStatusToggleHandlers() {
    allCards.forEach((card, index) => {
      const cardId = getCardId(card, index);
      cardIdByElement.set(card, cardId);

      const tag = card.querySelector(".status-toggle");
      if (!tag) return;

      tag.setAttribute("role", "button");
      tag.setAttribute("tabindex", "0");

      const initialState = getInitialStatusState(card, tag);
      setStatusState(tag, initialState);
    });
  }

  function hydrateStatuses() {
    allCards.forEach((card) => {
      const cardId = cardIdByElement.get(card);
      const tag = card.querySelector(".status-toggle");
      if (!cardId || !tag) return;

      const saved = safeStorageGet(storageKey(cardId));
      const savedState = normalizeStatusState(saved);
      if (!savedState) return;

      const initialState = getInitialStatusState(card, tag);
      if (savedState !== initialState) {
        setStatusState(tag, savedState);
        syncCardTagValue(card, initialState, savedState);
      }
    });
  }

  function getInitialStatusState(card, tag) {
    const raw = tag.getAttribute("data-state") || "";
    return normalizeStatusState(raw) || statusOrder[0];
  }

  function normalizeStatusState(value) {
    return statusMap[value] ? value : "";
  }

  function setStatusState(tag, state) {
    const info = statusMap[state];
    if (!info) return;

    const previousState = normalizeStatusState(tag.dataset.state);
    tag.dataset.state = state;
    tag.className = `tag ${info.className} status-toggle`;
    tag.textContent = info.label;
    tag.setAttribute("aria-label", `Статус: ${info.label}`);
    tag.setAttribute("aria-pressed", String(Boolean(info.pressed)));

    const card = tag.closest(".game-card");
    if (card) {
      syncCardTagValue(card, previousState, state);
      persistStatus(card, state);
    }
  }

  function toggleStatus(tag) {
    const state = tag.dataset.state || "";
    const info = statusMap[state];
    if (!info) return;

    const card = tag.closest(".game-card");
    if (!card) return;

    const nextState = info.next;
    setStatusState(tag, nextState || state);
    filterEverything();
  }

  function persistStatus(card, state) {
    const id = cardIdByElement.get(card);
    if (!id) return;

    safeStorageSet(storageKey(id), state);
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

  function storageKey(cardId) {
    return `${STORAGE_PREFIX}:${sectionKey}:${cardId}`;
  }

  function getCardId(card, index) {
    const explicitId = card.getAttribute("data-item-id") || card.getAttribute("data-id") || "";
    if (explicitId) return explicitId;

    const title = (card.querySelector("h3")?.textContent || `card-${index}`).trim();
    const slug = title
      .toLowerCase()
      .replace(/[^\wа-яё\s-]/giu, "")
      .replace(/\s+/g, "-");

    return `${sectionKey}-${slug || `card-${index}`}-${index}`;
  }

  function syncCardTagValue(card, fromState, toState) {
    const normalizeFrom = normalizeStatusState(fromState);
    const normalizeTo = normalizeStatusState(toState);
    if (!normalizeTo) return;

    const tags = (card.getAttribute("data-tags") || "")
      .split(" ")
      .filter(Boolean);

    if (normalizeFrom && normalizeFrom !== normalizeTo) {
      const index = tags.indexOf(normalizeFrom);
      if (index !== -1) {
        tags.splice(index, 1);
      }
    }

    if (!tags.includes(normalizeTo)) {
      tags.push(normalizeTo);
    }

    card.setAttribute("data-tags", tags.join(" "));
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
    if (!menuToggle || !filtersMenu) return;

    menuToggle.classList.add("active");
    filtersMenu.classList.add("active");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Закрыть фильтры");
  }

  function closeFiltersPanel() {
    if (!menuToggle || !filtersMenu) return;

    menuToggle.classList.remove("active");
    filtersMenu.classList.remove("active");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Открыть фильтры");
  }

  function initPerformanceDiagnostics() {
    if (typeof window === "undefined" || typeof performance === "undefined") return;

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
        const lastEntry = entries[entries.length - 1];
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
