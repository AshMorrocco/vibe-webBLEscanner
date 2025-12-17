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

    const triggerInput = (id, value, eventType = 'input') => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = value;
        el.dispatchEvent(new Event(eventType));
    };

    // --- 3. TEST SUITE EXECUTION ---
    (async () => {
        const btnStart = document.getElementById('btn-start');
        const btnStop = document.getElementById('btn-stop');
        const grid = document.getElementById('device-grid');

        await waitForUI(10); 
        log("Test Suite Starting...", true);

        // --- TEST 1: Basic UI State ---
        if (!btnStart.disabled && btnStop.disabled) log("Buttons in IDLE state", true);
        else log("Buttons wrong state", false);

        // --- TEST 2: Start Scan ---
        btnStart.click();
        await waitForUI(5);
        if (btnStart.disabled) log("Scan started", true);
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

        // --- TEST 9: Stop ---
        btnStop.click();
        await waitForUI(5);
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