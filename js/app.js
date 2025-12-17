import { initTheme } from './theme.js';
import * as UI from './ui.js';
import * as BLE from './ble.js';
import { runTests } from './test.js';

// Central State
const devices = new Map(); // Stores { id, name, rssi, lastSeen, stats }
let rateInterval = null;
const isTestMode = new URLSearchParams(window.location.search).has('test');

// Init
initTheme();
if (isTestMode) {
    UI.enableTestModeUI();
    runTests(UI, isTestMode);
}

// --- Event Listeners ---
document.getElementById('btn-start').addEventListener('click', async () => {
    try {
        await BLE.startBLE(onAdvertisement);
        UI.setUIState(true, isTestMode);
        rateInterval = setInterval(refreshLoop, 1000); // 1s loop for Rates & Sorting
    } catch (e) {
        if(!isTestMode) alert(e);
        UI.setUIState(false, isTestMode);
    }
});

document.getElementById('btn-stop').addEventListener('click', stop);

// Control Inputs Listeners
const rssiSlider = document.getElementById('rssi-slider');
const filterText = document.getElementById('filter-text');
const filterType = document.getElementById('filter-type');
const sortType = document.getElementById('sort-type');
const sortOrder = document.getElementById('sort-order');

// Trigger UI updates immediately on input
rssiSlider.addEventListener('input', (e) => {
    document.getElementById('rssi-val').textContent = e.target.value;
    UI.applyFilters(devices); 
});
filterText.addEventListener('input', () => UI.applyFilters(devices));
filterType.addEventListener('change', () => UI.applyFilters(devices));

// Trigger Sort immediately on change
sortType.addEventListener('change', () => UI.applySort(devices));
sortOrder.addEventListener('click', () => {
    const btn = document.getElementById('sort-order');
    btn.textContent = btn.textContent === '⬇' ? '⬆' : '⬇';
    btn.setAttribute('data-dir', btn.textContent === '⬇' ? 'desc' : 'asc');
    UI.applySort(devices);
});

function stop() {
    BLE.stopBLE();
    if (rateInterval) { clearInterval(rateInterval); rateInterval = null; }
    UI.setUIState(false, isTestMode);
}

// --- Loops & Handlers ---

// This runs every 1 second
function refreshLoop() {
    // 1. Calculate Rates
    devices.forEach((data) => {
        data.stats.rate = data.stats.bucket;
        data.stats.bucket = 0;
        UI.updateRateBadge(data.id, data.stats.total, data.stats.rate);
    });

    // 2. Re-apply sort (in case values changed, e.g. Ads/s or LastSeen)
    // We throttle this to the 1s loop so the DOM isn't jumping around wildly
    UI.applySort(devices);
}

function onAdvertisement(event) {
    const { device, rssi } = event;
    const id = device.id;
    const name = device.name || 'N/A';
    
    // Update Central State
    let data = devices.get(id);
    if (!data) {
        data = { 
            id, 
            name, 
            rssi, 
            lastSeen: Date.now(), 
            stats: { total: 0, bucket: 0, rate: 0 } 
        };
        devices.set(id, data);
    } else {
        data.rssi = rssi;
        data.lastSeen = Date.now();
    }
    
    // Stats Update
    data.stats.total++;
    data.stats.bucket++;

    // Render
    UI.updateCard(id, name, rssi, data.stats);
    
    // We apply filters on every packet to ensure new devices respect the rules
    UI.applyFilters(devices); 
}

// Visibility Guard
document.addEventListener("visibilitychange", () => { 
    if (document.hidden && !isTestMode && rateInterval) stop(); 
});
window.addEventListener("blur", () => { 
    if (!isTestMode && rateInterval) stop(); 
});