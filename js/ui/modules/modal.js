import { bufferToHex } from '../../utils/helpers.js';

// --- Internal Helper ---
const get = (id) => document.getElementById(id);

// --- Event Listeners (Guarded) ---
// We check if elements exist before attaching listeners
const modal = get('detail-modal');
const closeBtn = get('modal-close');
const pauseBtn = get('modal-pause');

if (closeBtn) closeBtn.onclick = closeModal;
if (pauseBtn) pauseBtn.onclick = togglePause;
if (modal) modal.onclick = (e) => {
    if (e.target === modal) closeModal();
};

let currentModalId = null;
let isPaused = false;

function closeModal() {
    const el = get('detail-modal');
    if (el) el.classList.add('hidden');
    currentModalId = null;
    setPaused(false);
}

function togglePause() {
    setPaused(!isPaused);
}

function setPaused(paused) {
    isPaused = paused;
    const btn = get('modal-pause');
    if (btn) {
        btn.textContent = isPaused ? "▶" : "⏸"; 
        btn.title = isPaused ? "Resume Live Updates" : "Pause Live Updates";
        if (paused) btn.classList.add('paused'); 
        else btn.classList.remove('paused');
    }
}

// --- Exports ---

export function isModalOpenFor(id) {
    const el = get('detail-modal');
    return el && !el.classList.contains('hidden') && currentModalId === id;
}

export function showDetails(deviceData) {
    const el = get('detail-modal');
    if (!el) return; // Exit if modal DOM doesn't exist

    const { id, name, rssi, raw } = deviceData;

    if (currentModalId !== id) {
        currentModalId = id;
        setPaused(false);
    } else {
        if (isPaused) return;
    }

    // Safe DOM Updates
    const titleEl = get('modal-title');
    if (titleEl) titleEl.textContent = name || 'Unknown Device';
    
    const idEl = get('modal-id');
    if (idEl) idEl.textContent = id;
    
    const rssiEl = get('modal-rssi');
    if (rssiEl) {
        rssiEl.textContent = rssi + ' dBm';
        rssiEl.style.color = 'var(--accent)';
        setTimeout(() => rssiEl.style.color = '', 200);
    }

    const txEl = get('modal-tx');
    if (txEl) txEl.textContent = (raw.txPower !== null && raw.txPower !== undefined) ? raw.txPower + ' dBm' : 'N/A';

    // UUIDs
    const uuidContainer = get('modal-uuids');
    if (uuidContainer) {
        const uuidList = raw.uuids || [];
        if (uuidList.length > 0) {
            uuidContainer.innerHTML = uuidList.map(u => `<div>• ${u}</div>`).join('');
        } else { uuidContainer.textContent = "None"; }
    }

    // Manufacturer Data
    const mfgContainer = get('modal-mfg');
    if (mfgContainer) {
        if (raw.manufacturerData && Object.keys(raw.manufacturerData).length > 0) {
            let html = '';
            // Handle Object (serialized) or Map (raw)
            const entries = raw.manufacturerData instanceof Map 
                ? raw.manufacturerData.entries() 
                : Object.entries(raw.manufacturerData);

            for (const [key, value] of entries) {
                 // Format key if it came from JSON object (already 0x...) or Map (needs formatting)
                const label = key.toString().startsWith('0x') 
                    ? key 
                    : '0x' + key.toString(16).toUpperCase().padStart(4, '0');
                
                // If value is still DataView, bufferToHex handles it. If string, print it.
                const valStr = typeof value === 'string' ? value : bufferToHex(value);
                html += `<div><strong>${label}:</strong> ${valStr}</div>`;
            }
            mfgContainer.innerHTML = html;
        } else { mfgContainer.textContent = "None"; }
    }

    // Service Data
    const svcContainer = get('modal-svc');
    if (svcContainer) {
        if (raw.serviceData && Object.keys(raw.serviceData).length > 0) {
            let html = '';
            const entries = raw.serviceData instanceof Map 
                ? raw.serviceData.entries() 
                : Object.entries(raw.serviceData);

            for (const [key, value] of entries) {
                const valStr = typeof value === 'string' ? value : bufferToHex(value);
                html += `<div><strong>${key}:</strong> ${valStr}</div>`;
            }
            svcContainer.innerHTML = html;
        } else { svcContainer.textContent = "None"; }
    }

    el.classList.remove('hidden');
}