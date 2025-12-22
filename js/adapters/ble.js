import { EventBus, EVENTS } from '../core/bus.js';

/**
 * Adapter for live Web Bluetooth scanning.
 */
export class LiveProvider {
    constructor() {
        this.scan = null;
        this.listener = null;
    }

    /**
     * Checks if the browser environment supports the required features.
     * @returns {Object} { ok: boolean, error: string, fix: string }
     */
    static checkSupport() {
        // 1. Check Basic Bluetooth Support
        if (!navigator.bluetooth) {
            return {
                ok: false,
                error: "Web Bluetooth API is not available in this browser.",
                fix: "Please use Chrome, Edge, or Opera on Desktop or Android."
            };
        }

        // 2. Check for Passive Scan capability (Requires the Flag)
        if (typeof navigator.bluetooth.requestLEScan !== 'function') {
            return {
                ok: false,
                error: "Passive BLE Scanning is disabled.",
                fix: "Go to chrome://flags/#enable-experimental-web-platform-features and set it to Enabled."
            };
        }

        return { ok: true };
    }
    
    /**
     * Starts the Bluetooth scan.
     * @param {Function} [callback] - Optional callback for direct data handling.
     */
    async start(callback = null) {
        if (!navigator.bluetooth) throw new Error("Bluetooth not supported");

        try {
            // Force picker to wake up radio (User Interaction required)
            await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
        } catch (e) { 
            // User cancelling the picker is expected/fine
        }

        // Start passive scan
        try {
            this.scan = await navigator.bluetooth.requestLEScan({
                acceptAllAdvertisements: true,
                keepRepeatedDevices: true
            });
        } catch (e) {
            // Fail cleanly and provide a helpful message
            this.scan = null;
            // Keep behavior consistent: don't leave listeners attached
            if (this.listener) {
                try { navigator.bluetooth.removeEventListener('advertisementreceived', this.listener); } catch (er) {}
                this.listener = null;
            }
            throw new Error('Passive BLE scanning failed or was blocked (requestLEScan). Ensure you permitted Bluetooth access and enabled experimental features. (' + (e.message || e) + ')');
        }

        // Handler
        this.listener = (event) => {
            // Option 1: Dispatch to global bus (Decoupled)
            EventBus.dispatchEvent(new CustomEvent(EVENTS.ADVERTISEMENT, { 
                detail: event 
            }));

            // Option 2: Direct callback (Coupled, for App controller)
            if (callback) callback(event);
        };

        navigator.bluetooth.addEventListener('advertisementreceived', this.listener);
    }

    stop() {
        if (this.scan) {
            try { this.scan.stop(); } catch (e) {}
        }
        if (this.listener) {
            navigator.bluetooth.removeEventListener('advertisementreceived', this.listener);
            this.listener = null;
        }
        this.scan = null;
    }
}