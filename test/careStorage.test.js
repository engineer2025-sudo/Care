import test from 'node:test'
import assert from 'node:assert/strict'
import { isMedicationTakenToday, isRoutineDoneToday, localDayKey, normalizePersistedValue, parseCareStorage } from '../src/lib/careStorage.js'

const defaults = {
  settings: { name: 'Alex', textScale: 'md', theme: 'system', highContrast: false, lowSensory: true, voice: false },
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
    theme: 'ultraviolet',
    highContrast: 'yes',
    lowSensory: false,
    voice: true,
    unexpected: 'discard',
  }, defaults.settings)

  assert.equal(value.name.length, 24)
  assert.equal(value.textScale, 'md')
  assert.equal(value.theme, 'system')
  assert.equal(value.highContrast, false)
  assert.equal(value.lowSensory, false)
  assert.equal(value.voice, true)
  assert.equal('unexpected' in value, false)
})

test('medication and note records are bounded and malformed fields are neutralized', () => {
  const [medication] = normalizePersistedValue('meds', [{ id: {}, name: 19, time: 'x'.repeat(80), taken: 'yes' }], defaults.meds)
  assert.equal(medication.id, 'medication-0')
  assert.equal(medication.name, '')
  assert.equal(medication.time.length, 32)
  assert.equal(medication.takenOn, null)

  const [note] = normalizePersistedValue('notes', [{ id: 1, date: 7, author: null, note: 'n'.repeat(10050) }], defaults.notes)
  assert.equal(note.date, 'Date not recorded')
  assert.equal(note.author, 'Author not recorded')
  assert.equal(note.note.length, 10000)
})

test('routine and medication check-ins are scoped to the local day with safe legacy migration', () => {
  const today = localDayKey()
  const [routine] = normalizePersistedValue('routines', [{ id: 'r1', text: 'Walk', done: true }], defaults.routines)
  const [medication] = normalizePersistedValue('meds', [{ id: 'm1', name: 'Example', time: '8:00 AM', taken: true }], defaults.meds)

  assert.equal(routine.completedOn, today)
  assert.equal(isRoutineDoneToday(routine), true)
  assert.equal(isRoutineDoneToday({ completedOn: '2000-01-01' }), false)
  assert.equal(isRoutineDoneToday({ done: true }), false)
  assert.equal(medication.takenOn, today)
  assert.equal(isMedicationTakenToday(medication), true)
  assert.equal(isMedicationTakenToday({ takenOn: '2000-01-01' }), false)
  assert.equal(isMedicationTakenToday({ taken: true }), false)
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
