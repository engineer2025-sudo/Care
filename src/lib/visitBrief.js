import { isMedicationTakenToday } from './careStorage.js'

const DEFAULT_MOOD_LABELS = {
  1: 'Struggling',
  2: 'Low',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
}

/**
 * Assemble a user-selected, source-labeled visit-prep text brief.
 * This is a convenience export, not a clinical record or interpretation.
 */
export function buildVisitBrief({
  displayName = '',
  meds = [],
  medsConfirmed = false,
  notes = [],
  moods = [],
  hrRecords = [],
  spo2 = null,
  bp = null,
  includeName = false,
  includeMeds = false,
  includeMoods = false,
  includeNotes = false,
  includeLiveVitals = false,
  includeSimulatedVitals = false,
  visitQuestions = '',
  moodLabels = DEFAULT_MOOD_LABELS,
  now = new Date(),
} = {}) {
  const dateLabel = value => {
    const date = new Date(value)
    return Number.isNaN(date.valueOf()) ? String(value || 'Date not recorded') : date.toLocaleString()
  }
  const noteDateLabel = value => {
    if (!value || value === 'Just now') return 'Date not recorded'
    const date = new Date(value)
    return Number.isNaN(date.valueOf()) ? String(value) : date.toLocaleString()
  }
  const liveRecords = hrRecords.filter(record => record.source === 'LIVE_BLE').slice(-20)
  const simulatedRecords = hrRecords.filter(record => record.source !== 'LIVE_BLE').slice(-20)
  const lines = [
    'CareSphere · Visit preparation brief',
    `Prepared: ${now.toLocaleString()}`,
    'User-prepared information only. This is not a verified medical record, diagnosis, or clinical interpretation.',
    '',
  ]

  if (includeName) lines.push(`Display name: ${displayName || 'Not entered'}`, '')
  if (includeMeds) {
    lines.push('MEDICATION REMINDERS (user-entered; not pharmacy-verified)')
    lines.push(`Schedule reviewed in CareSphere: ${medsConfirmed ? 'Yes' : 'No — schedule is unconfirmed and reminders are paused.'}`)
    if (meds.length === 0) lines.push('No medication reminders are saved.')
    meds.forEach(med => {
      const markedTakenToday = isMedicationTakenToday(med, now)
      lines.push(`- ${med.name || 'Unnamed entry'} · ${med.time || 'time not set'}${medsConfirmed ? (markedTakenToday ? ' · marked taken by user today' : ' · not marked taken today') : ''}`)
    })
    lines.push('')
  }
  if (includeMoods) {
    lines.push('MOOD CHECK-INS (optional self-reports; not a clinical measure)')
    if (moods.length === 0) lines.push('No mood check-ins are saved.')
    moods.slice(-30).forEach(mood => {
      const label = moodLabels[mood.score] || `Score ${mood.score}`
      lines.push(`- ${mood.date || 'Date not recorded'} · ${label}`)
    })
    lines.push('')
  }
  if (includeNotes) {
    lines.push('CARE NOTES (user-entered; not clinician-verified)')
    if (notes.length === 0) lines.push('No care notes are saved.')
    notes.slice(0, 50).forEach(note => lines.push(`- ${noteDateLabel(note.date)} · ${note.author || 'Author not recorded'}: ${note.note || ''}`))
    lines.push('')
  }
  if (includeLiveVitals) {
    lines.push('LIVE BLUETOOTH HEART RATE (source-labeled session samples; not a diagnosis)')
    if (liveRecords.length === 0) lines.push('No live BLE heart-rate samples are available in this browser session.')
    liveRecords.forEach(record => lines.push(`- ${dateLabel(record.timestamp)} · ${record.value} bpm · ${record.source}`))
    lines.push('')
  }
  if (includeSimulatedVitals) {
    lines.push('SIMULATED DEMONSTRATION VALUES (not measured; not clinical data)')
    if (simulatedRecords.length === 0 && spo2 === null && bp === null) lines.push('No simulated demonstration values are currently available.')
    simulatedRecords.forEach(record => lines.push(`- ${dateLabel(record.timestamp)} · ${record.metric}: ${record.value} · ${record.source}`))
    if (spo2 !== null) lines.push(`- ${now.toLocaleString()} · oxygen saturation demo: ${spo2}% · SIMULATED_SPOT_CHECK`)
    if (bp !== null) lines.push(`- ${now.toLocaleString()} · blood pressure demo: ${bp} mmHg · SIMULATED_SEQUENCE`)
    lines.push('')
  }
  if (visitQuestions.trim()) {
    lines.push('QUESTIONS OR TOPICS I WANT TO DISCUSS', visitQuestions.trim(), '')
  }

  return lines.join('\n')
}
