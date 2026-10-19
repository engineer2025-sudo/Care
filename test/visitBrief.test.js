import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { buildVisitBrief, buildVisitBriefHtml, createReportFingerprint } from '../src/lib/visitBrief.js'

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

test('legacy generated values are excluded even if an old caller requests them', () => {
  const brief = buildVisitBrief({
    hrRecords: [{ timestamp: '2026-09-27T18:01:00.000Z', metric: 'heart_rate_bpm', value: 99, source: 'SIMULATED' }],
    spo2: 97,
    bp: '118 / 76',
    includeSimulatedVitals: true,
    now: fixedNow,
  })

  assert.doesNotMatch(brief, /SIMULATED|99|97%|118 \/ 76/)
})

test('manually entered health readings are opt-in and source-labeled', () => {
  const readings = [
    { kind: 'bp', first: 122, second: 78, at: '2026-09-27T18:00:00.000Z' },
    { kind: 'oxygen', first: 97, at: '2026-09-27T18:02:00.000Z' },
  ]
  const omitted = buildVisitBrief({ manualVitals: readings, now: fixedNow })
  assert.doesNotMatch(omitted, /122\/78|97% SpO₂/)

  const selected = buildVisitBrief({ manualVitals: readings, includeManualVitals: true, now: fixedNow })
  assert.match(selected, /MANUALLY ENTERED VITALS \(self-entered values; not sensor-verified\)/)
  assert.match(selected, /122\/78 mmHg · entered by user/)
  assert.match(selected, /97% SpO₂ · entered by user/)
})

test('report PDF has a duplex data ledger and escaped electronic stamp', async () => {
  const brief = buildVisitBrief({
    includeNotes: true,
    notes: [{ date: '2026-09-27', author: 'Alex', note: '<script>alert("private")</script>' }],
    visitQuestions: 'Ask about sleep.',
    now: fixedNow,
  })
  const fingerprint = await createReportFingerprint(brief, webcrypto)
  const html = buildVisitBriefHtml({
    brief, fingerprint, generatedAt: fixedNow,
  })

  assert.match(fingerprint, /^[a-f0-9]{64}$/)
  assert.match(html, /Electronic integrity stamp/)
  assert.match(html, /Selected data included in this copy/)
  assert.match(html, /class="sheet reverse-side"/)
  assert.doesNotMatch(html, /QUESTIONS OR TOPICS I WANT TO DISCUS<\/p>/)
  assert.match(html, /class="seal-fallback" role="img" aria-label="CareSphere personal-copy seal"/)
  assert.match(html, /id="print-report">Print or save as PDF/)
  assert.match(html, /id="close-report">Close report/)
  assert.match(html, /color:#111/)
  assert.match(html, /background:#fff/)
  assert.doesNotMatch(html, /linear-gradient|gold|teal|mint|window\.addEventListener\('load'.*window\.print/s)
  assert.match(html, new RegExp(fingerprint))
  assert.match(html, /Alex: &lt;script&gt;alert\(&quot;private&quot;\)&lt;\/script&gt;/)
  assert.doesNotMatch(html, /<script>alert\("private"\)<\/script>/)
  assert.match(html, /not a clinician credential, PDF signature, or proof of identity/)
  assert.throws(() => buildVisitBriefHtml({ brief, fingerprint: 'fake' }), /valid SHA-256/)
})

test('report uses a built-in monochrome seal when no personal data sections are selected', async () => {
  const brief = buildVisitBrief({ now: fixedNow })
  const fingerprint = await createReportFingerprint(brief, webcrypto)
  const html = buildVisitBriefHtml({ brief, fingerprint, generatedAt: fixedNow })
  assert.match(html, /No personal data sections were selected/)
  assert.match(html, /class="seal-fallback"/)
  assert.doesNotMatch(html, /<img/)
  assert.doesNotMatch(html, /example\.invalid/)
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
