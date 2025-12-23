// NOTE: helper functions moved to `js/utils/raw.js` to centralize raw-data conversion utilities.
// Kept this file as a tiny shim for backward compatibility.
import { bufferToHex as _bufferToHex } from './raw.js';

/**
 * shim--for legacy imports, re-export from raw.js
 */
export function bufferToHex(dataView) {
    return _bufferToHex(dataView);
}

/**
 * Detects the device type from raw BLE advertising data.
 * Returns an object with type and optional battery info.
 * @param {Object} device - Device object with raw data and u1 fields
 * @returns {Object} { type: string, battery?: number }
 */
export function detectDeviceType(device) {
    if (!device) return { type: 'Unknown' };

    // Check for U1 beacon (battery data available)
    if (device.u1 && device.u1.battery && device.u1.battery.length > 0) {
        const latestBattery = device.u1.battery[device.u1.battery.length - 1];
        return {
            type: 'U1 Beacon',
            battery: latestBattery
        };
    }

    const raw = device.raw || {};
    const serviceUuids = raw.uuids || [];
    const manufacturerData = raw.manufacturerData || {};

    // Check common manufacturer IDs
    const manufacturerIds = Object.keys(manufacturerData);
    
    // Apple (iBeacon, AirPods, etc.)
    if (manufacturerIds.includes('0x004c') || manufacturerIds.includes('4c')) {
        // Could be AirPods, Apple Watch, etc. - just label as Apple device
        return { type: 'Apple Device' };
    }

    // Google/Pixel
    if (manufacturerIds.includes('0x00e0') || manufacturerIds.includes('e0')) {
        return { type: 'Google Device' };
    }

    // Microsoft
    if (manufacturerIds.includes('0x0006') || manufacturerIds.includes('6')) {
        return { type: 'Microsoft Device' };
    }

    // Check for common service UUIDs
    const uuidStr = serviceUuids.join(' ').toLowerCase();
    
    // Audio (Headphones, Speakers)
    if (uuidStr.includes('180a') || uuidStr.includes('180d')) {
        return { type: 'Audio Device' };
    }

    // HID (Mouse, Keyboard, Gamepad)
    if (uuidStr.includes('1812')) {
        return { type: 'Input Device' };
    }

    // Generic 
    return { type: 'Device' };
}