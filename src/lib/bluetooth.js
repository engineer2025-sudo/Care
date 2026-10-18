// Real Bluetooth SIG Heart Rate notifications only. No generated fallback data.
const HR_SERVICE = 'heart_rate'
const HR_MEASUREMENT = 'heart_rate_measurement'

export function parseHeartRate(dv) {
  if (!dv || dv.byteLength < 2) return null
  const flags = dv.getUint8(0)
  // If contact detection is supported, do not display a no-contact measurement.
  if ((flags & 4) && !(flags & 2)) return null
  if ((flags & 1) && dv.byteLength < 3) return null
  const bpm = flags & 1 ? dv.getUint16(1, true) : dv.getUint8(1)
  return bpm > 20 && bpm < 250 ? bpm : null
}

export async function connectHeartRateMonitor(onReading, onStatus) {
  if (!globalThis.navigator?.bluetooth) {
    onStatus({ mode: 'unsupported', message: 'Web Bluetooth is unavailable here. Use the native iOS or Android app, or a supported Chrome/Edge browser. No reading is shown.' })
    return null
  }
  let device
  try {
    device = await navigator.bluetooth.requestDevice({ filters: [{ services: [HR_SERVICE] }] })
  } catch (error) {
    onStatus({ mode: 'disconnected', message: error?.name === 'NotFoundError' || error?.name === 'AbortError'
      ? 'Pairing canceled. No sensor is connected.' : `Could not open Bluetooth: ${error?.message || 'check permissions'}` })
    return null
  }
  let char, expiry, connectionTimer, active = true
  const cleanup = () => {
    active = false
    clearTimeout(expiry)
    clearTimeout(connectionTimer)
    char?.removeEventListener('characteristicvaluechanged', measurement)
    device.removeEventListener('gattserverdisconnected', disconnected)
    if (char && device.gatt?.connected) {
      try { Promise.resolve(char.stopNotifications()).catch(() => {}) } catch { /* already disconnected */ }
    }
    try { device.gatt?.disconnect() } catch { /* already disconnected */ }
  }
  const disconnected = () => {
    cleanup()
    onReading(null)
    onStatus({ mode: 'disconnected', message: 'Monitor disconnected. No current reading; reconnect when ready.' })
  }
  const measurement = event => {
    if (!active) return
    const bpm = parseHeartRate(event.target.value)
    clearTimeout(expiry)
    onReading(bpm)
    onStatus({ mode: bpm === null ? 'connected' : 'live', message: bpm === null
      ? 'Monitor sent an invalid or no-contact reading. Check its fit.' : `Live Bluetooth reading · ${device.name || 'Heart-rate monitor'}` })
    if (bpm !== null) expiry = setTimeout(() => {
      if (!active) return
      onReading(null)
      onStatus({ mode: 'stale', message: 'No fresh reading for 15 seconds. Check the monitor and its connection.' })
    }, 15000)
  }
  try {
    onStatus({ mode: 'connecting', message: `Connecting to ${device.name || 'heart-rate monitor'}…` })
    const connection = (async () => {
      const server = await device.gatt.connect()
      if (!active) { device.gatt.disconnect(); throw new Error('Connection canceled') }
      const service = await server.getPrimaryService(HR_SERVICE)
      if (!active) throw new Error('Connection canceled')
      char = await service.getCharacteristic(HR_MEASUREMENT)
      if (!active) throw new Error('Connection canceled')
      char.addEventListener('characteristicvaluechanged', measurement)
      device.addEventListener('gattserverdisconnected', disconnected)
      onStatus({ mode: 'connected', message: 'Connected. Waiting for the first real measurement.' })
      await char.startNotifications()
    })()
    await Promise.race([connection, new Promise((_, reject) => {
      connectionTimer = setTimeout(() => reject(new Error('Connection timed out')), 20000)
    })])
    clearTimeout(connectionTimer)
    return cleanup
  } catch (error) {
    cleanup()
    onReading(null)
    onStatus({ mode: 'disconnected', message: `Bluetooth connection failed: ${error?.message || 'check the monitor and retry'}. No reading is shown.` })
    return null
  }
}
