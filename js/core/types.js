/**
 * @typedef {Object} DeviceStats
 * @property {number} total - Total number of advertisement packets received.
 * @property {number} bucket - Number of packets received in the current calculation interval.
 * @property {number} rate - Calculated packets per second (Ads/s).
 */

/**
 * @typedef {Object} DeviceRawData
 * @property {string[]} uuids - List of Service UUIDs advertised.
 * @property {Map<number, DataView>} manufacturerData - Manufacturer specific data map.
 * @property {Map<string, DataView>} serviceData - Service data map.
 * @property {number|null} txPower - Transmission power level (if available).
 */

/**
 * @typedef {Object} Device
 * @property {string} id - The unique Bluetooth Device ID.
 * @property {string} name - The device name (or 'N/A' if not advertised).
 * @property {number} rssi - The latest Signal Strength in dBm.
 * @property {number} lastSeen - Timestamp (ms) of the last packet received.
 * @property {DeviceStats} stats - Reception statistics for rate calculation.
 * @property {DeviceRawData} raw - Raw Bluetooth advertising data.
 */