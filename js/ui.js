const grid = document.getElementById('device-grid');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const statusBadge = document.getElementById('status');

function bufferToHex(dataView) {
    return [...new Uint8Array(dataView.buffer)]
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
}

// --- Modal Logic ---
const modal = document.getElementById('detail-modal');
const closeBtn = document.getElementById('modal-close');
const pauseBtn = document.getElementById('modal-pause');

let currentModalId = null;
let isPaused = false;

function closeModal() {
    if (modal) modal.classList.add('hidden');
    currentModalId = null;
    setPaused(false); // Reset pause when closing
}

function togglePause() {
    setPaused(!isPaused);
}

function setPaused(paused) {
    isPaused = paused;
    if (pauseBtn) {
        pauseBtn.textContent = isPaused ? "▶" : "⏸"; // Play vs Pause icon
        pauseBtn.title = isPaused ? "Resume Live Updates" : "Pause Live Updates";
        if (paused) pauseBtn.classList.add('paused'); 
        else pauseBtn.classList.remove('paused');
    }
}

if (closeBtn) closeBtn.onclick = closeModal;
if (pauseBtn) pauseBtn.onclick = togglePause;
if (modal) modal.onclick = (e) => {
    if (e.target === modal) closeModal();
};

export function isModalOpenFor(id) {
    return !modal.classList.contains('hidden') && currentModalId === id;
}

export function showDetails(deviceData) {
    const { id, name, rssi, raw } = deviceData;

    // 1. Check if this is a NEW open or an UPDATE
    if (currentModalId !== id) {
        // New Open: Always show, and unpause
        currentModalId = id;
        setPaused(false);
    } else {
        // Update: If paused, stop here (do not update DOM)
        if (isPaused) return;
    }

    // ... (The rest of your rendering logic remains exactly the same) ...
    const txPower = raw.txPower;
    
    document.getElementById('modal-title').textContent = name || 'Unknown Device';
    document.getElementById('modal-id').textContent = id;
    
    const rssiEl = document.getElementById('modal-rssi');
    rssiEl.textContent = rssi + ' dBm';
    rssiEl.style.color = 'var(--accent)';
    setTimeout(() => rssiEl.style.color = '', 200);

    document.getElementById('modal-tx').textContent = (txPower !== null && txPower !== undefined) ? txPower + ' dBm' : 'N/A';

    // UUIDs
    const uuidList = raw.uuids || [];
    const uuidContainer = document.getElementById('modal-uuids');
    if (uuidList.length > 0) {
        uuidContainer.innerHTML = uuidList.map(u => `<div>• ${u}</div>`).join('');
    } else { uuidContainer.textContent = "None"; }

    // Mfg Data
    const mfgContainer = document.getElementById('modal-mfg');
    if (raw.manufacturerData && raw.manufacturerData.size > 0) {
        let html = '';
        raw.manufacturerData.forEach((value, key) => {
            const hexKey = '0x' + key.toString(16).toUpperCase().padStart(4, '0');
            html += `<div><strong>${hexKey}:</strong> ${bufferToHex(value)}</div>`;
        });
        mfgContainer.innerHTML = html;
    } else { mfgContainer.textContent = "None"; }

    // Service Data
    const svcContainer = document.getElementById('modal-svc');
    if (raw.serviceData && raw.serviceData.size > 0) {
        let html = '';
        raw.serviceData.forEach((value, key) => {
            html += `<div><strong>${key}:</strong> ${bufferToHex(value)}</div>`;
        });
        svcContainer.innerHTML = html;
    } else { svcContainer.textContent = "None"; }

    modal.classList.remove('hidden');
}

// --- Card Logic ---

export function updateCard(id, name, rssi, stats) {
    let card = document.getElementById(id);
    
    if (!card) {
        card = document.createElement('div');
        card.id = id;
        card.className = 'card';
        if(grid) grid.appendChild(card);
        renderHTML(card, id, name, rssi, stats);
    } else {
        renderHTML(card, id, name, rssi, stats);
    }
    
    card.classList.remove('fresh'); 
    void card.offsetWidth; 
    card.classList.add('fresh');
}

export function updateRateBadge(id, total, rate) {
    const badge = document.getElementById(`badge-${id}`);
    if (badge) badge.textContent = `Rx: ${total} | ${rate}/s`;
}

// --- Filtering & Sorting ---

export function applyFilters(devicesMap) {
    const slider = document.getElementById('rssi-slider');
    const txt = document.getElementById('filter-text');
    
    const minRssi = slider ? parseInt(slider.value) : -100;
    const filterTxt = txt ? txt.value.toLowerCase() : '';
    const filterType = document.getElementById('filter-type').value;

    devicesMap.forEach(device => {
        const card = document.getElementById(device.id);
        if (!card) return;

        let visible = true;
        if (device.rssi < minRssi) visible = false;
        if (visible && filterTxt.length > 0) {
            const target = filterType === 'name' ? device.name : device.id;
            if (!target.toLowerCase().includes(filterTxt)) visible = false;
        }

        if (visible) card.classList.remove('hidden');
        else card.classList.add('hidden');
    });
}

export function applySort(devicesMap) {
    const sortEl = document.getElementById('sort-type');
    if (!sortEl) return;

    const type = sortEl.value;
    const btn = document.getElementById('sort-order');
    const isDesc = (btn.getAttribute('data-dir') || 'desc') === 'desc';

    const sorted = [...devicesMap.values()].sort((a, b) => {
        let valA, valB;
        switch (type) {
            case 'rssi': valA = a.rssi; valB = b.rssi; break;
            case 'lastSeen': valA = a.lastSeen; valB = b.lastSeen; break;
            case 'rate': valA = a.stats.rate; valB = b.stats.rate; break;
            case 'total': valA = a.stats.total; valB = b.stats.total; break;
            case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
            default: return 0;
        }
        if (valA < valB) return isDesc ? 1 : -1;
        if (valA > valB) return isDesc ? -1 : 1;
        return 0;
    });

    sorted.forEach(d => {
        const card = document.getElementById(d.id);
        if (card && grid) grid.appendChild(card);
    });
}

// --- UI State ---

export function setUIState(running, isTestMode = false) {
    if (running) {
        if(btnStart) btnStart.disabled = true; 
        if(btnStop) btnStop.disabled = false;
        if(!isTestMode && statusBadge) { 
            statusBadge.textContent = "Scanning Active"; 
            statusBadge.classList.add("active"); 
        }
    } else {
        if(btnStart) btnStart.disabled = false; 
        if(btnStop) btnStop.disabled = true;
        if(!isTestMode && statusBadge) { 
            statusBadge.textContent = "Idle"; 
            statusBadge.classList.remove("active"); 
        }
    }
}

export function enableTestModeUI() {
    if(statusBadge) {
        statusBadge.textContent = "TEST MODE";
        statusBadge.classList.add('test-mode');
    }
}

function renderHTML(card, id, name, rssi, stats) {
    const percent = Math.min(Math.max((rssi + 100) * 1.5, 0), 100);
    card.innerHTML = `
        <div class="card-header">
            <span class="device-name">${name}</span>
            <span id="badge-${id}" class="packet-count">Rx: ${stats.total} | ${stats.rate}/s</span>
        </div>
        <div class="card-center">${id}</div>
        <div class="rssi-container">
            <div class="meter"><div class="fill" style="width:${percent}%"></div></div>
            <div class="rssi-text">${rssi} dBm</div>
        </div>`;
}