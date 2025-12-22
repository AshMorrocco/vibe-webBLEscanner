// NOTE: helper functions moved to `js/utils/raw.js` to centralize raw-data conversion utilities.
// Kept this file as a tiny shim for backward compatibility.
import { bufferToHex as _bufferToHex } from './raw.js';

/**
 * shim--for legacy imports, re-export from raw.js
 */
export function bufferToHex(dataView) {
    return _bufferToHex(dataView);
}