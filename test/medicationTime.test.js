import test from 'node:test'
import assert from 'node:assert/strict'
import { reminderDate } from '../src/lib/medicationTime.js'
test('medication clock accepts precise 12/24-hour input and preserves the local day', () => {
  const day = new Date(2026, 9, 14, 8)
  assert.equal(reminderDate('12:00 AM', day).getHours(), 0)
  assert.equal(reminderDate('12:00 PM', day).getHours(), 12)
  assert.equal(reminderDate('09:30', day).getMinutes(), 30)
  assert.equal(reminderDate('9:30 PM', day).getHours(), 21)
  assert.equal(reminderDate('23:59', day).getDate(), 14)
})
test('malformed medication clock does not roll over or find a partial match', () => {
  for (const value of ['24:00', '13:00 PM', '09:60', '0:30 AM', 'prefix 9:30 PM', '9:30 PM suffix', null, {}]) assert.equal(reminderDate(value), null)
})
