/**
 * Main Controller
 */
import { initTheme } from '../theme.js';
import * as BLE from '../ble.js';
import * as UI from '../ui/main.js';
import { getSortedAndFilteredList } from '../logic/filter.js';
import { runTests } from '../test.js';
import './types.js';

// Central State
const devices = new Map(); 
let rateInterval = null;
const isTestMode = new URLSearchParams(window.location.search).has('test');

// 1. Initialization
initTheme();
UI.setUIState(false, isTestMode);

// Bind Inputs (Refresh logic)
UI.bindInputEvents(() => refreshUI());

// Bind Card Clicks (Modal logic) - THIS WAS MISSING
UI.bindCardClick((id) => {
    const deviceData = devices.get(id);
    if (deviceData) {
        UI.showDetails(deviceData);
    }
});

// Start Test Mode
if (isTestMode) {
    UI.enableTestModeUI();
    runTests(isTestMode);
}

// 2. Event Handlers
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');

if (btnStart) btnStart.addEventListener('click', async () => {
    try {
        await BLE.startBLE(onAdvertisement);
        UI.setUIState(true, isTestMode);
        rateInterval = setInterval(refreshRates, 1000);
    } catch (e) {
        if(!isTestMode) alert(e);
        UI.setUIState(false, isTestMode);
    }
});

if (btnStop) btnStop.addEventListener('click', stop);

// 3. Core Logic Loop
function onAdvertisement(event) {
    const { device, rssi, txPower, uuids, manufacturerData, serviceData } = event;
    const id = device.id;
    const name = device.name || 'N/A';
    
    // Update State
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

    // UI Updates
    UI.updateCard(id, name, rssi, data.stats);
    refreshUI();

    if (UI.isModalOpenFor(id)) {
        UI.showDetails(data);
    }
}

function refreshRates() {
    devices.forEach((data) => {
        data.stats.rate = data.stats.bucket;
        data.stats.bucket = 0;
        UI.updateRateBadge(data.id, data.stats.total, data.stats.rate);
    });
    refreshUI();
}

function refreshUI() {
    const config = UI.getFilterConfig();
    const sortedList = getSortedAndFilteredList(devices, config);
    UI.render(sortedList);
}

function stop() {
    BLE.stopBLE();
    if (rateInterval) { clearInterval(rateInterval); rateInterval = null; }
    UI.setUIState(false, isTestMode);
}

document.addEventListener("visibilitychange", () => { 
    if (document.hidden && !isTestMode && rateInterval) stop(); 
});
window.addEventListener("blur", () => { 
    if (!isTestMode && rateInterval) stop(); 
});