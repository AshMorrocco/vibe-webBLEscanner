/**
 * @typedef {import('../core/types').Device} Device
 */

/**
 * Filters and sorts a map of devices based on the provided configuration.
 * This function is "pure" - it does not modify the DOM or the input Map.
 * * @param {Map<string, Device>} devicesMap - The source map of devices.
 * @param {Object} config - Configuration object for filtering and sorting.
 * @param {number} [config.minRssi] - Minimum RSSI threshold (e.g. -100).
 * @param {string} [config.filterText] - Search string.
 * @param {'name'|'id'} [config.filterType] - Which field to search against.
 * @param {'rssi'|'lastSeen'|'rate'|'total'|'delta'|'name'} [config.sortType] - Field to sort by.
 * @param {'asc'|'desc'} [config.sortOrder] - Sort direction.
 * @returns {Device[]} An array of Device objects that match the criteria, sorted.
 */
export function getSortedAndFilteredList(devicesMap, config) {
    const { 
        minRssi = -100, 
        filterText = '', 
        filterType = 'name', 
        sortType = 'rssi', 
        sortOrder = 'desc' 
    } = config;

    const lowerFilterText = filterText.toLowerCase();
    const isDesc = sortOrder === 'desc';

    // 1. Filter
    const filtered = [];
    for (const device of devicesMap.values()) {
        // RSSI Filter
        if (device.rssi < minRssi) continue;

        // Text Filter
        if (lowerFilterText.length > 0) {
            const target = filterType === 'name' ? (device.name || '') : device.id;
            if (!target.toLowerCase().includes(lowerFilterText)) continue;
        }

        filtered.push(device);
    }

    // 2. Sort
    filtered.sort((a, b) => {
        let valA, valB;
        switch (sortType) {
            case 'rssi': 
                valA = a.rssi; valB = b.rssi; 
                break;
            case 'lastSeen': 
                valA = a.lastSeen; valB = b.lastSeen; 
                break;
            case 'rate': 
                valA = a.stats.rate; valB = b.stats.rate; 
                break;
            case 'total': 
                valA = a.stats.total; valB = b.stats.total; 
                break;
            case 'delta':
                valA = Math.abs((a.stats.rssiMax ?? 0) - (a.stats.rssiMin ?? -100));
                valB = Math.abs((b.stats.rssiMax ?? 0) - (b.stats.rssiMin ?? -100));
                break;
            case 'name': 
                valA = (a.name || '').toLowerCase(); 
                valB = (b.name || '').toLowerCase(); 
                break;
            default: 
                return 0;
        }

        if (valA < valB) return isDesc ? 1 : -1;
        if (valA > valB) return isDesc ? -1 : 1;
        return 0;
    });

    return filtered;
}