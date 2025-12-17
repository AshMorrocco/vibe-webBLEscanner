/**
 * Central Event Bus for the application.
 * Replaces direct function calls with a Pub/Sub model.
 */
export const EventBus = new EventTarget();

export const EVENTS = {
    ADVERTISEMENT: 'advertisement',   // Raw BLE packet received (Source -> Store)
    DEVICE_UPDATED: 'device-updated', // Processed device state (Store -> UI)
    SCAN_STATUS: 'scan-status',       // Scanning state changed (App -> UI)
    RESET: 'reset'                    // Clear data requested
};