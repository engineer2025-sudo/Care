export const STORAGE_KEY = 'caresphere.v1'
export const RESET_LOCAL_DATA_EVENT = 'caresphere:reset-local-data'

const PERSISTED_KEYS = new Set(['settings', 'routines', 'meds', 'medsConfirmed', 'notes', 'moods', 'emotionScore', 'bestPattern'])
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const isDayKey = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

/** A stable local-calendar day key for daily routines and medication check-ins. */
export function localDayKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isRoutineDoneToday(routine, date = new Date()) {
  return routine?.completedOn === localDayKey(date)
}

export function isMedicationTakenToday(medication, date = new Date()) {
  return medication?.takenOn === localDayKey(date)
}

/** Parse only the known CareSphere storage keys; ignore malformed or foreign data. */
export function parseCareStorage(raw) {
  try {
    const parsed = JSON.parse(raw || '{}')
    if (!isRecord(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).filter(([key]) => PERSISTED_KEYS.has(key)))
  } catch {
    return {}
  }
}

/** Bound and type-check values restored from editable browser storage. */
export function normalizePersistedValue(key, value, fallback) {
  if (key === 'settings') {
    if (!isRecord(value)) return fallback
    return {
      name: typeof value.name === 'string' ? value.name.slice(0, 24) : fallback.name,
      textScale: ['md', 'lg', 'xl'].includes(value.textScale) ? value.textScale : fallback.textScale,
      theme: ['system', 'dark', 'light'].includes(value.theme) ? value.theme : fallback.theme,
      highContrast: typeof value.highContrast === 'boolean' ? value.highContrast : fallback.highContrast,
      lowSensory: typeof value.lowSensory === 'boolean' ? value.lowSensory : fallback.lowSensory,
      voice: typeof value.voice === 'boolean' ? value.voice : fallback.voice,
    }
  }
  if (key === 'routines' && Array.isArray(value)) {
    return value.slice(0, 200).filter(isRecord).map((item, index) => ({
      id: typeof item.id === 'string' ? item.id.slice(0, 120) : Number.isSafeInteger(item.id) ? item.id : `routine-${index}`,
      text: typeof item.text === 'string' ? item.text.slice(0, 240) : '',
      // Migrate the legacy Boolean as today's check-in once; new data expires
      // naturally at the next local calendar day.
      completedOn: isDayKey(item.completedOn) ? item.completedOn : item.done === true ? localDayKey() : null,
    }))
  }
  if (key === 'meds' && Array.isArray(value)) {
    return value.slice(0, 200).filter(isRecord).map((item, index) => ({
      id: typeof item.id === 'string' ? item.id.slice(0, 120) : Number.isSafeInteger(item.id) ? item.id : `medication-${index}`,
      name: typeof item.name === 'string' ? item.name.slice(0, 160) : '',
      time: typeof item.time === 'string' ? item.time.slice(0, 32) : '',
      // Legacy taken flags are kept for today only, then stop suppressing reminders.
      takenOn: isDayKey(item.takenOn) ? item.takenOn : item.taken === true ? localDayKey() : null,
    }))
  }
  if (key === 'notes' && Array.isArray(value)) {
    return value.slice(0, 500).filter(isRecord).map((item, index) => ({
      id: typeof item.id === 'string' ? item.id.slice(0, 120) : Number.isSafeInteger(item.id) ? item.id : `note-${index}`,
      date: typeof item.date === 'string' ? item.date.slice(0, 80) : 'Date not recorded',
      author: typeof item.author === 'string' ? item.author.slice(0, 120) : 'Author not recorded',
      note: typeof item.note === 'string' ? item.note.slice(0, 10000) : '',
    }))
  }
  if (key === 'moods' && Array.isArray(value)) {
    return value.slice(-365).filter(item => isRecord(item) && typeof item.date === 'string' && Number.isInteger(item.score) && item.score >= 1 && item.score <= 5).map(item => ({
      date: item.date.slice(0, 80),
      score: item.score,
      ts: Number.isFinite(item.ts) ? item.ts : undefined,
    }))
  }
  if (key === 'medsConfirmed') return typeof value === 'boolean' ? value : fallback
  if (key === 'emotionScore' || key === 'bestPattern') {
    return Number.isFinite(value) && value >= 0 ? Math.min(Math.floor(value), 1000000) : fallback
  }
  return fallback
}
