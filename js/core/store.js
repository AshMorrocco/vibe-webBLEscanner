import { EventBus, EVENTS } from './bus.js';
import { serializeRawMap } from '../utils/raw.js';

// Central State (Single Source of Truth)
const devices = new Map();

/**
 * Returns the current state map.
 * @returns {Map<string, Object>}
 */
export function getDevices() {
    // Return a shallow copy snapshot to avoid accidental external mutation.
    return new Map(devices);
}

export function getDeviceById(id) {
    // Return a shallow clone of the device object (defensive copy)
    const d = devices.get(id);
    return d ? JSON.parse(JSON.stringify(d)) : null;
}

/**
 * Processes an incoming BLE packet, updates the state, and notifies listeners.
 * @param {Object} packet - The raw advertisement packet from the Provider.
 */
export function upsertDevice(packet) {
    try {
        // Diagnostic: log incoming packet shape to help test failures
        console.debug('[Store] upsertDevice called', packet);

        const { device, rssi, txPower, uuids, manufacturerData, serviceData } = packet || {};
        if (!device || !device.id) {
            console.warn('[Store] upsertDevice ignored malformed packet (missing device/id)', packet);
            return;
        }

        const id = device.id;
        // Prefer existing name if new one is N/A, otherwise take new one
        const name = device.name || 'N/A';
        
        // 1. Serialize Raw Data (Rule: JSON-serializable Store)
        // Convert Maps of DataViews to Objects of Hex Strings
        const serializedRaw = {
            uuids: uuids || [],
            manufacturerData: serializeRawMap(manufacturerData, true),
            serviceData: serializeRawMap(serviceData, false),
            // Some platforms use -128 as a sentinel (int8 min) when Tx Power is unknown.
            // Normalize that to null so UI can display "N/A" instead of a misleading -128 dBm.
            txPower: (typeof txPower === 'number' && txPower !== -128) ? txPower : null
        }; 

        // 2. Update State
        let data = devices.get(id);
        if (!data) {
            data = { 
                id, 
                name, 
                rssi, 
                lastSeen: Date.now(), 
                stats: { total: 0, bucket: 0, rate: 0 },
                raw: serializedRaw
            };
            devices.set(id, data);
            console.debug('[Store] new device added', id);
        } else {
            data.rssi = rssi;
            data.lastSeen = Date.now();
            data.raw = serializedRaw;
            // Update name if we found a better one
            if (name !== 'N/A') data.name = name;
            console.debug('[Store] device updated', id);
        }
        
        // 3. Update Metrics
        data.stats.total++;
        data.stats.bucket++;

        // 4. Dispatch Event (Store -> UI) — send a defensive copy
        const payload = JSON.parse(JSON.stringify(data));
        console.debug('[Store] dispatching DEVICE_UPDATED', payload);
        EventBus.dispatchEvent(new CustomEvent(EVENTS.DEVICE_UPDATED, { 
            detail: payload 
        }));
    } catch (e) {
        console.error('[Store] upsertDevice error', e);
        throw e;
    }
}

// Helper moved to `js/utils/raw.js` and is imported above as `serializeRawMap`.

/**
 * Clear all devices from the store and notify listeners.
 */
export function clearDevices() {
    devices.clear();
    EventBus.dispatchEvent(new CustomEvent(EVENTS.RESET));
}