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
        this.scan = await navigator.bluetooth.requestLEScan({
            acceptAllAdvertisements: true,
            keepRepeatedDevices: true
        });

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