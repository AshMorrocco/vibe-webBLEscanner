import { EventBus, EVENTS } from '../core/bus.js';

/**
 * ReplayProvider
 * - Load a session JSON (packets with relative timestamps `t` in ms)
 * - Schedule packets using setTimeout preserving timing (playbackRate)
 * - Emit packets via EventBus and optional callback to match LiveProvider usage
 */
export class ReplayProvider {
    constructor() {
        this.packets = [];
        this.timers = [];
        this.isRunning = false;
        this.callback = null;
        this.playbackRate = 1.0;
        this.loop = false;
        this.paused = false;
    }

    /**
     * Load session data from a parsed JSON object
     * @param {Object} json
     */
    loadFromJSON(json) {
        if (!json || !Array.isArray(json.packets)) throw new Error('Invalid replay JSON');
        // Ensure packets sorted by t
        this.packets = json.packets.slice().sort((a, b) => (a.t || 0) - (b.t || 0));
        return Promise.resolve();
    }

    /**
     * Read a File object (from file input) and load JSON
     * @param {File} file
     */
    loadFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const json = JSON.parse(reader.result);
                    this.loadFromJSON(json);
                    resolve();
                } catch (e) { reject(e); }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    /**
     * Start playback
     * @param {Function|null} callback - Optional callback used by app.js to pipe packets into Store
     * @param {Object} options - { playbackRate, loop }
     */
    async start(callback = null, { playbackRate = 1.0, loop = false } = {}) {
        if (!this.packets || this.packets.length === 0) throw new Error('No replay data loaded');
        this.stop(); // clear previous timers
        this.callback = callback;
        this.playbackRate = playbackRate;
        this.loop = loop;
        this.isRunning = true;
        this.paused = false;

        // Notify listeners that replay scanning has started
        EventBus.dispatchEvent(new CustomEvent(EVENTS.SCAN_STATUS, { detail: { running: true, source: 'replay' } }));

        const baseT = this.packets[0].t || 0;
        // Schedule all packets relative to now
        for (let i = 0; i < this.packets.length; i++) {
            const pkt = this.packets[i];
            const delay = Math.max(0, ((pkt.t || 0) - baseT) / this.playbackRate);
            const timer = setTimeout(() => {
                if (!this.isRunning || this.paused) return;
                const normalized = this._normalizePacket(pkt);

                // Call optional callback (app.js passes Store.upsertDevice)
                if (this.callback) this.callback(normalized);

                // Dispatch to EventBus for decoupled consumers
                EventBus.dispatchEvent(new CustomEvent(EVENTS.ADVERTISEMENT, { detail: normalized }));

                // If finished and loop requested, restart
                if (i === this.packets.length - 1) {
                    if (this.loop && this.isRunning) {
                        // small tick before restarting to avoid stack growth
                        setTimeout(() => { if (this.isRunning) this.start(this.callback, { playbackRate: this.playbackRate, loop: this.loop }); }, 0);
                    } else {
                        // Playback completed (no loop): notify listeners that scanning stopped
                        EventBus.dispatchEvent(new CustomEvent(EVENTS.SCAN_STATUS, { detail: { running: false, source: 'replay' } }));
                        // Mark not running to be safe
                        this.isRunning = false;
                    }
                }
            }, delay);
            this.timers.push(timer);
        }
    }

    /**
     * Stop playback
     */
    stop() {
        this.isRunning = false;
        this.paused = false;
        this.timers.forEach(t => clearTimeout(t));
        this.timers = [];
    }

    pause() {
        if (!this.isRunning) return;
        this.paused = true;
        this.timers.forEach(t => clearTimeout(t));
        this.timers = [];
    }

    resume() {
        if (!this.isRunning || !this.paused) return;
        this.paused = false;
        // Simple resume: restart playback from the beginning
        // (could be enhanced to remember offset)
        this.start(this.callback, { playbackRate: this.playbackRate, loop: this.loop });
    }

    // --- Helpers ---
    _normalizePacket(pkt) {
        const device = pkt.device || { id: 'UNKNOWN' };
        const rssi = pkt.rssi;
        // Normalize sentinel -128 to null to indicate unknown/absent Tx Power
        const txPower = (typeof pkt.txPower === 'number' && pkt.txPower !== -128) ? pkt.txPower : null;
        const uuids = pkt.uuids || [];

        const manufacturerData = this._parseRawMap(pkt.manufacturerData || {} , true);
        const serviceData = this._parseRawMap(pkt.serviceData || {} , false);

        return { device, rssi, txPower, uuids, manufacturerData, serviceData };
    }

    _parseRawMap(obj, isManufacturer = false) {
        // Input: object mapping keys -> hex strings
        // Output: Map (like Web Bluetooth) mapping number->DataView (manufacturer) or string->DataView (service)
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
                console.warn('Invalid hex value in replay packet for key', key, e);
            }
        });
        return map;
    }
}

function hexToDataView(hexStr) {
    if (!hexStr || typeof hexStr !== 'string') return new DataView(new ArrayBuffer(0));
    const bytes = hexStr.split(/\s+/).filter(Boolean).map(h => parseInt(h, 16));
    return new DataView(new Uint8Array(bytes).buffer);
}