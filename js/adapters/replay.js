import { EventBus, EVENTS } from '../core/bus.js';

/**
 * Adapter for replaying saved scan data.
 * (Skeleton Implementation)
 */
export class ReplayProvider {
    constructor() {
        this.isRunning = false;
    }

    async start(callback = null) {
        this.isRunning = true;
        console.log("Replay started (Feature pending implementation)");
        // Future logic: Read JSON, setInterval loop, emit EVENTS.ADVERTISEMENT
    }

    stop() {
        this.isRunning = false;
        console.log("Replay stopped");
    }
}