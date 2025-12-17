export function runTests(ui, isTestMode) {
    if (!isTestMode) return;
    
    // Inject Mock API
    console.log("⚠️ TEST MODE: Overwriting Bluetooth API");
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

    // Setup Test Runner
    const resultsDiv = document.getElementById('test-results');
    resultsDiv.style.display = 'block';
    
    const log = (msg, pass) => {
        const div = document.createElement('div');
        div.textContent = (pass ? "✅ PASS: " : "❌ FAIL: ") + msg;
        div.className = pass ? 'pass' : 'fail';
        resultsDiv.appendChild(div);
        if (!pass) console.error("Test Failed:", msg);
    };
    
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // --- HELPER: Trigger Event ---
    const triggerInput = (id, value, eventType = 'input') => {
        const el = document.getElementById(id);
        el.value = value;
        el.dispatchEvent(new Event(eventType));
    };

    (async () => {
        const btnStart = document.getElementById('btn-start');
        const btnStop = document.getElementById('btn-stop');
        const grid = document.getElementById('device-grid');

        await sleep(500);
        log("Test Suite Starting...", true);

        // 1. Basic UI State
        if (!btnStart.disabled && btnStop.disabled) log("Buttons in IDLE state", true);
        else log("Buttons wrong state", false);

        // 2. Start Scan
        btnStart.click();
        await sleep(100);
        if (btnStart.disabled) log("Scan started", true);
        else log("Start button failed", false);

        // 3. Inject Data (Standard)
        if (mockListener) {
            mockListener({ device: { id: "TEST_A", name: "Alpha Device" }, rssi: -50, raw: {} });
            mockListener({ device: { id: "TEST_Z", name: "Zebra Device" }, rssi: -90, raw: {} });
            log("Injected 2 mock devices (Alpha & Zebra)", true);
        } else log("Listener missing", false);

        await sleep(100);
        if (document.getElementById("TEST_A") && document.getElementById("TEST_Z")) {
            log("Cards rendered", true);
        } else log("Cards missing", false);

        // 4. Test Filtering (RSSI)
        log("Testing RSSI Filter...", true);
        triggerInput('rssi-slider', '-80');
        await sleep(100); 
        
        const cardA = document.getElementById("TEST_A");
        const cardZ = document.getElementById("TEST_Z");

        if (!cardA.classList.contains('hidden') && cardZ.classList.contains('hidden')) {
            log("RSSI Filter logic correct (Weak signal hidden)", true);
        } else log("RSSI Filter failed. Check classList.", false);

        // Reset Filter
        triggerInput('rssi-slider', '-100');
        await sleep(50);

        // 5. Test Filtering (Text)
        log("Testing Text Filter...", true);
        triggerInput('filter-text', 'Zebra');
        await sleep(50);

        if (cardA.classList.contains('hidden') && !cardZ.classList.contains('hidden')) {
            log("Text Filter logic correct ('Zebra' showed only Zebra)", true);
        } else log("Text Filter failed.", false);
        
        // Reset Text
        triggerInput('filter-text', '');
        await sleep(50);

        // 6. Test Sorting (Name)
        log("Testing Sorting (Name)...", true);
        triggerInput('sort-type', 'name', 'change');
        
        const sortBtn = document.getElementById('sort-order');
        if(sortBtn.textContent === '⬇') sortBtn.click(); // Toggle to Asc
        
        triggerInput('sort-type', 'name', 'change'); 
        await sleep(50);

        const firstId = grid.firstElementChild.id;
        if (firstId === 'TEST_A') log("Sorting correct (Alpha is first)", true);
        else log(`Sorting failed. First element is ${firstId}`, false);

        // 7. Rate Calculation
        mockListener({ device: { id: "TEST_A", name: "Alpha" }, rssi: -50, raw: {} });
        mockListener({ device: { id: "TEST_A", name: "Alpha" }, rssi: -50, raw: {} });
        
        log("Waiting for rate calc (1.1s)...", true);
        await sleep(1100);
        
        if (cardA.innerHTML.includes("3/s")) log("Rate correct (3/s)", true);
        else log("Rate failed", false);

        // --- 8. NEW: Modal & Pause Tests ---
        log("Testing Modal Logic...", true);
        
        // A. Open Modal for TEST_A
        cardA.click();
        await sleep(100);

        const modal = document.getElementById('detail-modal');
        const modalId = document.getElementById('modal-id');
        const modalRssi = document.getElementById('modal-rssi');
        const pauseBtn = document.getElementById('modal-pause');

        if (!modal.classList.contains('hidden') && modalId.textContent === 'TEST_A') {
            log("Modal opened for TEST_A", true);
        } else log("Modal failed to open", false);

        // B. Verify Live Update (Unpaused)
        mockListener({ device: { id: "TEST_A", name: "Alpha Device" }, rssi: -40, raw: {} });
        await sleep(50);
        if (modalRssi.textContent.includes("-40")) log("Live update received (Unpaused)", true);
        else log("Live update failed", false);

        // C. Test Pause Button
        pauseBtn.click(); // Click Pause
        await sleep(50);
        if (pauseBtn.textContent.includes("▶")) log("Pause button toggled UI", true);
        else log("Pause button UI failed", false);

        // D. Verify Blocked Update (Paused)
        mockListener({ device: { id: "TEST_A", name: "Alpha Device" }, rssi: -10, raw: {} });
        await sleep(50);
        // Should STILL be -40, NOT -10
        if (modalRssi.textContent.includes("-40")) log("Live update blocked (Paused)", true);
        else log("Pause logic failed! Updated to " + modalRssi.textContent, false);

        // E. Test Reset on New Device
        // Clicking TEST_Z should open Z and UNPAUSE automatically.
        cardZ.click();
        await sleep(100);

        if (modalId.textContent === 'TEST_Z') log("Switched to TEST_Z", true);
        
        // Button should be back to Pause icon (⏸)
        if (pauseBtn.textContent.includes("⏸")) log("Pause state reset automatically", true);
        else log("Failed to reset pause state", false);

        // Close Modal
        document.getElementById('modal-close').click();
        await sleep(100);

        // 9. Stop
        btnStop.click();
        await sleep(100);
        if (!btnStart.disabled) log("Stop button reset UI", true);
        else log("Stop failed", false);

        log("___ DONE ___", true);
        
        const close = document.createElement('button');
        close.textContent = "Exit Tests";
        close.style.marginTop = "20px";
        close.onclick = () => window.location.href = window.location.pathname;
        resultsDiv.appendChild(close);

    })();
}