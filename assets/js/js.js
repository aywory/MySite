document.addEventListener("DOMContentLoaded", () => {
  // ═══════════════════════════════════════
  //  ЭЛЕМЕНТЫ
  // ═══════════════════════════════════════
  const customSelects = document.querySelectorAll(".custom-select");
  const searchInput = document.getElementById("search");
  const allCards = document.querySelectorAll(".game-card");
  const emptyState = document.getElementById("empty-state");
  const countEl = document.getElementById("count");
  const badgeEl = document.getElementById("badge-count");
  const menuToggle = document.getElementById("menu-toggle");
  const filtersMenu = document.getElementById("filters-menu");

  // ═══════════════════════════════════════
  //  КАСТОМНЫЕ СЕЛЕКТЫ
  // ═══════════════════════════════════════
  customSelects.forEach((select) => {
    const trigger = select.querySelector(".select-trigger");
    const options = select.querySelectorAll(".option");

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      // Закрываем остальные
      customSelects.forEach((s) => {
        if (s !== select) s.classList.remove("open");
      });
      select.classList.toggle("open");
    });

    options.forEach((opt) => {
      opt.addEventListener("click", () => {
        options.forEach((o) => o.classList.remove("active"));
        opt.classList.add("active");

        // Обновляем текст триггера (без стрелки)
        const arrow = trigger.querySelector(".arrow");
        trigger.childNodes[0].textContent = opt.textContent + " ";
        if (arrow) trigger.appendChild(arrow);

        select.classList.remove("open");
        filterEverything();
      });
    });
  });

  // Клик вне — закрыть все
  document.addEventListener("click", () => {
    customSelects.forEach((s) => s.classList.remove("open"));
  });

  // ═══════════════════════════════════════
  //  МОБИЛЬНОЕ МЕНЮ
  // ═══════════════════════════════════════
  if (menuToggle && filtersMenu) {
    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      menuToggle.classList.toggle("active");
      filtersMenu.classList.toggle("active");
    });
  }

  // ═══════════════════════════════════════
  //  ФИЛЬТРАЦИЯ
  // ═══════════════════════════════════════
  function filterEverything() {
    const searchText = (searchInput?.value || "").toLowerCase().trim();

    // Текущие значения фильтров
    const activeFilters = {};
    customSelects.forEach((select) => {
      const key = select.getAttribute("data-filter");
      const val =
        select.querySelector(".option.active")?.getAttribute("data-value") ||
        "all";
      activeFilters[key] = val;
    });

    let visible = 0;

    allCards.forEach((card) => {
      const title = card.querySelector("h3")?.textContent.toLowerCase() || "";
      const tagData = card.getAttribute("data-tags") || "";

      // Поиск по заголовку
      let show = title.includes(searchText);

      // Фильтры по тегам из data-tags
      if (show) {
        for (const [key, val] of Object.entries(activeFilters)) {
          if (val !== "all") {
            const tags = tagData.split(" ");
            if (!tags.includes(val)) {
              show = false;
              break;
            }
          }
        }
      }

      if (show) {
        card.style.display = "";
        // Переанимируем появившиеся карточки
        card.style.animation = "none";
        requestAnimationFrame(() => {
          card.style.animation = "";
        });
        visible++;
      } else {
        card.style.display = "none";
      }
    });

    // Счётчик
    if (countEl) countEl.textContent = visible;
    if (badgeEl)
      badgeEl.textContent = pluralCount(visible, "игр", "игра", "игры");

    // Empty state
    if (emptyState) {
      emptyState.style.display = visible === 0 ? "block" : "none";
    }
  }

  // Хелпер: склонение
  function pluralCount(n, form0, form1, form2) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 14) return `${n} ${form0}`;
    if (mod10 === 1) return `${n} ${form1}`;
    if (mod10 >= 2 && mod10 <= 4) return `${n} ${form2}`;
    return `${n} ${form0}`;
  }

  if (searchInput) {
    searchInput.addEventListener("input", filterEverything);
  }

  // ═══════════════════════════════════════
  //  КЛИК ПО СТАТУСУ (TOGGLE)
  // ═══════════════════════════════════════
  document.addEventListener("click", (e) => {
    const tag = e.target.closest(".status-toggle");
    if (!tag) return;

    const state = tag.getAttribute("data-state");

    // Для игр
    const toggleMap = {
      undone: { next: "done", cls: "tag-done", label: "Пройдено" },
      done: { next: "undone", cls: "tag-undone", label: "Не пройдено" },
      nottried: { next: "tried", cls: "tag-tried", label: "Готовил" },
      tried: { next: "nottried", cls: "tag-nottried", label: "Не готовил" },
    };
    const t = toggleMap[state];
    if (t) {
      tag.setAttribute("data-state", t.next);
      tag.className = `tag ${t.cls} status-toggle`;
      tag.textContent = t.label;
      updateCardTag(tag, state, t.next);
    }

    filterEverything();
  });

  function updateCardTag(tagEl, from, to) {
    const card = tagEl.closest(".game-card");
    if (!card) return;
    const tags = (card.getAttribute("data-tags") || "").split(" ");
    const idx = tags.indexOf(from);
    if (idx !== -1) tags[idx] = to;
    card.setAttribute("data-tags", tags.join(" "));
  }

  // ═══════════════════════════════════════
  //  АНИМАЦИЯ КАРТОЧЕК ПРИ ЗАГРУЗКЕ
  // ═══════════════════════════════════════
  allCards.forEach((card, i) => {
    card.style.animationDelay = `${i * 0.05}s`;
  });

  // Начальный счётчик
  if (countEl) countEl.textContent = allCards.length;
});
