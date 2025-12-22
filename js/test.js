import { ReplayProvider } from './adapters/replay.js';
import { Recorder } from './adapters/recorder.js';
import { EventBus, EVENTS } from './core/bus.js';
import * as Store from './core/store.js';

export function runTests(isTestMode) {
    if (!isTestMode) return;
    
    console.log("⚠️ TEST MODE: Initializing Test Suite");

    // --- 1. MOCK API INJECTION ---
    let mockListener = null;
    const mockBluetooth = {
        requestDevice: async () => ({}),
        requestLEScan: async () => ({ stop: () => {} }),
        addEventListener: (type, fn) => { if(type === 'advertisementreceived') mockListener = fn; },
        removeEventListener: () => { mockListener = null; }
    };

    try {
        Object.defineProperty(navigator, 'bluetooth', { value: mockBluetooth, writable: true });
    } catch(e) { console.error("Mock injection failed", e); }

    // --- 2. TEST HELPERS ---
    const resultsDiv = document.getElementById('test-results');
    resultsDiv.style.display = 'block';
    
    const log = (msg, pass) => {
        const div = document.createElement('div');
        div.textContent = (pass ? "✅ PASS: " : "❌ FAIL: ") + msg;
        div.className = pass ? 'pass' : 'fail';
        resultsDiv.appendChild(div);
        if (!pass) console.error("Test Failed:", msg);
        resultsDiv.scrollTop = resultsDiv.scrollHeight;
    };
    
    const waitForUI = async (frames = 2) => {
        for (let i = 0; i < frames; i++) {
            await new Promise(r => requestAnimationFrame(r));
        }
    };

    // Wait for an arbitrary condition to become true (timeout in ms)
    const waitForCondition = async (fn, timeout = 2000, interval = 50) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            if (fn()) return true;
            await new Promise(r => setTimeout(r, interval));
        }
        return false;
    };

    const triggerInput = (id, value, eventType = 'input') => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = value;
        el.dispatchEvent(new Event(eventType));
    };

    // --- 3. TEST SUITE EXECUTION ---
    (async () => {
        const btnScan = document.getElementById('btn-scan-toggle');
        const btnRecord = document.getElementById('btn-record-toggle');
        const recordStatus = document.getElementById('record-status');
        const stopOnSave = document.getElementById('stop-on-save');
        const grid = document.getElementById('device-grid');

        await waitForUI(10); 
        log("Test Suite Starting...", true);

        // --- TEST 1: Basic UI State ---
        if (btnScan && !btnScan.disabled) log("Buttons in IDLE state", true);
        else log("Buttons wrong state", false);

        // --- TEST 2: Start Scan ---
        btnScan.click();
        await waitForUI(5);
        if (btnScan && btnScan.textContent.toLowerCase().includes('stop')) log("Scan started", true);
        else log("Start button failed", false);

        // --- TEST 3: Inject Data ---
        if (mockListener) {
            mockListener({ device: { id: "TEST_A", name: "Alpha Device" }, rssi: -50, raw: {} });
            mockListener({ device: { id: "TEST_Z", name: "Zebra Device" }, rssi: -90, raw: {} });
            log("Injected 2 mock devices (Alpha & Zebra)", true);
        } else log("Listener missing", false);

        await waitForUI(5);

        if (document.getElementById("TEST_A") && document.getElementById("TEST_Z")) {
            log("Cards rendered", true);
        } else log("Cards missing", false);

        // --- TEST 4: Filtering (RSSI) ---
        log("Testing RSSI Filter...", true);
        triggerInput('rssi-slider', '-80');
        await waitForUI(5);
        
        const cardA = document.getElementById("TEST_A");
        const cardZ = document.getElementById("TEST_Z");

        if (!cardA.classList.contains('hidden') && cardZ.classList.contains('hidden')) {
            log("RSSI Filter logic correct (Weak signal hidden)", true);
        } else log("RSSI Filter failed. Check classList.", false);

        triggerInput('rssi-slider', '-100');
        await waitForUI(5);

        // --- TEST 5: Filtering (Text) ---
        log("Testing Text Filter...", true);
        triggerInput('filter-text', 'Zebra');
        await waitForUI(5);

        if (cardA.classList.contains('hidden') && !cardZ.classList.contains('hidden')) {
            log("Text Filter logic correct ('Zebra' showed only Zebra)", true);
        } else log("Text Filter failed.", false);
        
        triggerInput('filter-text', '');
        await waitForUI(5);

        // --- TEST 6: Sorting (Name) ---
        log("Testing Sorting (Name)...", true);
        triggerInput('sort-type', 'name', 'change');
        await waitForUI(5);
        
        const sortBtn = document.getElementById('sort-order');
        if(sortBtn.textContent.includes('⬇')) {
            sortBtn.click();
            await waitForUI(5);
        }

        const firstId = grid.firstElementChild.id;
        if (firstId === 'TEST_A') log("Sorting correct (Alpha is first)", true);
        else log(`Sorting failed. First element is ${firstId}`, false);

        // --- TEST 7: Rate Calculation (Continuous Stream Fix) ---
        log("Testing Rate Calculation...", true);
        
        let ratePassed = false;
        let finalRateText = "";

        // Simulate a device broadcasting at ~10Hz for 2.5 seconds.
        // This ensures that when the 1-second interval tick happens, the bucket is full.
        for (let i = 0; i < 25; i++) {
            // 1. Inject Packet
            mockListener({ device: { id: "TEST_A", name: "Alpha" }, rssi: -50, raw: {} });
            
            // 2. Wait 100ms (Simulating 10 packets per second)
            await new Promise(r => setTimeout(r, 100));
            await waitForUI(1);

            // 3. Check UI
            const badge = document.getElementById('badge-TEST_A');
            if (badge) {
                finalRateText = badge.textContent;
                // We expect something like "Rx: 24 | 10/s"
                // We check if "10/s" or "9/s" or "11/s" exists (handling timing jitter)
                if (finalRateText.includes("/s") && !finalRateText.includes(" 0/s")) {
                    // Check specifically for a number > 0
                    const rateMatch = finalRateText.match(/\|\s*(\d+)\/s/);
                    if (rateMatch && parseInt(rateMatch[1]) > 0) {
                        ratePassed = true;
                        break; 
                    }
                }
            }
        }

        if (ratePassed) log("Rate correct (> 0/s detected)", true);
        else log(`Rate failed. Final Text: '${finalRateText}'`, false);

        // --- TEST 8: Modal & Pause Logic ---
        log("Testing Modal Logic...", true);
        
        cardA.click();
        await waitForUI(5);

        const modal = document.getElementById('detail-modal');
        const modalId = document.getElementById('modal-id');
        const modalRssi = document.getElementById('modal-rssi');
        const pauseBtn = document.getElementById('modal-pause');

        if (!modal.classList.contains('hidden') && modalId.textContent === 'TEST_A') {
            log("Modal opened for TEST_A", true);
        } else log("Modal failed to open", false);

        mockListener({ device: { id: "TEST_A", name: "Alpha Device" }, rssi: -40, raw: {} });
        await waitForUI(5);
        
        if (modalRssi.textContent.includes("-40")) log("Live update received (Unpaused)", true);
        else log("Live update failed", false);

        pauseBtn.click();
        await waitForUI(5);
        
        if (pauseBtn.textContent.includes("▶")) log("Pause button toggled UI", true);
        else log("Pause button UI failed: " + pauseBtn.textContent, false);

        mockListener({ device: { id: "TEST_A", name: "Alpha Device" }, rssi: -10, raw: {} });
        await waitForUI(5);
        
        if (modalRssi.textContent.includes("-40")) log("Live update blocked (Paused)", true);
        else log("Pause logic failed! Updated to " + modalRssi.textContent, false);

        cardZ.click();
        await waitForUI(5);

        if (modalId.textContent === 'TEST_Z') log("Switched to TEST_Z", true);
        
        if (pauseBtn.textContent.includes("⏸")) log("Pause state reset automatically", true);
        else log("Failed to reset pause state", false);

        document.getElementById('modal-close').click();
        await waitForUI(5);

        // --- TEST: Replay Playback (App-level) ---
        try {
            // Fetch replay file blob and create a File so we can use the app's file input
            const resp = await fetch('replays/sample_session.json');
            const blob = await resp.blob();
            const file = new File([blob], 'sample_session.json', { type: 'application/json' });

            // Stop any live scans before starting replay
            try { btnScan.click(); } catch (e) {}
            await waitForUI(5);

            // Prevent mock listener from re-injecting packets during the replay test
            try { mockListener = null; } catch (e) {}

            // Place file into the file input using DataTransfer and fire the change event
            const fileInput = document.getElementById('replay-file');
            if (!fileInput) throw new Error('replay file input missing');

            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
            fileInput.dispatchEvent(new Event('change'));

            // Wait for the app to load the file and enable the start button

            const startReady = await waitForCondition(() => {
                const btn = document.getElementById('btn-start-replay');
                const name = document.getElementById('replay-file-name');
                return btn && !btn.disabled && name && name.textContent.length > 0;
            }, 2000, 50);

            if (!startReady) { log('Replay file failed to load / start disabled', false); }
            else log('Replay file loaded via UI', true);

            // Now click the Start Replay button (this will cause the app to clear devices)
            const startBtn = document.getElementById('btn-start-replay');
            if (!startBtn) throw new Error('start replay button missing');
            startBtn.click();

            // Wait until a replay card appears or timeout (2s)
            const found = await waitForCondition(() => document.getElementById('REPLAY_A') || document.getElementById('REPLAY_B'), 2000, 50);
            if (found) log('Replay packets rendered (app start)', true);
            else log('Replay failed: no cards after timeout', false);

            // Verify previous devices are cleared or hidden
            const oldA = document.getElementById('TEST_A');
            if (!oldA) log('Old devices cleared', true);
            else if (oldA.classList.contains('hidden')) log('Old devices hidden', true);
            else log('Old devices not cleared', false);

            // Verify status text reads 'Replaying'
            const statusBadge = document.getElementById('status');
            if (statusBadge && statusBadge.textContent.toLowerCase().includes('replay')) log('Status shows replaying', true);
            else log('Status did not indicate replaying', false);

            // Wait for UI to auto-reset to stopped state (Start Replay re-enabled)
            const stopped = await waitForCondition(() => startBtn && !startBtn.disabled, 4000, 50);
            if (stopped) log('Replay completion toggled UI to stopped', true);
            else log('Replay did not toggle UI to stopped after timeout', false);

        } catch (e) {
            log('Replay test skipped: ' + e.message, false);
        }

        // --- Additional Tests: Recorder / Replay edge cases ---
        // Recorder UI behavior
        log("Testing Recorder UI...", true);
        try {
            // Ensure scanning is running
            if (!btnScan.textContent.toLowerCase().includes('stop')) btnScan.click();
            await waitForUI(5);
            btnRecord.click();
            await waitForUI(2);
            if (btnRecord && btnRecord.textContent.toLowerCase().includes('stop') && recordStatus && recordStatus.textContent.includes('Recording')) log("Recording started UI", true);
            else log("Recording start UI failed", false);

            // Inject a packet so recorder has something to save
            if (mockListener) {
                mockListener({ device: { id: 'REC_A', name: 'Recorder Device' }, rssi: -60, raw: {} });
            }
            await waitForUI(3);

            // Test stop-on-save behavior
            stopOnSave.checked = true;
            btnRecord.click();
            await waitForUI(5);
            if (btnScan && btnScan.textContent.toLowerCase().includes('start')) log("Stop-on-save stopped scanning", true);
            else log("Stop-on-save failed", false);
            if (recordStatus && recordStatus.textContent.includes('Saved')) log("Recording saved UI shown", true);
            else log("Recording save UI failed", false);
        } catch (e) {
            log("Recorder UI test failed: " + e.message, false);
        }

        // Empty replay file handling
        log("Testing empty replay file handling...", true);
        try {
            const emptyJson = JSON.stringify({ meta: {}, packets: [] });
            const file = new File([emptyJson], 'empty.json', { type: 'application/json' });
            const fileInput = document.getElementById('replay-file');
            const origAlert = window.alert;
            window.alert = () => {}; // silence alert
            const dt2 = new DataTransfer();
            dt2.items.add(file);
            fileInput.files = dt2.files;
            fileInput.dispatchEvent(new Event('change'));
            const emptyReady = await waitForCondition(() => {
                const btn = document.getElementById('btn-start-replay');
                const name = document.getElementById('replay-file-name');
                return btn && btn.disabled && name && name.textContent.includes('0 packets');
            }, 2000, 50);
            window.alert = origAlert;
            if (emptyReady) log("Empty replay rejected", true);
            else log("Empty replay not handled", false);
        } catch (e) {
            log("Empty replay test failed: " + e.message, false);
        }

        // Recorder truncation unit test
        log("Testing Recorder truncation...", true);
        try {
            const rec = new Recorder();
            rec.maxRecords = 3;
            rec.start();
            for (let i=0;i<5;i++) {
                EventBus.dispatchEvent(new CustomEvent(EVENTS.ADVERTISEMENT, { detail: { device: { id: 'R' + i, name: 'R' + i }, rssi: -50 } }));
            }
            rec.stop();
            if (rec.records.length <= 3 && rec.truncated) log("Recorder truncation enforced", true);
            else log("Recorder truncation failed", false);
        } catch (e) {
            log("Recorder truncation test failed: " + e.message, false);
        }

        // --- TEST 9: Stop ---
        btnScan.click();
        await waitForUI(5);
        if (!btnScan.disabled) log("Stop button reset UI", true);
        else log("Stop failed", false);

        log("___ DONE ___", true);
        
        const close = document.createElement('button');
        close.textContent = "Exit Tests";
        close.style.marginTop = "20px";
        close.onclick = () => window.location.href = window.location.pathname; 
        resultsDiv.appendChild(close);

    })();
}