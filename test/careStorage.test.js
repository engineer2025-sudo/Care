import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePersistedValue, parseCareStorage } from '../src/lib/careStorage.js'

const defaults = {
  settings: { name: 'Alex', textScale: 'md', highContrast: false, voice: false },
  routines: [],
  meds: [],
  medsConfirmed: false,
  notes: [],
  moods: [],
  emotionScore: 0,
  bestPattern: 0,
}

test('storage parser rejects malformed roots and ignores unknown keys', () => {
  assert.deepEqual(parseCareStorage('{broken'), {})
  assert.deepEqual(parseCareStorage('[]'), {})
  assert.deepEqual(parseCareStorage('{"notes":[],"attackerPayload":"<script>","__proto__":{"polluted":true}}'), { notes: [] })
})

test('settings are shape-checked and bounded before React uses them', () => {
  const value = normalizePersistedValue('settings', {
    name: 'A'.repeat(100),
    textScale: 'huge',
    highContrast: 'yes',
    voice: true,
    unexpected: 'discard',
  }, defaults.settings)

  assert.equal(value.name.length, 24)
  assert.equal(value.textScale, 'md')
  assert.equal(value.highContrast, false)
  assert.equal(value.voice, true)
  assert.equal('unexpected' in value, false)
})

test('medication and note records are bounded and malformed fields are neutralized', () => {
  const [medication] = normalizePersistedValue('meds', [{ id: {}, name: 19, time: 'x'.repeat(80), taken: 'yes' }], defaults.meds)
  assert.equal(medication.id, 'medication-0')
  assert.equal(medication.name, '')
  assert.equal(medication.time.length, 32)
  assert.equal(medication.taken, false)

  const [note] = normalizePersistedValue('notes', [{ id: 1, date: 7, author: null, note: 'n'.repeat(10050) }], defaults.notes)
  assert.equal(note.date, 'Date not recorded')
  assert.equal(note.author, 'Author not recorded')
  assert.equal(note.note.length, 10000)
})

test('mood ranges and score counters are validated', () => {
  const moods = normalizePersistedValue('moods', [
    { date: '2026-09-27', score: 5, ts: 1 },
    { date: 'bad', score: 99, ts: 2 },
    { date: 7, score: 3, ts: 3 },
  ], defaults.moods)
  assert.deepEqual(moods, [{ date: '2026-09-27', score: 5, ts: 1 }])
  assert.equal(normalizePersistedValue('emotionScore', -10, 0), 0)
  assert.equal(normalizePersistedValue('bestPattern', 2000000, 0), 1000000)
})
