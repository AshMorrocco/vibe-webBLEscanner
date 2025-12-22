import { EventBus, EVENTS } from '../core/bus.js';
import { bufferToHex, serializeRawMap } from '../utils/raw.js';

/**
 * Simple Recorder for capturing advertisement events and exporting as replay JSON.
 */
export class Recorder {
    constructor() {
        this.records = [];
        this.startTs = 0;
        this.listener = null;
        this.isRecording = false;
        this.maxRecords = 10000; // Safety cap to prevent unbounded memory growth
        this.truncated = false;
    }

    start() {
        if (this.isRecording) return;
        this.records = [];
        this.startTs = Date.now();
        this.isRecording = true;

        this.listener = (event) => {
            const pkt = event.detail || {};
            const t = Date.now() - this.startTs;

            const record = {
                t,
                device: { id: pkt.device && pkt.device.id, name: pkt.device && pkt.device.name },
                rssi: pkt.rssi,
                txPower: pkt.txPower,
                uuids: pkt.uuids ? (Array.isArray(pkt.uuids) ? pkt.uuids : Array.from(pkt.uuids)) : [],
                manufacturerData: this._serializeMapOrObj(pkt.manufacturerData, true),
                serviceData: this._serializeMapOrObj(pkt.serviceData, false)
            };

            if (this.records.length >= this.maxRecords) {
                if (!this.truncated) {
                    console.warn('Recorder: maxRecords reached, further packets will be dropped');
                    this.truncated = true;
                }
                return;
            }
            this.records.push(record);
        };

        EventBus.addEventListener(EVENTS.ADVERTISEMENT, this.listener);
    }

    stop() {
        if (!this.isRecording) return;
        this.isRecording = false;
        if (this.listener) {
            EventBus.removeEventListener(EVENTS.ADVERTISEMENT, this.listener);
            this.listener = null;
        }
    }

    getJSON(name = 'recording') {
        return {
            meta: { name, created: Date.now(), version: 1 },
            packets: this.records
        };
    }

    download(filename = 'replay.json', name = 'recording') {
        const json = this.getJSON(name);
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    _serializeMapOrObj(mapOrObj, isManufacturer = false) {
        if (!mapOrObj) return {};

        // If it's a Map (key -> DataView), reuse shared util
        if (mapOrObj instanceof Map) {
            return serializeRawMap(mapOrObj, isManufacturer);
        }

        // Else if it's an object (serialized already)
        const out = {};
        try {
            Object.entries(mapOrObj).forEach(([k, v]) => {
                out[k] = (typeof v === 'string') ? v : bufferToHex(v);
            });
        } catch (e) {
            return {};
        }
        return out;
    }
}