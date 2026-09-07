// ─────────────────────────────────────────────────────────────────────────────
// CareSphere BLE Integration — Web Bluetooth (GATT)
//
// Production digital-health platforms read vitals from paired wearables and
// medical sensors — not from thin air. This module implements the standard
// Bluetooth SIG Heart Rate profile (service 0x180D, characteristic 0x2A37)
// over the browser's Web Bluetooth API, the same path used by Chrome/Edge on
// desktop and Android to talk to real BLE chest straps and watch pods.
//
// When the browser does not support Web Bluetooth (Safari, Firefox, iOS) or no
// sensor is paired, we fall back to a clearly-labeled physiologically-plausible
// simulated stream so the clinical workflow remains demonstrable end-to-end.
// ─────────────────────────────────────────────────────────────────────────────

const HR_SERVICE = 'heart_rate'            // Bluetooth SIG service 0x180D
const HR_MEASUREMENT = 'heart_rate_measurement' // characteristic 0x2A37

function startSimulatedStream(onReading, onStatus) {
  let hr = 74
  const timer = setInterval(() => {
    // Random-walk drift constrained to a realistic resting band, with gentle
    // excursions toward relaxation or light activity.
    hr += (Math.random() - 0.5) * 4
    if (Math.random() < 0.06) hr += Math.random() < 0.5 ? -5 : 7
    hr = Math.min(96, Math.max(58, hr))
    onReading(Math.round(hr))
  }, 1500)
  onStatus({
    mode: 'simulated',
    message: 'Simulated sensor stream — physiologically plausible demo data. Connect a real monitor for live telemetry.',
  })
  return () => clearInterval(timer)
}

/**
 * Connect to a BLE heart-rate monitor and stream readings.
 * Returns a disconnect function.
 *
 * @param {(bpm:number)=>void} onReading  called for every heart-rate measurement
 * @param {(status:{mode:string,message:string})=>void} onStatus
 * @returns {Promise<()=>void>} disconnect()
 */
export async function connectHeartRateMonitor(onReading, onStatus) {
  const webBluetoothUnavailable = !('bluetooth' in navigator)
  if (webBluetoothUnavailable) {
    onStatus({
      mode: 'unsupported',
      message: 'This browser does not support Web Bluetooth (Safari/Firefox/iOS). Use Chrome or Edge on desktop/Android to pair a real sensor. Showing simulated data meanwhile.',
    })
    return startSimulatedStream(onReading, onStatus)
  }

  let device
  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [HR_SERVICE] }],
      optionalServices: ['battery_service'],
    })
  } catch (err) {
    // User cancelled the chooser or no compatible device nearby.
    onStatus({
      mode: 'simulated',
      message: `No sensor paired (${err.name === 'NotFoundError' ? 'device chooser closed' : err.message}). Falling back to simulated stream.`,
    })
    return startSimulatedStream(onReading, onStatus)
  }

  try {
    onStatus({ mode: 'connecting', message: `Connecting to ${device.name || 'BLE sensor'}…` })
    const server = await device.gatt.connect()
    const service = await server.getPrimaryService(HR_SERVICE)
    const char = await service.getCharacteristic(HR_MEASUREMENT)

    await char.startNotifications()
    char.addEventListener('characteristicvaluechanged', (event) => {
      const dv = event.target.value
      const flags = dv.getUint8(0)
      // Bit 0 of the flags field selects 8-bit vs 16-bit BPM encoding.
      const bpm = flags & 0x1 ? dv.getUint16(1, true) : dv.getUint8(1)
      if (bpm > 20 && bpm < 250) onReading(bpm)
    })

    device.addEventListener('gattserverdisconnected', () => {
      onStatus({ mode: 'disconnected', message: `${device.name || 'Sensor'} disconnected. Reconnect to resume streaming.` })
    })

    onStatus({ mode: 'live', message: `Live — receiving heart-rate notifications from ${device.name || 'BLE sensor'} via Bluetooth GATT.` })
    return () => { try { device.gatt.disconnect() } catch (e) {} }
  } catch (err) {
    onStatus({
      mode: 'simulated',
      message: `GATT session failed (${err.message}). Falling back to simulated stream.`,
    })
    return startSimulatedStream(onReading, onStatus)
  }
}
