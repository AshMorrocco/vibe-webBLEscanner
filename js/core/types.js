/**
 * @typedef {Object} DeviceStats
 * @property {number} total - Total number of advertisement packets received.
 * @property {number} bucket - Number of packets received in the current calculation interval.
 * @property {number} rate - Calculated packets per second (Ads/s).
 * @property {number} rssiMin - Minimum RSSI value observed for this device.
 * @property {number} rssiMax - Maximum RSSI value observed for this device.
 */

/**
 * @typedef {Object} DeviceRawData
 * @property {string[]} uuids - List of Service UUIDs advertised.
 * @property {Map<number, DataView>} manufacturerData - Manufacturer specific data map.
 * @property {Map<string, DataView>} serviceData - Service data map.
 * @property {number|null} txPower - Transmission power level (if available).
 */

/**
 * @typedef {Object} DeviceU1
 * @property {Array<{t:number,mv:number,percent:number}>} battery - Time series of battery readings.
 * @property {Array<{t:number,active:boolean,countdown:number}>} motion - Time series of motion/trigger events.
 */

/**
 * @typedef {Object} Device
 * @property {string} id - The unique Bluetooth Device ID.
 * @property {string} name - The device name (or 'N/A' if not advertised).
 * @property {number} rssi - The latest Signal Strength in dBm.
 * @property {number} lastSeen - Timestamp (ms) of the last packet received.
 * @property {DeviceStats} stats - Reception statistics for rate calculation.
 * @property {DeviceRawData} raw - Raw Bluetooth advertising data.
 * @property {DeviceU1} [u1] - Parsed U1 protocol data (if available) including history arrays.
 */