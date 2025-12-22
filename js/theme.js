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

    // Set initial color input value if present
    const colorInput = document.getElementById('color-hex');
    const colorApplyBtn = document.getElementById('color-apply');
    if (colorInput) colorInput.value = savedColor;

    // Events
    fabBtn.addEventListener('click', () => settingsMenu.classList.toggle('visible'));
    themeToggle.addEventListener('click', () => 
        document.body.classList.contains('light-mode') ? disableLightMode() : enableLightMode()
    );
    swatches.forEach(s => s.addEventListener('click', (e) => {
        applyAccent(e.target.dataset.color, e.target.dataset.bg);
        if (colorInput) colorInput.value = e.target.dataset.color;
    }));

    if (colorApplyBtn && colorInput) {
        const applyFromInput = () => {
            const v = (colorInput.value || '').trim();
            const norm = normalizeHex(v);
            if (!norm) {
                colorInput.classList.add('invalid');
                return;
            }
            colorInput.classList.remove('invalid');
            const bg = computeBgForAccent(norm);
            applyAccent(norm, bg);
            colorInput.value = norm;
        };
        colorApplyBtn.addEventListener('click', applyFromInput);
        colorInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') applyFromInput(); });
        colorInput.addEventListener('input', () => colorInput.classList.remove('invalid'));
    }

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

    // --- Helpers for color input ---
    function normalizeHex(v) {
        if (!v) return null;
        let s = v.trim().toUpperCase();
        if (s[0] === '#') s = s.slice(1);
        if (!/^[0-9A-F]{6}$/.test(s)) return null;
        return '#' + s;
    }

    function computeBgForAccent(hex) {
        // Simple darken: scale RGB down to produce a complementary dark badge color
        const n = parseInt(hex.slice(1), 16);
        const r = (n >> 16) & 255;
        const g = (n >> 8) & 255;
        const b = n & 255;
        const factor = 0.12; // darker multiplier
        const r2 = Math.max(0, Math.min(255, Math.round(r * factor)));
        const g2 = Math.max(0, Math.min(255, Math.round(g * factor)));
        const b2 = Math.max(0, Math.min(255, Math.round(b * factor)));
        return '#' + [r2, g2, b2].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    }
}