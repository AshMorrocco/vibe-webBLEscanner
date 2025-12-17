/**
 * Main Controller
 * Refactored to use EventBus and Store for better separation of concerns.
 */
import { initTheme } from '../theme.js';
import { EventBus, EVENTS } from './bus.js';
import * as Store from './store.js';
import { LiveProvider } from '../adapters/ble.js';
import * as UI from '../ui/main.js';
import { getSortedAndFilteredList } from '../logic/filter.js';
import { runTests } from '../test.js';
import './types.js';

// Global Provider Instance (Live or Replay)
let provider = null;
let rateInterval = null;
const isTestMode = new URLSearchParams(window.location.search).has('test');

// 1. Initialization
initTheme();
UI.setUIState(false, isTestMode);

// Bind Inputs (Refresh logic)
UI.bindInputEvents(() => refreshUI());

// Bind Card Clicks (Modal logic)
UI.bindCardClick((id) => {
    // Fetch data directly from Store
    const deviceData = Store.getDevices().get(id);
    if (deviceData) {
        UI.showDetails(deviceData);
    }
});

// Start Test Mode
if (isTestMode) {
    UI.enableTestModeUI();
    runTests(isTestMode);
}

// 2. Wiring: Listen for Store Updates (Store -> UI)
EventBus.addEventListener(EVENTS.DEVICE_UPDATED, (event) => {
    const device = event.detail;
    
    // Update the specific card
    UI.updateCard(device.id, device.name, device.rssi, device.stats);
    
    // Refresh grid sorting/filtering
    refreshUI();

    // Live update Detail Modal if open
    if (UI.isModalOpenFor(device.id)) {
        UI.showDetails(device);
    }
});

// 3. User Controls
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');

if (btnStart) btnStart.addEventListener('click', async () => {
    try {
        // Initialize the Data Source (Live BLE)
        provider = new LiveProvider();
        
        // Start Scanning
        // We pass a callback that pipes data directly into the Store.
        // Logic Flow: Provider -> Store -> EventBus -> UI
        await provider.start((packet) => Store.upsertDevice(packet));
        
        UI.setUIState(true, isTestMode);
        rateInterval = setInterval(refreshRates, 1000);
    } catch (e) {
        if(!isTestMode) alert(e);
        UI.setUIState(false, isTestMode);
    }
});

if (btnStop) btnStop.addEventListener('click', stop);

function stop() {
    if (provider) {
        provider.stop();
        provider = null;
    }
    if (rateInterval) { 
        clearInterval(rateInterval); 
        rateInterval = null; 
    }
    UI.setUIState(false, isTestMode);
}

// 4. Periodic Tasks
function refreshRates() {
    // Iterate over the Store's state
    Store.getDevices().forEach((data) => {
        data.stats.rate = data.stats.bucket;
        data.stats.bucket = 0;
        UI.updateRateBadge(data.id, data.stats.total, data.stats.rate);
    });
    refreshUI();
}

function refreshUI() {
    const config = UI.getFilterConfig();
    // Retrieve map from Store
    const devicesMap = Store.getDevices();
    const sortedList = getSortedAndFilteredList(devicesMap, config);
    UI.render(sortedList);
}

// 5. Lifecycle Management
document.addEventListener("visibilitychange", () => { 
    if (document.hidden && !isTestMode && rateInterval) stop(); 
});
window.addEventListener("blur", () => { 
    if (!isTestMode && rateInterval) stop(); 
});