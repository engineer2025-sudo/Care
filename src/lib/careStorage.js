export const STORAGE_KEY = 'caresphere.v1'
export const RESET_LOCAL_DATA_EVENT = 'caresphere:reset-local-data'

const PERSISTED_KEYS = new Set(['settings', 'routines', 'meds', 'medsConfirmed', 'notes', 'moods', 'emotionScore', 'bestPattern'])
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)

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
      highContrast: typeof value.highContrast === 'boolean' ? value.highContrast : fallback.highContrast,
      voice: typeof value.voice === 'boolean' ? value.voice : fallback.voice,
    }
  }
  if (key === 'routines' && Array.isArray(value)) {
    return value.slice(0, 200).filter(isRecord).map((item, index) => ({
      id: typeof item.id === 'string' ? item.id.slice(0, 120) : Number.isSafeInteger(item.id) ? item.id : `routine-${index}`,
      text: typeof item.text === 'string' ? item.text.slice(0, 240) : '',
      done: item.done === true,
    }))
  }
  if (key === 'meds' && Array.isArray(value)) {
    return value.slice(0, 200).filter(isRecord).map((item, index) => ({
      id: typeof item.id === 'string' ? item.id.slice(0, 120) : Number.isSafeInteger(item.id) ? item.id : `medication-${index}`,
      name: typeof item.name === 'string' ? item.name.slice(0, 160) : '',
      time: typeof item.time === 'string' ? item.time.slice(0, 32) : '',
      taken: item.taken === true,
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
