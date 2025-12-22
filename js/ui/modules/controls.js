const scanBtn = document.getElementById('btn-scan-toggle');
const recordBtn = document.getElementById('btn-record-toggle');
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
    // Toggle scan button label instead of enabling/disabling separate start/stop buttons
    if (scanBtn) {
        if (running) {
            scanBtn.textContent = 'Stop scanning';
            scanBtn.disabled = false;
        } else {
            scanBtn.textContent = 'Start scanning';
            scanBtn.disabled = false;
        }
    }

    // Only allow recording when scanning is active
    if (recordBtn) {
        recordBtn.disabled = !running;
    }

    if(!isTestMode && statusBadge) {
        if (running) {
            statusBadge.textContent = "Scanning Active";
            statusBadge.classList.add("active");
        } else {
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