const grid = document.getElementById('device-grid');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const statusBadge = document.getElementById('status');

export function updateCard(id, name, rssi, stats) {
    let card = document.getElementById(id);
    
    if (!card) {
        card = document.createElement('div');
        card.id = id;
        card.className = 'card';
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