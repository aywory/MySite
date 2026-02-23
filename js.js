document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search');
    const modeFilter = document.getElementById('mode-filter');
    const perfFilter = document.getElementById('performance-filter');
    const radminFilter = document.getElementById('radmin-filter');
    const statusFilter = document.getElementById('status-filter');
    
    const allCards = document.querySelectorAll('.game-card');

    function filterGames() {
        const searchText = searchInput.value.toLowerCase();
        const mode = modeFilter.value;
        const perf = perfFilter.value;
        const radmin = radminFilter.value;
        const status = statusFilter.value;

        allCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const tags = card.querySelector('.tags');
            
            const matchesSearch = title.includes(searchText);
            
            const matchesMode = (mode === 'all') || 
                (mode === 'single' && tags.querySelector('.tag-single')) ||
                (mode === 'multi' && tags.querySelector('.tag-multi'));

            const matchesPerf = (perf === 'all') || 
                (perf === 'runs' && tags.querySelector('.tag-runs')) ||
                (perf === 'noruns' && tags.querySelector('.tag-noruns'));

            const matchesRadmin = (radmin === 'all') || 
                (radmin === 'radmin' && tags.querySelector('.tag-radmin')) ||
                (radmin === 'noradmin' && tags.querySelector('.tag-noradmin'));

            const matchesStatus = (status === 'all') || 
                (status === 'done' && tags.querySelector('.tag-done')) ||
                (status === 'undone' && tags.querySelector('.tag-undone'));

            if (matchesSearch && matchesMode && matchesPerf && matchesRadmin && matchesStatus) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    searchInput.addEventListener('input', filterGames);
    modeFilter.addEventListener('change', filterGames);
    perfFilter.addEventListener('change', filterGames);
    radminFilter.addEventListener('change', filterGames);
    statusFilter.addEventListener('change', filterGames);
});

document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menu-toggle');
    const filters = document.querySelector('.filters');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            filters.classList.toggle('active');
            
            // Анимация иконок (опционально)
            menuToggle.classList.toggle('open');
        });
    }
});

// Искры на главной странице

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('sparks-container');
    if (!container) return; // Проверка, что мы на главной странице

    const sparkCount = 50; // Количество искорок

    for (let i = 0; i < sparkCount; i++) {
        createSpark(container);
    }

    function createSpark(target) {
        const spark = document.createElement('div');
        spark.classList.add('spark');

        // Случайный размер от 2 до 5 пикселей
        const size = Math.random() * 3 + 2;
        spark.style.width = `${size}px`;
        spark.style.height = `${size}px`;

        // Начальная позиция (случайно по всему экрану)
        spark.style.left = Math.random() * 100 + '%';
        spark.style.top = Math.random() * 100 + '%';

        // Случайные траектории полета через CSS переменные
        spark.style.setProperty('--x1', `${Math.random() * 200 - 100}px`);
        spark.style.setProperty('--y1', `${Math.random() * 200 - 100}px`);
        spark.style.setProperty('--x2', `${Math.random() * 400 - 200}px`);
        spark.style.setProperty('--y2', `${Math.random() * 400 - 200}px`);

        // Случайное время полета от 5 до 15 секунд
        spark.style.setProperty('--time', `${Math.random() * 10 + 5}s`);
        
        // Случайная задержка старта, чтобы они не вылетали все сразу
        spark.style.animationDelay = Math.random() * 10 + 's';

        target.appendChild(spark);
    }
});