import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import {
  Heart, Shield, Brain, Sparkles, Video, Activity, Coffee, X, ExternalLink,
  Volume2, CheckCircle, Bluetooth, BluetoothConnected, Phone, PhoneCall,
  AlertTriangle, Wind, Gamepad2, Flame, TreePine, CloudRain, Waves, Send,
  Bell, Pill, Calendar, Lock, Stethoscope, Timer, Award, Settings, Download,
  BellRing, Smile, Frown, Meh, Laugh, MapPin, User, FileText
} from 'lucide-react'
import { celebrate as celebrateConfetti } from './lib/celebrate'
import { soundEngine } from './lib/audio'
import { connectHeartRateMonitor, startSimulatedHeartRateMonitor } from './lib/bluetooth'
import { buildVisitBrief } from './lib/visitBrief'
import { encodeCsv } from './lib/csv'
import { STORAGE_KEY, RESET_LOCAL_DATA_EVENT, parseCareStorage, normalizePersistedValue, localDayKey, isRoutineDoneToday, isMedicationTakenToday } from './lib/careStorage'

// ─────────────────────────────────────────────────────────────────────────────
// Platform detection — iPhone/iPad (incl. iPadOS desktop-mode UA) and whether
// CareSphere is running as an installed home-screen app.
// ─────────────────────────────────────────────────────────────────────────────
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches

// ─────────────────────────────────────────────────────────────────────────────
// Persistence — routines, medications, notes, scores, mood and display settings
// are stored in this browser. Joining Jitsi, BLE pairing, SOS sharing, and
// notification permissions are explicit external/device actions.
// ─────────────────────────────────────────────────────────────────────────────
function loadSaved() {
  try { return parseCareStorage(localStorage.getItem(STORAGE_KEY)) } catch { return {} }
}
const saved = loadSaved()

// A browser storage event is delivered only to other tabs. Propagate erasures
// across tabs without echoing ordinary writes back and forth.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY || event.newValue !== null) return
    Object.keys(saved).forEach(key => delete saved[key])
    window.dispatchEvent(new CustomEvent(RESET_LOCAL_DATA_EVENT, { detail: { closeOverlays: true } }))
  })
}

function usePersisted(key, initial) {
  const initialRef = useRef(initial)
  const skipWriteRef = useRef(false)
  const [resetGeneration, setResetGeneration] = useState(0)
  const [value, setValue] = useState(() => {
    if (saved[key] === undefined) return initialRef.current
    const normalized = normalizePersistedValue(key, saved[key], initialRef.current)
    saved[key] = normalized
    return normalized
  })

  useEffect(() => {
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }
    saved[key] = value
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)) } catch {}
  }, [key, value, resetGeneration])

  useEffect(() => {
    const resetToStoredValue = (incoming) => {
      const next = incoming && typeof incoming === 'object' && !Array.isArray(incoming) ? incoming : {}
      if (Object.prototype.hasOwnProperty.call(next, key)) {
        const normalized = normalizePersistedValue(key, next[key], initialRef.current)
        saved[key] = normalized
        setValue(normalized)
      } else {
        delete saved[key]
        skipWriteRef.current = true
        setValue(initialRef.current)
        setResetGeneration(generation => generation + 1)
      }
    }
    const handleReset = event => resetToStoredValue(event.detail)
    window.addEventListener(RESET_LOCAL_DATA_EVENT, handleReset)
    return () => window.removeEventListener(RESET_LOCAL_DATA_EVENT, handleReset)
  }, [key])

  return [value, setValue]
}

const todayKey = () => new Date().toDateString()

function formatCareDate(value) {
  if (!value || value === 'Just now') return 'Date not recorded'
  const date = new Date(value)
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function useLocalDayKey() {
  const [day, setDay] = useState(() => localDayKey())

  useEffect(() => {
    let timer
    const refresh = () => {
      const currentDay = localDayKey()
      setDay(previous => previous === currentDay ? previous : currentDay)
      window.clearTimeout(timer)
      const now = new Date()
      const nextMidnight = new Date(now)
      nextMidnight.setHours(24, 0, 1, 0)
      timer = window.setTimeout(refresh, Math.max(1000, nextMidnight.getTime() - now.getTime()))
    }
    const refreshOnReturn = () => {
      setDay(localDayKey())
      refresh()
    }
    refresh()
    window.addEventListener('focus', refreshOnReturn)
    document.addEventListener('visibilitychange', refreshOnReturn)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', refreshOnReturn)
      document.removeEventListener('visibilitychange', refreshOnReturn)
    }
  }, [])

  return day
}

function useEscapeToClose(enabled, onClose) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!enabled) return
    const handleKeyDown = event => {
      if (event.key === 'Escape') closeRef.current?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled])
}

function speak(text) {
  if (!('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.95
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

// ─────────────────────────────────────────────────────────────────────────────
// Jitsi Meet room — embedded with the official Jitsi Meet External API
// (https://meet.jit.si/external_api.js). Falls back to a plain iframe embed of
// the same real room if the script can't load.
// ─────────────────────────────────────────────────────────────────────────────
function JitsiRoom({ room, displayName = 'CareSphere Member' }) {
  const containerRef = useRef(null)
  const apiRef = useRef(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    let cancelled = false
    const ensureApiScript = () =>
      window.JitsiMeetExternalAPI
        ? Promise.resolve()
        : new Promise((resolve, reject) => {
            const s = document.createElement('script')
            s.src = 'https://meet.jit.si/external_api.js'
            s.async = true
            s.onload = resolve
            s.onerror = () => reject(new Error('external_api.js failed to load'))
            document.head.appendChild(s)
          })

    ensureApiScript()
      .then(() => {
        if (cancelled || !containerRef.current) return
        apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
          roomName: room,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          userInfo: { displayName },
          configOverwrite: { prejoinConfig: { enabled: true } },
        })
      })
      .catch(() => { if (!cancelled) setFallback(true) })

    return () => {
      cancelled = true
      try { apiRef.current?.dispose?.() } catch {}
      apiRef.current = null
    }
  }, [room, displayName])

  return (
    <div className="w-full h-full">
      <div ref={containerRef} className={`w-full h-full ${fallback ? 'hidden' : ''}`} />
      {fallback && (
        <iframe
          title={`Jitsi room ${room}`}
          src={`https://meet.jit.si/${room}#embed=true`}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
        />
      )}
    </div>
  )
}

function VideoModal({ session, displayName, onClose }) {
  useEscapeToClose(Boolean(session), onClose)
  if (!session) return null
  const url = `https://meet.jit.si/${session.room}`
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6">
      <div role="dialog" aria-modal="true" aria-label={session.title} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-bold text-sm text-white truncate">{session.title}</span>
            <span className="hidden sm:inline text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
              Encrypted Jitsi · no download
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition"
            >
              <span className="hidden sm:inline">Open full tab</span> <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button onClick={onClose} aria-label="Leave meeting" className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-black">
          <JitsiRoom room={session.room} displayName={displayName} />
        </div>
        {isIOS && (
          <div className="px-5 py-2.5 bg-sky-500/10 border-t border-sky-500/25 text-[11px] text-sky-200 leading-relaxed">
            📱 On iPhone, Safari manages camera & microphone permissions best — if video doesn't start in the embed, tap <span className="font-bold">"Open full tab"</span> above.
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Emergency SOS — call 911 via tel:, optionally attach real GPS coordinates,
// and share details only after the user selects a recipient in the system sheet.
// There is no automatic Care Circle push backend in this build.
// ─────────────────────────────────────────────────────────────────────────────
function SosModal({ open, onClose }) {
  const [shareStatus, setShareStatus] = useState(null)
  const [loc, setLoc] = useState(null)
  const [locState, setLocState] = useState('idle') // idle | loading | ok | error
  useEscapeToClose(open, onClose)

  if (!open) return null

  const attachLocation = () => {
    if (!('geolocation' in navigator)) { setLocState('error'); return }
    setLocState('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc(pos.coords)
        setLocState('ok')
      },
      () => setLocState('error'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="sos-title" className="bg-slate-900 border border-red-500/40 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-500/15 border border-red-500/40 rounded-2xl flex items-center justify-center mx-auto text-3xl">🚨</div>
        <div className="space-y-1.5">
          <h3 id="sos-title" className="text-xl font-black text-white">Emergency SOS</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real emergencies need real responders. Call 911 directly. CareSphere does not send a push alert; you can share a message{locState === 'ok' ? ' with your current location' : ''} using the system share sheet below.
          </p>
        </div>

        {locState === 'ok' && loc && (
          <a
            href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-sky-500/10 border border-sky-500/30 rounded-2xl p-3 text-xs text-sky-300 font-semibold text-left flex items-start gap-2"
          >
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Location attached: {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)} (±{Math.round(loc.accuracy)} m) — tap to view map</span>
          </a>
        )}
        {locState === 'error' && (
          <p className="text-xs text-amber-300 text-left">Location unavailable or permission denied. You can still share an SOS message without coordinates.</p>
        )}

        {shareStatus && (
          <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-3.5 text-xs text-sky-200 font-semibold text-left">
            {shareStatus}
          </div>
        )}

        <div className="space-y-2.5">
          <a
            href="tel:911"
            className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3.5 rounded-2xl text-sm shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 transition"
          >
            <PhoneCall className="w-4 h-4" /> Call 911 Now
          </a>
          {locState !== 'ok' && (
            <button
              onClick={attachLocation}
              disabled={locState === 'loading'}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl text-xs border border-slate-700 transition flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" /> {locState === 'loading' ? 'Locating…' : 'Attach my GPS location'}
            </button>
          )}
          <button
            onClick={async () => {
              const map = loc ? ` https://www.google.com/maps?q=${loc.latitude},${loc.longitude}` : ''
              const message = `CareSphere SOS: I am requesting help. Please check in now.${map}`
              try {
                if (navigator.share) {
                  await navigator.share({ title: 'CareSphere SOS', text: message })
                  setShareStatus('Share sheet closed. CareSphere cannot confirm message delivery.')
                } else if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(message)
                  setShareStatus('SOS message copied. Paste it into Messages or another app; CareSphere did not send it.')
                } else {
                  setShareStatus(message)
                }
              } catch (error) {
                if (error?.name !== 'AbortError') {
                  setShareStatus('Sharing was not completed. No alert was sent.')
                }
              }
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-2xl text-xs border border-slate-700 transition"
          >
            ↗ Share SOS details
          </button>
          <button onClick={onClose} className="w-full text-xs text-slate-400 hover:text-white font-bold py-2 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Toasts — in-app notifications for medication reminders and system events.
// ─────────────────────────────────────────────────────────────────────────────
function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), toast.ttl || 6000)
    return () => clearTimeout(t)
  }, [toast, onDismiss])

  return (
    <div
      role="status"
      className={`pointer-events-auto w-full sm:w-80 rounded-2xl border shadow-2xl p-4 backdrop-blur-md ${
        toast.kind === 'med'
          ? 'bg-rose-950/90 border-rose-500/40'
          : toast.kind === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/40'
            : 'bg-slate-900/95 border-slate-600/60'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">{toast.kind === 'med' ? '💊' : toast.kind === 'success' ? '✅' : 'ℹ️'}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-white">{toast.title}</div>
          {toast.body && <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.body}</div>}
          {toast.actions && (
            <div className="flex gap-2 mt-2.5">
              {toast.actions.map((a, i) => (
                <button
                  key={i}
                  onClick={() => { a.onClick?.(); onDismiss(toast.id) }}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition ${
                    i === 0 ? 'bg-white text-slate-900 hover:bg-slate-200' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => onDismiss(toast.id)} aria-label="Dismiss" className="text-slate-400 hover:text-white shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings — display name, accessibility, user-entered medication schedule & notifications.
// ─────────────────────────────────────────────────────────────────────────────
function MedicationScheduleEditor({ meds, setMeds, medsConfirmed, setMedsConfirmed }) {
  const [name, setName] = useState('')
  const [time, setTime] = useState('09:00')
  const [message, setMessage] = useState('')
  const scheduleReady = meds.length > 0 && meds.every(med =>
    med && typeof med.name === 'string' && med.name.trim().length > 0 &&
    typeof med.time === 'string' && /^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(med.time))

  const add = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const timeLabel = `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${period}`
    setMeds(current => [...current, { id: `${Date.now()}-${Math.random()}`, name: trimmed, time: timeLabel, takenOn: null }])
    setMedsConfirmed(false)
    setName('')
    setMessage('Schedule saved on this device. Review and confirm it below before reminders are enabled.')
  }

  return (
    <div className="border-t border-slate-800 pt-4 mt-3 space-y-3">
      <div>
        <h4 className="text-sm font-bold text-white">Medication schedule · local only</h4>
        <p className="text-[11px] text-slate-400 mt-1">Add only medicines and times confirmed by your care team or label. CareSphere does not prescribe, verify a dose, or check interactions.</p>
      </div>
      {meds.length === 0 ? (
        <p className="text-xs text-slate-500">No medication reminders are configured.</p>
      ) : meds.map(med => (
        <div key={med.id} className="flex items-center justify-between gap-3 bg-slate-800/60 rounded-xl px-3 py-2">
          <span className="text-xs text-slate-200">{med.name} · {med.time}</span>
          <button onClick={() => { setMeds(current => current.filter(item => item.id !== med.id)); setMedsConfirmed(false) }} className="text-[11px] font-bold text-rose-300 hover:text-rose-200">Remove</button>
        </div>
      ))}
      {meds.length > 0 && (
        <div className={`rounded-xl border p-3 space-y-2 ${medsConfirmed ? 'border-emerald-700/60 bg-emerald-950/20' : 'border-amber-700/60 bg-amber-950/20'}`}>
          <label className="flex items-start gap-2 text-xs text-slate-200 cursor-pointer">
            <input type="checkbox" checked={medsConfirmed} disabled={!scheduleReady} onChange={event => setMedsConfirmed(event.target.checked)} aria-label="Confirm medication schedule" className="mt-0.5 accent-emerald-500 disabled:opacity-40" />
            <span>I reviewed every saved medication name and reminder time against my medication label or care-team instructions.</span>
          </label>
          <p className="text-[11px] text-slate-400">
            {medsConfirmed
              ? 'Reminders are enabled while CareSphere is running. Browser notifications require permission; this app cannot reliably schedule reminders after the browser is closed.'
              : scheduleReady
                ? 'Reminders are paused until you confirm. Schedules saved by an earlier version are kept, but are not trusted or used until reviewed.'
                : 'Complete or remove any blank/invalid saved entries before confirming this schedule.'}
          </p>
        </div>
      )}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <input value={name} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') add() }} placeholder="Medication name" aria-label="New medication name" className="min-w-0 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500" />
        <input type="time" value={time} onChange={event => setTime(event.target.value)} aria-label="Reminder time" className="bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white" />
        <button onClick={add} disabled={!name.trim()} className="bg-emerald-700 disabled:opacity-40 text-xs font-bold text-white px-3 py-2 rounded-xl">Add</button>
      </div>
      {message && <p className="text-[11px] text-emerald-300">{message}</p>}
    </div>
  )
}

function SettingsModal({ open, onClose, settings, update, notifyState, enableNotifications, meds, setMeds, medsConfirmed, setMedsConfirmed, onExportData, onClearLocalData, localDataBytes }) {
  const [confirmClear, setConfirmClear] = useState(false)
  const [privacyMessage, setPrivacyMessage] = useState('')
  useEffect(() => {
    if (!open) {
      setConfirmClear(false)
      setPrivacyMessage('')
    }
  }, [open])
  useEscapeToClose(open, onClose)
  if (!open) return null

  const formatBytes = (bytes) => bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(1)} KB`
  const handleExport = () => {
    const success = onExportData()
    setPrivacyMessage(success
      ? 'A private JSON export was downloaded. Review it before sharing; it contains sensitive information.'
      : 'The export could not be created in this browser.')
  }
  const handleClear = () => {
    const success = onClearLocalData()
    setConfirmClear(false)
    setPrivacyMessage(success
      ? 'Saved CareSphere personal data was cleared from this browser.'
      : 'This browser did not allow CareSphere to remove its saved data.')
  }
  const Row = ({ label, hint, children }) => (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-slate-800 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-bold text-white">{label}</div>
        {hint && <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
  const Toggle = ({ on, onClick, label }) => (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`w-12 h-7 rounded-full transition relative ${on ? 'bg-emerald-500' : 'bg-slate-700'}`}
    >
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-1 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2">
          <h3 id="settings-title" className="text-lg font-black text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" /> Settings & Accessibility
          </h3>
          <button onClick={onClose} aria-label="Close settings" className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <Row label="Display name" hint="Shown when you join video coffee circles.">
          <input
            type="text"
            value={settings.name}
            onChange={(e) => update({ name: e.target.value.slice(0, 24) })}
            aria-label="Display name"
            className="w-36 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </Row>

        <Row label="Text size" hint="Larger text across the whole app — good for low vision.">
          <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-1 gap-1">
            {[
              { id: 'md', label: 'A' },
              { id: 'lg', label: 'A+' },
              { id: 'xl', label: 'A++' },
            ].map((o) => (
              <button
                key={o.id}
                onClick={() => update({ textScale: o.id })}
                aria-pressed={settings.textScale === o.id}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                  settings.textScale === o.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Row>

        <Row label="High contrast" hint="Brightens grey text and borders for glare, ageing eyes, or cortical vision needs.">
          <Toggle on={settings.highContrast} onClick={() => update({ highContrast: !settings.highContrast })} label="High contrast" />
        </Row>

        <Row label="Voice reminders" hint="Speaks medication and routine prompts aloud (browser speech synthesis).">
          <Toggle on={settings.voice} onClick={() => update({ voice: !settings.voice })} label="Voice reminders" />
        </Row>

        <Row label="Preview reminder" hint="Hear a generic voice preview; a saved schedule preview never records a dose or enables reminders.">
          <button
            onClick={() => {
              speak('This is a CareSphere reminder preview. Please follow the medication instructions you reviewed with your care team.')
              window.__careSphereTestReminder?.()
            }}
            className="bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white px-4 py-2 rounded-xl border border-slate-700 transition"
          >
            ▶ Test
          </button>
        </Row>

        <Row
          label="Browser notifications"
          hint={
            notifyState === 'granted'
              ? 'Allowed. Reminders run while this page is open; background delivery may vary by browser.'
              : notifyState === 'unsupported' && isIOS
                ? 'On iPhone, enable by installing to the Home Screen first (Share → Add to Home Screen), then revisit Settings.'
                : 'Optional browser alerts while the page is open; no reliable closed-page scheduling.'
          }
        >
          {notifyState === 'granted' ? (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> On</span>
          ) : notifyState === 'unsupported' ? (
            <span className="text-[11px] text-slate-400 font-semibold max-w-40 text-right">Not available in this browser</span>
          ) : (
            <button onClick={enableNotifications} className="bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white px-4 py-2 rounded-xl border border-slate-700 transition">
              Enable
            </button>
          )}
        </Row>

        <MedicationScheduleEditor meds={meds} setMeds={setMeds} medsConfirmed={medsConfirmed} setMedsConfirmed={setMedsConfirmed} />

        <section className="mt-5 rounded-2xl border border-emerald-800/60 bg-gradient-to-br from-emerald-950/60 to-slate-950 p-4 sm:p-5 space-y-4" aria-labelledby="privacy-data-title">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-300"><Shield className="w-5 h-5" /></div>
            <div className="min-w-0 flex-1">
              <h4 id="privacy-data-title" className="text-sm font-bold text-white">Privacy & your data</h4>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                CareSphere saves your entries in this browser profile ({formatBytes(localDataBytes)}). The web app does not encrypt localStorage; anyone with access to this unlocked browser profile may be able to read it. No CareSphere account or sync server is configured.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button onClick={handleExport} className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2.5 text-xs font-bold text-white transition">
              <Download className="w-4 h-4 text-emerald-300" /> Download private JSON export
            </button>
            {!confirmClear ? (
              <button onClick={() => { setPrivacyMessage(''); setConfirmClear(true) }} className="flex items-center justify-center gap-2 rounded-xl border border-rose-900/70 bg-rose-950/50 hover:bg-rose-950 px-3 py-2.5 text-xs font-bold text-rose-200 transition">
                <X className="w-4 h-4" /> Erase saved care data
              </button>
            ) : (
              <div className="sm:col-span-2 rounded-xl border border-rose-700/60 bg-rose-950/40 p-3 space-y-3" role="group" aria-labelledby="clear-care-data-title">
                <div>
                  <h5 id="clear-care-data-title" className="text-xs font-bold text-rose-100">Erase this browser's CareSphere data?</h5>
                  <p className="text-[11px] text-rose-200/80 mt-1">This removes your saved name, routines, medications, notes, mood history and game score, and clears temporary visit/vitals data in other open CareSphere tabs. It cannot be undone. Browser permissions, installed-app files and data in other browser profiles are not affected.</p>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setConfirmClear(false)} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">Cancel</button>
                  <button onClick={handleClear} className="rounded-lg bg-rose-700 hover:bg-rose-600 px-3 py-2 text-xs font-bold text-white">Erase local data</button>
                </div>
              </div>
            )}
          </div>
          {privacyMessage && <p className="text-[11px] text-emerald-200" role="status" aria-live="polite">{privacyMessage}</p>}
          <p className="text-[10px] text-slate-500 leading-relaxed">A downloaded export is no longer protected by CareSphere. Store it carefully and share it only with a person you trust. Optional third-party features such as Jitsi and SOS sharing operate only when you choose them.</p>
        </section>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Vitals helpers
// ─────────────────────────────────────────────────────────────────────────────
function Sparkline({ data, stroke = '#34d399' }) {
  if (!data || data.length < 2) {
    return <div className="h-12 flex items-center text-[11px] text-slate-500">Awaiting stream data…</div>
  }
  const min = Math.min(...data) - 2
  const max = Math.max(...data) + 2
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${30 - ((v - min) / (max - min || 1)) * 28}`)
    .join(' ')
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="w-full h-12" aria-hidden="true">
      <polyline
        points={pts} fill="none" stroke={stroke} strokeWidth="1.5"
        vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"
      />
    </svg>
  )
}

const STATUS_STYLES = {
  live: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  simulated: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  connecting: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  unsupported: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  disconnected: 'bg-slate-700/40 text-slate-300 border-slate-600',
}

function SensorChip({ mode, label }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${STATUS_STYLES[mode] || STATUS_STYLES.disconnected}`}>
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Therapy games
// ─────────────────────────────────────────────────────────────────────────────
const EMOTIONS = [
  { name: 'Happy', emoji: '😊' },
  { name: 'Calm', emoji: '😌' },
  { name: 'Excited', emoji: '🤩' },
  { name: 'Tired', emoji: '😴' },
]

function EmotionMatch({ onPoint }) {
  const [target, setTarget] = useState(EMOTIONS[0])
  const [feedback, setFeedback] = useState('')
  const [streak, setStreak] = useState(0)

  const pick = (emo) => {
    if (emo.name === target.name) {
      celebrateConfetti({ particleCount: 28, spread: 55, origin: { y: 0.7 } })
      setStreak(s => s + 1)
      setFeedback('✨ Great reading!')
      onPoint()
      setTimeout(() => {
        setTarget(EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)])
        setFeedback('')
      }, 850)
    } else {
      setFeedback('Almost — look again 💙')
      setStreak(0)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-400 font-extrabold">
          <Brain className="w-4 h-4 text-indigo-400" /> Emoji-matching practice
        </div>
        <span className="text-xs bg-indigo-500/15 text-indigo-300 px-2.5 py-1 rounded-full font-bold border border-indigo-500/30">
          Streak {streak}
        </span>
      </div>
      <p className="text-xs text-slate-400 -mt-3">Optional emoji-matching practice. Real people show feelings in many different ways; this game is not an assessment.</p>
      <div className="text-center py-5 bg-slate-950 rounded-2xl border border-slate-800">
        <div className="text-5xl sm:text-6xl">{feedback ? '' : target.emoji}</div>
        <div className={`text-xs font-bold mt-2 h-4 ${feedback.startsWith('✨') ? 'text-emerald-400' : 'text-slate-400'}`}>{feedback}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {EMOTIONS.map((emo) => (
          <button
            key={emo.name}
            onClick={() => pick(emo)}
            aria-label={`Option ${emo.name}`}
            className="py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-3xl transition hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {emo.emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

const PAD_STYLES = [
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-amber-500 to-orange-600',
  'from-purple-500 to-fuchsia-600',
]

function PatternRecall() {
  const [seq, setSeq] = useState([])
  const [step, setStep] = useState(0)
  const [lit, setLit] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | showing | input | wait | over
  const [best, setBest] = usePersisted('bestPattern', 0)
  const timers = useRef([])

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => clearTimers, [])

  const rand = () => Math.floor(Math.random() * 4)

  const play = (s) => {
    clearTimers()
    setPhase('showing'); setStep(0)
    s.forEach((pad, i) => {
      timers.current.push(setTimeout(() => setLit(pad), i * 950 + 400))
      timers.current.push(setTimeout(() => setLit(null), i * 950 + 400 + 520))
    })
    timers.current.push(setTimeout(() => setPhase('input'), s.length * 950 + 550))
  }

  const start = () => {
    const s = [rand()]
    setSeq(s)
    play(s)
  }

  const tap = (i) => {
    if (phase !== 'input') return
    setLit(i)
    timers.current.push(setTimeout(() => setLit(null), 220))
    if (seq[step] === i) {
      if (step === seq.length - 1) {
        const next = [...seq, rand()]
        setSeq(next)
        setPhase('wait')
        if (next.length > best) setBest(next.length)
        celebrateConfetti({ particleCount: 24, spread: 60, origin: { y: 0.65 } })
        timers.current.push(setTimeout(() => play(next), 850))
      } else {
        setStep(step + 1)
      }
    } else {
      setPhase('over')
    }
  }

  const banner = {
    idle: 'Press start — I’ll flash a pattern, you repeat it.',
    showing: '👀 Watch the pattern…',
    input: 'Your turn — repeat the pattern!',
    wait: 'Nice! Level up…',
    over: `Round ended at level ${seq.length}. Try again?`,
  }[phase]

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-400 font-extrabold">
          <Gamepad2 className="w-4 h-4 text-emerald-400" /> Pattern Recall
        </div>
        <span className="text-xs bg-emerald-500/15 text-emerald-300 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1">
          <Award className="w-3.5 h-3.5" /> Best: {best}
        </span>
      </div>
      <p className="text-xs text-slate-400 -mt-3">A short pattern-matching game for optional practice. Your score is not a measure of memory or cognitive health.</p>
      <div className="text-center text-xs font-bold text-slate-300 min-h-5">{banner}</div>
      <div className="grid grid-cols-2 gap-3">
        {PAD_STYLES.map((pad, i) => (
          <button
            key={i}
            onClick={() => tap(i)}
            disabled={phase !== 'input'}
            aria-label={`Pattern pad ${i + 1}`}
            className={`h-20 sm:h-24 rounded-2xl bg-gradient-to-br ${pad} transition duration-150 ${
              lit === i ? 'brightness-150 scale-[1.03] ring-4 ring-white/70' : 'opacity-70 hover:opacity-90'
            } disabled:cursor-default focus:outline-none focus:ring-2 focus:ring-white/40`}
          />
        ))}
      </div>
      <button
        onClick={start}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-2xl text-xs shadow-lg shadow-emerald-500/20 transition"
      >
        {phase === 'idle' || phase === 'over' ? '▶ Start / Restart' : `Level ${seq.length} in progress`}
      </button>
    </div>
  )
}

const SOUNDSCAPES = [
  { id: 'rain', name: 'Rain', icon: CloudRain },
  { id: 'ocean', name: 'Waves', icon: Waves },
  { id: 'forest', name: 'Forest', icon: TreePine },
  { id: 'fire', name: 'Hearth', icon: Flame },
]

function Soundscapes() {
  const [playing, setPlaying] = useState(null)

  useEffect(() => () => soundEngine.stop(), [])

  const toggle = (id) => {
    if (playing === id) {
      soundEngine.stop()
      setPlaying(null)
    } else {
      soundEngine.play(id)
      setPlaying(id)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-400 font-extrabold">
          <Volume2 className="w-4 h-4 text-cyan-400" /> Sensory Soundscapes
        </div>
        {playing && (
          <button onClick={() => toggle(playing)} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-full font-bold border border-slate-700">
            ⏸ Stop
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400 -mt-3">
        Generated live with the Web Audio API and works offline. Audio preferences vary; start at a comfortable device volume and stop anytime.
      </p>
      <div className="grid grid-cols-2 gap-3 flex-1">
        {SOUNDSCAPES.map((s) => {
          const Icon = s.icon
          const active = playing === s.id
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              aria-pressed={active}
              className={`rounded-2xl p-4 border transition text-left ${
                active
                  ? 'bg-cyan-500/15 border-cyan-400/60 ring-2 ring-cyan-400/50'
                  : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 mb-2 ${active ? 'text-cyan-300' : 'text-slate-300'}`} />
              <div className="text-sm font-bold text-white">{s.name}</div>
              <div className={`text-[10px] font-semibold ${active ? 'text-cyan-300' : 'text-slate-500'}`}>
                {active ? '● Playing' : 'Tap to play'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const PHASES = [
  { name: 'Breathe in', seconds: 4, scale: 'scale-100' },
  { name: 'Hold', seconds: 4, scale: 'scale-100' },
  { name: 'Breathe out', seconds: 6, scale: 'scale-[0.55]' },
]

function BreathingCoach() {
  const [running, setRunning] = useState(false)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [count, setCount] = useState(PHASES[0].seconds)
  const [cycles, setCycles] = useState(0)

  useEffect(() => {
    if (!running) return
    if (count === 0) {
      const nextIdx = (phaseIdx + 1) % PHASES.length
      if (nextIdx === 0) setCycles(c => c + 1)
      setPhaseIdx(nextIdx)
      setCount(PHASES[nextIdx].seconds)
      return
    }
    const t = setTimeout(() => setCount(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [running, count, phaseIdx])

  const toggle = () => {
    if (running) {
      setRunning(false)
    } else {
      setPhaseIdx(0); setCount(PHASES[0].seconds); setRunning(true)
    }
  }

  const phase = PHASES[phaseIdx]

  return (
    <div className="bg-gradient-to-br from-teal-950 to-slate-900 border border-teal-500/30 rounded-3xl p-6 sm:p-7 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-teal-300 font-extrabold">
          <Wind className="w-4 h-4" /> Guided Breathing 4·4·6
        </div>
        <span className="text-xs bg-teal-500/15 text-teal-300 px-2.5 py-1 rounded-full font-bold border border-teal-500/30">
          {cycles} cycles
        </span>
      </div>
      <p className="text-xs text-teal-100/60 -mt-3">A paced-breathing exercise, not treatment. The breath hold is optional—pause or stop if it feels uncomfortable.</p>
      <div className="flex-1 flex items-center justify-center py-4">
        <div className="relative w-36 h-36 flex items-center justify-center">
          <div
            className={`absolute inset-0 rounded-full bg-teal-500/20 border-2 border-teal-400/60 transition-transform ease-in-out ${phase.scale}`}
            style={{ transitionDuration: `${phase.seconds}s` }}
          />
          <div className="relative z-10 text-center">
            <div className="text-3xl font-black text-white">{count}</div>
            <div className="text-[11px] font-bold text-teal-300 uppercase tracking-widest">{running ? phase.name : 'Paused'}</div>
          </div>
        </div>
      </div>
      <button
        onClick={toggle}
        className="w-full bg-teal-600 hover:bg-teal-500 text-white font-black py-3 rounded-2xl text-xs shadow-lg shadow-teal-500/20 transition"
      >
        {running ? '⏸ Pause' : '▶ Begin session'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Mood check-in — daily emotional pulse, visualised over two weeks.
// ─────────────────────────────────────────────────────────────────────────────
const MOODS = [
  { score: 1, emoji: '😞', label: 'Struggling', color: 'bg-rose-500' },
  { score: 2, emoji: '😕', label: 'Low', color: 'bg-orange-400' },
  { score: 3, emoji: '😐', label: 'Okay', color: 'bg-amber-300' },
  { score: 4, emoji: '🙂', label: 'Good', color: 'bg-lime-400' },
  { score: 5, emoji: '😄', label: 'Great', color: 'bg-emerald-400' },
]

function MoodCheckIn({ moods, setMoods }) {
  const today = todayKey()
  const todayMood = moods.find(m => m.date === today)

  const setToday = (score) => {
    setMoods(ms => {
      const rest = ms.filter(m => m.date !== today)
      return [...rest, { date: today, score, ts: Date.now() }].slice(-30)
    })
    celebrateConfetti({ particleCount: 16 })
  }

  const last14 = [...moods].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-14)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base text-white flex items-center gap-2">
          <Smile className="w-4 h-4 text-amber-300" /> Daily mood check-in
        </h3>
        <span className="text-xs text-slate-500">one tap, saved privately</span>
      </div>
      <div className="flex justify-between gap-2">
        {MOODS.map(m => (
          <button
            key={m.score}
            onClick={() => setToday(m.score)}
            aria-label={`Feeling ${m.label}`}
            aria-pressed={todayMood?.score === m.score}
            className={`flex-1 py-3 rounded-2xl border text-2xl transition ${
              todayMood?.score === m.score
                ? 'bg-amber-500/15 border-amber-400/60 ring-2 ring-amber-400/50 scale-105'
                : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800'
            }`}
          >
            {m.emoji}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{todayMood ? `Today: feeling ${MOODS[todayMood.score - 1].label.toLowerCase()}` : 'How are you feeling right now?'}</span>
        {last14.length > 0 && (
          <span className="flex items-center gap-1" title="Last check-ins">
            {last14.map(m => (
              <span key={m.date} className={`w-2.5 h-2.5 rounded-full ${MOODS[m.score - 1].color}`} title={m.date} />
            ))}
          </span>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// v2.3 groundwork — user-selected, on-device visit-prep brief. This is an
// editable handoff aid, not a medical record, diagnosis, or clinical summary.
// ─────────────────────────────────────────────────────────────────────────────
function VisitBriefModal({ open, onClose, displayName, meds, medsConfirmed, notes, moods, hrRecords, spo2, bp }) {
  const [includeName, setIncludeName] = useState(false)
  const [includeMeds, setIncludeMeds] = useState(false)
  const [includeMoods, setIncludeMoods] = useState(false)
  const [includeNotes, setIncludeNotes] = useState(false)
  const [includeLiveVitals, setIncludeLiveVitals] = useState(false)
  const [includeSimulatedVitals, setIncludeSimulatedVitals] = useState(false)
  const [visitQuestions, setVisitQuestions] = useState('')
  const [downloadMessage, setDownloadMessage] = useState('')

  useEffect(() => {
    if (!open) return
    setIncludeName(false)
    setIncludeMeds(false)
    setIncludeMoods(false)
    setIncludeNotes(false)
    setIncludeLiveVitals(false)
    setIncludeSimulatedVitals(false)
    setVisitQuestions('')
    setDownloadMessage('')
  }, [open])
  useEscapeToClose(open, onClose)

  if (!open) return null

  const brief = buildVisitBrief({
    displayName,
    meds,
    medsConfirmed,
    notes,
    moods,
    hrRecords,
    spo2,
    bp,
    includeName,
    includeMeds,
    includeMoods,
    includeNotes,
    includeLiveVitals,
    includeSimulatedVitals,
    visitQuestions,
    moodLabels: Object.fromEntries(MOODS.map(mood => [mood.score, mood.label])),
  })

  const downloadBrief = () => {
    try {
      const url = URL.createObjectURL(new Blob([brief], { type: 'text/plain;charset=utf-8' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `caresphere-visit-prep-${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 10000)
      setDownloadMessage('Downloaded to this device. Review every line before sharing.')
    } catch {
      setDownloadMessage('CareSphere could not create the download in this browser.')
    }
  }

  const Choice = ({ checked, onChange, title, detail }) => (
    <label className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-800/70 p-3 cursor-pointer hover:border-emerald-700/70">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="mt-0.5 accent-emerald-500" />
      <span className="min-w-0"><span className="block text-xs font-bold text-slate-100">{title}</span><span className="mt-0.5 block text-[10px] leading-relaxed text-slate-400">{detail}</span></span>
    </label>
  )

  return (
    <div className="fixed inset-0 z-[55] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="visit-brief-title" className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto space-y-5" onClick={event => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-700/50 bg-sky-950/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-200"><FileText className="h-3.5 w-3.5" /> Local preview · no sync</div>
            <h2 id="visit-brief-title" className="mt-3 text-xl font-black text-white">Prepare for a care visit</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">Choose exactly what to include. The summary is assembled on this device from your entries; it is not a medical record, diagnosis, or clinical advice, and nothing is sent automatically.</p>
          </div>
          <button onClick={onClose} aria-label="Close visit preparation" className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Choice checked={includeName} onChange={setIncludeName} title="Display name" detail="Optional. Off by default." />
          <Choice checked={includeMeds} onChange={setIncludeMeds} title="Medication reminders" detail="User-entered names and times; review/confirmation status is shown." />
          <Choice checked={includeMoods} onChange={setIncludeMoods} title="Mood check-ins" detail="Self-reports from this browser. They are not a clinical measure." />
          <Choice checked={includeNotes} onChange={setIncludeNotes} title="Care notes" detail="Private note text may be sensitive; include only after review." />
          <Choice checked={includeLiveVitals} onChange={setIncludeLiveVitals} title="Live BLE heart-rate samples" detail="Only readings labeled LIVE_BLE from the current browser session." />
          <Choice checked={includeSimulatedVitals} onChange={setIncludeSimulatedVitals} title="Simulated demonstrations" detail="Optional demo values, explicitly labeled SIMULATED and not measured." />
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-bold text-white">Questions or topics to discuss · optional</span>
          <textarea value={visitQuestions} onChange={event => setVisitQuestions(event.target.value.slice(0, 1200))} rows={3} maxLength={1200} placeholder="Write your own questions or topics. This draft is temporary and is not saved unless you download the brief." className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none" />
        </label>

        <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
          <h3 className="mb-2 text-xs font-bold text-slate-200">Exact file preview</h3>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-300">{brief}</pre>
        </div>
        <footer className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[10px] leading-relaxed text-slate-500">Downloaded files are outside CareSphere's local privacy controls. Verify all names, dates, and sources before sharing.</p>
          <div className="flex gap-2 shrink-0">
            <button onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800">Close</button>
            <button onClick={downloadBrief} className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-500"><Download className="h-4 w-4" /> Download .txt</button>
          </div>
        </footer>
        {downloadMessage && <p role="status" className="text-[11px] text-emerald-300">{downloadMessage}</p>}
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [videoSession, setVideoSession] = useState(null)
  const [sosOpen, setSosOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [visitBriefOpen, setVisitBriefOpen] = useState(false)
  const [installTipDismissed, setInstallTipDismissed] = useState(false)
  const showInstallTip = isIOS && !isStandalone && !installTipDismissed
  const localDay = useLocalDayKey()

  // Settings (persisted)
  const [settings, setSettings] = usePersisted('settings', {
    name: 'Alex', textScale: 'md', highContrast: false, voice: false,
  })
  const updateSettings = (patch) => setSettings(s => ({ ...s, ...patch }))

  // Apply accessibility preferences to <html>
  useEffect(() => {
    document.documentElement.dataset.textscale = settings.textScale
    if (settings.highContrast) document.documentElement.dataset.contrast = 'high'
    else delete document.documentElement.dataset.contrast
  }, [settings.textScale, settings.highContrast])

  const [notifyState, setNotifyState] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  )
  const enableNotifications = () => {
    if (typeof Notification === 'undefined') return
    Notification.requestPermission().then(p => setNotifyState(p))
  }

  // ── Toasts ──
  const [toasts, setToasts] = useState([])
  const dismissToast = useCallback((id) => setToasts(items => items.filter(toast => toast.id !== id)), [])
  const pushToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    setToasts(items => [...items.slice(-3), { id, ...toast }])
    return id
  }, [])

  // ── Daily living state (persisted) ──
  const [routines, setRoutines] = usePersisted('routines', [
    { id: 1, text: 'Morning hydration 💧', completedOn: null },
    { id: 2, text: '10-minute brain game 🧩', completedOn: null },
    { id: 3, text: 'Join a coffee circle ☕', completedOn: null },
    { id: 4, text: 'Evening stretch & wind-down 🌿', completedOn: null },
  ])
  // Never prefill medications. Older saved schedules remain visible for review,
  // but reminders stay paused until the user explicitly confirms every entry.
  const [meds, setMeds] = usePersisted('meds', [])
  const [medsConfirmed, setMedsConfirmed] = usePersisted('medsConfirmed', false)
  const [notes, setNotes] = usePersisted('notes', [])
  const [moods, setMoods] = usePersisted('moods', [])
  const [noteDraft, setNoteDraft] = useState('')
  const [routineDraft, setRoutineDraft] = useState('')
  const [routineEditorOpen, setRoutineEditorOpen] = useState(false)
  const [emotionScore, setEmotionScore] = usePersisted('emotionScore', 0)

  const toggleRoutine = (id) => {
    const now = new Date()
    const day = localDayKey(now)
    const current = routines.find(routine => routine.id === id)
    if (!current) return
    const wasDone = isRoutineDoneToday(current, now)
    setRoutines(items => items.map(routine => routine.id === id
      ? { ...routine, completedOn: wasDone ? null : day }
      : routine))
    if (!wasDone) celebrateConfetti({ particleCount: 14 })
  }
  const addRoutine = (event) => {
    event.preventDefault()
    const text = routineDraft.trim().slice(0, 120)
    if (!text || routines.length >= 24) return
    const id = globalThis.crypto?.randomUUID?.() || `routine-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setRoutines(items => [...items, { id, text, completedOn: null }])
    setRoutineDraft('')
  }
  const removeRoutine = (id) => setRoutines(items => items.filter(routine => routine.id !== id))

  const toggleMed = (id) => {
    const now = new Date()
    const day = localDayKey(now)
    const current = meds.find(medication => medication.id === id)
    if (!current) return
    const wasTaken = isMedicationTakenToday(current, now)
    setMeds(items => items.map(medication => medication.id === id
      ? { ...medication, takenOn: wasTaken ? null : day }
      : medication))
    if (!wasTaken) celebrateConfetti({ particleCount: 18 })
  }
  const postNote = (e) => {
    e.preventDefault()
    if (!noteDraft.trim()) return
    setNotes(ns => [{
      id: Date.now(), date: new Date().toISOString(), author: `You (${settings.name})`, note: noteDraft.trim(),
    }, ...ns])
    setNoteDraft('')
    pushToast({ kind: 'success', title: 'Note saved', body: 'Saved in this browser only; no Care Circle sync server is connected.' })
  }

  // ── Medication reminder engine ──
  // Checks every 15 s whether a scheduled dose is due, then raises a toast,
  // an optional browser notification, and an optional spoken prompt.
  const notifiedRef = useRef(new Set())
  const snoozeTimersRef = useRef({})
  const medsRef = useRef(meds)
  const medsConfirmedRef = useRef(medsConfirmed)
  medsRef.current = meds
  medsConfirmedRef.current = medsConfirmed

  const fireMedReminder = (med, key) => {
    pushToast({
      kind: 'med',
      title: `Time for ${med.name.split(' (')[0]}`,
      body: `Scheduled at ${med.time}. Tap "Mark taken" to save a self-report, or snooze.`,
      ttl: 30000,
      actions: [
        { label: '✓ Taken', onClick: () => { toggleMed(med.id); if (settings.voice) speak('Thank you. Dose check-in saved.') } },
        { label: 'Snooze 10 min', onClick: () => {
            window.clearTimeout(snoozeTimersRef.current[key])
            snoozeTimersRef.current[key] = window.setTimeout(() => {
              delete snoozeTimersRef.current[key]
              const latest = medsRef.current.find(item => item.id === med.id)
              if (!medsConfirmedRef.current || !latest || isMedicationTakenToday(latest, new Date())) return
              fireMedReminder(latest, key)
            }, 10 * 60 * 1000)
          } },
      ],
    })
    if (settings.voice) speak(`This is your CareSphere reminder. Time to take ${med.name.split(' (')[0]}.`)
    if (notifyState === 'granted' && typeof Notification !== 'undefined') {
      try { new Notification('CareSphere — medication reminder', { body: `${med.name} — scheduled ${med.time}`, tag: key }) } catch {}
    }
  }

  useEffect(() => {
    const parseMedTime = (t) => {
      const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(t)
      if (!m) return null
      let h = Number(m[1]) % 12
      if (/pm/i.test(m[3])) h += 12
      const d = new Date()
      d.setHours(h, Number(m[2]), 0, 0)
      return d
    }
    const check = () => {
      if (!medsConfirmed) return
      const now = new Date()
      const day = localDayKey(now)
      meds.forEach(med => {
        if (!med || isMedicationTakenToday(med, now) || typeof med.name !== 'string' || !med.name.trim()) return
        const due = parseMedTime(med.time)
        if (!due) return
        const diff = now - due
        const key = `${med.id}-${day}`
        if (diff >= 0 && diff < 120000 && !notifiedRef.current.has(key)) {
          notifiedRef.current.add(key)
          fireMedReminder(med, key)
        }
      })
    }
    check()
    const iv = setInterval(check, 15000)
    return () => clearInterval(iv)
  }, [meds, medsConfirmed, settings.voice, notifyState]) // eslint-disable-line react-hooks/exhaustive-deps

  // Demo hook for the "Preview reminder" button in Settings.
  useEffect(() => {
    window.__careSphereTestReminder = () => {
      if (meds.length === 0) {
        pushToast({ kind: 'info', title: 'No medication schedule', body: 'Add a personal reminder schedule in Settings and review each entry against your current instructions.' })
        return
      }
      if (!medsConfirmed) {
        pushToast({ kind: 'info', title: 'Schedule not confirmed', body: 'Review every saved name and time in Settings. This preview will not enable reminders or record a dose.' })
        return
      }
      const med = meds.find(item => !isMedicationTakenToday(item)) || meds[0]
      pushToast({
        kind: 'med',
        title: `Reminder preview · ${med.name.split(' (')[0]}`,
        body: `Preview only. Your saved reminder time is ${med.time}; no dose is recorded.`,
        ttl: 12000,
      })
    }
    return () => { delete window.__careSphereTestReminder }
  }, [meds, medsConfirmed]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Vitals ──
  const [hr, setHr] = useState(null)
  const [hrHistory, setHrHistory] = useState([])
  const [hrRecords, setHrRecords] = useState([])
  const [hrStatus, setHrStatus] = useState({ mode: 'disconnected', message: 'No sensor connected. Pair a monitor or choose a labeled demo.' })
  const hrModeRef = useRef('disconnected')
  const hrStopRef = useRef(null)
  const hrConnectionGenerationRef = useRef(0)
  const spotCheckTimersRef = useRef([])
  const [connectingHr, setConnectingHr] = useState(false)

  const receiveHeartRate = (bpm) => {
    const timestamp = new Date().toISOString()
    const source = hrModeRef.current === 'live' ? 'LIVE_BLE' : 'SIMULATED'
    setHr(bpm)
    setHrHistory(history => [...history.slice(-35), bpm])
    setHrRecords(records => [...records.slice(-499), { timestamp, metric: 'heart_rate_bpm', value: bpm, source }])
  }
  const receiveHeartRateStatus = (status, generation) => {
    if (generation !== hrConnectionGenerationRef.current) return
    hrModeRef.current = status.mode
    setHrStatus(status)
    if (status.mode === 'disconnected' || status.mode === 'unsupported') {
      setHr(null)
      setConnectingHr(false)
      hrStopRef.current = null
    }
  }

  const connectHr = async () => {
    if (hrStopRef.current || connectingHr) return
    const generation = ++hrConnectionGenerationRef.current
    setConnectingHr(true)
    const stop = await connectHeartRateMonitor(
      receiveHeartRate,
      status => receiveHeartRateStatus(status, generation),
    )
    if (generation !== hrConnectionGenerationRef.current) {
      stop?.()
      return
    }
    hrStopRef.current = stop
    setConnectingHr(false)
  }
  const startHeartRateDemo = () => {
    if (hrStopRef.current || connectingHr) return
    const generation = ++hrConnectionGenerationRef.current
    hrStopRef.current = startSimulatedHeartRateMonitor(
      receiveHeartRate,
      status => receiveHeartRateStatus(status, generation),
    )
    setConnectingHr(false)
  }
  const disconnectHr = () => {
    hrConnectionGenerationRef.current += 1
    hrStopRef.current?.()
    hrStopRef.current = null
    setConnectingHr(false)
    setHr(null)
    setHrHistory([])
    setHrRecords([])
    hrModeRef.current = 'disconnected'
    setHrStatus({ mode: 'disconnected', message: 'Disconnected. No current heart-rate reading is displayed.' })
  }
  useEffect(() => () => {
    hrStopRef.current?.()
    spotCheckTimersRef.current.forEach(timer => window.clearTimeout(timer))
  }, [])

  const [spo2, setSpo2] = useState(null)
  const [spo2Phase, setSpo2Phase] = useState('idle')
  const scheduleSpotCheck = (callback, delay) => {
    const timer = window.setTimeout(() => {
      spotCheckTimersRef.current = spotCheckTimersRef.current.filter(item => item !== timer)
      callback()
    }, delay)
    spotCheckTimersRef.current.push(timer)
    return timer
  }
  const clearSpotCheckTimers = () => {
    spotCheckTimersRef.current.forEach(timer => window.clearTimeout(timer))
    spotCheckTimersRef.current = []
  }
  const clearTransientCareData = ({ closeOverlays = false } = {}) => {
    setNoteDraft('')
    setRoutineDraft('')
    setRoutineEditorOpen(false)
    disconnectHr()
    clearSpotCheckTimers()
    setSpo2(null)
    setSpo2Phase('idle')
    setBp(null)
    setBpPhase('idle')
    setToasts([])
    setVisitBriefOpen(false)
    setVideoSession(null)
    setSosOpen(false)
    if (closeOverlays) setSettingsOpen(false)
    notifiedRef.current.clear()
    Object.values(snoozeTimersRef.current).forEach(timer => window.clearTimeout(timer))
    snoozeTimersRef.current = {}
  }
  useEffect(() => {
    const handleLocalDataReset = event => clearTransientCareData(event.detail)
    window.addEventListener(RESET_LOCAL_DATA_EVENT, handleLocalDataReset)
    return () => window.removeEventListener(RESET_LOCAL_DATA_EVENT, handleLocalDataReset)
  }, [])
  const runSpo2 = () => {
    if (spo2Phase === 'measuring') return
    setSpo2Phase('measuring')
    scheduleSpotCheck(() => {
      setSpo2(96 + Math.floor(Math.random() * 4))
      setSpo2Phase('idle')
      celebrateConfetti({ particleCount: 12 })
    }, 4000)
  }

  const [bp, setBp] = useState(null)
  const [bpPhase, setBpPhase] = useState('idle')
  const runBp = () => {
    if (bpPhase !== 'idle') return
    setBpPhase('inflating')
    scheduleSpotCheck(() => setBpPhase('measuring'), 2000)
    scheduleSpotCheck(() => {
      const sys = 112 + Math.floor(Math.random() * 22)
      const dia = 70 + Math.floor(Math.random() * 12)
      setBp(`${sys} / ${dia}`)
      setBpPhase('idle')
    }, 5200)
  }

  const hasLiveHeartRate = hrStatus.mode === 'live' && hr !== null
  const anyFlag = hasLiveHeartRate && (hr < 50 || hr > 110)

  const exportVitals = () => {
    const rows = [['timestamp', 'metric', 'value', 'source']]
    hrRecords.forEach(record => rows.push([record.timestamp, record.metric, record.value, record.source]))
    if (spo2 !== null) rows.push([new Date().toISOString(), 'spo2_pct', spo2, 'SIMULATED_SPOT_CHECK'])
    if (bp !== null) rows.push([new Date().toISOString(), 'blood_pressure_mmHg', bp.replace(' / ', '/'), 'SIMULATED_SEQUENCE'])
    if (rows.length === 1) {
      pushToast({ kind: 'info', title: 'Nothing to export yet', body: 'Pair a real sensor or generate a clearly labeled demo value first.' })
      return
    }
    const csv = encodeCsv(rows)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `caresphere-vitals-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 10000)
    pushToast({ kind: 'success', title: 'Exported', body: 'CSV downloaded with source labels. Simulated rows are demo values, not clinical measurements.' })
  }

  const exportLocalData = () => {
    try {
      const snapshot = {
        app: 'CareSphere',
        exportVersion: 1,
        exportedAt: new Date().toISOString(),
        privacyNotice: 'Contains sensitive personal and health-related data. Review before sharing.',
        data: {
          ...saved,
          settings,
          routines,
          medications: meds,
          medicationScheduleConfirmed: medsConfirmed,
          notes,
          moods,
          emotionScore,
          bestPattern: normalizePersistedValue('bestPattern', saved.bestPattern, 0),
        },
        sessionVitals: {
          heartRate: hrRecords,
          oxygenSaturation: spo2 === null ? null : { timestamp: new Date().toISOString(), value: spo2, source: 'SIMULATED_SPOT_CHECK' },
          bloodPressure: bp === null ? null : { timestamp: new Date().toISOString(), value: bp, source: 'SIMULATED_SEQUENCE' },
        },
      }
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `caresphere-private-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 10000)
      return true
    } catch {
      return false
    }
  }

  const clearLocalData = () => {
    let storageCleared = true
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      storageCleared = false
    }
    Object.keys(saved).forEach(key => delete saved[key])
    window.dispatchEvent(new CustomEvent(RESET_LOCAL_DATA_EVENT, { detail: { closeOverlays: false } }))
    return storageCleared
  }

  const localDataBytes = useMemo(() => {
    try { return new Blob([JSON.stringify(saved)]).size } catch { return 0 }
  }, [settings, routines, meds, medsConfirmed, notes, moods, emotionScore, saved.bestPattern])

  // ── Coffee circles — real, open Jitsi rooms ──
  const coffeeCircles = [
    {
      id: 1, title: 'Morning Sunshine Tea & Chat', icon: '☕',
      time: 'Open Jitsi room · no schedule',
      room: 'CareSphere-MorningSunshineTea-Room2026',
    },
    {
      id: 2, title: 'Classic Movie Trivia & Memories', icon: '🎬',
      time: 'Open Jitsi room · no schedule',
      room: 'CareSphere-ClassicMovieTrivia-Room2026',
    },
    {
      id: 3, title: 'Gentle Stretching & Breathing', icon: '🌿',
      time: 'Open Jitsi room · no schedule',
      room: 'CareSphere-GentleStretchBreathing-Room2026',
    },
  ]

  const launchRoom = (title, room) => setVideoSession({ title, room })
  const launchOpenRoom = () =>
    setVideoSession({
      title: 'CareSphere Open Circle',
      room: `CareSphere-OpenCoffeeCircle-${Math.random().toString(36).slice(2, 8)}`,
    })

  const routinesDone = routines.filter(routine => routine.completedOn === localDay).length
  const medsTaken = medsConfirmed ? meds.filter(medication => medication.takenOn === localDay).length : 0
  const routineIsDone = routine => routine.completedOn === localDay
  const medicationIsTaken = medication => medication.takenOn === localDay
  const nextMed = medsConfirmed
    ? meds
      .filter(medication => medication.takenOn !== localDay)
      .map(medication => ({ ...medication, t: /^\s*(\d{1,2}):(\d{2})/.exec(medication.time) }))
      .filter(m => m.t)
      .sort((a, b) => a.t[1] * 60 + Number(a.t[2]) - (b.t[1] * 60 + Number(b.t[2])))[0]
    : null

  const tabs = [
    { id: 'home', label: 'Overview', icon: Sparkles },
    { id: 'games', label: 'Therapy & Sensory', icon: Brain },
    { id: 'buddies', label: 'Coffee Circles', icon: Coffee },
    { id: 'care', label: 'Care Circle', icon: Shield },
    { id: 'telehealth', label: 'Vitals & Telehealth', icon: Activity },
  ]

  useEffect(() => { if (activeTab !== 'games') soundEngine.stop() }, [activeTab])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="app-shell bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 pb-4 safe-x ios-header">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 cursor-pointer shrink-0" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 text-xl shadow-lg shadow-emerald-500/20">💚</div>
            <div className="hidden sm:block">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">CareSphere AI</span>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">Live</span>
              </div>
              <p className="text-[11px] text-slate-400">Senior care · isolation prevention · autism support</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60" aria-label="Main navigation">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === tab.id ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings and accessibility"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl border border-slate-700 transition"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSosOpen(true)}
              className="bg-red-600/90 hover:bg-red-600 text-white px-3.5 sm:px-4 py-2.5 rounded-2xl font-black text-xs shadow-lg shadow-red-500/30 flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" /> SOS
            </button>
          </div>
        </div>

        <div className="flex md:hidden overflow-x-auto pt-3 mt-3 space-x-2 border-t border-slate-800/80" aria-label="Mobile navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeTab === tab.id ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* iOS install tip — Safari requires manual Add to Home Screen */}
      {showInstallTip && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/25 px-4 sm:px-8 py-2.5 text-xs text-emerald-200 flex items-center gap-3 safe-x">
          <span className="flex-1 leading-relaxed">
            📲 Install CareSphere on your iPhone: tap <span className="font-bold">Share → Add to Home Screen</span> in Safari. The app shell works offline; reminders run only while it is open and are not reliably delivered after closing it.
          </span>
          <button
            onClick={() => setInstallTipDismissed(true)}
            aria-label="Dismiss install tip"
            className="p-1.5 text-emerald-300/70 hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 safe-x space-y-8">

        {/* ══════════ OVERVIEW ══════════ */}
        {activeTab === 'home' && (
          <div className="space-y-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 border border-emerald-500/30 p-8 sm:p-12 shadow-2xl">
              <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-300 px-3.5 py-1 rounded-full text-xs font-bold border border-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{greeting}, {settings.name} — here's your day at a glance</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                  Connected care for independent living
                </h1>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Live wearable vitals over Bluetooth, one-tap Jitsi video coffee circles that fight isolation,
                  medication reminders you configure, and sensory-friendly games — with real Jitsi rooms you can share with family.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={launchOpenRoom}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-6 py-3 rounded-2xl text-xs shadow-lg transition flex items-center gap-2"
                  >
                    <Video className="w-3.5 h-3.5" /> Join a live coffee circle
                  </button>
                  <button
                    onClick={() => setActiveTab('telehealth')}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-2xl text-xs border border-slate-700 transition"
                  >
                    Connect wearable vitals 🫀
                  </button>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-1.5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Routine today</div>
                <div className="text-2xl font-black text-white">{routinesDone} / {routines.length}</div>
                <p className="text-xs text-slate-500">A personal checklist for today</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-1.5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sensor status</div>
                <div className="text-2xl font-black text-white">{hr !== null ? `${hr} bpm` : 'Not paired'}</div>
                <p className="text-xs text-slate-500 truncate">{hrStatus.mode === 'live' ? 'Live BLE stream' : 'Pair in Vitals & Telehealth'}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-1.5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Practice activity</div>
                <div className="text-2xl font-black text-indigo-400">{emotionScore} points</div>
                <p className="text-xs text-slate-500">Optional game points, not a progress measure</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-1.5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Medications</div>
                <div className="text-2xl font-black text-emerald-400">{meds.length === 0 ? '—' : medsConfirmed ? `${medsTaken} / ${meds.length}` : 'Review'}</div>
                <p className="text-xs text-slate-500 truncate">
                  {meds.length === 0 ? 'No medication schedule' : medsConfirmed ? (nextMed ? `Next: ${nextMed.name.split(' (')[0]} at ${nextMed.time}` : 'All check-ins marked today ✓') : 'Saved schedule paused · confirm in Settings'}
                </p>
              </div>
            </div>

            <MoodCheckIn moods={moods} setMoods={setMoods} />

            {/* Routines & meds */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base text-white">Predictable daily routine</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Check-ins reset at local midnight.</p>
                  </div>
                  <button
                    onClick={() => setRoutineEditorOpen(open => !open)}
                    aria-expanded={routineEditorOpen}
                    className="text-xs font-bold text-emerald-300 hover:text-emerald-200 px-3 py-2 rounded-xl border border-emerald-800/60 hover:bg-emerald-950/40"
                  >
                    {routineEditorOpen ? 'Done editing' : 'Customize'}
                  </button>
                </div>
                {routineEditorOpen && (
                  <form onSubmit={addRoutine} className="rounded-2xl border border-emerald-800/50 bg-emerald-950/20 p-3 space-y-2">
                    <label htmlFor="new-routine" className="block text-xs font-bold text-slate-200">Add a personal routine</label>
                    <div className="flex gap-2">
                      <input
                        id="new-routine"
                        value={routineDraft}
                        onChange={event => setRoutineDraft(event.target.value.slice(0, 120))}
                        maxLength={120}
                        placeholder="For example: Take a short walk"
                        className="min-w-0 flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button type="submit" disabled={!routineDraft.trim() || routines.length >= 24} className="bg-emerald-600 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-xs">Add</button>
                    </div>
                    <p className="text-[10px] text-slate-500">Saved only in this browser. Up to 24 routines.</p>
                  </form>
                )}
                <div className="space-y-2.5">
                  {routines.length === 0 && <p className="text-xs text-slate-400">No routines yet. Customize your list to add one.</p>}
                  {routines.map(r => (
                    <div key={r.id} className="flex gap-2">
                      <button
                        onClick={() => toggleRoutine(r.id)}
                        aria-pressed={routineIsDone(r)}
                        className={`flex-1 min-w-0 flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition text-left ${
                          routineIsDone(r) ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-slate-800/60 border-slate-700/60 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <span className={`font-semibold text-sm ${routineIsDone(r) ? 'line-through' : ''}`}>{r.text}</span>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ml-3 ${routineIsDone(r) ? 'bg-emerald-500 text-slate-950 font-bold' : 'border border-slate-600'}`}>
                          {routineIsDone(r) && '✓'}
                        </span>
                      </button>
                      {routineEditorOpen && (
                        <button onClick={() => removeRoutine(r.id)} aria-label={`Remove routine ${r.text}`} className="shrink-0 px-3 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-950/40">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-white">Today's medications</h3>
                  <Bell className="w-4 h-4 text-rose-400" />
                </div>
                <div className="space-y-2.5">
                  {meds.length === 0 && <p className="text-xs text-slate-400">No reminders are configured. Add a personal schedule and review it against your current instructions.</p>}
                  {meds.length > 0 && !medsConfirmed && <p className="text-xs text-amber-200 bg-amber-950/30 border border-amber-800/50 rounded-xl p-3">A saved schedule needs review in Settings. Reminders and dose check-ins are paused until you confirm every name and time.</p>}
                  {medsConfirmed && meds.map(m => (
                    <div key={m.id} className={`flex items-center justify-between p-4 rounded-2xl border transition ${medicationIsTaken(m) ? 'bg-slate-800/40 border-slate-700/50 text-slate-400' : 'bg-rose-950/30 border-rose-500/30 text-slate-100'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => toggleMed(m.id)}
                          aria-label={`Mark ${m.name} ${medicationIsTaken(m) ? 'not taken' : 'taken'}`}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition shrink-0 ${medicationIsTaken(m) ? 'bg-emerald-500 text-slate-950 font-bold' : 'border border-rose-400 hover:bg-rose-500/20'}`}
                        >
                          {medicationIsTaken(m) && '✓'}
                        </button>
                        <div className="min-w-0">
                          <div className={`font-bold text-sm truncate ${medicationIsTaken(m) ? 'line-through text-slate-500' : 'text-white'}`}>{m.name}</div>
                          <div className="text-xs text-slate-400">Scheduled {m.time}</div>
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold shrink-0 ml-3 ${medicationIsTaken(m) ? 'bg-slate-800 text-slate-400' : 'bg-rose-500/20 text-rose-300'}`}>
                        {medicationIsTaken(m) ? 'Marked taken today' : 'Not marked'}
                      </span>
                    </div>
                  ))}
                </div>
                {medsConfirmed && <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5 text-amber-400" />
                  In-app reminders run while this page is open. Browser notifications require permission and do not provide a reliable closed-browser schedule.
                </p>}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ THERAPY & SENSORY ══════════ */}
        {activeTab === 'games' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-black text-white">Therapy & Sensory Studio</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Optional low-pressure games and sensory tools—not clinical therapy, treatment, or assessment. Skip or stop any activity that feels uncomfortable.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EmotionMatch onPoint={() => setEmotionScore(s => s + 1)} />
              <PatternRecall />
              <Soundscapes />
              <BreathingCoach />
            </div>
          </div>
        )}

        {/* ══════════ COFFEE CIRCLES ══════════ */}
        {activeTab === 'buddies' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">Coffee Circles — Isolation Prevention</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  These buttons open real <span className="text-emerald-300 font-semibold">meet.jit.si</span> rooms — join embedded or in a full tab. Rooms are public links with no scheduled host, attendance count, or CareSphere moderation. Share only with people you trust; no installs or accounts required. You'll appear as <span className="text-white font-semibold">{settings.name}</span>.
                </p>
              </div>
              <button
                onClick={launchOpenRoom}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-2xl text-xs shadow-lg transition flex items-center gap-1.5"
              >
                <Video className="w-3.5 h-3.5" /> Launch open circle
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {coffeeCircles.map(room => (
                <div key={room.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col shadow-xl">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{room.icon}</span>
                      <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-bold border border-slate-700">{room.time}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{room.title}</h3>
                    <p className="text-xs text-slate-400">No CareSphere host, attendance tracking, or moderation is configured. Anyone with the Jitsi room link can join.</p>
                    <p className="text-[10px] text-slate-600 font-mono break-all">meet.jit.si/{room.room}</p>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => launchRoom(room.title, room.room)}
                      className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3 rounded-2xl text-xs shadow transition flex items-center justify-center gap-1.5"
                    >
                      <Video className="w-3.5 h-3.5" /> Join in app
                    </button>
                    <a
                      href={`https://meet.jit.si/${room.room}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${room.title} in a new tab`}
                      className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-2xl text-xs transition flex items-center"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-xs text-slate-400 space-y-2">
              <div className="font-bold text-white">💡 How the video works</div>
              <p>
                Rooms use Jitsi Meet's encrypted WebRTC transport. "Join in app" loads the official Jitsi External API inside CareSphere;
                camera and microphone permissions are requested only when you enable them. CareSphere does not host, schedule, or moderate rooms;
                anyone with a room link may join, so verify participants before sharing private health details.
              </p>
            </div>
          </div>
        )}

        {/* ══════════ CARE CIRCLE ══════════ */}
        {activeTab === 'care' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">Care Circle · Local</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">Private notes and check-ins saved in this browser. No family-sync, clinician portal, or push-alert server is connected.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setVisitBriefOpen(true)} className="text-xs bg-sky-700 hover:bg-sky-600 text-white px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition" aria-haspopup="dialog">
                  <FileText className="w-4 h-4" /> Prepare visit brief
                </button>
                <span className="text-xs bg-purple-500/15 text-purple-300 border border-purple-500/30 px-4 py-2 rounded-2xl font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Stored on this device
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5">
                <h3 className="text-lg font-bold text-white">Care notes · local only</h3>
                <form onSubmit={postNote} className="flex gap-3">
                  <input
                    type="text"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Add a note stored in this browser…"
                    aria-label="New care note"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-3 rounded-2xl text-xs shadow transition flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" /> Post
                  </button>
                </form>
                <div className="space-y-3">
                  {notes.map((n) => (
                    <div key={n.id} className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300 gap-2">
                        <span>{n.author}</span>
                        <span className="text-slate-500 font-normal shrink-0">{formatCareDate(n.date)}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{n.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-950 to-purple-950 border border-indigo-500/30 rounded-3xl p-6 space-y-3.5">
                  <div className="inline-flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold text-amber-300">
                    <Sparkles className="w-3.5 h-3.5" /> Local check-in summary
                  </div>
                  <h3 className="text-lg font-bold text-white">From this browser's saved entries</h3>
                  <ul className="space-y-2.5 text-xs text-indigo-200/90 leading-relaxed">
                    <li>• Routine completion: <span className="text-white font-bold">{routinesDone}/{routines.length}</span> today — consistency is the goal, not perfection.</li>
                    <li>• Emotion-match game score: <span className="text-white font-bold">{emotionScore}</span> — practice activity only, not a clinical progress measure.</li>
                    <li>• Coffee-circle attendance: <span className="text-white font-bold">Not tracked</span> — no calendar or family-sync connection is configured.</li>
                    <li>• Mood check-ins logged: <span className="text-white font-bold">{moods.length}</span> — a gentle emotional pulse over time{moods.length ? ` (latest: feeling ${MOODS[moods[moods.length - 1].score - 1].label.toLowerCase()})` : ''}.</li>
                  </ul>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2"><Pill className="w-4 h-4 text-rose-400" /> Medication check-ins · today</h3>
                  <div className="text-2xl font-black text-white">{meds.length === 0 ? '—' : medsConfirmed ? `${medsTaken} / ${meds.length}` : 'Review'}{medsConfirmed && <span className="text-xs font-normal text-slate-400"> marked taken</span>}</div>
                  <p className="text-[11px] text-slate-500">{meds.length === 0 ? 'No medication schedule is saved in this browser.' : medsConfirmed ? 'Local self-reports only. CareSphere cannot verify a dose or send this status to family or a pharmacy.' : 'Saved schedule is paused; review every name and time in Settings. No dose check-ins are counted until confirmed.'}</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2"><User className="w-4 h-4 text-sky-400" /> Sample roster · not contacts</h3>
                  <p className="text-[11px] text-slate-500">Illustrative names only. This build cannot invite, message, or notify these people.</p>
                  <ul className="space-y-2.5 text-xs">
                    {[
                      { n: 'Sarah M.', r: 'Daughter · primary caregiver', c: 'bg-emerald-500' },
                      { n: 'Dr. Evelyn Vance', r: 'Primary care physician', c: 'bg-sky-500' },
                      { n: 'Elena R.', r: 'Wellness coach · coffee circle host', c: 'bg-purple-500' },
                      { n: 'David K.', r: 'Activity lead · trivia host', c: 'bg-amber-500' },
                    ].map(p => (
                      <li key={p.n} className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full ${p.c} bg-opacity-20 border border-white/10 flex items-center justify-center text-[10px] font-black text-white`}>
                          {p.n.split(' ').map(w => w[0]).join('')}
                        </span>
                        <div>
                          <div className="font-bold text-slate-200">{p.n}</div>
                          <div className="text-slate-500">{p.r}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ VITALS & TELEHEALTH ══════════ */}
        {activeTab === 'telehealth' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">Wearable Vitals & Telehealth</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Pair a real BLE heart-rate monitor, optionally generate clearly labeled sample values, and export source-labeled session data—not a clinical summary.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportVitals}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs border border-slate-700 transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>
                <button
                  onClick={() => launchRoom('Telehealth consultation', 'CareSphere-TelehealthConsultation-2026')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2.5 rounded-2xl text-xs shadow-lg transition flex items-center gap-2"
                >
                  <Stethoscope className="w-4 h-4" /> Start telehealth visit
                </button>
              </div>
            </div>

            {/* Sensor bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {hrStatus.mode === 'live'
                  ? <BluetoothConnected className="w-5 h-5 text-emerald-400 shrink-0" />
                  : <Bluetooth className="w-5 h-5 text-slate-500 shrink-0" />}
                <div className="min-w-0">
                  <SensorChip mode={hrStatus.mode} label={hrStatus.mode.toUpperCase()} />
                  <p className="text-xs text-slate-400 mt-1.5 truncate">{hrStatus.message}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={connectHr}
                  disabled={!!hrStopRef.current || connectingHr}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-4 py-2.5 rounded-2xl text-xs shadow transition flex items-center gap-1.5"
                >
                  <Bluetooth className="w-3.5 h-3.5" /> {connectingHr ? 'Pairing…' : 'Pair real monitor'}
                </button>
                {hrStopRef.current ? (
                  <button onClick={disconnectHr} className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2.5 rounded-2xl text-xs border border-slate-700 transition">
                    {hrStatus.mode === 'simulated' ? 'Stop demo' : 'Disconnect'}
                  </button>
                ) : (
                  <button onClick={startHeartRateDemo} disabled={connectingHr} className="bg-amber-950/50 hover:bg-amber-900/60 disabled:opacity-40 text-amber-200 font-bold px-4 py-2.5 rounded-2xl text-xs border border-amber-800/60 transition">
                    Start labeled demo
                  </button>
                )}
              </div>
            </div>

            {/* iPhone capability note — honest about iOS Safari limits */}
            {isIOS && (
              <div className="bg-sky-500/10 border border-sky-500/25 rounded-3xl p-4 text-xs text-sky-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <span className="font-bold">iPhone note:</span> iOS Safari doesn't support Web Bluetooth.
                  For live Apple Watch vitals use the native <span className="font-bold">CareSphere iOS app</span> (HealthKit + CoreBluetooth).
                  On desktop Chrome/Edge, "Pair real monitor" pairs BLE straps. "Start labeled demo" shows generated example values only; it does not read a sensor.
                </span>
              </div>
            )}

            {/* Informational range check only — never clinical triage or notification. */}
            <div className={`rounded-3xl border p-5 flex items-start gap-3 ${
              !hasLiveHeartRate ? 'bg-slate-900 border-slate-700' : anyFlag ? 'bg-amber-950/40 border-amber-500/40' : 'bg-emerald-950/30 border-emerald-500/30'
            }`}>
              {!hasLiveHeartRate
                ? <Activity className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                : anyFlag
                  ? <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  : <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
              <div className="text-xs leading-relaxed">
                <div className={`font-black text-sm ${!hasLiveHeartRate ? 'text-slate-200' : anyFlag ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {!hasLiveHeartRate ? 'Reference check uses live Bluetooth heart rate only' : anyFlag ? 'Live heart rate is outside this broad example range' : 'Live heart rate is within this broad example range'}
                </div>
                <p className={!hasLiveHeartRate ? 'text-slate-300 mt-1' : anyFlag ? 'text-amber-200/80 mt-1' : 'text-emerald-200/70 mt-1'}>
                  This simple example range checks only a current LIVE BLE heart-rate reading (50–110 bpm). Simulated SpO₂ and blood-pressure examples are excluded. Ranges vary by person; this is not triage, does not notify anyone, and does not create a clinical record.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Heart rate */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" /> Heart rate
                  </span>
                  <SensorChip mode={hrStatus.mode} label={hrStatus.mode === 'live' ? 'LIVE BLE' : hrStatus.mode === 'disconnected' ? 'NO SENSOR' : hrStatus.mode.toUpperCase()} />
                </div>
                <div className="text-4xl font-black text-white">
                  {hr ?? '—'} <span className="text-xs text-slate-400 font-normal">bpm</span>
                </div>
                <Sparkline data={hrHistory} />
                <p className="text-[11px] text-slate-500">Bluetooth SIG Heart Rate profile (0x180D) · 1.5 s polling</p>
              </div>

              {/* SpO2 */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-sky-400" /> Blood oxygen (SpO₂)
                  </span>
                  <SensorChip mode={spo2 !== null ? 'simulated' : 'disconnected'} label={spo2 !== null ? 'SIMULATED' : 'NO READING'} />
                </div>
                <div className="text-4xl font-black text-white">
                  {spo2Phase === 'measuring' ? '…' : spo2 !== null ? `${spo2}%` : '—'}
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`bg-sky-500 h-full rounded-full transition-all duration-1000 ${spo2Phase === 'measuring' ? 'w-2/3 animate-pulse' : ''}`}
                    style={spo2 !== null && spo2Phase !== 'measuring' ? { width: `${((spo2 - 88) / 12) * 100}%` } : undefined}
                  />
                </div>
                <button
                  onClick={runSpo2}
                  disabled={spo2Phase === 'measuring'}
                  className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold py-2.5 rounded-xl text-slate-200 transition"
                >
                  {spo2Phase === 'measuring' ? 'Generating demo value…' : 'Generate example (simulated)'}
                </button>
                <p className="text-[11px] text-slate-500">Sample data only. No pulse oximeter or Apple Health measurement is used.</p>
              </div>

              {/* Blood pressure */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-400" /> Blood pressure
                  </span>
                  <SensorChip mode={bp !== null ? 'simulated' : 'disconnected'} label={bp !== null ? 'SIMULATED' : 'NOT MEASURED'} />
                </div>
                <div className="text-3xl font-black text-white">
                  {bpPhase !== 'idle' ? '…' : bp ?? '—'} <span className="text-xs text-slate-400 font-normal">mmHg</span>
                </div>
                <p className="text-[11px] text-slate-500 min-h-4">
                  {bpPhase !== 'idle' && 'Generating a simulated example — no cuff is connected…'}
                  {bpPhase === 'idle' && 'Generated values only. No cuff or sensor is read.'}
                </p>
                <button
                  onClick={runBp}
                  disabled={bpPhase !== 'idle'}
                  className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold py-2.5 rounded-xl text-slate-200 transition"
                >
                  {bpPhase !== 'idle' ? 'Generating demo…' : 'Generate example (simulated)'}
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-xs text-slate-400 space-y-2">
              <div className="font-bold text-white">🫀 How vitals really reach this screen</div>
              <p>
                <span className="text-slate-200 font-semibold">Live mode:</span> "Pair real monitor" opens your browser's Bluetooth chooser
                (Chrome/Edge desktop & Android) and subscribes to the standard BLE Heart Rate service — the same profile exposed by
                many chest straps. Readings arrive as GATT notifications, plotted above in real time.
              </p>
              <p>
                <span className="text-slate-200 font-semibold">Demo mode:</span> sample data starts only after you tap "Start labeled demo". It uses no sensor,
                is not a measurement, and is excluded from the live heart-rate reference check. Canceling pairing or using an unsupported browser leaves the value blank.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <VisitBriefModal
        key={visitBriefOpen ? 'visit-brief-open' : 'visit-brief-closed'}
        open={visitBriefOpen}
        onClose={() => setVisitBriefOpen(false)}
        displayName={settings.name}
        meds={meds}
        medsConfirmed={medsConfirmed}
        notes={notes}
        moods={moods}
        hrRecords={hrRecords}
        spo2={spo2}
        bp={bp}
      />
      <VideoModal session={videoSession} displayName={settings.name} onClose={() => setVideoSession(null)} />
      <SosModal open={sosOpen} onClose={() => setSosOpen(false)} />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        update={updateSettings}
        notifyState={notifyState}
        enableNotifications={enableNotifications}
        meds={meds}
        setMeds={setMeds}
        medsConfirmed={medsConfirmed}
        setMedsConfirmed={setMedsConfirmed}
        onExportData={exportLocalData}
        onClearLocalData={clearLocalData}
        localDataBytes={localDataBytes}
      />

      {/* Toast stack */}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-3 pointer-events-none safe-bottom pr-4" aria-live="polite">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-8 safe-bottom text-center text-xs text-slate-500 space-y-2 px-4">
        <div className="font-bold text-slate-300">💚 CareSphere AI — proactive senior care & autism support</div>
        <p>Real Jitsi Meet rooms · Web Bluetooth vitals · Web Audio sensory studio · Your data stays on your device.</p>
      </footer>
    </div>
  )
}
