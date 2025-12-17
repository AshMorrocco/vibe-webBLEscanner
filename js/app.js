import { initTheme } from './theme.js';
import * as UI from './ui.js';
import * as BLE from './ble.js';
import { runTests } from './test.js';

// Central State
const devices = new Map(); 
let rateInterval = null;
const isTestMode = new URLSearchParams(window.location.search).has('test');

// Init
initTheme();
if (isTestMode) {
    UI.enableTestModeUI();
    runTests(UI, isTestMode);
}

// --- Event Listeners ---
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');

if (btnStart) btnStart.addEventListener('click', async () => {
    try {
        await BLE.startBLE(onAdvertisement);
        UI.setUIState(true, isTestMode);
        rateInterval = setInterval(refreshLoop, 1000);
    } catch (e) {
        if(!isTestMode) alert(e);
        UI.setUIState(false, isTestMode);
    }
});

if (btnStop) btnStop.addEventListener('click', stop);

// Control Inputs Listeners
const rssiSlider = document.getElementById('rssi-slider');
const filterText = document.getElementById('filter-text');
const filterType = document.getElementById('filter-type');
const sortType = document.getElementById('sort-type');
const sortOrder = document.getElementById('sort-order');

// Defensive Checks (prevents crash if HTML is missing)
if (rssiSlider) rssiSlider.addEventListener('input', (e) => {
    document.getElementById('rssi-val').textContent = e.target.value;
    UI.applyFilters(devices); 
});

if (filterText) filterText.addEventListener('input', () => UI.applyFilters(devices));
if (filterType) filterType.addEventListener('change', () => UI.applyFilters(devices));

if (sortType) sortType.addEventListener('change', () => UI.applySort(devices));
if (sortOrder) sortOrder.addEventListener('click', () => {
    const btn = document.getElementById('sort-order');
    btn.textContent = btn.textContent === '⬇' ? '⬆' : '⬇';
    btn.setAttribute('data-dir', btn.textContent === '⬇' ? 'desc' : 'asc');
    UI.applySort(devices);
});

// Click Handler for Details (Delegation)
const grid = document.getElementById('device-grid');
if (grid) grid.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (card) {
        const id = card.id;
        const deviceData = devices.get(id);
        if (deviceData) UI.showDetails(deviceData);
    }
});

function stop() {
    BLE.stopBLE();
    if (rateInterval) { clearInterval(rateInterval); rateInterval = null; }
    UI.setUIState(false, isTestMode);
}

function refreshLoop() {
    // 1. Calculate Rates
    devices.forEach((data) => {
        data.stats.rate = data.stats.bucket;
        data.stats.bucket = 0;
        UI.updateRateBadge(data.id, data.stats.total, data.stats.rate);
    });
    // 2. Sort
    UI.applySort(devices);
}

function onAdvertisement(event) {
    const { device, rssi, txPower, uuids, manufacturerData, serviceData } = event;
    const id = device.id;
    const name = device.name || 'N/A';
    
    // Update Central State
    let data = devices.get(id);
    if (!data) {
        data = { 
            id, name, rssi, lastSeen: Date.now(), 
            stats: { total: 0, bucket: 0, rate: 0 },
            raw: { uuids, manufacturerData, serviceData, txPower }
        };
        devices.set(id, data);
    } else {
        data.rssi = rssi;
        data.lastSeen = Date.now();
        data.raw = { uuids, manufacturerData, serviceData, txPower };
    }
    
    data.stats.total++;
    data.stats.bucket++;

    UI.updateCard(id, name, rssi, data.stats);
    UI.applyFilters(devices); 

    // --- LIVE MODAL UPDATE ---
    if (UI.isModalOpenFor(id)) {
        UI.showDetails(data);
    }
}

// Visibility Guard
document.addEventListener("visibilitychange", () => { 
    if (document.hidden && !isTestMode && rateInterval) stop(); 
});
window.addEventListener("blur", () => { 
    if (!isTestMode && rateInterval) stop(); 
});