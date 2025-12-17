/**
 * Converts a DataView (standard in Web Bluetooth API) to a hex string.
 * @param {DataView} dataView 
 * @returns {string} Space-separated hex string (e.g., "0A FF 10")
 */
export function bufferToHex(dataView) {
    return [...new Uint8Array(dataView.buffer)]
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
}