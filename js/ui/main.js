import { EventBus, EVENTS } from '../core/bus.js';
import * as Store from '../core/store.js';
import { getSortedAndFilteredList } from '../logic/filter.js';
import * as Card from './modules/card.js';
import * as Modal from './modules/modal.js';
import * as Controls from './modules/controls.js';
import { toSafeId } from '../utils/raw.js';

const grid = document.getElementById('device-grid');

// --- Exports (Preserve API for now) ---
export const updateCard = Card.updateCard;
export const updateRateBadge = Card.updateRateBadge;
export const showDetails = Modal.showDetails;
export const isModalOpenFor = Modal.isModalOpenFor;
export const setUIState = Controls.setUIState;
export const enableTestModeUI = Controls.enableTestModeUI;
export const getFilterConfig = Controls.getFilterConfig;

// --- 1. Event Subscription (Decoupling) ---
// The UI now listens for changes directly. app.js triggers the update in Store, 
// Store fires event, UI updates itself.
EventBus.addEventListener(EVENTS.DEVICE_UPDATED, (event) => {
    const device = event.detail;

    // A. Visual Update (Granular)
    Card.updateCard(device.id, device.name, device.rssi, device.stats);

    // B. List Order Update (Full Refresh)
    // We only re-sort/filter if the Grid exists
    refreshGrid();

    // C. Modal Update (Live)
    if (Modal.isModalOpenFor(device.id)) {
        // Modal expects full device data object; pass a defensive copy
        Modal.showDetails(JSON.parse(JSON.stringify(device)));
    }
});

// Clear UI when store is reset
EventBus.addEventListener(EVENTS.RESET, () => {
    const gridEl = document.getElementById('device-grid');
    if (gridEl) gridEl.innerHTML = '';
});

function refreshGrid() {
    const gridEl = document.getElementById('device-grid');
    if (!gridEl) return; // Null Safety: Don't run logic if view is missing

    const config = Controls.getFilterConfig();
    const devicesMap = Store.getDevices();
    const sortedList = getSortedAndFilteredList(devicesMap, config);
    render(sortedList);
}

// --- 2. Input Binding ---
export function bindInputEvents(callback) {
    const inputs = ['rssi-slider', 'filter-text', 'filter-type', 'sort-type'];
    
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return; // Null Safety

        const type = (id.includes('text') || id.includes('slider')) ? 'input' : 'change';
        
        el.addEventListener(type, (e) => {
            if (id === 'rssi-slider') {
                const label = document.getElementById('rssi-val');
                if (label) label.textContent = e.target.value;
            }
            // Trigger refresh immediately on input
            refreshGrid();
            if (callback) callback(); 
        });
    });

    const sortBtn = document.getElementById('sort-order');
    if (sortBtn) {
        sortBtn.addEventListener('click', () => {
            Controls.toggleSortOrder(); 
            refreshGrid();
            if (callback) callback();
        });
    }
}

// --- 3. Click Binding ---
export function bindCardClick(onCardClick) {
    const gridEl = document.getElementById('device-grid');
    if (gridEl) {
        gridEl.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            if (card && card.dataset && card.dataset.deviceId) {
                onCardClick(card.dataset.deviceId);
            }
        });
    }
}

// --- 4. Rendering Logic ---
export function render(deviceList) {
    const gridEl = document.getElementById('device-grid');
    if (!gridEl) return;

    const visibleIds = new Set(deviceList.map(d => d.id));

    // Manage Visibility
    Array.from(gridEl.children).forEach(card => {
        const deviceId = card.dataset && card.dataset.deviceId;
        if (deviceId && visibleIds.has(deviceId)) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });

    // Manage Order (Smart Reorder)
    let predecessor = null;

    deviceList.forEach(device => {
        const card = document.getElementById(toSafeId(device.id));
        if (!card) return;

        if (predecessor === null) {
            if (gridEl.firstElementChild !== card) {
                gridEl.prepend(card);
            }
        } else {
            if (predecessor.nextElementSibling !== card) {
                predecessor.after(card);
            }
        }
        predecessor = card;
    });
}

// --- 5. Compatibility Warning ---
export function showWarning(message, fixInstructions = null) {
    const banner = document.getElementById('compat-warning');
    const msgEl = document.getElementById('compat-message');
    const fixEl = document.getElementById('compat-fix');
    
    if (!banner) return;

    msgEl.textContent = message;
    
    if (fixInstructions) {
        fixEl.textContent = fixInstructions;
        fixEl.style.display = 'block';
    } else {
        fixEl.style.display = 'none';
    }

    banner.classList.remove('hidden');
}

export function hideWarning() {
    const banner = document.getElementById('compat-warning');
    if (banner) banner.classList.add('hidden');
}