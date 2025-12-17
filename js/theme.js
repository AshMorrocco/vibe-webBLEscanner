export function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const swatches = document.querySelectorAll('.swatch');
    const fabBtn = document.getElementById('fab-btn');
    const settingsMenu = document.getElementById('settings-menu');

    // Load saved
    const savedTheme = localStorage.getItem('ble-theme') || 'dark';
    const savedColor = localStorage.getItem('ble-color') || '#03dac6';
    const savedBg = localStorage.getItem('ble-color-bg') || '#003d33';

    if (savedTheme === 'light') enableLightMode();
    applyAccent(savedColor, savedBg);

    // Events
    fabBtn.addEventListener('click', () => settingsMenu.classList.toggle('visible'));
    themeToggle.addEventListener('click', () => 
        document.body.classList.contains('light-mode') ? disableLightMode() : enableLightMode()
    );
    swatches.forEach(s => s.addEventListener('click', (e) => 
        applyAccent(e.target.dataset.color, e.target.dataset.bg)
    ));

    function enableLightMode() { 
        document.body.classList.add('light-mode'); 
        themeToggle.textContent = 'Dark'; 
        localStorage.setItem('ble-theme', 'light'); 
    }
    
    function disableLightMode() { 
        document.body.classList.remove('light-mode'); 
        themeToggle.textContent = 'Light'; 
        localStorage.setItem('ble-theme', 'dark'); 
    }
    
    function applyAccent(c, bg) { 
        document.documentElement.style.setProperty('--accent', c); 
        document.documentElement.style.setProperty('--accent-badge', bg); 
        localStorage.setItem('ble-color', c); 
        localStorage.setItem('ble-color-bg', bg); 
    }
}