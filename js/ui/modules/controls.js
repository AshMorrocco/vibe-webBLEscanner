const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const statusBadge = document.getElementById('status');
const sortBtn = document.getElementById('sort-order');

// Inputs
const slider = document.getElementById('rssi-slider');
const txt = document.getElementById('filter-text');
const filterType = document.getElementById('filter-type');
const sortType = document.getElementById('sort-type');

/**
 * Toggles the sort order button UI (Arrow icon and data attribute).
 */
export function toggleSortOrder() {
    if (!sortBtn) return;
    const current = sortBtn.getAttribute('data-dir') || 'desc';
    const newDir = current === 'desc' ? 'asc' : 'desc';
    
    sortBtn.textContent = newDir === 'desc' ? '⬇' : '⬆';
    sortBtn.setAttribute('data-dir', newDir);
}

/**
 * Returns the current configuration based on DOM input values.
 */
export function getFilterConfig() {
    return {
        minRssi: slider ? parseInt(slider.value) : -100,
        filterText: txt ? txt.value : '',
        filterType: filterType ? filterType.value : 'name',
        sortType: sortType ? sortType.value : 'rssi',
        sortOrder: sortBtn ? (sortBtn.getAttribute('data-dir') || 'desc') : 'desc'
    };
}

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