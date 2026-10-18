import test from 'node:test'
import assert from 'node:assert/strict'
import { parseHeartRate, connectHeartRateMonitor } from '../src/lib/bluetooth.js'
const packet = (...values) => new DataView(new Uint8Array(values).buffer)
test('real HR parser supports 8-bit and little-endian 16-bit packets', () => {
  assert.equal(parseHeartRate(packet(0,72)),72)
  assert.equal(parseHeartRate(packet(1,200,0)),200)
})
test('HR parser leaves no number for truncated, no-contact or invalid data', () => {
  for (const p of [packet(),packet(0),packet(1,72),packet(4,72),packet(0,0),packet(1,0,1)]) assert.equal(parseHeartRate(p),null)
  assert.equal(parseHeartRate(packet(6,72)),72)
})
test('unsupported Bluetooth never creates a substitute reading', async () => {
  let status
  let measurements = 0
  const stop = await connectHeartRateMonitor(() => measurements++, value => { status = value })
  assert.equal(stop,null)
  assert.equal(measurements,0)
  assert.equal(status.mode,'unsupported')
})
