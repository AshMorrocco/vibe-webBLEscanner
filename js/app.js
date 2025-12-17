import { initTheme } from './theme.js';
import * as UI from './ui.js';
import * as BLE from './ble.js';
import { runTests } from './test.js';

const deviceStats = new Map();
let rateInterval = null;
const isTestMode = new URLSearchParams(window.location.search).has('test');

// Init
initTheme();
if (isTestMode) {
    UI.enableTestModeUI();
    runTests(UI, isTestMode);
}

// Logic
document.getElementById('btn-start').addEventListener('click', async () => {
    try {
        await BLE.startBLE(onAdvertisement);
        UI.setUIState(true, isTestMode);
        rateInterval = setInterval(calculateRates, 1000);
    } catch (e) {
        if(!isTestMode) alert(e);
        UI.setUIState(false, isTestMode);
    }
});

document.getElementById('btn-stop').addEventListener('click', stop);

function stop() {
    BLE.stopBLE();
    if (rateInterval) { clearInterval(rateInterval); rateInterval = null; }
    UI.setUIState(false, isTestMode);
}

// Stats Loop
function calculateRates() {
    deviceStats.forEach((stats, id) => {
        stats.rate = stats.bucket; 
        stats.bucket = 0;
        UI.updateRateBadge(id, stats.total, stats.rate);
    });
}

// Packet Handler
function onAdvertisement(event) {
    const { device, rssi } = event;
    const id = device.id;
    const name = device.name || 'N/A';
    
    let stats = deviceStats.get(id);
    if (!stats) { stats = { total: 0, bucket: 0, rate: 0 }; deviceStats.set(id, stats); }
    stats.total++; stats.bucket++;

    UI.updateCard(id, name, rssi, stats);
}

// Visibility Guard
document.addEventListener("visibilitychange", () => { 
    if (document.hidden && !isTestMode && rateInterval) stop(); 
});
window.addEventListener("blur", () => { 
    if (!isTestMode && rateInterval) stop(); 
});