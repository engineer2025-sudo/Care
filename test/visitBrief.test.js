import test from 'node:test'
import assert from 'node:assert/strict'
import { buildVisitBrief } from '../src/lib/visitBrief.js'

const fixedNow = new Date('2026-09-27T19:00:00.000Z')

test('omits personal sections unless the user explicitly opts in', () => {
  const brief = buildVisitBrief({
    displayName: 'Alex Example',
    meds: [{ name: 'Private medicine', time: '09:00 AM' }],
    notes: [{ author: 'Alex', note: 'Private note' }],
    moods: [{ date: '2026-09-27', score: 3 }],
    now: fixedNow,
  })

  assert.match(brief, /not a verified medical record/)
  assert.doesNotMatch(brief, /Alex Example|Private medicine|Private note|Okay/)
})

test('labels medication schedule as unconfirmed and self-entered', () => {
  const brief = buildVisitBrief({
    meds: [{ name: 'My medicine', time: '8:30 AM', taken: true }],
    medsConfirmed: false,
    includeMeds: true,
    now: fixedNow,
  })

  assert.match(brief, /user-entered; not pharmacy-verified/)
  assert.match(brief, /unconfirmed and reminders are paused/)
  assert.match(brief, /My medicine · 8:30 AM/)
  assert.doesNotMatch(brief, /marked taken by user/)
})

test('visit brief reports only a same-day medication self-report as taken', () => {
  const fixedNow = new Date()
  const today = `${fixedNow.getFullYear()}-${String(fixedNow.getMonth() + 1).padStart(2, '0')}-${String(fixedNow.getDate()).padStart(2, '0')}`
  const brief = buildVisitBrief({
    meds: [
      { name: 'Today medicine', time: '8:00 AM', takenOn: today },
      { name: 'Older medicine', time: '9:00 AM', takenOn: '2000-01-01' },
    ],
    medsConfirmed: true,
    includeMeds: true,
    now: fixedNow,
  })

  assert.match(brief, /Today medicine · 8:00 AM · marked taken by user today/)
  assert.match(brief, /Older medicine · 9:00 AM · not marked taken today/)
})

test('legacy relative note timestamps are not exported as if they were current', () => {
  const brief = buildVisitBrief({
    notes: [{ date: 'Just now', author: 'Me', note: 'Older saved note' }],
    includeNotes: true,
    now: fixedNow,
  })

  assert.match(brief, /Date not recorded · Me: Older saved note/)
  assert.doesNotMatch(brief, /Just now/)
})

test('live BLE selection never silently includes simulated heart-rate records', () => {
  const brief = buildVisitBrief({
    hrRecords: [
      { timestamp: '2026-09-27T18:00:00.000Z', metric: 'heart_rate_bpm', value: 72, source: 'LIVE_BLE' },
      { timestamp: '2026-09-27T18:01:00.000Z', metric: 'heart_rate_bpm', value: 99, source: 'SIMULATED' },
    ],
    includeLiveVitals: true,
    now: fixedNow,
  })

  assert.match(brief, /72 bpm · LIVE_BLE/)
  assert.doesNotMatch(brief, /99 bpm|SIMULATED DEMONSTRATION VALUES/)
})

test('simulated values appear only after opt-in and stay visibly labeled', () => {
  const brief = buildVisitBrief({
    hrRecords: [{ timestamp: '2026-09-27T18:01:00.000Z', metric: 'heart_rate_bpm', value: 99, source: 'SIMULATED' }],
    spo2: 97,
    bp: '118 / 76',
    includeSimulatedVitals: true,
    now: fixedNow,
  })

  assert.match(brief, /SIMULATED DEMONSTRATION VALUES \(not measured; not clinical data\)/)
  assert.match(brief, /99 · SIMULATED/)
  assert.match(brief, /97% · SIMULATED_SPOT_CHECK/)
  assert.match(brief, /118 \/ 76 mmHg · SIMULATED_SEQUENCE/)
})

test('selected mood, note and discussion sections retain their limitations', () => {
  const brief = buildVisitBrief({
    moods: [{ date: '2026-09-27', score: 4 }],
    notes: [{ date: 'Today', author: 'Me', note: 'Ask about sleep.' }],
    includeMoods: true,
    includeNotes: true,
    visitQuestions: 'Can we review my sleep routine?',
    moodLabels: { 4: 'Good' },
    now: fixedNow,
  })

  assert.match(brief, /optional self-reports; not a clinical measure/)
  assert.match(brief, /2026-09-27 · Good/)
  assert.match(brief, /user-entered; not clinician-verified/)
  assert.match(brief, /Ask about sleep\./)
  assert.match(brief, /Can we review my sleep routine\?/)
})
