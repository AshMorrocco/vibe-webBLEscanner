/**
 * Main Controller
 * Refactored to use EventBus and Store for better separation of concerns.
 */
import { initTheme } from '../theme.js';
import { EventBus, EVENTS } from './bus.js';
import * as Store from './store.js';
import { LiveProvider } from '../adapters/ble.js';
import { ReplayProvider } from '../adapters/replay.js';
import { Recorder } from '../adapters/recorder.js';
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

// --- Compatibility Check (Run on Load) ---
// This runs immediately to warn the user before they even click "Start"
(function checkBrowser() {
    const support = LiveProvider.checkSupport();
    if (!support.ok) {
        UI.showWarning(support.error, support.fix);
        // Optional: Disable scanning and replay start buttons
        const scanBtn = document.getElementById('btn-scan-toggle');
        if (scanBtn) scanBtn.disabled = true;
        const replayBtn = document.getElementById('btn-start-replay');
        if (replayBtn) replayBtn.disabled = true;
    }
})();

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
const btnScan = document.getElementById('btn-scan-toggle');
const btnRecord = document.getElementById('btn-record-toggle');
const stopOnSave = document.getElementById('stop-on-save');

// Recorder state (declared here so event handlers can reference it)
let recorder = null;
const recordStatus = document.getElementById('record-status');

if (btnScan) btnScan.addEventListener('click', async () => {
    // Toggle scanning
    if (provider) {
        // Stop scanning
        stop();
        if (btnScan) btnScan.textContent = 'Start scanning';
        return;
    }

    try {
        // Start scanning
        const live = new LiveProvider();
        await live.start((packet) => Store.upsertDevice(packet));
        provider = live;
        UI.setUIState(true, isTestMode);
        if (btnScan) btnScan.textContent = 'Stop scanning';
        rateInterval = setInterval(refreshRates, 1000);
    } catch (e) {
        try { if (provider && provider.stop) provider.stop(); } catch (_) {}
        provider = null;
        if(!isTestMode) alert((e && e.message) || 'Scan failed or was blocked by the user.');
        UI.setUIState(false, isTestMode);
    }
});

// Recording toggle button
if (btnRecord) btnRecord.addEventListener('click', () => {
    if (!recorder) recorder = new Recorder();

    if (!recorder.isRecording) {
        try {
            recorder.start();
            if (recordStatus) recordStatus.textContent = 'Recording...';
            btnRecord.textContent = 'Stop recording & Save';
        } catch (e) { console.error('Recorder start failed', e); }
    } else {
        try {
            recorder.stop();
            // Don't save empty recordings
            if (!recorder.records || recorder.records.length === 0) {
                if (recordStatus) recordStatus.textContent = 'No packets recorded';
                alert('No packets recorded — nothing to save.');
                btnRecord.textContent = 'Start recording';
                setTimeout(() => { if (recordStatus) recordStatus.textContent = ''; }, 2000);
                return;
            }
            const filename = `replay-${Date.now()}.json`;
            recorder.download(filename, 'recording');
            if (recordStatus) recordStatus.textContent = `Saved ${filename}`;
            setTimeout(() => { if (recordStatus) recordStatus.textContent = ''; }, 3000);

            // Optionally stop scanning when saving
            if (stopOnSave && stopOnSave.checked) {
                stop();
                if (btnScan) btnScan.textContent = 'Start scanning';
            }

            btnRecord.textContent = 'Start recording';
        } catch (e) { console.error('Recorder stop/download failed', e); }
    }
});

// --- Replay Controls ---
let replayLoaded = false;
let replaySessionData = null; // Stores parsed JSON so we can recreate provider later
const btnStartReplay = document.getElementById('btn-start-replay');
const fileInput = document.getElementById('replay-file');
const replayFileName = document.getElementById('replay-file-name');

async function loadReplayFile(file) {
    if (!file) { alert('Select a replay JSON file first'); replayLoaded = false; replaySessionData = null; if (replayFileName) replayFileName.textContent = ''; return; }

    // Show a short loading state and disable the input to avoid duplicate loads
    if (replayFileName) replayFileName.textContent = 'Loading...';
    if (fileInput) fileInput.disabled = true;

    try {
        // If any provider is currently running (live), stop it first
        try { if (provider && typeof provider.stop === 'function') { provider.stop(); } } catch (e) { console.warn('Failed to stop current provider', e); }

        // Read file text asynchronously
        const text = await file.text();

        // Yield to the event loop before heavy parsing to avoid blocking the UI click handler
        await new Promise(r => setTimeout(r, 0));

        let json;
        try {
            json = JSON.parse(text);
        } catch (pe) {
            throw new Error('Invalid JSON in replay file');
        }

        // Reject empty replay files: no packets to play
        if (!Array.isArray(json.packets) || json.packets.length === 0) {
            replayLoaded = false;
            replaySessionData = null;
            provider = null;
            if (replayFileName) replayFileName.textContent = `${file.name} — 0 packets (empty)`;
            if (btnStartReplay) btnStartReplay.disabled = true;
            console.warn('Loaded replay file contains no packets');
            alert('Loaded replay file contains no packets — nothing to play.');
            return;
        }

        replaySessionData = json;

        const r = new ReplayProvider();
        await r.loadFromJSON(json);
        provider = r;
        replayLoaded = true;
        if (btnStartReplay) btnStartReplay.disabled = false;
        if (replayFileName) replayFileName.textContent = file.name;
        console.log('Replay file loaded');
    } catch (e) {
        replayLoaded = false;
        replaySessionData = null;
        provider = null;
        if (replayFileName) replayFileName.textContent = '';
        console.error('Failed to load replay:', e);
        alert('Failed to load replay: ' + (e && e.message ? e.message : e));
    } finally {
        if (fileInput) fileInput.disabled = false;
    }
}

// Auto-load when a file is selected
if (fileInput) fileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
        // Disable start until loaded
        if (btnStartReplay) btnStartReplay.disabled = true;
        await loadReplayFile(file);
    } else {
        replayLoaded = false;
        replaySessionData = null;
        if (btnStartReplay) btnStartReplay.disabled = true;
        if (replayFileName) replayFileName.textContent = '';
    }
});


if (btnStartReplay) btnStartReplay.addEventListener('click', async () => {
    // If provider is missing but we have loaded JSON, reconstruct provider
    if (!provider) {
        if (replayLoaded && replaySessionData) {
            const r = new ReplayProvider();
            try { await r.loadFromJSON(replaySessionData); provider = r; } catch (e) { console.error('Failed to recreate provider', e); }
        }
    }

    if (!provider) { alert('No replay provider loaded'); return; }
    try {
        // Clear existing devices before starting replay (robust fallback if API missing)
        try {
            if (Store && typeof Store.clearDevices === 'function') {
                Store.clearDevices();
            } else if (Store && typeof Store.getDevices === 'function') {
                const map = Store.getDevices();
                if (map && typeof map.clear === 'function') map.clear();
                // Dispatch RESET so UI clears
                EventBus.dispatchEvent(new CustomEvent(EVENTS.RESET));
            } else {
                console.warn('No clearDevices/getDevices API on Store');
            }
        } catch (e) {
            console.warn('clearDevices failed', e);
        }
        // Also ensure DOM grid is cleared immediately in case RESET handlers are slow
        const grid = document.getElementById('device-grid'); if (grid) grid.innerHTML = '';
        // Start replay; provide Store.upsertDevice as callback so Store is updated directly
        await provider.start((packet) => Store.upsertDevice(packet), { playbackRate: 1.0, loop: false });

        // Update UI state and start the rate interval
        UI.setUIState(true, isTestMode);
        // If this is a ReplayProvider, show a specialized badge
        const badge = document.getElementById('status');
        if (provider instanceof ReplayProvider && badge) badge.textContent = 'Replaying Scan';
        rateInterval = setInterval(refreshRates, 1000);

        // Disable start until replay ends
        if (btnStartReplay) btnStartReplay.disabled = true;
    } catch (e) {
        alert(e);
    }
});

function stop() {
    if (provider) {
        try { provider.stop(); } catch (e) {}
        provider = null;
    }
    if (rateInterval) { 
        clearInterval(rateInterval); 
        rateInterval = null; 
    }
    UI.setUIState(false, isTestMode);
    // Re-enable replay start button only if a file is loaded
    const replayStartBtn = document.getElementById('btn-start-replay');
    if (replayStartBtn) replayStartBtn.disabled = !replayLoaded;
}

// Listen for scan status changes (used by ReplayProvider when playback ends)
EventBus.addEventListener(EVENTS.SCAN_STATUS, (event) => {
    const detail = event.detail || {};
    if (detail.running === false) {
        stop();
    } else if (detail.running === true && detail.source === 'replay') {
        // Show specialized status for replay
        UI.setUIState(true, isTestMode);
        const badge = document.getElementById('status');
        if (badge) badge.textContent = 'Replaying Scan';
        // Ensure start button disabled while replay is running
        const replayStartBtn = document.getElementById('btn-start-replay');
        if (replayStartBtn) replayStartBtn.disabled = true;
    }
});

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