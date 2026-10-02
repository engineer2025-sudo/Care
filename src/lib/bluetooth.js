// ─────────────────────────────────────────────────────────────────────────────
// CareSphere BLE Integration — Web Bluetooth (GATT)
//
// Production digital-health platforms read vitals from paired wearables and
// medical sensors — not from thin air. This module implements the standard
// Bluetooth SIG Heart Rate profile (service 0x180D, characteristic 0x2A37)
// over the browser's Web Bluetooth API, the same path used by Chrome/Edge on
// desktop and Android to talk to real BLE chest straps and watch pods.
//
// A canceled/failed pairing never creates mock readings. A separate, explicit
// demo control can start a clearly-labeled simulated stream when desired.
// ─────────────────────────────────────────────────────────────────────────────

const HR_SERVICE = 'heart_rate'            // Bluetooth SIG service 0x180D
const HR_MEASUREMENT = 'heart_rate_measurement' // characteristic 0x2A37

export function startSimulatedHeartRateMonitor(onReading, onStatus) {
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
 * @returns {Promise<(()=>void)|null>} disconnect handler, or null when no sensor connected
 */
export async function connectHeartRateMonitor(onReading, onStatus) {
  const webBluetoothUnavailable = !('bluetooth' in navigator)
  if (webBluetoothUnavailable) {
    onStatus({
      mode: 'unsupported',
      message: 'This browser does not support Web Bluetooth (Safari/Firefox/iOS). No heart-rate reading is shown. Use the separate demo control only if you want sample data.',
    })
    return null
  }

  let device
  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [HR_SERVICE] }],
      optionalServices: ['battery_service'],
    })
  } catch (err) {
    // Canceling a pairing chooser must never silently start fabricated readings.
    const cancelled = err?.name === 'NotFoundError' || err?.name === 'AbortError'
    onStatus({
      mode: cancelled ? 'disconnected' : 'unsupported',
      message: cancelled
        ? 'Pairing canceled. No sensor is connected and no heart-rate reading is shown.'
        : `Could not open the Bluetooth chooser (${err?.message || 'unknown error'}). No reading is shown.`,
    })
    return null
  }

  try {
    onStatus({ mode: 'connecting', message: `Connecting to ${device.name || 'BLE sensor'}…` })
    const server = await device.gatt.connect()
    const service = await server.getPrimaryService(HR_SERVICE)
    const char = await service.getCharacteristic(HR_MEASUREMENT)

    await char.startNotifications()
    const handleMeasurement = (event) => {
      const dv = event.target.value
      if (!dv || dv.byteLength < 2) return
      const flags = dv.getUint8(0)
      // Bit 0 of the flags field selects 8-bit vs 16-bit BPM encoding.
      if ((flags & 0x1) && dv.byteLength < 3) return
      const bpm = flags & 0x1 ? dv.getUint16(1, true) : dv.getUint8(1)
      if (bpm > 20 && bpm < 250) onReading(bpm)
    }
    const handleDisconnected = () => {
      char.removeEventListener('characteristicvaluechanged', handleMeasurement)
      device.removeEventListener('gattserverdisconnected', handleDisconnected)
      onStatus({ mode: 'disconnected', message: `${device.name || 'Sensor'} disconnected. No current reading is available; reconnect to resume streaming.` })
    }
    char.addEventListener('characteristicvaluechanged', handleMeasurement)
    device.addEventListener('gattserverdisconnected', handleDisconnected)

    onStatus({ mode: 'live', message: `Live — receiving heart-rate notifications from ${device.name || 'BLE sensor'} via Bluetooth GATT.` })
    return () => {
      char.removeEventListener('characteristicvaluechanged', handleMeasurement)
      device.removeEventListener('gattserverdisconnected', handleDisconnected)
      try { char.stopNotifications() } catch {}
      try { device.gatt?.disconnect() } catch {}
    }
  } catch (err) {
    try { device.gatt?.disconnect() } catch {}
    onStatus({
      mode: 'disconnected',
      message: `Bluetooth connection failed (${err?.message || 'unknown error'}). No simulated reading was started; try pairing again or use the labeled demo.`,
    })
    return null
  }
}
