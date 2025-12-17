import { bufferToHex } from '../../utils/helpers.js';

const modal = document.getElementById('detail-modal');
const closeBtn = document.getElementById('modal-close');
const pauseBtn = document.getElementById('modal-pause');

let currentModalId = null;
let isPaused = false;

// --- Internal Event Listeners ---
if (closeBtn) closeBtn.onclick = closeModal;
if (pauseBtn) pauseBtn.onclick = togglePause;
if (modal) modal.onclick = (e) => {
    if (e.target === modal) closeModal();
};

function closeModal() {
    if (modal) modal.classList.add('hidden');
    currentModalId = null;
    setPaused(false);
}

function togglePause() {
    setPaused(!isPaused);
}

function setPaused(paused) {
    isPaused = paused;
    if (pauseBtn) {
        pauseBtn.textContent = isPaused ? "▶" : "⏸"; 
        pauseBtn.title = isPaused ? "Resume Live Updates" : "Pause Live Updates";
        if (paused) pauseBtn.classList.add('paused'); 
        else pauseBtn.classList.remove('paused');
    }
}

// --- Exports ---

export function isModalOpenFor(id) {
    return !modal.classList.contains('hidden') && currentModalId === id;
}

export function showDetails(deviceData) {
    const { id, name, rssi, raw } = deviceData;

    // Handle New Open vs Update
    if (currentModalId !== id) {
        currentModalId = id;
        setPaused(false);
    } else {
        if (isPaused) return;
    }

    // Render Content
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

    // Manufacturer Data
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