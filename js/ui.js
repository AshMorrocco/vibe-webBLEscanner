const grid = document.getElementById('device-grid');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const statusBadge = document.getElementById('status');

// --- Core Rendering ---

export function updateCard(id, name, rssi, stats) {
    let card = document.getElementById(id);
    
    if (!card) {
        card = document.createElement('div');
        card.id = id;
        card.className = 'card';
        // When creating, we just append. Sorting will fix order later.
        grid.appendChild(card);
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
    const minRssi = parseInt(document.getElementById('rssi-slider').value);
    const filterTxt = document.getElementById('filter-text').value.toLowerCase();
    const filterType = document.getElementById('filter-type').value;

    devicesMap.forEach(device => {
        const card = document.getElementById(device.id);
        if (!card) return;

        let visible = true;

        // 1. RSSI Check
        if (device.rssi < minRssi) visible = false;

        // 2. Text Check
        if (visible && filterTxt.length > 0) {
            const target = filterType === 'name' ? device.name : device.id;
            if (!target.toLowerCase().includes(filterTxt)) visible = false;
        }

        if (visible) card.classList.remove('hidden');
        else card.classList.add('hidden');
    });
}

export function applySort(devicesMap) {
    const type = document.getElementById('sort-type').value;
    const btn = document.getElementById('sort-order');
    const isDesc = (btn.getAttribute('data-dir') || 'desc') === 'desc';

    // Convert Map to Array
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

    // Re-append nodes in new order
    // (Note: appendChild moves an element if it already exists)
    sorted.forEach(d => {
        const card = document.getElementById(d.id);
        if (card) grid.appendChild(card);
    });
}

// --- State Management ---

export function setUIState(running, isTestMode = false) {
    if (running) {
        btnStart.disabled = true; 
        btnStop.disabled = false;
        if(!isTestMode) { 
            statusBadge.textContent = "Scanning Active"; 
            statusBadge.classList.add("active"); 
        }
    } else {
        btnStart.disabled = false; 
        btnStop.disabled = true;
        if(!isTestMode) { 
            statusBadge.textContent = "Idle"; 
            statusBadge.classList.remove("active"); 
        }
    }
}

export function enableTestModeUI() {
    statusBadge.textContent = "TEST MODE";
    statusBadge.classList.add('test-mode');
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