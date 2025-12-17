import * as Card from './modules/card.js';
import * as Modal from './modules/modal.js';
import * as Controls from './modules/controls.js';

const grid = document.getElementById('device-grid');

// --- Re-Exports ---
export const updateCard = Card.updateCard;
export const updateRateBadge = Card.updateRateBadge;
export const showDetails = Modal.showDetails;
export const isModalOpenFor = Modal.isModalOpenFor;
export const setUIState = Controls.setUIState;
export const enableTestModeUI = Controls.enableTestModeUI;
export const getFilterConfig = Controls.getFilterConfig;

/**
 * Binds DOM events for filtering/sorting inputs.
 */
export function bindInputEvents(callback) {
    const inputs = ['rssi-slider', 'filter-text', 'filter-type', 'sort-type'];
    
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        const type = (id.includes('text') || id.includes('slider')) ? 'input' : 'change';
        
        el.addEventListener(type, (e) => {
            if (id === 'rssi-slider') {
                const label = document.getElementById('rssi-val');
                if (label) label.textContent = e.target.value;
            }
            callback(); 
        });
    });

    const sortBtn = document.getElementById('sort-order');
    if (sortBtn) {
        sortBtn.addEventListener('click', () => {
            Controls.toggleSortOrder(); 
            callback(); 
        });
    }
}

/**
 * Binds clicks on the Grid to a callback (Event Delegation).
 */
export function bindCardClick(onCardClick) {
    if (grid) {
        grid.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            if (card && card.id) {
                onCardClick(card.id);
            }
        });
    }
}

/**
 * Renders the device list using Lazy Sorting to prevent click-thrashing.
 */
export function render(deviceList) {
    const visibleIds = new Set(deviceList.map(d => d.id));

    // 1. Manage Visibility 
    // We iterate over the REAL DOM children to hide/show them.
    if(grid) {
        Array.from(grid.children).forEach(card => {
            if (visibleIds.has(card.id)) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }

    // 2. Manage Order (Smart Reorder)
    // Only move elements if they are out of place. This preserves click events.
    let predecessor = null;

    deviceList.forEach(device => {
        const card = document.getElementById(device.id);
        if (!card) return;

        if (predecessor === null) {
            // This card should be the very first child
            if (grid.firstElementChild !== card) {
                grid.prepend(card);
            }
        } else {
            // This card should follow the predecessor.
            // checking 'nextElementSibling' ensures we only move it if it's not already there.
            if (predecessor.nextElementSibling !== card) {
                predecessor.after(card);
            }
        }
        predecessor = card;
    });
}