import { EventBus, EVENTS } from './bus.js';
import { bufferToHex } from '../utils/helpers.js';

// Central State (Single Source of Truth)
const devices = new Map();

/**
 * Returns the current state map.
 * @returns {Map<string, Object>}
 */
export function getDevices() {
    return devices;
}

/**
 * Processes an incoming BLE packet, updates the state, and notifies listeners.
 * @param {Object} packet - The raw advertisement packet from the Provider.
 */
export function upsertDevice(packet) {
    const { device, rssi, txPower, uuids, manufacturerData, serviceData } = packet;
    const id = device.id;
    // Prefer existing name if new one is N/A, otherwise take new one
    const name = device.name || 'N/A';
    
    // 1. Serialize Raw Data (Rule: JSON-serializable Store)
    // Convert Maps of DataViews to Objects of Hex Strings
    const serializedRaw = {
        uuids: uuids || [],
        manufacturerData: serializeRawMap(manufacturerData, true),
        serviceData: serializeRawMap(serviceData, false),
        txPower
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
    } else {
        data.rssi = rssi;
        data.lastSeen = Date.now();
        data.raw = serializedRaw;
        // Update name if we found a better one
        if (name !== 'N/A') data.name = name;
    }
    
    // 3. Update Metrics
    data.stats.total++;
    data.stats.bucket++;

    // 4. Dispatch Event (Store -> UI)
    EventBus.dispatchEvent(new CustomEvent(EVENTS.DEVICE_UPDATED, { 
        detail: data 
    }));
}

/**
 * Helper to convert WebBluetooth Maps (key -> DataView) 
 * into JSON-friendly Objects (string -> hexString).
 */
function serializeRawMap(map, isManufacturer = false) {
    if (!map || map.size === 0) return {};
    
    const obj = {};
    map.forEach((dataView, key) => {
        // Manufacturer IDs are numbers (0xFFFF), Service UUIDs are strings
        const keyStr = isManufacturer 
            ? '0x' + key.toString(16).toUpperCase().padStart(4, '0') 
            : key;
            
        obj[keyStr] = bufferToHex(dataView);
    });
    return obj;
}

/**
 * Clear all devices from the store and notify listeners.
 */
export function clearDevices() {
    devices.clear();
    EventBus.dispatchEvent(new CustomEvent(EVENTS.RESET));
}