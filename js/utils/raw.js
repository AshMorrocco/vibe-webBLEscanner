/**
 * Helpers for converting between DataView <-> hex strings and serializing raw maps
 */

/**
 * Converts a DataView (standard in Web Bluetooth API) to a hex string.
 * @param {DataView} dataView
 * @returns {string} Space-separated hex string (e.g., "0A FF 10")
 */
export function bufferToHex(dataView) {
    if (!dataView || !dataView.buffer) return '';
    return [...new Uint8Array(dataView.buffer)]
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
}

/**
 * Converts a space-separated hex string into a DataView
 * @param {string} hexStr
 * @returns {DataView}
 */
export function hexToDataView(hexStr) {
    if (!hexStr || typeof hexStr !== 'string') return new DataView(new ArrayBuffer(0));
    const bytes = hexStr.split(/\s+/).filter(Boolean).map(h => parseInt(h, 16) || 0);
    return new DataView(new Uint8Array(bytes).buffer);
}

/**
 * Serialize a Map (key -> DataView) into an object of hex strings.
 * If isManufacturer is true, keys are formatted as 0xFFFF.
 */
export function serializeRawMap(map, isManufacturer = false) {
    if (!map || map.size === 0) return {};
    const obj = {};
    map.forEach((dataView, key) => {
        const keyStr = isManufacturer ? ('0x' + Number(key).toString(16).toUpperCase().padStart(4, '0')) : key;
        obj[keyStr] = bufferToHex(dataView);
    });
    return obj;
}

/**
 * Parse a serialized raw object (key-> hex string) into a Map(key->DataView)
 */
export function parseRawObject(obj, isManufacturer = false) {
    const map = new Map();
    Object.entries(obj || {}).forEach(([key, value]) => {
        try {
            const dv = hexToDataView(value);
            if (isManufacturer) {
                const numKey = key.toString().startsWith('0x') ? parseInt(key, 16) : Number(key);
                map.set(numKey, dv);
            } else {
                map.set(key, dv);
            }
        } catch (e) {
            // ignore invalid data
        }
    });
    return map;
}

/**
 * Helper to sanitize a device.id to a safe DOM id (alphanumeric + hyphen/underscore)
 * If the id is falsy, a deterministic fallback is used.
 */
export function toSafeId(deviceId) {
    if (!deviceId) return 'device-unknown';
    // Replace unsafe characters with '-'
    return ('device-' + String(deviceId)).replace(/[^a-zA-Z0-9-_]/g, '-');
}
