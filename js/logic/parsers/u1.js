import { parseRawObject, hexToDataView } from '../../utils/raw.js';

// Conditionally import proprietary AA16 parser if available
let parseU1AA16Format = null;
try {
    const aa16Module = await import('./u1-aa16.js');
    parseU1AA16Format = aa16Module.parseU1AA16Format;
} catch (e) {
    // AA16 parser not available - that's OK
}

/**
 * Parsers for Meeblue U1 Specific Data
 * Based on Datasheet v1.1 Page 8 (Real-Time Mode)
 */

export function parseU1RealTime(serviceDataMapOrObj) {
    // Accept either a Map (from live events) or a serialized object (key->hex string)
    // Supports standard U1 realtime (0x4000, 20 bytes) and custom formats if available

    if (!serviceDataMapOrObj) return null;

    let rawData = null;
    let format = null; // 'u1' or 'aa16'

    // If it's a Map-like object (has entries), iterate it directly
    if (typeof serviceDataMapOrObj.entries === 'function') {
        try {
            for (const [uuid, dataView] of serviceDataMapOrObj.entries()) {
                if (!uuid) continue;
                const key = String(uuid).toLowerCase();
                if (key.includes('4000')) {
                    rawData = dataView;
                    format = 'u1';
                    break;
                } else if (key.includes('aa16') && parseU1AA16Format) {
                    rawData = dataView;
                    format = 'aa16';
                    break;
                }
            }
        } catch (e) {
            // continue to obj fallback
        }
    }

    // If not found and it's a plain object (serialized), convert values to DataView using hex strings
    if (!rawData && typeof serviceDataMapOrObj === 'object') {
        for (const [uuid, hexStr] of Object.entries(serviceDataMapOrObj)) {
            if (!uuid) continue;
            const key = String(uuid).toLowerCase();
            if (key.includes('4000')) {
                if (hexStr && typeof hexStr === 'string') rawData = hexToDataView(hexStr);
                else if (hexStr && hexStr.buffer) rawData = hexStr;
                format = 'u1';
                break;
            } else if (key.includes('aa16') && parseU1AA16Format) {
                if (hexStr && typeof hexStr === 'string') rawData = hexToDataView(hexStr);
                else if (hexStr && hexStr.buffer) rawData = hexStr;
                format = 'aa16';
                break;
            }
        }
    }

    if (!rawData) return null;

    // Ensure we have a DataView
    if (!rawData.buffer) rawData = hexToDataView(rawData);

    // Parse based on detected format
    if (format === 'u1') {
        return parseU1StandardFormat(rawData);
    } else if (format === 'aa16' && parseU1AA16Format) {
        return parseU1AA16Format(rawData);
    }

    return null;
}

/**
 * Standard U1 Realtime Format (20 bytes, service 0x4000)
 * Format: [ID:6] [Batt:2] [MiniUUID:6] [Time:4] [Trigger:2]
 */
function parseU1StandardFormat(rawData) {
    if (rawData.byteLength < 20) return null;

    const voltage = rawData.getUint16(6, false); // Big Endian
    const deviceTimestamp = rawData.getUint32(14, false);
    const triggerValue = rawData.getUint16(18, false);
    const isTriggered = triggerValue !== 0xFFFF;

    return {
        type: 'U1_REALTIME',
        battery: {
            mv: voltage,
            percent: estimateCoinCellPercent(voltage)
        },
        uptime: deviceTimestamp,
        motion: {
            active: isTriggered,
            countdown: isTriggered ? triggerValue : 0
        }
    };
}

/**
 * Rough estimation for CR2477/2032 Coin Cells
 */
function estimateCoinCellPercent(mv) {
    if (mv >= 3000) return 100;
    if (mv <= 2000) return 0;
    return Math.max(0, Math.min(100, (mv - 2000) / 10));
}