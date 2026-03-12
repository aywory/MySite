document.addEventListener('DOMContentLoaded', () => {
    const customSelects = document.querySelectorAll('.custom-select');
    const searchInput = document.getElementById('search');
    const allCards = document.querySelectorAll('.game-card');

    // 1. ЛОГИКА РАБОТЫ МЕНЮ
    customSelects.forEach(select => {
        const trigger = select.querySelector('.select-trigger');
        const options = select.querySelectorAll('.option');

        // Открыть/закрыть
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Закрываем другие, если открыты
            customSelects.forEach(s => { if(s !== select) s.classList.remove('open'); });
            select.classList.toggle('open');
        });

        // Выбор значения
        options.forEach(opt => {
            opt.addEventListener('click', () => {
                options.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                trigger.textContent = opt.textContent;
                select.classList.remove('open');
                
                // Запускаем фильтрацию
                filterEverything();
            });
        });
    });

    // Закрыть если кликнули в любое другое место
    window.addEventListener('click', () => {
        customSelects.forEach(s => s.classList.remove('open'));
    });

    // 2. ГЛАВНАЯ ФУНКЦИЯ ФИЛЬТРАЦИИ
    function filterEverything() {
        const searchText = searchInput.value.toLowerCase();
        
        // Собираем текущие значения всех кастомных фильтров
        const activeFilters = {};
        customSelects.forEach(select => {
            const filterName = select.getAttribute('data-filter');
            const activeVal = select.querySelector('.option.active').getAttribute('data-value');
            activeFilters[filterName] = activeVal;
        });

        allCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            let isVisible = title.includes(searchText);

            // Проверяем по тегам
            for (let key in activeFilters) {
                const val = activeFilters[key];
                if (val !== 'all') {
                    if (!card.querySelector(`.tag-${val}`)) {
                        isVisible = false;
                    }
                }
            }

            card.style.display = isVisible ? 'block' : 'none';
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterEverything);
    }
});