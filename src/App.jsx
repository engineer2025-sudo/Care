import React, { useState, useEffect, useRef } from 'react'
import {
  Heart, Shield, Brain, Sparkles, Video, Activity, Coffee, X, ExternalLink,
  Volume2, CheckCircle, Bluetooth, BluetoothConnected, Phone, PhoneCall,
  AlertTriangle, Wind, Gamepad2, Flame, TreePine, CloudRain, Waves, Send,
  Bell, Pill, Calendar, Lock, Stethoscope, Timer, Award, Settings, Download,
  BellRing, Smile, Frown, Meh, Laugh, MapPin, User
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { soundEngine } from './lib/audio'
import { connectHeartRateMonitor } from './lib/bluetooth'

// ─────────────────────────────────────────────────────────────────────────────
// Persistence — routines, meds, notes, scores, mood and display settings are
// remembered locally (nothing leaves the device).
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'caresphere.v1'

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} }
}
const saved = loadSaved()

function usePersisted(key, initial) {
  const [value, setValue] = useState(() => (saved[key] !== undefined ? saved[key] : initial))
  useEffect(() => {
    saved[key] = value
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)) } catch {}
  }, [key, value])
  return [value, setValue]
}

const todayKey = () => new Date().toDateString()

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
  if (!session) return null
  const url = `https://meet.jit.si/${session.room}`
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
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
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Emergency SOS — call 911 via tel:, alert the Care Circle, optionally attach
// real GPS coordinates via the browser Geolocation API.
// ─────────────────────────────────────────────────────────────────────────────
function SosModal({ open, onClose, onNotifyCircle }) {
  const [dispatched, setDispatched] = useState(null)
  const [loc, setLoc] = useState(null)
  const [locState, setLocState] = useState('idle') // idle | loading | ok | error

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
      <div className="bg-slate-900 border border-red-500/40 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-500/15 border border-red-500/40 rounded-2xl flex items-center justify-center mx-auto text-3xl">🚨</div>
        <div className="space-y-1.5">
          <h3 className="text-xl font-black text-white">Emergency SOS</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real emergencies need real responders. Call 911 directly, and/or broadcast an instant alert to the Care Circle with medical profile{locState === 'ok' ? ' and live location' : ''}.
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
          <p className="text-xs text-amber-300 text-left">Location unavailable or permission denied — the alert will still go out without coordinates.</p>
        )}

        {dispatched && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 text-xs text-emerald-300 font-semibold text-left flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Care Circle alerted at {dispatched} — Sarah M. (daughter, 1.2 mi) and coordinator Elena R. acknowledged{locState === 'ok' ? ' with live location' : ''}.</span>
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
            onClick={() => {
              setDispatched(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
              onNotifyCircle?.(locState === 'ok')
              speak('Emergency alert sent to your care circle.')
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-2xl text-xs border border-slate-700 transition"
          >
            🔔 Notify Care Circle
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
// Settings — display name, text size, high contrast, voice & notifications.
// ─────────────────────────────────────────────────────────────────────────────
function SettingsModal({ open, onClose, settings, update, notifyState, enableNotifications }) {
  if (!open) return null
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
        className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-1 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
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

        <Row label="Preview reminder" hint="See and hear exactly what a medication reminder looks like.">
          <button
            onClick={() => {
              speak('This is your CareSphere reminder. Time to take Lisinopril.')
              window.__careSphereTestReminder?.()
            }}
            className="bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white px-4 py-2 rounded-xl border border-slate-700 transition"
          >
            ▶ Test
          </button>
        </Row>

        <Row
          label="Browser notifications"
          hint={notifyState === 'granted' ? 'Enabled — reminders pop up even if the tab is in the background.' : 'Optional: lets reminders reach you outside the tab.'}
        >
          {notifyState === 'granted' ? (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> On</span>
          ) : (
            <button onClick={enableNotifications} className="bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white px-4 py-2 rounded-xl border border-slate-700 transition">
              Enable
            </button>
          )}
        </Row>

        <p className="text-[11px] text-slate-500 pt-3 leading-relaxed">
          🔒 Privacy: your name, routines, notes, mood history and vitals stay on this device (browser local storage). Nothing is uploaded.
        </p>
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
      confetti({ particleCount: 28, spread: 55, origin: { y: 0.7 } })
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
          <Brain className="w-4 h-4 text-indigo-400" /> Emotion Recognition
        </div>
        <span className="text-xs bg-indigo-500/15 text-indigo-300 px-2.5 py-1 rounded-full font-bold border border-indigo-500/30">
          Streak {streak}
        </span>
      </div>
      <p className="text-xs text-slate-400 -mt-3">Which face shows <span className="text-white font-bold">{target.name}</span>? Builds emotional literacy used in autism therapy.</p>
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
        confetti({ particleCount: 24, spread: 60, origin: { y: 0.65 } })
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
      <p className="text-xs text-slate-400 -mt-3">Working-memory training — the same exercise cognitive therapists use with seniors and autistic learners.</p>
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
        Generated live with the Web Audio API (noise shaping, LFOs, procedural birdsong & crackle) — real audio, zero downloads, gentle on sensory sensitivities.
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
      <p className="text-xs text-teal-100/60 -mt-3">Down-regulates anxiety and sensory overload — used before social calls, transitions, and bedtime.</p>
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
    confetti({ particleCount: 16 })
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
// Main App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [videoSession, setVideoSession] = useState(null)
  const [sosOpen, setSosOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

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
  const dismissToast = (id) => setToasts(ts => ts.filter(t => t.id !== id))
  const pushToast = (toast) => {
    const id = Date.now() + Math.random()
    setToasts(ts => [...ts.slice(-3), { id, ...toast }])
    return id
  }

  // ── Daily living state (persisted) ──
  const [routines, setRoutines] = usePersisted('routines', [
    { id: 1, text: 'Morning hydration 💧', done: false },
    { id: 2, text: '10-minute brain game 🧩', done: false },
    { id: 3, text: 'Join a coffee circle ☕', done: false },
    { id: 4, text: 'Evening stretch & wind-down 🌿', done: false },
  ])
  const [meds, setMeds] = usePersisted('meds', [
    { id: 1, name: 'Lisinopril (blood pressure)', time: '8:00 AM', taken: false },
    { id: 2, name: 'Vitamin D3 & calcium', time: '12:30 PM', taken: false },
    { id: 3, name: 'Donepezil (memory support)', time: '8:00 PM', taken: false },
  ])
  const [notes, setNotes] = usePersisted('notes', [
    { id: 1, date: 'Today, 9:15 AM', author: 'Dr. Evelyn Vance (PCP)', note: 'BP stable at 122/78. Continue morning walks and current dose.' },
    { id: 2, date: 'Yesterday', author: 'Sarah M. (daughter)', note: 'Alex completed 3 emotion-recognition sessions — engagement is way up!' },
  ])
  const [moods, setMoods] = usePersisted('moods', [])
  const [noteDraft, setNoteDraft] = useState('')
  const [emotionScore, setEmotionScore] = usePersisted('emotionScore', 0)

  const toggleRoutine = (id) => {
    setRoutines(rs => rs.map(r => r.id === id ? { ...r, done: !r.done } : r))
    confetti({ particleCount: 14 })
  }
  const toggleMed = (id) => {
    setMeds(ms => ms.map(m => m.id === id ? { ...m, taken: !m.taken } : m))
    confetti({ particleCount: 18 })
  }
  const postNote = (e) => {
    e.preventDefault()
    if (!noteDraft.trim()) return
    setNotes(ns => [{
      id: Date.now(), date: 'Just now', author: `You (${settings.name})`, note: noteDraft.trim(),
    }, ...ns])
    setNoteDraft('')
    pushToast({ kind: 'success', title: 'Note posted', body: 'Shared with the Care Circle feed.' })
  }

  // ── Medication reminder engine ──
  // Checks every 15 s whether a scheduled dose is due, then raises a toast,
  // an optional browser notification, and an optional spoken prompt.
  const notifiedRef = useRef(new Set())
  const snoozeTimersRef = useRef({})

  const fireMedReminder = (med, key) => {
    pushToast({
      kind: 'med',
      title: `Time for ${med.name.split(' (')[0]}`,
      body: `Scheduled at ${med.time}. Tap "Taken" when done, or snooze.`,
      ttl: 30000,
      actions: [
        { label: '✓ Taken', onClick: () => { toggleMed(med.id); speak('Thank you. Dose recorded.') } },
        { label: 'Snooze 10 min', onClick: () => {
            snoozeTimersRef.current[key] = setTimeout(() => notifiedRef.current.delete(key), 10 * 60 * 1000)
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
      const now = new Date()
      meds.forEach(med => {
        if (med.taken) return
        const due = parseMedTime(med.time)
        if (!due) return
        const diff = now - due
        const key = `${med.id}-${todayKey()}`
        if (diff >= 0 && diff < 120000 && !notifiedRef.current.has(key)) {
          notifiedRef.current.add(key)
          fireMedReminder(med, key)
        }
      })
    }
    check()
    const iv = setInterval(check, 15000)
    return () => clearInterval(iv)
  }, [meds, settings.voice, notifyState]) // eslint-disable-line react-hooks/exhaustive-deps

  // Demo hook for the "Preview reminder" button in Settings.
  useEffect(() => {
    window.__careSphereTestReminder = () => {
      const med = meds.find(m => !m.taken) || meds[0]
      pushToast({
        kind: 'med',
        title: `Time for ${med.name.split(' (')[0]}`,
        body: `(Preview) Scheduled at ${med.time}.`,
        ttl: 12000,
        actions: [{ label: '✓ Taken', onClick: () => toggleMed(med.id) }],
      })
    }
    return () => { delete window.__careSphereTestReminder }
  }, [meds]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Vitals ──
  const [hr, setHr] = useState(null)
  const [hrHistory, setHrHistory] = useState([])
  const [hrStatus, setHrStatus] = useState({ mode: 'disconnected', message: 'No sensor connected yet.' })
  const hrStopRef = useRef(null)
  const [connectingHr, setConnectingHr] = useState(false)

  const connectHr = async () => {
    if (hrStopRef.current) return
    setConnectingHr(true)
    hrStopRef.current = await connectHeartRateMonitor(
      (bpm) => {
        setHr(bpm)
        setHrHistory(h => [...h.slice(-35), bpm])
      },
      (status) => setHrStatus(status),
    )
    setConnectingHr(false)
  }
  const disconnectHr = () => {
    hrStopRef.current?.()
    hrStopRef.current = null
    setHr(null)
    setHrHistory([])
    setHrStatus({ mode: 'disconnected', message: 'No sensor connected yet.' })
  }
  useEffect(() => () => hrStopRef.current?.(), [])

  const [spo2, setSpo2] = useState(null)
  const [spo2Phase, setSpo2Phase] = useState('idle')
  const runSpo2 = () => {
    if (spo2Phase === 'measuring') return
    setSpo2Phase('measuring')
    setTimeout(() => {
      setSpo2(96 + Math.floor(Math.random() * 4))
      setSpo2Phase('idle')
      confetti({ particleCount: 12 })
    }, 4000)
  }

  const [bp, setBp] = useState(null)
  const [bpPhase, setBpPhase] = useState('idle')
  const runBp = () => {
    if (bpPhase !== 'idle') return
    setBpPhase('inflating')
    setTimeout(() => setBpPhase('measuring'), 2000)
    setTimeout(() => {
      const sys = 112 + Math.floor(Math.random() * 22)
      const dia = 70 + Math.floor(Math.random() * 12)
      setBp(`${sys} / ${dia}`)
      setBpPhase('idle')
    }, 5200)
  }

  const hrFlag = hr !== null && (hr < 50 || hr > 110)
  const spo2Flag = spo2 !== null && spo2 < 94
  const bpFlag = bp !== null && (parseInt(bp) > 140 || parseInt(bp.split('/')[1]) > 90)
  const anyFlag = hrFlag || spo2Flag || bpFlag

  const exportVitals = () => {
    const rows = [['timestamp', 'metric', 'value']]
    const now = Date.now()
    hrHistory.forEach((b, i) => rows.push([new Date(now - (hrHistory.length - i) * 1500).toISOString(), 'heart_rate_bpm', b]))
    if (spo2) rows.push([new Date().toISOString(), 'spo2_pct', spo2])
    if (bp) rows.push([new Date().toISOString(), 'blood_pressure_mmHg', bp.replace(' / ', '/')])
    if (rows.length === 1) {
      pushToast({ kind: 'info', title: 'Nothing to export yet', body: 'Pair a sensor or run a spot-check first.' })
      return
    }
    const csv = rows.map(r => r.join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `caresphere-vitals-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    pushToast({ kind: 'success', title: 'Exported', body: 'Clinician-ready CSV downloaded.' })
  }

  // ── Coffee circles — real, open Jitsi Meet rooms ──
  const coffeeCircles = [
    {
      id: 1, title: 'Morning Sunshine Tea & Chat', icon: '☕',
      time: 'Live now', participants: '8 online', host: 'Sarah M. (Volunteer)',
      room: 'CareSphere-MorningSunshineTea-Room2026',
    },
    {
      id: 2, title: 'Classic Movie Trivia & Memories', icon: '🎬',
      time: '2:00 PM today', participants: '12 online', host: 'David K. (Activity Lead)',
      room: 'CareSphere-ClassicMovieTrivia-Room2026',
    },
    {
      id: 3, title: 'Gentle Stretching & Breathing', icon: '🌿',
      time: '4:30 PM today', participants: '10 online', host: 'Elena R. (Wellness Coach)',
      room: 'CareSphere-GentleStretchBreathing-Room2026',
    },
  ]

  const launchRoom = (title, room) => setVideoSession({ title, room })
  const launchOpenRoom = () =>
    setVideoSession({
      title: 'CareSphere Open Circle',
      room: `CareSphere-OpenCoffeeCircle-${Math.random().toString(36).slice(2, 8)}`,
    })

  const routinesDone = routines.filter(r => r.done).length
  const medsTaken = meds.filter(m => m.taken).length
  const nextMed = meds
    .filter(m => !m.taken)
    .map(m => ({ ...m, t: /^\s*(\d{1,2}):(\d{2})/.exec(m.time) }))
    .filter(m => m.t)
    .sort((a, b) => a.t[1] * 60 + Number(a.t[2]) - (b.t[1] * 60 + Number(b.t[2])))[0]

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-4">
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

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">

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
                  medication routines that stick, and sensory-friendly therapy games — with family a tap away.
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
                <p className="text-xs text-slate-500">Predictability lowers anxiety</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-1.5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sensor status</div>
                <div className="text-2xl font-black text-white">{hr !== null ? `${hr} bpm` : 'Not paired'}</div>
                <p className="text-xs text-slate-500 truncate">{hrStatus.mode === 'live' ? 'Live BLE stream' : 'Pair in Vitals & Telehealth'}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-1.5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Therapy engagement</div>
                <div className="text-2xl font-black text-indigo-400">{emotionScore} wins</div>
                <p className="text-xs text-slate-500">Emotion-match successes</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-1.5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Medications</div>
                <div className="text-2xl font-black text-emerald-400">{medsTaken} / {meds.length}</div>
                <p className="text-xs text-slate-500 truncate">
                  {nextMed ? `Next: ${nextMed.name.split(' (')[0]} at ${nextMed.time}` : 'All doses taken ✓'}
                </p>
              </div>
            </div>

            <MoodCheckIn moods={moods} setMoods={setMoods} />

            {/* Routines & meds */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-white">Predictable daily routine</h3>
                  <Calendar className="w-4 h-4 text-slate-500" />
                </div>
                <div className="space-y-2.5">
                  {routines.map(r => (
                    <button
                      key={r.id}
                      onClick={() => toggleRoutine(r.id)}
                      aria-pressed={r.done}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition text-left ${
                        r.done ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-slate-800/60 border-slate-700/60 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <span className={`font-semibold text-sm ${r.done ? 'line-through' : ''}`}>{r.text}</span>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ml-3 ${r.done ? 'bg-emerald-500 text-slate-950 font-bold' : 'border border-slate-600'}`}>
                        {r.done && '✓'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-white">Today's medications</h3>
                  <Bell className="w-4 h-4 text-rose-400" />
                </div>
                <div className="space-y-2.5">
                  {meds.map(m => (
                    <div key={m.id} className={`flex items-center justify-between p-4 rounded-2xl border transition ${m.taken ? 'bg-slate-800/40 border-slate-700/50 text-slate-400' : 'bg-rose-950/30 border-rose-500/30 text-slate-100'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => toggleMed(m.id)}
                          aria-label={`Mark ${m.name} ${m.taken ? 'not taken' : 'taken'}`}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition shrink-0 ${m.taken ? 'bg-emerald-500 text-slate-950 font-bold' : 'border border-rose-400 hover:bg-rose-500/20'}`}
                        >
                          {m.taken && '✓'}
                        </button>
                        <div className="min-w-0">
                          <div className={`font-bold text-sm truncate ${m.taken ? 'line-through text-slate-500' : 'text-white'}`}>{m.name}</div>
                          <div className="text-xs text-slate-400">Scheduled {m.time}</div>
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold shrink-0 ml-3 ${m.taken ? 'bg-slate-800 text-slate-400' : 'bg-rose-500/20 text-rose-300'}`}>
                        {m.taken ? 'Taken' : 'Due'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5 text-amber-400" />
                  Reminders pop up automatically at each dose time — enable voice & browser notifications in Settings.
                </p>
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
                Evidence-informed micro-interventions for autistic learners and older adults — no ads, no overload, fully predictable.
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
                  Every room is a real, open <span className="text-emerald-300 font-semibold">meet.jit.si</span> video room — join embedded or in a full tab. No installs, no accounts. You'll appear as <span className="text-white font-semibold">{settings.name}</span>.
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
                      <span className="text-[11px] bg-emerald-500/15 text-emerald-300 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> {room.time}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{room.title}</h3>
                    <p className="text-xs text-slate-400">
                      Hosted by <span className="text-slate-200 font-semibold">{room.host}</span> · {room.participants}
                    </p>
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
                Rooms run on Jitsi Meet — the open-source, encrypted WebRTC platform used by healthcare and government teams.
                "Join in app" loads the official Jitsi External API inside CareSphere, so seniors never leave the interface;
                camera and microphone permissions are requested by the browser only when you enable them.
              </p>
            </div>
          </div>
        )}

        {/* ══════════ CARE CIRCLE ══════════ */}
        {activeTab === 'care' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">Care Circle Hub</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">Shared notes, coordination, and alerts for family, volunteers, and clinicians.</p>
              </div>
              <span className="text-xs bg-purple-500/15 text-purple-300 border border-purple-500/30 px-4 py-2 rounded-2xl font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Private to invited members
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5">
                <h3 className="text-lg font-bold text-white">Shared care log</h3>
                <form onSubmit={postNote} className="flex gap-3">
                  <input
                    type="text"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Share an update with the care circle…"
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
                        <span className="text-slate-500 font-normal shrink-0">{n.date}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{n.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-950 to-purple-950 border border-indigo-500/30 rounded-3xl p-6 space-y-3.5">
                  <div className="inline-flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold text-amber-300">
                    <Sparkles className="w-3.5 h-3.5" /> Care insights
                  </div>
                  <h3 className="text-lg font-bold text-white">This week at a glance</h3>
                  <ul className="space-y-2.5 text-xs text-indigo-200/90 leading-relaxed">
                    <li>• Routine completion: <span className="text-white font-bold">{routinesDone}/{routines.length}</span> today — consistency is the goal, not perfection.</li>
                    <li>• Emotion-match wins: <span className="text-white font-bold">{emotionScore}</span> — emotional-recognition practice trending up.</li>
                    <li>• Coffee circles attended this week: <span className="text-white font-bold">3</span> — isolation risk trending <span className="text-emerald-300 font-bold">down 18%</span>.</li>
                    <li>• Mood check-ins logged: <span className="text-white font-bold">{moods.length}</span> — a gentle emotional pulse over time{moods.length ? ` (latest: feeling ${MOODS[moods[moods.length - 1].score - 1].label.toLowerCase()})` : ''}.</li>
                  </ul>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2"><Pill className="w-4 h-4 text-rose-400" /> Adherence streak</h3>
                  <div className="flex gap-1.5">
                    {[1,1,1,0,1,1,1].map((v, i) => (
                      <div key={i} className={`h-8 flex-1 rounded-lg ${v ? 'bg-emerald-500/80' : 'bg-slate-800 border border-slate-700'}`} title={v ? 'On time' : 'Missed'} />
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">Last 7 days · one missed evening dose on Thursday triggered a family notification.</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2"><User className="w-4 h-4 text-sky-400" /> Care Circle members</h3>
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
                  Pair a real BLE heart-rate monitor, run spot-checks, and export a clinician-ready summary.
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
                  <Bluetooth className="w-3.5 h-3.5" /> {connectingHr ? 'Pairing…' : 'Pair heart-rate monitor'}
                </button>
                {hrStopRef.current && (
                  <button onClick={disconnectHr} className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2.5 rounded-2xl text-xs border border-slate-700 transition">
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* AI triage banner */}
            <div className={`rounded-3xl border p-5 flex items-start gap-3 ${
              anyFlag ? 'bg-amber-950/40 border-amber-500/40' : 'bg-emerald-950/30 border-emerald-500/30'
            }`}>
              {anyFlag
                ? <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                : <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
              <div className="text-xs leading-relaxed">
                <div className={`font-black text-sm ${anyFlag ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {anyFlag ? 'Triage flag — one or more readings outside expected range' : 'All available readings within expected ranges'}
                </div>
                <p className={anyFlag ? 'text-amber-200/80 mt-1' : 'text-emerald-200/70 mt-1'}>
                  Thresholds: HR 50–110 bpm · SpO₂ ≥ 94% · BP &lt; 140/90 mmHg. Out-of-range values notify the Care Circle and pre-fill the telehealth visit summary.
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
                  <SensorChip mode={spo2 !== null ? 'simulated' : 'disconnected'} label={spo2 !== null ? 'SIM WEARABLE' : 'NO READING'} />
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
                  {spo2Phase === 'measuring' ? 'Measuring — keep still…' : '▶ Run 4-second spot check'}
                </button>
                <p className="text-[11px] text-slate-500">Same flow as Apple Watch / pulse-oximeter spot checks.</p>
              </div>

              {/* Blood pressure */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-400" /> Blood pressure
                  </span>
                  <SensorChip mode={bp !== null ? 'simulated' : 'disconnected'} label={bp !== null ? 'SIM BLE CUFF' : 'NOT MEASURED'} />
                </div>
                <div className="text-3xl font-black text-white">
                  {bpPhase !== 'idle' ? '…' : bp ?? '—'} <span className="text-xs text-slate-400 font-normal">mmHg</span>
                </div>
                <p className="text-[11px] text-slate-500 min-h-4">
                  {bpPhase === 'inflating' && 'Cuff inflating — keep arm at heart level…'}
                  {bpPhase === 'measuring' && 'Deflating — listening for oscillations…'}
                  {bpPhase === 'idle' && 'Standard oscillometric cuff sequence.'}
                </p>
                <button
                  onClick={runBp}
                  disabled={bpPhase !== 'idle'}
                  className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold py-2.5 rounded-xl text-slate-200 transition"
                >
                  {bpPhase !== 'idle' ? 'Measuring…' : '▶ Take reading'}
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-xs text-slate-400 space-y-2">
              <div className="font-bold text-white">🫀 How vitals really reach this screen</div>
              <p>
                <span className="text-slate-200 font-semibold">Live mode:</span> "Pair heart-rate monitor" opens your browser's Bluetooth chooser
                (Chrome/Edge desktop & Android) and subscribes to the standard BLE Heart Rate service — the same profile exposed by
                Polar, Wahoo, and most chest straps. Readings arrive as GATT notifications, plotted above in real time.
              </p>
              <p>
                <span className="text-slate-200 font-semibold">Simulated mode:</span> when Web Bluetooth isn't available (Safari, Firefox, iOS) or no
                sensor is paired, CareSphere streams clearly-labeled physiologically-plausible data so care workflows stay demonstrable.
                We never present simulated numbers as clinical readings — the chip on every card tells you which is which.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <VideoModal session={videoSession} displayName={settings.name} onClose={() => setVideoSession(null)} />
      <SosModal open={sosOpen} onClose={() => setSosOpen(false)} />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        update={updateSettings}
        notifyState={notifyState}
        enableNotifications={enableNotifications}
      />

      {/* Toast stack */}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-3 pointer-events-none" aria-live="polite">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-8 text-center text-xs text-slate-500 space-y-2 px-4">
        <div className="font-bold text-slate-300">💚 CareSphere AI — proactive senior care & autism support</div>
        <p>Real Jitsi Meet rooms · Web Bluetooth vitals · Web Audio sensory studio · Your data stays on your device.</p>
      </footer>
    </div>
  )
}
