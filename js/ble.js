let scan = null;
let listener = null;

export async function startBLE(onAdvertisement) {
    if (!navigator.bluetooth) throw new Error("Bluetooth not supported");
    
    try { 
        // Force picker to wake up radio
        await navigator.bluetooth.requestDevice({ acceptAllDevices: true }); 
    } catch (e) { /* user cancel is fine */ }
    
    scan = await navigator.bluetooth.requestLEScan({ 
        acceptAllAdvertisements: true, 
        keepRepeatedDevices: true 
    });
    
    listener = onAdvertisement;
    navigator.bluetooth.addEventListener('advertisementreceived', listener);
}

export function stopBLE() {
    if (scan) { 
        try { scan.stop(); } catch(e){} 
    }
    if (listener) {
        navigator.bluetooth.removeEventListener('advertisementreceived', listener);
        listener = null;
    }
    scan = null;
}