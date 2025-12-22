import { EventBus, EVENTS } from '../core/bus.js';
import { hexToDataView } from '../utils/raw.js';

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
        // Use an incremental scheduler to reduce memory usage and support pause/resume accurately.
        this._startTime = Date.now();
        this._index = 0;

        const scheduleNext = () => {
            if (!this.isRunning || this.paused) return;
            if (this._index >= this.packets.length) {
                if (this.loop && this.isRunning) {
                    // restart from beginning
                    this._index = 0;
                    this._startTime = Date.now();
                } else {
                    EventBus.dispatchEvent(new CustomEvent(EVENTS.SCAN_STATUS, { detail: { running: false, source: 'replay' } }));
                    this.isRunning = false;
                    return;
                }
            }

            const pkt = this.packets[this._index];
            const baseOffset = (this.packets[0].t || 0);
            const targetDelay = Math.max(0, ((pkt.t || 0) - baseOffset) / this.playbackRate);
            const nowOffset = Date.now() - this._startTime;
            const wait = Math.max(0, targetDelay - nowOffset);

            this._timerId = setTimeout(() => {
                if (!this.isRunning || this.paused) return;
                const normalized = this._normalizePacket(pkt);

                if (this.callback) this.callback(normalized);
                EventBus.dispatchEvent(new CustomEvent(EVENTS.ADVERTISEMENT, { detail: normalized }));

                this._index++;
                scheduleNext();
            }, wait);
        };

        scheduleNext();
    }

    /**
     * Stop playback
     */
    stop() {
        this.isRunning = false;
        this.paused = false;
        if (this._timerId) { clearTimeout(this._timerId); this._timerId = null; }
        this.timers = [];
    }

    pause() {
        if (!this.isRunning) return;
        this.paused = true;
        if (this._timerId) { clearTimeout(this._timerId); this._timerId = null; }
    }

    resume() {
        if (!this.isRunning || !this.paused) return;
        this.paused = false;
        // Resume from current index and adjust start time so offsets align
        this._startTime = Date.now() - ((this.packets[this._index] && this.packets[this._index].t) || 0) / this.playbackRate;
        // Continue scheduling
        const that = this;
        setTimeout(() => { if (that.isRunning && !that.paused) that._index = that._index || 0; that.start(that.callback, { playbackRate: that.playbackRate, loop: that.loop }); }, 0);
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

