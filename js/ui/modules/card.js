const grid = document.getElementById('device-grid');

export function updateCard(id, name, rssi, stats) {
    // 1. Schedule UI update for the next animation frame
    // This prevents blocking the main thread (user clicks) with DOM writes
    requestAnimationFrame(() => {
        let card = document.getElementById(id);
        
        // A. Create Card (First time only)
        if (!card) {
            card = document.createElement('div');
            card.id = id;
            card.className = 'card';
            // Create the skeleton ONCE. We will never overwrite .innerHTML again.
            card.innerHTML = `
                <div class="card-header">
                    <span class="device-name"></span>
                    <span class="packet-count"></span>
                </div>
                <div class="card-center">${id}</div>
                <div class="rssi-container">
                    <div class="meter"><div class="fill"></div></div>
                    <div class="rssi-text"></div>
                </div>`;
            if(grid) grid.appendChild(card);
        }
        
        // B. Select specific elements (Granular updates)
        const nameEl = card.querySelector('.device-name');
        const countEl = card.querySelector('.packet-count');
        const fillEl = card.querySelector('.fill');
        const rssiEl = card.querySelector('.rssi-text');

        // C. Calculate Visuals
        const percent = Math.min(Math.max((rssi + 100) * 1.5, 0), 100);

        // D. Apply Text/Style Updates (Only if changed)
        if (nameEl.textContent !== name) nameEl.textContent = name;
        
        // Helper to preserve the badge ID if it was set externally or previously
        if (!countEl.id) countEl.id = `badge-${id}`;
        countEl.textContent = `Rx: ${stats.total} | ${stats.rate}/s`;

        fillEl.style.width = `${percent}%`;
        rssiEl.textContent = `${rssi} dBm`;

        // E. The Fix: Non-blocking Flash Animation
        // Instead of forcing a reflow (offsetWidth), we simply add the class.
        // If it's already there, we do nothing. The timeout handles the removal.
        if (!card.classList.contains('fresh')) {
            card.classList.add('fresh');
            // Remove it after 200ms to allow it to be triggered again later
            setTimeout(() => {
                if(card) card.classList.remove('fresh');
            }, 200);
        }
    });
}

export function updateRateBadge(id, total, rate) {
    // Also wrap in rAF for consistency
    requestAnimationFrame(() => {
        const badge = document.getElementById(`badge-${id}`);
        if (badge) badge.textContent = `Rx: ${total} | ${rate}/s`;
    });
}