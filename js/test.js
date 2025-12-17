export function runTests(ui, isTestMode) {
    if (!isTestMode) return;
    
    // Inject Mock
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

    // Run Suite
    const resultsDiv = document.getElementById('test-results');
    resultsDiv.style.display = 'block';
    
    const log = (msg, pass) => {
        const div = document.createElement('div');
        div.textContent = (pass ? "✅ PASS: " : "❌ FAIL: ") + msg;
        div.className = pass ? 'pass' : 'fail';
        resultsDiv.appendChild(div);
    };
    
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    (async () => {
        const btnStart = document.getElementById('btn-start');
        const btnStop = document.getElementById('btn-stop');

        await sleep(500);
        log("Test Suite Starting...", true);

        // Test 1
        if (!btnStart.disabled && btnStop.disabled) log("Buttons in IDLE state", true);
        else log("Buttons wrong state", false);

        // Test 2
        btnStart.click();
        await sleep(100);
        if (btnStart.disabled && !btnStop.disabled) log("Scan started", true);
        else log("Start button failed", false);

        // Test 3
        if (mockListener) {
            mockListener({ device: { id: "TEST_001", name: "Mock Device" }, rssi: -50 });
            log("Injected mock packet", true);
        } else log("Listener missing", false);

        await sleep(100);
        const card = document.getElementById("TEST_001");
        if (card) log("Card rendered", true);
        else log("Card missing", false);

        // Test 4 (Rate)
        mockListener({ device: { id: "TEST_001", name: "Mock Device" }, rssi: -50 });
        mockListener({ device: { id: "TEST_001", name: "Mock Device" }, rssi: -50 });
        
        log("Waiting for rate calc...", true);
        await sleep(1100);
        
        if (card && card.innerHTML.includes("3/s")) log("Rate correct (3/s)", true);
        else log("Rate failed", false);

        // Test 5
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