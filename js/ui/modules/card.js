/**
 * Renders/Updates a single device card.
 * Null-safe: Checks if the grid and card elements exist before writing.
 */
export function updateCard(id, name, rssi, stats) {
    // Schedule UI update for the next animation frame
    requestAnimationFrame(() => {
        const grid = document.getElementById('device-grid');
        // GUARD: If the grid view isn't active, do nothing
        if (!grid) return;

        let card = document.getElementById(id);
        
        // A. Create Card (First time only)
        if (!card) {
            card = document.createElement('div');
            card.id = id;
            card.className = 'card';
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
            grid.appendChild(card);
        }
        
        // B. Select specific elements
        const nameEl = card.querySelector('.device-name');
        const countEl = card.querySelector('.packet-count');
        const fillEl = card.querySelector('.fill');
        const rssiEl = card.querySelector('.rssi-text');

        // C. Calculate Visuals
        const percent = Math.min(Math.max((rssi + 100) * 1.5, 0), 100);

        // D. Apply Updates (Safe Checks)
        if (nameEl && nameEl.textContent !== name) nameEl.textContent = name;
        
        if (countEl) {
            if (!countEl.id) countEl.id = `badge-${id}`;
            countEl.textContent = `Rx: ${stats.total} | ${stats.rate}/s`;
        }

        if (fillEl) fillEl.style.width = `${percent}%`;
        if (rssiEl) rssiEl.textContent = `${rssi} dBm`;

        // E. Flash Animation
        if (!card.classList.contains('fresh')) {
            card.classList.add('fresh');
            setTimeout(() => {
                if(card) card.classList.remove('fresh');
            }, 200);
        }
    });
}

export function updateRateBadge(id, total, rate) {
    requestAnimationFrame(() => {
        const badge = document.getElementById(`badge-${id}`);
        if (badge) badge.textContent = `Rx: ${total} | ${rate}/s`;
    });
}