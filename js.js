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

// Логика для мобильного меню
    const menuToggle = document.getElementById('menu-toggle');
    const filtersMenu = document.getElementById('filters-menu');

    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        filtersMenu.classList.toggle('active');
    });

    // Закрывать меню при клике на фильтр (для удобства на мобилках)
    const selects = filtersMenu.querySelectorAll('select');
    selects.forEach(select => {
        select.addEventListener('change', () => {
            if (window.innerWidth <= 768) {
                menuToggle.classList.remove('active');
                filtersMenu.classList.remove('active');
            }
        });
    });