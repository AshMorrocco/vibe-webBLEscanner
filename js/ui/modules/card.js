import { toSafeId } from '../../utils/raw.js';
import { detectDeviceType } from '../../utils/helpers.js';

/**
 * Renders/Updates a single device card with device type and RSSI bar showing min/max zones.
 * Null-safe: Checks if the grid and card elements exist before writing.
 */
export function updateCard(id, name, rssi, stats, device = null) {
    // Schedule UI update for the next animation frame
    requestAnimationFrame(() => {
        const grid = document.getElementById('device-grid');
        // GUARD: If the grid view isn't active, do nothing
        if (!grid) return;

        // Use safe id when querying the DOM
        const safeId = toSafeId(id);
        let card = document.getElementById(safeId);
        
        // A. Create Card (First time only)
        if (!card) {
            card = document.createElement('div');
            card.id = safeId;
            card.dataset.deviceId = id; // keep original id for lookup
            card.className = 'card';
            card.innerHTML = `
                <div class="card-header">
                    <span class="device-name"></span>
                    <span class="packet-count"></span>
                </div>
                <div class="card-type"></div>
                <div class="rssi-container">
                    <div class="meter">
                        <div class="rssi-zone-below"></div>
                        <div class="rssi-zone-range"></div>
                        <div class="rssi-zone-above"></div>
                    </div>
                    <div class="rssi-text"></div>
                </div>`;
            grid.appendChild(card);
        }
        
        // B. Select specific elements
        const nameEl = card.querySelector('.device-name');
        const countEl = card.querySelector('.packet-count');
        const typeEl = card.querySelector('.card-type');
        const belowEl = card.querySelector('.rssi-zone-below');
        const rangeEl = card.querySelector('.rssi-zone-range');
        const aboveEl = card.querySelector('.rssi-zone-above');
        const rssiEl = card.querySelector('.rssi-text');

        // C. Calculate Visuals
        // Convert RSSI (-100 to 0) to percentage (0 to 100)
        const rssiMin = stats.rssiMin ?? -100;
        const rssiMax = stats.rssiMax ?? 0;
        const percent = Math.min(Math.max((rssi + 100) * 1.5, 0), 100);
        
        // Calculate zone widths (each zone is a percentage of the full bar)
        const minPercent = Math.min(Math.max((rssiMin + 100) * 1.5, 0), 100);
        const maxPercent = Math.min(Math.max((rssiMax + 100) * 1.5, 0), 100);

        // D. Apply Updates (Safe Checks)
        if (nameEl && nameEl.textContent !== name) nameEl.textContent = name;
        
        if (countEl) {
            if (!countEl.id) countEl.id = `badge-${safeId}`;
            countEl.textContent = `Rx: ${stats.total} | ${stats.rate}/s`;
        }

        // Update device type display with optional battery info
        if (typeEl && device) {
            const typeInfo = detectDeviceType(device);
            let typeContent = typeInfo.type;
            if (typeInfo.battery) {
                const batteryPct = Math.round(typeInfo.battery.percent);
                typeContent += ` · ${batteryPct}%`;
            }
            typeEl.textContent = typeContent;
        }

        // Update RSSI bar zones
        if (belowEl) {
            belowEl.style.width = `${minPercent}%`;
            belowEl.style.opacity = '1';
        }
        if (rangeEl) {
            rangeEl.style.width = `${Math.max(0, maxPercent - minPercent)}%`;
            rangeEl.style.opacity = '0.6';
        }
        if (aboveEl) {
            aboveEl.style.width = `${Math.max(0, 100 - maxPercent)}%`;
            aboveEl.style.opacity = '0.15';
        }
        if (rssiEl) rssiEl.textContent = `${rssi} dBm (Δ ${Math.abs(rssiMax - rssiMin)})`;

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
        const badge = document.getElementById(`badge-${toSafeId(id)}`);
        if (badge) badge.textContent = `Rx: ${total} | ${rate}/s`;
    });
}