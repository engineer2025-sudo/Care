import test from 'node:test'
import assert from 'node:assert/strict'
import { encodeCsv } from '../src/lib/csv.js'

test('CSV export escapes commas, quotes, line breaks, and null cells', () => {
  assert.equal(
    encodeCsv([
      ['timestamp', 'note', 'value'],
      ['2026-10-01T09:00:00.000Z', 'felt "a little dizzy", then rested\nfor ten minutes', null],
    ]),
    'timestamp,note,value\r\n2026-10-01T09:00:00.000Z,"felt ""a little dizzy"", then rested\nfor ten minutes",\r\n',
  )
})

test('empty CSV has no phantom row', () => {
  assert.equal(encodeCsv([]), '')
})
