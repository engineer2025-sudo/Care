import { reminderDate } from './lib/medicationTime.js';
import {speak as speakLocally} from './lib/support'
import {useLanguage,getLanguage,languageTag} from './lib/i18n'
import LanguagePicker from './components/LanguagePicker'
// Interface text localized; user-authored expressions are intentionally unchanged.
import { tr } from "./lib/i18n";import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  Heart, Shield, Brain, Sparkles, Video, Activity, Coffee, X, ExternalLink,
  Volume2, CheckCircle, Bluetooth, BluetoothConnected, Phone, PhoneCall,
  AlertTriangle, Wind, Gamepad2, Flame, TreePine, CloudRain, Waves, Send,
  Bell, Pill, Calendar, Lock, Stethoscope, Settings, Download,
  BellRing, Smile, Frown, Meh, Laugh, MapPin, User, FileText, ArrowRight, ChevronRight, Sun, Check, Plus } from
'lucide-react';
import ActivityLibrary from './components/ActivityLibrary';
import CareNotes from './components/CareNotes';
import SupportHub from './components/SupportHub';
import { normalizeSupport } from './lib/support';
import { toggleFavorite } from './lib/activityLibrary';
import { useDialog } from './hooks/useDialog';
import { celebrate as celebrateConfetti } from './lib/celebrate';
import { soundEngine } from './lib/audio';
import { connectHeartRateMonitor } from './lib/bluetooth';
import { buildVisitBrief } from './lib/visitBrief';
import { encodeCsv } from './lib/csv';
import { STORAGE_KEY, RESET_LOCAL_DATA_EVENT, normalizePersistedValue, localDayKey, isRoutineDoneToday, isMedicationTakenToday } from './lib/careStorage';
import { CARE_STORAGE_SECURITY_EVENT, eraseCareStorage, getCareStorageCache, getCareStorageSecurityStatus, persistCareStorage } from './lib/secureCareStorage';
import Info from './components/Info';
import { setBareMinimum, useBareMinimum } from './lib/displayMode';

// ─────────────────────────────────────────────────────────────────────────────
// Platform detection — iPhone/iPad (incl. iPadOS desktop-mode UA) and whether
// CareSphere is running as an installed home-screen app.
// ─────────────────────────────────────────────────────────────────────────────
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
const isStandalone = window.navigator.standalone === true ||
window.matchMedia('(display-mode: standalone)').matches;

// ─────────────────────────────────────────────────────────────────────────────
// Persistence — routines, medications, notes, scores, mood and display settings
// are stored in this browser. Joining Jitsi, BLE pairing, SOS sharing, and
// notification permissions are explicit external/device actions.
// ─────────────────────────────────────────────────────────────────────────────
// main.jsx hydrates this shared cache with authenticated encrypted storage before
// React mounts. Hooks keep a reference to the same object for export/reset flows.
const saved = getCareStorageCache();

// A browser storage event is delivered only to other tabs. Propagate erasures
// across tabs without echoing ordinary writes back and forth.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || event.newValue !== null) return;
    Object.keys(saved).forEach((key) => delete saved[key]);
    window.dispatchEvent(new CustomEvent(RESET_LOCAL_DATA_EVENT, { detail: { closeOverlays: true } }));
  });
}

function usePersisted(key, initial) {
  const initialRef = useRef(initial);
  const skipWriteRef = useRef(false);
  const [resetGeneration, setResetGeneration] = useState(0);
  const [value, setValue] = useState(() => {
    if (saved[key] === undefined) return initialRef.current;
    const normalized = normalizePersistedValue(key, saved[key], initialRef.current);
    saved[key] = normalized;
    return normalized;
  });

  useEffect(() => {
    if (skipWriteRef.current) {
      skipWriteRef.current = false;
      return;
    }
    saved[key] = value;
    void persistCareStorage(saved);
  }, [key, value, resetGeneration]);

  useEffect(() => {
    const resetToStoredValue = (incoming) => {
      const next = incoming && typeof incoming === 'object' && !Array.isArray(incoming) ? incoming : {};
      if (Object.prototype.hasOwnProperty.call(next, key)) {
        const normalized = normalizePersistedValue(key, next[key], initialRef.current);
        saved[key] = normalized;
        setValue(normalized);
      } else {
        delete saved[key];
        skipWriteRef.current = true;
        setValue(initialRef.current);
        setResetGeneration((generation) => generation + 1);
      }
    };
    const handleReset = (event) => resetToStoredValue(event.detail);
    window.addEventListener(RESET_LOCAL_DATA_EVENT, handleReset);
    return () => window.removeEventListener(RESET_LOCAL_DATA_EVENT, handleReset);
  }, [key]);

  return [value, setValue];
}

const todayKey = () => new Date().toDateString();

function formatCareDate(value) {
  if (!value || value === 'Just now') return 'Date not recorded';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ?
  value :
  date.toLocaleString(languageTag(), { dateStyle: 'medium', timeStyle: 'short' });
}

function useLocalDayKey() {
  const [day, setDay] = useState(() => localDayKey());

  useEffect(() => {
    let timer;
    const refresh = () => {
      const currentDay = localDayKey();
      setDay((previous) => previous === currentDay ? previous : currentDay);
      window.clearTimeout(timer);
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 1, 0);
      timer = window.setTimeout(refresh, Math.max(1000, nextMidnight.getTime() - now.getTime()));
    };
    const refreshOnReturn = () => {
      setDay(localDayKey());
      refresh();
    };
    refresh();
    window.addEventListener('focus', refreshOnReturn);
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refreshOnReturn);
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, []);

  return day;
}


function speak(text) {
  try { speakLocally(text) } catch(error) { window.dispatchEvent(new CustomEvent('caresphere-speech-status',{detail:error.message})) }
}

// ─────────────────────────────────────────────────────────────────────────────
// Jitsi Meet room — embedded with the official Jitsi Meet External API
// (https://meet.jit.si/external_api.js). Falls back to a plain iframe embed of
// the same real room if the script can't load.
// ─────────────────────────────────────────────────────────────────────────────
function JitsiRoom({ room, displayName = 'CareSphere Member' }) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ensureApiScript = () =>
    window.JitsiMeetExternalAPI ?
    Promise.resolve() :
    new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://meet.jit.si/external_api.js';
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('external_api.js failed to load'));
      document.head.appendChild(s);
    });

    ensureApiScript().
    then(() => {
      if (cancelled || !containerRef.current) return;
      apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName: room,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName },
        configOverwrite: { prejoinConfig: { enabled: true } }
      });
    }).
    catch(() => {if (!cancelled) setFallback(true);});

    return () => {
      cancelled = true;
      try {apiRef.current?.dispose?.();} catch {}
      apiRef.current = null;
    };
  }, [room, displayName]);

  return (
    <div className="w-full h-full">
      <div ref={containerRef} className={`w-full h-full ${fallback ? 'hidden' : ''}`} />
      {fallback &&
      <iframe
        title={`Jitsi room ${room}`}
        src={`https://meet.jit.si/${room}#embed=true`}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="w-full h-full border-0" />

      }
    </div>);

}

function VideoModal({ session, displayName, onClose }) {
  const dialogRef = useDialog(Boolean(session), onClose);
  if (!session) return null;
  const url = `https://meet.jit.si/${session.room}`;
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={session.title} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-bold text-sm text-white truncate">{session.title}</span>
            <span className="hidden sm:inline text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">{tr("Encrypted Jitsi · no download")}

            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition">

              <span className="hidden sm:inline">{tr("Open full tab")}</span> <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button onClick={onClose} aria-label={tr("Leave meeting")} className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-black">
          <JitsiRoom room={session.room} displayName={displayName} />
        </div>
        {isIOS &&
        <div className="px-5 py-2.5 bg-sky-500/10 border-t border-sky-500/25 text-[11px] text-sky-200 leading-relaxed">{tr("📱 On iPhone, Safari manages camera & microphone permissions best — if video doesn't start in the embed, tap ")}
          <span className="font-bold">{tr("\"Open full tab\"")}</span>{tr(" above.")}
        </div>
        }
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────────────────────
// Emergency SOS — call 911 via tel:, optionally attach real GPS coordinates,
// and share details only after the user selects a recipient in the system sheet.
// There is no automatic Care Circle push backend in this build.
// ─────────────────────────────────────────────────────────────────────────────
function SosModal({ open, onClose }) {
  const [shareStatus, setShareStatus] = useState(null);
  const [loc, setLoc] = useState(null);
  const [locState, setLocState] = useState('idle'); // idle | loading | ok | error
  const dialogRef = useDialog(open, onClose);

  if (!open) return null;

  const attachLocation = () => {
    if (!('geolocation' in navigator)) {setLocState('error');return;}
    setLocState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc(pos.coords);
        setLocState('ok');
      },
      () => setLocState('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="sos-title" className="bg-slate-900 border border-red-500/40 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-500/15 border border-red-500/40 rounded-2xl flex items-center justify-center mx-auto text-3xl">🚨</div>
        <div className="space-y-1.5">
          <h3 id="sos-title" className="text-xl font-black text-white">{tr("Emergency SOS")}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">{tr("Real emergencies need real responders. Call 911 directly. CareSphere does not send a push alert; you can share a message")}
            {locState === 'ok' ? tr(' with your current location') : ''}{tr(" using the system share sheet below.")}
          </p>
        </div>

        {locState === 'ok' && loc &&
        <a
          href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-sky-500/10 border border-sky-500/30 rounded-2xl p-3 text-xs text-sky-300 font-semibold text-left flex items-start gap-2">

            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{tr("Location attached: ")}{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)} (±{Math.round(loc.accuracy)}{tr(" m) — tap to view map")}</span>
          </a>
        }
        {locState === 'error' &&
        <p className="text-xs text-amber-300 text-left">{tr("Location unavailable or permission denied. You can still share an SOS message without coordinates.")}</p>
        }

        {shareStatus &&
        <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-3.5 text-xs text-sky-200 font-semibold text-left">
            {shareStatus}
          </div>
        }

        <div className="space-y-2.5">
          <a
            href="tel:911"
            className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3.5 rounded-2xl text-sm shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 transition">

            <PhoneCall className="w-4 h-4" />{tr(" Call 911 Now")}
          </a>
          {locState !== 'ok' &&
          <button
            onClick={attachLocation}
            disabled={locState === 'loading'}
            className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl text-xs border border-slate-700 transition flex items-center justify-center gap-2">

              <MapPin className="w-4 h-4" /> {locState === 'loading' ? tr('Locating…') : tr('Attach my GPS location')}
            </button>
          }
          <button
            onClick={async () => {
              const map = loc ? ` https://www.google.com/maps?q=${loc.latitude},${loc.longitude}` : '';
              const message = `CareSphere SOS: I am requesting help. Please check in now.${map}`;
              try {
                if (navigator.share) {
                  await navigator.share({ title: 'CareSphere SOS', text: message });
                  setShareStatus('Share sheet closed. CareSphere cannot confirm message delivery.');
                } else if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(message);
                  setShareStatus('SOS message copied. Paste it into Messages or another app; CareSphere did not send it.');
                } else {
                  setShareStatus(message);
                }
              } catch (error) {
                if (error?.name !== 'AbortError') {
                  setShareStatus('Sharing was not completed. No alert was sent.');
                }
              }
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-2xl text-xs border border-slate-700 transition">{tr("↗ Share SOS details")}


          </button>
          <button onClick={onClose} className="w-full text-xs text-slate-400 hover:text-white font-bold py-2 transition">{tr("Close")}

          </button>
        </div>
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────────────────────
// Toasts — in-app notifications for medication reminders and system events.
// ─────────────────────────────────────────────────────────────────────────────
function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), toast.ttl || 6000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <div
      role="status"
      className={`pointer-events-auto w-full sm:w-80 rounded-2xl border shadow-2xl p-4 backdrop-blur-md ${
      toast.kind === 'med' ?
      'bg-rose-950/90 border-rose-500/40' :
      toast.kind === 'success' ?
      'bg-emerald-950/90 border-emerald-500/40' :
      'bg-slate-900/95 border-slate-600/60'}`
      }>

      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">{toast.kind === 'med' ? '💊' : toast.kind === 'success' ? '✅' : 'ℹ️'}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-white">{toast.title}</div>
          {toast.body && <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.body}</div>}
          {toast.actions &&
          <div className="flex gap-2 mt-2.5">
              {toast.actions.map((a, i) =>
            <button
              key={i}
              onClick={() => {a.onClick?.();onDismiss(toast.id);}}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition ${
              i === 0 ? 'bg-white text-slate-900 hover:bg-slate-200' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600'}`
              }>

                  {a.label}
                </button>
            )}
            </div>
          }
        </div>
        <button onClick={() => onDismiss(toast.id)} aria-label={tr("Dismiss")} className="text-slate-400 hover:text-white shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────────────────────
// Settings — display name, accessibility, user-entered medication schedule & notifications.
// ─────────────────────────────────────────────────────────────────────────────
function MedicationScheduleEditor({ meds, setMeds, medsConfirmed, setMedsConfirmed }) {
  const [name, setName] = useState('');
  const [time, setTime] = useState('09:00');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const scheduleReady = meds.length > 0 && meds.every((med) =>
  med && typeof med.name === 'string' && med.name.trim().length > 0 &&
  reminderDate(med.time) !== null);

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 160 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || (editingId === null && meds.length >= 200)) return;
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const timeLabel = `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${period}`;
    setMeds((current) => editingId === null ? [...current, { id: crypto.randomUUID(), name: trimmed, time: timeLabel, takenOn: null }] : current.map(med => med.id === editingId ? { ...med, name: trimmed, time: timeLabel, takenOn: null } : med));
    setEditingId(null);
    setMedsConfirmed(false);
    setName('');
    setMessage('Schedule saved on this device. Review and confirm it below before reminders are enabled.');
  };

  return (
    <div className="border-t border-slate-800 pt-4 mt-3 space-y-3">
      <div>
        <h4 id="medication-settings" tabIndex={-1} className="text-sm font-bold text-white">{tr("Medication schedule · local only")}</h4>
        <Info className="text-[11px] text-slate-400 mt-1">{tr("Add only medicines and times confirmed by your care team or label. CareSphere does not prescribe, verify a dose, or check interactions.")}</Info>
      </div>
      {meds.length === 0 ?
      <p className="text-xs text-slate-500">{tr("No medication reminders are configured.")}</p> :
      meds.map((med) =>
      <div key={med.id} className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/60 rounded-xl px-3 py-2">
          <span className="text-xs text-slate-200">{med.name} · {med.time}</span>
          <button type="button" aria-label={tr('Edit medication: {0}', [med.name])} onClick={() => {setEditingId(med.id);setName(med.name);const date = reminderDate(med.time);setTime(date ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '');setMessage('');}} className="text-sm font-bold text-emerald-300">{tr("Edit")}</button>
          <button onClick={() => {if (editingId === med.id) {setEditingId(null);setName('');} setMeds((current) => current.filter((item) => item.id !== med.id));setMedsConfirmed(false);}} className="text-[11px] font-bold text-rose-300 hover:text-rose-200">{tr("Remove")}</button>
        </div>
      )}
      {meds.length > 0 &&
      <div className={`rounded-xl border p-3 space-y-2 ${medsConfirmed ? 'border-emerald-700/60 bg-emerald-950/20' : 'border-amber-700/60 bg-amber-950/20'}`}>
          <label className="flex items-start gap-2 text-xs text-slate-200 cursor-pointer">
            <input type="checkbox" checked={medsConfirmed} disabled={!scheduleReady} onChange={(event) => setMedsConfirmed(event.target.checked)} aria-label={tr("Confirm medication schedule")} className="mt-0.5 accent-emerald-500 disabled:opacity-40" />
            <span>{tr("I reviewed every saved medication name and reminder time against my medication label or care-team instructions.")}</span>
          </label>
          <p className="text-[11px] text-slate-400">
            {medsConfirmed ? tr(
            'Reminders are enabled while CareSphere is running. Browser notifications require permission; this app cannot reliably schedule reminders after the browser is closed.') :
          scheduleReady ? tr(
            'Reminders are paused until you confirm. Schedules saved by an earlier version are kept, but are not trusted or used until reviewed.') : tr(
            'Complete or remove any blank/invalid saved entries before confirming this schedule.')}
          </p>
        </div>
      }
      <form onSubmit={(event) => {event.preventDefault();add();}} className="medication-form">
        <label className="field-label">{tr("Medication name")}
          <input required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} placeholder={tr("As written on your label")} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500" />
        </label>
        <label className="field-label">{tr("Reminder time")}
          <input required type="time" value={time} onChange={(event) => setTime(event.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
        </label>
        <button type="submit" disabled={!name.trim() || !time || (editingId === null && meds.length >= 200)} className="bg-emerald-700 disabled:opacity-40 text-sm font-bold text-white px-4 py-2 rounded-xl">{tr(editingId === null ? "Add medication" : "Save changes")}</button>
        {editingId !== null && <button type="button" onClick={() => {setEditingId(null);setName('');setTime('09:00');}} className="text-sm font-bold text-slate-200">{tr("Cancel")}</button>}
      </form>
      {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
    </div>);

}

const SettingsRow = ({ label, hint, children }) =>
<div className="settings-row flex items-center justify-between gap-4 py-3.5 border-b border-slate-800 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-bold text-white">{label}</div>
        {hint && !useBareMinimum() && <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>;

const SettingsToggle = ({ on, onClick, label }) =>
<button
  onClick={onClick}
  role="switch"
  aria-checked={on}
  aria-label={label}
  className={`w-12 h-7 rounded-full transition relative ${on ? 'bg-emerald-500' : 'bg-slate-700'}`}>

      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>;



function SettingsModal({ open, initialSection, onClose, settings, update, notifyState, enableNotifications, meds, setMeds, medsConfirmed, setMedsConfirmed, onExportData, onClearLocalData, localDataBytes, storageSecurity }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState('');
  useEffect(() => {
    if (!open) {
      setConfirmClear(false);
      setPrivacyMessage('');
    }
  }, [open]);
  const dialogRef = useDialog(open, onClose);
  useEffect(() => {
    if (open && initialSection === 'medications') {
      const heading = document.getElementById('medication-settings');
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [open, initialSection]);
  if (!open) return null;

  const formatBytes = (bytes) => bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(1)} KB`;
  const handleExport = () => {
    const success = onExportData();
    setPrivacyMessage(success ?
    'A private JSON export was downloaded. Review it before sharing; it contains sensitive information.' :
    'The export could not be created in this browser.');
  };
  const handleClear = async () => {
    setClearing(true);
    const success = await onClearLocalData();
    setClearing(false);
    setConfirmClear(false);
    setPrivacyMessage(success ?
    'Saved CareSphere data and its local encryption key were removed from this browser.' :
    'CareSphere could not fully remove its saved data or encryption key. Check this browser’s site storage before continuing.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div
        ref={dialogRef} role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="settings-dialog bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-1 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>

        <div className="settings-heading flex items-center justify-between gap-3 pb-2">
          <h3 id="settings-title" className="text-lg font-black text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />{tr(" Settings & Accessibility")}
          </h3>
          <button onClick={onClose} aria-label={tr("Close settings")} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <LanguagePicker />
        <SettingsRow label={tr("Display name")} hint="Shown when you join video coffee circles.">
          <input
            type="text"
            value={settings.name}
            onChange={(e) => update({ name: e.target.value.slice(0, 24) })}
            aria-label={tr("Display name")}
            className="w-36 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" />

        </SettingsRow>

        <SettingsRow label={tr("Text size")} hint="Larger text across the whole app — good for low vision.">
          <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-1 gap-1">
            {[
            { id: 'md', label: 'A' },
            { id: 'lg', label: 'A+' },
            { id: 'xl', label: 'A++' }].
            map((o) =>
            <button
              key={o.id}
              onClick={() => update({ textScale: o.id })}
              aria-pressed={settings.textScale === o.id}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
              settings.textScale === o.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`
              }>

                {o.label}
              </button>
            )}
          </div>
        </SettingsRow>

        <SettingsRow label={tr("Color appearance")} hint="Choose the device appearance, calm charcoal, or warm light. Contrast stays readable in each theme.">
          <select
            value={settings.theme || 'system'}
            onChange={(event) => update({ theme: event.target.value })}
            aria-label={tr("Color appearance")}
            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white">

            <option value="system">{tr("Follow device")}</option>
            <option value="dark">{tr("Calm charcoal")}</option>
            <option value="light">{tr("Warm light")}</option>
          </select>
        </SettingsRow>

        <SettingsRow label={tr("High contrast")} hint="Brightens grey text and borders; keep this on if it makes text easier to see.">
          <SettingsToggle on={settings.highContrast} onClick={() => update({ highContrast: !settings.highContrast })} label={tr("High contrast")} />
        </SettingsRow>

        <SettingsRow label={tr("Reduce visual movement")} hint="Turns off confetti, pulsing decoration, and hover scaling. Activities remain untimed; you can change this any time.">
          <SettingsToggle on={settings.lowSensory} onClick={() => update({ lowSensory: !settings.lowSensory })} label={tr("Reduce visual movement")} />
        </SettingsRow>

        <SettingsRow label={tr("Bare minimum mode")} hint="Hides explanatory and how-to text everywhere in the app. Status messages, empty states and safety warnings stay visible.">
          <SettingsToggle on={settings.bareMinimum === true} onClick={() => update({ bareMinimum: settings.bareMinimum !== true })} label={tr("Bare minimum mode")} />
        </SettingsRow>

        <SettingsRow label={tr("Voice reminders")} hint="Speaks medication and routine prompts aloud (browser speech synthesis).">
          <SettingsToggle on={settings.voice} onClick={() => update({ voice: !settings.voice })} label={tr("Voice reminders")} />
        </SettingsRow>

        <SettingsRow label={tr("Preview reminder")} hint="Hear a generic voice preview; a saved schedule preview never records a dose or enables reminders.">
          <button
            onClick={() => {
              speak(tr('This is your CareSphere reminder. Please check your medication label and follow the schedule agreed with your care team.'));
              window.__careSphereTestReminder?.();
            }}
            className="bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white px-4 py-2 rounded-xl border border-slate-700 transition">{tr("▶ Test")}


          </button>
        </SettingsRow>

        <SettingsRow
          label={tr("Browser notifications")}
          hint={
          notifyState === 'granted' ?
          'Allowed. Reminders run while this page is open; background delivery may vary by browser.' :
          notifyState === 'unsupported' && isIOS ?
          'On iPhone, enable by installing to the Home Screen first (Share → Add to Home Screen), then revisit Settings.' :
          'Optional browser alerts while the page is open; no reliable closed-page scheduling.'
          }>

          {notifyState === 'granted' ?
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"><CheckCircle className="w-4 h-4" />{tr(" On")}</span> :
          notifyState === 'unsupported' ?
          <span className="text-[11px] text-slate-400 font-semibold max-w-40 text-right">{tr("Not available in this browser")}</span> :

          <button onClick={enableNotifications} className="bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white px-4 py-2 rounded-xl border border-slate-700 transition">{tr("Enable")}

          </button>
          }
        </SettingsRow>

        <MedicationScheduleEditor meds={meds} setMeds={setMeds} medsConfirmed={medsConfirmed} setMedsConfirmed={setMedsConfirmed} />

        <section className="mt-5 rounded-2xl border border-emerald-800/60 bg-gradient-to-br from-emerald-950/60 to-slate-950 p-4 sm:p-5 space-y-4" aria-labelledby="privacy-data-title">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-300"><Shield className="w-5 h-5" /></div>
            <div className="min-w-0 flex-1">
              <h4 id="privacy-data-title" className="text-sm font-bold text-white">{tr("Privacy & your data")}</h4>
              <Info className="text-[11px] text-slate-300 mt-1 leading-relaxed">{tr("CareSphere saves your entries in this browser profile (")}
                {formatBytes(localDataBytes)}{tr("). When secure browser storage is available, saved data is encrypted with AES-256-GCM and its non-extractable key is kept in this origin’s IndexedDB.")}
              </Info>
              <p className={`text-[11px] mt-2 leading-relaxed ${storageSecurity?.state === 'ready' ? 'text-emerald-200' : 'text-amber-200'}`} role={storageSecurity?.state === 'ready' ? 'status' : 'alert'}>
                {storageSecurity?.message || tr('Secure local storage status is not available.')}{tr(" Encryption at rest does not protect data from scripts running in this page, malware, or someone using your unlocked browser profile. No CareSphere account or sync server is configured.")}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button onClick={handleExport} disabled={storageSecurity?.state !== 'ready'} className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 px-3 py-2.5 text-xs font-bold text-white transition">
              <Download className="w-4 h-4 text-emerald-300" />{tr(" Download private JSON export")}
            </button>
            {!confirmClear ?
            <button onClick={() => {setPrivacyMessage('');setConfirmClear(true);}} className="flex items-center justify-center gap-2 rounded-xl border border-rose-900/70 bg-rose-950/50 hover:bg-rose-950 px-3 py-2.5 text-xs font-bold text-rose-200 transition">
                <X className="w-4 h-4" />{tr(" Erase saved care data")}
            </button> :

            <div className="sm:col-span-2 rounded-xl border border-rose-700/60 bg-rose-950/40 p-3 space-y-3" role="group" aria-labelledby="clear-care-data-title">
                <div>
                  <h5 id="clear-care-data-title" className="text-xs font-bold text-rose-100">{tr("Erase this browser's CareSphere data?")}</h5>
                  <p className="text-[11px] text-rose-200/80 mt-1">{tr("This removes your saved name, routines, medications, notes, mood history, and any activity points saved by an older version. It also clears temporary visit/vitals data in other open CareSphere tabs. It cannot be undone. Browser permissions, installed-app files and data in other browser profiles are not affected.")}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setConfirmClear(false)} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">{tr("Cancel")}</button>
                  <button onClick={handleClear} disabled={clearing} className="rounded-lg bg-rose-700 hover:bg-rose-600 disabled:opacity-60 px-3 py-2 text-xs font-bold text-white">{clearing ? tr('Erasing…') : tr('Erase local data')}</button>
                </div>
              </div>
            }
          </div>
          {privacyMessage && <p className="text-[11px] text-emerald-200" role="status" aria-live="polite">{privacyMessage}</p>}
          <Info className="text-[10px] text-slate-500 leading-relaxed">{tr("A downloaded export is no longer protected by CareSphere. Store it carefully and share it only with a person you trust. Optional third-party features such as Jitsi and SOS sharing operate only when you choose them.")}</Info>
        </section>
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────────────────────
// Vitals helpers
// ─────────────────────────────────────────────────────────────────────────────
function Sparkline({ data, stroke = '#34d399' }) {
  if (!data || data.length < 2) {
    return <div className="h-12 flex items-center text-[11px] text-slate-500">{tr("Awaiting stream data…")}</div>;
  }
  const min = Math.min(...data) - 2;
  const max = Math.max(...data) + 2;
  const pts = data.
  map((v, i) => `${i / (data.length - 1) * 100},${30 - (v - min) / (max - min || 1) * 28}`).
  join(' ');
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="w-full h-12" aria-hidden="true">
      <polyline
        points={pts} fill="none" stroke={stroke} strokeWidth="1.5"
        vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />

    </svg>);

}

const STATUS_STYLES = {
  live: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  connecting: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  unsupported: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  disconnected: 'bg-slate-700/40 text-slate-300 border-slate-600'
};

function SensorChip({ mode, label }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${STATUS_STYLES[mode] || STATUS_STYLES.disconnected}`}>
      {label}
    </span>);

}

// ─────────────────────────────────────────────────────────────────────────────
// Optional, untimed activities. They are for shared practice and enjoyment,
// never for diagnosing, treating, or measuring anyone's health.
// ─────────────────────────────────────────────────────────────────────────────
const FEELINGS = [
{ name: 'Happy', emoji: '😊' },
{ name: 'Calm', emoji: '😌' },
{ name: 'Excited', emoji: '🤩' },
{ name: 'Tired', emoji: '😴' },
{ name: 'Not sure', emoji: '💭' }];

const FEELING_PICTURES = ['🙂', '😐', '😴', '😊'];

function EmotionMatch() {
  const [pictureIndex, setPictureIndex] = useState(0);
  const [choice, setChoice] = useState(null);

  const nextPicture = () => {
    setPictureIndex((index) => (index + 1) % FEELING_PICTURES.length);
    setChoice(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col gap-5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-400 font-extrabold">
        <Brain className="w-4 h-4 text-emerald-300" />{tr(" Feelings explorer")}
      </div>
      <Info className="text-sm text-slate-300 leading-relaxed">{tr("What might this person be feeling? Choose any word—or “Not sure.” These emoji are simplified illustrations, not rules for reading real people; there is no right answer or score.")}</Info>
      <div className="text-center py-5 bg-slate-950 rounded-2xl border border-slate-800" aria-live="polite">
        <div className="text-5xl sm:text-6xl" aria-hidden="true">{FEELING_PICTURES[pictureIndex]}</div>
        {choice && <Info className="text-sm text-slate-300 mt-3 px-3">“{choice}{tr("” is one possibility. It is also okay not to know.")}</Info>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {FEELINGS.map((feeling) =>
        <button
          key={feeling.name}
          onClick={() => setChoice(feeling.name)}
          aria-pressed={choice === feeling.name}
          className="min-h-14 flex items-center justify-center gap-2 px-3 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-base font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-300">

            <span aria-hidden="true" className="text-2xl">{feeling.emoji}</span>
            <span>{feeling.name}</span>
          </button>
        )}
      </div>
      <button onClick={nextPicture} className="self-start px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm">{tr("Next picture")}

      </button>
    </div>);

}

function PatternRecall({ reduceVisualMotion }) {
  const [sequence, setSequence] = useState([]);
  const [step, setStep] = useState(0);
  const [lit, setLit] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | showing | input | ready | over
  const timers = useRef([]);

  const clearTimers = () => {timers.current.forEach(clearTimeout);timers.current = [];};
  useEffect(() => clearTimers, []);

  const play = (items) => {
    clearTimers();
    setLit(null);
    setPhase('showing');
    setStep(0);
    const systemPrefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const slowVisuals = reduceVisualMotion || systemPrefersReducedMotion;
    const interval = slowVisuals ? 1800 : 1200;
    const highlightDuration = slowVisuals ? 1100 : 700;
    items.forEach((pad, index) => {
      timers.current.push(setTimeout(() => setLit(pad), index * interval + 500));
      timers.current.push(setTimeout(() => setLit(null), index * interval + 500 + highlightDuration));
    });
    timers.current.push(setTimeout(() => setPhase('input'), items.length * interval + 700));
  };

  const start = () => {
    const firstSequence = [Math.floor(Math.random() * 4)];
    setSequence(firstSequence);
    play(firstSequence);
  };

  const stop = () => {
    clearTimers();
    setLit(null);
    setPhase('idle');
  };

  const tap = (index) => {
    if (phase !== 'input') return;
    if (sequence[step] !== index) {
      setLit(null);
      setPhase('over');
      return;
    }
    setLit(index);
    const systemPrefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    timers.current.push(setTimeout(() => setLit(null), reduceVisualMotion || systemPrefersReducedMotion ? 600 : 300));
    if (step === sequence.length - 1) {
      setSequence((items) => [...items, Math.floor(Math.random() * 4)]);
      setPhase('ready');
    } else {
      setStep((current) => current + 1);
    }
  };

  const banner = {
    idle: 'Start when you are ready. There is no timer.',
    showing: 'Watch the pattern…',
    input: 'Your turn — tap the numbered pads in order.',
    ready: 'Pattern completed. Continue when you are ready.',
    over: 'That is okay. Show the same pattern again, or stop.'
  }[phase];
  const primaryLabel = {
    idle: 'Start pattern',
    showing: 'Stop activity',
    input: 'Stop activity',
    ready: 'Continue with a new pattern',
    over: 'Show this pattern again'
  }[phase];
  const handlePrimary = () => {
    if (phase === 'idle') start();else
    if (phase === 'showing' || phase === 'input') stop();else
    play(sequence);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col gap-5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-400 font-extrabold">
        <Gamepad2 className="w-4 h-4 text-emerald-300" />{tr(" Pattern Recall")}
      </div>
      <Info className="text-sm text-slate-300 leading-relaxed">{tr("An optional pattern activity. It is untimed, has no personal score, and is not a measure of memory or cognitive health. Reduce visual movement in Settings to slow each highlight.")}</Info>
      <p className="text-sm text-slate-200 min-h-11" role="status" aria-live="polite">{banner}</p>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((index) =>
        <button
          key={index}
          onClick={() => tap(index)}
          disabled={phase !== 'input'}
          aria-label={`Pattern pad ${index + 1}`}
          className={`min-h-20 sm:min-h-24 rounded-2xl border-2 border-slate-600 bg-slate-800 text-3xl font-bold transition ${
          lit === index ? 'bg-emerald-500 text-slate-950 border-emerald-300' : 'text-slate-100'} disabled:cursor-default focus:outline-none focus:ring-2 focus:ring-emerald-300`
          }>

            {index + 1}
          </button>
        )}
      </div>
      <button onClick={handlePrimary} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl text-sm">
        {primaryLabel}
      </button>
    </div>);

}

const SOUNDSCAPES = [
{ id: 'rain', name: 'Rain', icon: CloudRain },
{ id: 'ocean', name: 'Waves', icon: Waves },
{ id: 'forest', name: 'Forest', icon: TreePine },
{ id: 'fire', name: 'Hearth', icon: Flame }];


const PICTURE_PAIRS = [
{ pairId: 'cup', label: 'Cup', emoji: '☕' },
{ pairId: 'book', label: 'Book', emoji: '📘' },
{ pairId: 'plant', label: 'Plant', emoji: '🌿' },
{ pairId: 'bird', label: 'Bird', emoji: '🐦' }];


function makePictureDeck(pairCount) {
  const cards = PICTURE_PAIRS.slice(0, pairCount).flatMap((picture) => [
  { ...picture, cardId: `${picture.pairId}-a` },
  { ...picture, cardId: `${picture.pairId}-b` }]
  );
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }
  return cards;
}

function PicturePairs() {
  const [pairCount, setPairCount] = useState(3);
  const [cards, setCards] = useState(() => makePictureDeck(3));
  const [opened, setOpened] = useState([]);
  const [matched, setMatched] = useState([]);
  const [status, setStatus] = useState('Choose two picture cards to look for a pair.');

  const restart = (count = pairCount) => {
    setCards(makePictureDeck(count));
    setOpened([]);
    setMatched([]);
    setStatus('Choose two picture cards to look for a pair.');
  };

  const choosePairCount = (event) => {
    const count = Number(event.target.value);
    setPairCount(count);
    restart(count);
  };

  const reveal = (card) => {
    if (opened.length >= 2 || matched.includes(card.pairId) || opened.includes(card.cardId)) return;
    const nextOpened = [...opened, card.cardId];
    setOpened(nextOpened);
    if (nextOpened.length < 2) return;

    const first = cards.find((item) => item.cardId === nextOpened[0]);
    if (first?.pairId === card.pairId) {
      const nextMatched = [...matched, card.pairId];
      setMatched(nextMatched);
      setOpened([]);
      setStatus(nextMatched.length === pairCount ?
      'All pairs are visible. You can start again or choose a different number of pairs.' :
      'Pair found. Take your time with the next one.');
    } else {
      setStatus('These are different pictures. They will stay open until you choose “Hide cards.”');
    }
  };

  const canHide = opened.length === 2 && !matched.includes(cards.find((item) => item.cardId === opened[0])?.pairId);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col gap-5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-400 font-extrabold">
        <Gamepad2 className="w-4 h-4 text-emerald-300" />{tr(" Picture pairs")}
      </div>
      <Info className="text-sm text-slate-300 leading-relaxed">{tr("Match familiar picture symbols at your own pace. There is no timer or score; unmatched cards stay visible until you choose to hide them. This is an optional game, not a memory test.")}</Info>
      <label className="flex items-center gap-3 text-sm font-semibold text-slate-200">
        <span>{tr("Number of pairs")}</span>
        <select value={pairCount} onChange={choosePairCount} className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white">
          <option value={2}>{tr("2 pairs")}</option>
          <option value={3}>{tr("3 pairs")}</option>
          <option value={4}>{tr("4 pairs")}</option>
        </select>
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((card, index) => {
          const isOpen = opened.includes(card.cardId) || matched.includes(card.pairId);
          const isMatched = matched.includes(card.pairId);
          return (
            <button
              key={card.cardId}
              onClick={() => reveal(card)}
              disabled={isMatched || opened.length === 2}
              aria-pressed={isOpen}
              aria-label={isOpen ? `${card.label}${isMatched ? ', pair found' : ''}` : `Hidden picture card ${index + 1}`}
              className={`min-h-24 flex flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3 text-center focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-default ${
              isOpen ? 'bg-emerald-950 border-emerald-500 text-slate-100' : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'}`
              }>

              <span aria-hidden="true" className="text-3xl">{isOpen ? card.emoji : '▢'}</span>
              <span className="text-sm font-semibold">{isOpen ? card.label : `Card ${index + 1}`}</span>
            </button>);

        })}
      </div>
      <p className="text-sm text-slate-200 min-h-10" role="status" aria-live="polite">{status}</p>
      <div className="flex flex-wrap gap-2">
        {canHide && <button onClick={() => {setOpened([]);setStatus('Cards hidden. Choose two when you are ready.');}} className="px-4 py-2.5 bg-slate-800 border border-slate-600 text-slate-100 rounded-xl font-semibold text-sm">{tr("Hide cards")}</button>}
        <button onClick={() => restart()} className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm">{tr("Start over")}</button>
      </div>
    </div>);

}

const PICTURE_STORIES = [
{
  title: 'A seed grows',
  steps: [
  { label: 'Seed', emoji: '🫘' },
  { label: 'Sprout', emoji: '🌱' },
  { label: 'Flower', emoji: '🌼' }]

},
{
  title: 'Wash hands',
  steps: [
  { label: 'Wet hands', emoji: '🚰' },
  { label: 'Use soap', emoji: '🧼' },
  { label: 'Rinse', emoji: '💧' }]

}];


function PictureStory() {
  const [storyIndex, setStoryIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const story = PICTURE_STORIES[storyIndex];
  const step = story.steps[stepIndex];

  const chooseStory = (event) => {
    setStoryIndex(Number(event.target.value));
    setStepIndex(0);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col gap-5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-400 font-extrabold">
        <FileText className="w-4 h-4 text-emerald-300" />{tr(" Picture story")}
      </div>
      <Info className="text-sm text-slate-300 leading-relaxed">{tr("Explore a short, predictable picture sequence. These are examples, not instructions—people’s routines and preferences differ. Move forward or back whenever you like.")}</Info>
      <label className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-200">
        <span>{tr("Choose a story")}</span>
        <select value={storyIndex} onChange={chooseStory} className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white">
          {PICTURE_STORIES.map((item, index) => <option key={item.title} value={index}>{item.title}</option>)}
        </select>
      </label>
      <div className="text-center py-5 bg-slate-950 rounded-2xl border border-slate-800" aria-live="polite">
        <p className="text-xs text-slate-400">{tr("Picture ")}{stepIndex + 1}{tr(" of ")}{story.steps.length}</p>
        <div className="text-6xl my-3" aria-hidden="true">{step.emoji}</div>
        <p className="text-lg font-bold text-slate-100">{step.label}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => setStepIndex((index) => Math.max(0, index - 1))} disabled={stepIndex === 0} className="px-4 py-2.5 bg-slate-800 border border-slate-600 text-slate-100 rounded-xl font-semibold text-sm disabled:opacity-50">{tr("Previous picture")}</button>
        <button onClick={() => setStepIndex((index) => (index + 1) % story.steps.length)} className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm">{stepIndex === story.steps.length - 1 ? tr('Start story again') : tr('Next picture')}</button>
      </div>
    </div>);

}

function Soundscapes() {
  const [playing, setPlaying] = useState(null);

  useEffect(() => () => soundEngine.stop(), []);

  const toggle = (id) => {
    if (playing === id) {
      soundEngine.stop();
      setPlaying(null);
    } else {
      soundEngine.play(id);
      setPlaying(id);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-400 font-extrabold">
          <Volume2 className="w-4 h-4 text-cyan-400" />{tr(" Sensory Soundscapes")}
        </div>
        {playing &&
        <button onClick={() => toggle(playing)} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-full font-bold border border-slate-700">{tr("⏸ Stop")}

        </button>
        }
      </div>
      <Info className="text-xs text-slate-400 -mt-3">{tr("Generated live with the Web Audio API and works offline. Audio preferences vary; start at a comfortable device volume and stop anytime.")}

      </Info>
      <div className="grid grid-cols-2 gap-3 flex-1">
        {SOUNDSCAPES.map((s) => {
          const Icon = s.icon;
          const active = playing === s.id;
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              aria-pressed={active}
              className={`rounded-2xl p-4 border transition text-left ${
              active ?
              'bg-cyan-500/15 border-cyan-400/60 ring-2 ring-cyan-400/50' :
              'bg-slate-800/60 border-slate-700 hover:bg-slate-800'}`
              }>

              <Icon className={`w-5 h-5 mb-2 ${active ? 'text-cyan-300' : 'text-slate-300'}`} />
              <div className="text-sm font-bold text-white">{s.name}</div>
              <div className={`text-[10px] font-semibold ${active ? 'text-cyan-300' : 'text-slate-500'}`}>
                {active ? tr('● Playing') : tr('Tap to play')}
              </div>
            </button>);

        })}
      </div>
    </div>);

}

const PHASES = [
{ name: 'Breathe in', seconds: 4, scale: 'scale-100' },
{ name: 'Breathe out', seconds: 6, scale: 'scale-[0.55]' }];


function BreathingCoach() {
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [count, setCount] = useState(PHASES[0].seconds);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    if (!running) return;
    if (count === 0) {
      const nextIdx = (phaseIdx + 1) % PHASES.length;
      if (nextIdx === 0) setCycles((c) => c + 1);
      setPhaseIdx(nextIdx);
      setCount(PHASES[nextIdx].seconds);
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [running, count, phaseIdx]);

  const toggle = () => {
    if (running) {
      setRunning(false);
    } else {
      setPhaseIdx(0);setCount(PHASES[0].seconds);setRunning(true);
    }
  };

  const phase = PHASES[phaseIdx];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-emerald-300 font-extrabold">
          <Wind className="w-4 h-4" />{tr(" Guided breathing")}
        </div>
        <span className="text-xs bg-emerald-950/60 text-emerald-200 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30">
          {cycles}{tr(" cycles")}
        </span>
      </div>
      <Info className="text-sm text-slate-300 leading-relaxed">{tr("A paced-breathing exercise, not treatment. Breathe in for 4 seconds and out for 6, without a hold. Follow your own comfortable rhythm and pause or stop at any time.")}</Info>
      <div className="flex-1 flex items-center justify-center py-4">
        <div className="relative w-36 h-36 flex items-center justify-center">
          <div
            className={`absolute inset-0 rounded-full bg-emerald-500/15 border-2 border-emerald-400/50 transition-transform ease-in-out ${phase.scale}`}
            style={{ transitionDuration: `${phase.seconds}s` }} />

          <div className="relative z-10 text-center">
            <div className="text-3xl font-black text-slate-100">{count}</div>
            <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest">{running ? phase.name : tr('Paused')}</div>
          </div>
        </div>
      </div>
      <button
        onClick={toggle}
        className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl text-sm">

        {running ? tr('⏸ Pause') : tr('▶ Begin session')}
      </button>
    </div>);

}

// ─────────────────────────────────────────────────────────────────────────────
// Mood check-in — daily emotional pulse, visualised over two weeks.
// ─────────────────────────────────────────────────────────────────────────────
const MOODS = [
{ score: 1, icon: Frown, label: 'Very low', color: 'bg-rose-500' },
{ score: 2, icon: Frown, label: 'Low', color: 'bg-orange-400' },
{ score: 3, icon: Meh, label: 'Okay', color: 'bg-amber-300' },
{ score: 4, icon: Smile, label: 'Good', color: 'bg-lime-400' },
{ score: 5, icon: Laugh, label: 'Great', color: 'bg-emerald-400' }];


function MoodCheckIn({ moods, setMoods }) {
  const today = todayKey();
  const todayMood = moods.find((m) => m.date === today);

  const setToday = (score) => {
    setMoods((ms) => {
      const rest = ms.filter((m) => m.date !== today);
      return [...rest, { date: today, score, ts: Date.now() }].slice(-30);
    });
    celebrateConfetti({ particleCount: 16 });
  };

  const last14 = [...moods].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-14);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base text-white flex items-center gap-2">
          <Smile className="w-4 h-4 text-amber-300" />{tr(" How are you feeling today?")}
        </h3>
        <span className="mood-privacy text-xs text-slate-500"><Lock className="w-3.5 h-3.5" />{tr(" Only on this device")}</span>
      </div>
      <div className="mood-choices">
        {MOODS.map((m) =>
        <button
          key={m.score}
          onClick={() => setToday(m.score)}
          aria-label={tr('Feeling {0}',[tr(m.label)])}
          aria-pressed={todayMood?.score === m.score}
          className={`mood-option flex-1 py-3 rounded-2xl border text-2xl transition ${
          todayMood?.score === m.score ?
          'bg-amber-500/15 border-amber-400/60 ring-2 ring-amber-400/50' :
          'bg-slate-800/60 border-slate-700 hover:bg-slate-800'}`
          }>

            <m.icon className="w-7 h-7 text-slate-300" strokeWidth={1.5} aria-hidden="true" />
            <span className="mood-label">{tr(m.label)}</span>
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-3 items-center justify-between text-xs text-slate-500">
        <span role="status">{todayMood ? tr('Saved for today: {0}. You can change this anytime.',[getLanguage()==='en'?MOODS[todayMood.score-1].label.toLowerCase():tr(MOODS[todayMood.score-1].label)]) : tr('How are you feeling right now?')}</span>
        {last14.length > 0 &&
        <span className="flex items-center gap-1" title={tr("Last check-ins")}>
            {last14.map((m) =>
          <span key={m.date} className={`w-2.5 h-2.5 rounded-full ${MOODS[m.score - 1].color}`} title={m.date} />
          )}
          </span>
        }
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────────────────────
// v2.3 groundwork — user-selected, on-device visit-prep brief. This is an
// editable handoff aid, not a medical record, diagnosis, or clinical summary.
// ─────────────────────────────────────────────────────────────────────────────
const VisitBriefChoice = ({ checked, onChange, title, detail }) =>
<label className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-800/70 p-3 cursor-pointer hover:border-emerald-700/70">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 accent-emerald-500" />
      <span className="min-w-0"><span className="block text-xs font-bold text-slate-100">{title}</span><span className="mt-0.5 block text-[10px] leading-relaxed text-slate-400">{detail}</span></span>
    </label>;


function VisitBriefModal({ open, onClose, displayName, meds, medsConfirmed, notes, moods, hrRecords }) {
  const [includeName, setIncludeName] = useState(false);
  const [includeMeds, setIncludeMeds] = useState(false);
  const [includeMoods, setIncludeMoods] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeLiveVitals, setIncludeLiveVitals] = useState(false);
  const [visitQuestions, setVisitQuestions] = useState('');
  const [downloadMessage, setDownloadMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setIncludeName(false);
    setIncludeMeds(false);
    setIncludeMoods(false);
    setIncludeNotes(false);
    setIncludeLiveVitals(false);
    setVisitQuestions('');
    setDownloadMessage('');
  }, [open]);
  const dialogRef = useDialog(open, onClose);

  if (!open) return null;

  const brief = buildVisitBrief({
    displayName,
    meds,
    medsConfirmed,
    notes,
    moods,
    hrRecords,
    includeName,
    includeMeds,
    includeMoods,
    includeNotes,
    includeLiveVitals,
    visitQuestions,
    moodLabels: Object.fromEntries(MOODS.map((mood) => [mood.score, mood.label]))
  });

  const downloadBrief = () => {
    try {
      const url = URL.createObjectURL(new Blob([brief], { type: 'text/plain;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `caresphere-visit-prep-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      setDownloadMessage('Downloaded to this device. Review every line before sharing.');
    } catch {
      setDownloadMessage('CareSphere could not create the download in this browser.');
    }
  };



  return (
    <div className="fixed inset-0 z-[55] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="visit-brief-title" className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto space-y-5" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-700/50 bg-sky-950/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-200"><FileText className="h-3.5 w-3.5" />{tr(" Local preview · no sync")}</div>
            <h2 id="visit-brief-title" className="mt-3 text-xl font-black text-white">{tr("Prepare for a care visit")}</h2>
            <Info className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">{tr("Choose exactly what to include. The summary is assembled on this device from your entries; it is not a medical record, diagnosis, or clinical advice, and nothing is sent automatically.")}</Info>
          </div>
          <button onClick={onClose} aria-label={tr("Close visit preparation")} className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <VisitBriefChoice checked={includeName} onChange={setIncludeName} title={tr("Display name")} detail="Optional. Off by default." />
          <VisitBriefChoice checked={includeMeds} onChange={setIncludeMeds} title={tr("Medication reminders")} detail="User-entered names and times; review/confirmation status is shown." />
          <VisitBriefChoice checked={includeMoods} onChange={setIncludeMoods} title={tr("Mood check-ins")} detail="Self-reports from this browser. They are not a clinical measure." />
          <VisitBriefChoice checked={includeNotes} onChange={setIncludeNotes} title={tr("Care notes")} detail="Private note text may be sensitive; include only after review." />
          <VisitBriefChoice checked={includeLiveVitals} onChange={setIncludeLiveVitals} title={tr("Live BLE heart-rate samples")} detail="Only readings labeled LIVE_BLE from the current browser session." />
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-bold text-white">{tr("Questions or topics to discuss · optional")}</span>
          <textarea value={visitQuestions} onChange={(event) => setVisitQuestions(event.target.value.slice(0, 1200))} rows={3} maxLength={1200} placeholder={tr("Write your own questions or topics. This draft is temporary and is not saved unless you download the brief.")} className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none" />
        </label>

        <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
          <h3 className="mb-2 text-xs font-bold text-slate-200">{tr("Exact file preview")}</h3>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-300">{brief}</pre>
        </div>
        <footer className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <Info className="text-[10px] leading-relaxed text-slate-500">{tr("Downloaded files are outside CareSphere's local privacy controls. Verify all names, dates, and sources before sharing.")}</Info>
          <div className="flex gap-2 shrink-0">
            <button onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800">{tr("Close")}</button>
            <button onClick={downloadBrief} className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-500"><Download className="h-4 w-4" />{tr(" Download .txt")}</button>
          </div>
        </footer>
        {downloadMessage && <p role="status" className="text-[11px] text-emerald-300">{downloadMessage}</p>}
      </section>
    </div>);

}

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const languageRevision = useLanguage();
  const [speechIssue,setSpeechIssue]=useState('');
  useEffect(()=>{const show=e=>setSpeechIssue(e.detail);window.addEventListener('caresphere-speech-status',show);return()=>window.removeEventListener('caresphere-speech-status',show)},[]);
  useEffect(()=>setSpeechIssue(''),[languageRevision]);
  useEffect(()=>{document.documentElement.lang=languageTag();document.documentElement.dir="ltr"},[languageRevision]);
  const [activeTab, setActiveTab] = useState('home');
  const [storageSecurity, setStorageSecurity] = useState(() => getCareStorageSecurityStatus());
  useEffect(() => {
    const updateStatus = (event) => setStorageSecurity(event.detail || getCareStorageSecurityStatus());
    window.addEventListener(CARE_STORAGE_SECURITY_EVENT, updateStatus);
    return () => window.removeEventListener(CARE_STORAGE_SECURITY_EVENT, updateStatus);
  }, []);
  const [videoSession, setVideoSession] = useState(null);
  const [sosOpen, setSosOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState(null);
  const openSettings = (section = null) => {setSettingsSection(section);setSettingsOpen(true);};
  const [visitBriefOpen, setVisitBriefOpen] = useState(false);
  const [installTipDismissed, setInstallTipDismissed] = useState(false);
  const showInstallTip = isIOS && !isStandalone && !installTipDismissed;
  const localDay = useLocalDayKey();

  // Settings (persisted)
  const [settings, setSettings] = usePersisted('settings', {
    name: '', textScale: 'md', theme: 'system', highContrast: false, lowSensory: true, voice: false, bareMinimum: false
  });
  const updateSettings = (patch) => setSettings((s) => ({ ...s, ...patch }));

  // Apply accessibility preferences to <html>
  useEffect(() => {
    document.documentElement.dataset.textscale = settings.textScale;
    if (settings.highContrast) document.documentElement.dataset.contrast = 'high';else
    delete document.documentElement.dataset.contrast;
    document.documentElement.dataset.lowSensory = settings.lowSensory !== false ? 'true' : 'false';
    setBareMinimum(settings.bareMinimum === true);
  }, [settings.textScale, settings.highContrast, settings.lowSensory, settings.bareMinimum]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      document.documentElement.dataset.theme = settings.theme === 'system' ?
      media.matches ? 'dark' : 'light' :
      settings.theme;
    };
    applyTheme();
    if (media.addEventListener) media.addEventListener('change', applyTheme);else
    media.addListener?.(applyTheme);
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', applyTheme);else
      media.removeListener?.(applyTheme);
    };
  }, [settings.theme]);

  const [notifyState, setNotifyState] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const enableNotifications = () => {
    if (typeof Notification === 'undefined') return;
    Notification.requestPermission().then((p) => setNotifyState(p));
  };

  // ── Toasts ──
  const [toasts, setToasts] = useState([]);
  const dismissToast = useCallback((id) => setToasts((items) => items.filter((toast) => toast.id !== id)), []);
  const pushToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items.slice(-3), { id, ...toast }]);
    return id;
  }, []);

  // ── Daily living state (persisted) ──
  const [routines, setRoutines] = usePersisted('routines', []);
  const [routineUndo, setRoutineUndo] = useState(null);
  const undoRoutine = () => {if (routineUndo?.day === localDayKey()) setRoutines(routineUndo.items);setRoutineUndo(null);};
  // Never prefill medications. Older saved schedules remain visible for review,
  // but reminders stay paused until the user explicitly confirms every entry.
  const [meds, setMeds] = usePersisted('meds', []);
  const [medsConfirmed, setMedsConfirmed] = usePersisted('medsConfirmed', false);
  const [notes, setNotes] = usePersisted('notes', []);
  const [support, setSupport] = usePersisted('support', normalizeSupport());
  useEffect(() => {setSupport((current) => normalizeSupport(current));}, [localDay]);
  const [favorites, setFavorites] = usePersisted('favoriteActivities', []);
  const [moods, setMoods] = usePersisted('moods', []);
  const [routineDraft, setRoutineDraft] = useState('');
  const [routineEditorOpen, setRoutineEditorOpen] = useState(false);
  const [emotionScore] = usePersisted('emotionScore', 0);

  const toggleRoutine = (id) => {
    const now = new Date();
    const day = localDayKey(now);
    const current = routines.find((routine) => routine.id === id);
    if (!current) return;
    const wasDone = isRoutineDoneToday(current, now);
    setRoutineUndo({ items: routines, day: localDayKey() });
    setRoutines((items) => items.map((routine) => routine.id === id ?
    { ...routine, completedOn: wasDone ? null : day } :
    routine));
    if (!wasDone) celebrateConfetti({ particleCount: 14 });
  };
  const addRoutine = (event) => {
    event.preventDefault();
    const text = routineDraft.trim().slice(0, 120);
    if (!text || routines.length >= 24) return;
    const id = globalThis.crypto?.randomUUID?.() || `routine-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setRoutineUndo({ items: routines, day: localDayKey() });
    setRoutines((items) => [...items, { id, text, completedOn: null }]);
    setRoutineDraft('');
  };
  const removeRoutine = (id) => {setRoutineUndo({ items: routines, day: localDayKey() });setRoutines((items) => items.filter((routine) => routine.id !== id));};

  const toggleMed = (id) => {
    const now = new Date();
    const day = localDayKey(now);
    const current = meds.find((medication) => medication.id === id);
    if (!current) return;
    const wasTaken = isMedicationTakenToday(current, now);
    setMeds((items) => items.map((medication) => medication.id === id ?
    { ...medication, takenOn: wasTaken ? null : day } :
    medication));
    if (!wasTaken) celebrateConfetti({ particleCount: 18 });
  };
  // ── Medication reminder engine ──
  // Checks every 15 s whether a scheduled dose is due, then raises a toast,
  // an optional browser notification, and an optional spoken prompt.
  const notifiedRef = useRef(new Set());
  const snoozeTimersRef = useRef({});
  const medsRef = useRef(meds);
  const medsConfirmedRef = useRef(medsConfirmed);
  medsRef.current = meds;
  medsConfirmedRef.current = medsConfirmed;

  const fireMedReminder = (med, key) => {
    pushToast({
      kind: 'med',
      title: `Review your reminder: ${med.name}`,
      body: `Scheduled at ${med.time}. Tap "Mark taken" to save a self-report, or snooze.`,
      ttl: 30000,
      actions: [
      { label: '✓ Taken', onClick: () => {const current = medsRef.current.find(item => item.id === med.id); if (!medsConfirmedRef.current || !current || isMedicationTakenToday(current)) return; toggleMed(med.id); if (settings.voice) speak(tr('Thank you. Dose check-in saved.'));} },
      { label: 'Snooze 10 min', onClick: () => {
          window.clearTimeout(snoozeTimersRef.current[key]);
          snoozeTimersRef.current[key] = window.setTimeout(() => {
            delete snoozeTimersRef.current[key];
            const latest = medsRef.current.find((item) => item.id === med.id);
            if (!medsConfirmedRef.current || !latest || latest.time !== med.time || latest.name !== med.name || isMedicationTakenToday(latest, new Date())) return;
            fireMedReminder(latest, key);
          }, 10 * 60 * 1000);
        } }]

    });
    if (settings.voice) speak(tr('Open your confirmed medication schedule.'));
    if (notifyState === 'granted' && typeof Notification !== 'undefined') {
      try {new Notification('CareSphere — medication reminder', { body: tr('Open your confirmed medication schedule.'), tag: key });} catch {}
    }
  };

  useEffect(() => {
    const check = () => {
      if (!medsConfirmed) return;
      const now = new Date();
      const day = localDayKey(now);
      meds.forEach((med) => {
        if (!med || isMedicationTakenToday(med, now) || typeof med.name !== 'string' || !med.name.trim()) return;
        const due = reminderDate(med.time, now);
        if (!due) return;
        const diff = now - due;
        const key = `${med.id}-${day}`;
        if (diff >= 0 && diff < 120000 && !notifiedRef.current.has(key)) {
          notifiedRef.current.add(key);
          fireMedReminder(med, key);
        }
      });
    };
    check();
    const iv = setInterval(check, 15000);
    return () => clearInterval(iv);
  }, [meds, medsConfirmed, settings.voice, notifyState]); // eslint-disable-line react-hooks/exhaustive-deps

  // User-requested preview for the configured reminder in Settings.
  useEffect(() => {
    window.__careSphereTestReminder = () => {
      if (meds.length === 0) {
        pushToast({ kind: 'info', title: 'No medication schedule', body: 'Add a personal reminder schedule in Settings and review each entry against your current instructions.' });
        return;
      }
      if (!medsConfirmed) {
        pushToast({ kind: 'info', title: 'Schedule not confirmed', body: 'Review every saved name and time in Settings. This preview will not enable reminders or record a dose.' });
        return;
      }
      const med = meds.find((item) => !isMedicationTakenToday(item)) || meds[0];
      pushToast({
        kind: 'med',
        title: `Reminder preview · ${med.name.split(' (')[0]}`,
        body: `Preview only. Your saved reminder time is ${med.time}; no dose is recorded.`,
        ttl: 12000
      });
    };
    return () => {delete window.__careSphereTestReminder;};
  }, [meds, medsConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Vitals ──
  const [hr, setHr] = useState(null);
  const [hrHistory, setHrHistory] = useState([]);
  const [hrRecords, setHrRecords] = useState([]);
  const [hrStatus, setHrStatus] = useState({ mode: 'disconnected', message: 'No sensor connected. Pair a real monitor when you are ready.' });
  const hrStopRef = useRef(null);
  const hrConnectionGenerationRef = useRef(0);
  const [connectingHr, setConnectingHr] = useState(false);

  const receiveHeartRate = (bpm) => {
    const timestamp = new Date().toISOString();
    setHr(bpm);
    setHrHistory((history) => [...history.slice(-35), bpm]);
    setHrRecords((records) => [...records.slice(-499), { timestamp, metric: 'heart_rate_bpm', value: bpm, source }]);
  };
  const receiveHeartRateStatus = (status, generation) => {
    if (generation !== hrConnectionGenerationRef.current) return;
    setHrStatus(status);
    if (status.mode === 'disconnected' || status.mode === 'unsupported') {
      setHr(null);
      setConnectingHr(false);
      hrStopRef.current = null;
    }
  };

  const connectHr = async () => {
    if (hrStopRef.current || connectingHr) return;
    const generation = ++hrConnectionGenerationRef.current;
    setConnectingHr(true);
    const stop = await connectHeartRateMonitor(
      (bpm) => {if (generation === hrConnectionGenerationRef.current) receiveHeartRate(bpm);},
      (status) => receiveHeartRateStatus(status, generation)
    );
    if (generation !== hrConnectionGenerationRef.current) {
      stop?.();
      return;
    }
    hrStopRef.current = stop;
    setConnectingHr(false);
  };
  const disconnectHr = () => {
    hrConnectionGenerationRef.current += 1;
    hrStopRef.current?.();
    hrStopRef.current = null;
    setConnectingHr(false);
    setHr(null);
    setHrHistory([]);
    setHrRecords([]);
    setHrStatus({ mode: 'disconnected', message: 'Disconnected. No current heart-rate reading is displayed.' });
  };
  useEffect(() => () => {
    hrStopRef.current?.();
  }, []);

  const clearTransientCareData = ({ closeOverlays = false } = {}) => {
    setRoutineDraft('');
    setRoutineUndo(null);
    setRoutineEditorOpen(false);
    disconnectHr();
    setToasts([]);
    setVisitBriefOpen(false);
    setVideoSession(null);
    setSosOpen(false);
    if (closeOverlays) setSettingsOpen(false);
    notifiedRef.current.clear();
    Object.values(snoozeTimersRef.current).forEach((timer) => window.clearTimeout(timer));
    snoozeTimersRef.current = {};
  };
  useEffect(() => {
    const handleLocalDataReset = (event) => clearTransientCareData(event.detail);
    window.addEventListener(RESET_LOCAL_DATA_EVENT, handleLocalDataReset);
    return () => window.removeEventListener(RESET_LOCAL_DATA_EVENT, handleLocalDataReset);
  }, []);
  const hasLiveHeartRate = hrStatus.mode === 'live' && hr !== null;
  const anyFlag = hasLiveHeartRate && (hr < 50 || hr > 110);

  const exportVitals = () => {
    const rows = [['timestamp', 'metric', 'value', 'source']];
    hrRecords.forEach((record) => rows.push([record.timestamp, record.metric, record.value, record.source]));
    if (rows.length === 1) {
      pushToast({ kind: 'info', title: 'Nothing to export yet', body: 'Pair a real heart-rate monitor first.' });
      return;
    }
    const csv = encodeCsv(rows);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `caresphere-vitals-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    pushToast({ kind: 'success', title: 'Exported', body: 'CSV downloaded with Bluetooth source labels. Readings are not a diagnosis.' });
  };

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
          bestPattern: normalizePersistedValue('bestPattern', saved.bestPattern, 0)
        },
        sessionVitals: {
          heartRate: hrRecords
        }
      };
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `caresphere-private-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    } catch {
      return false;
    }
  };

  const clearLocalData = async () => {
    const storageCleared = await eraseCareStorage();
    Object.keys(saved).forEach((key) => delete saved[key]);
    window.dispatchEvent(new CustomEvent(RESET_LOCAL_DATA_EVENT, { detail: { closeOverlays: false } }));
    return storageCleared;
  };

  const localDataBytes = useMemo(() => {
    try {return new Blob([JSON.stringify(saved)]).size;} catch {return 0;}
  }, [settings, routines, meds, medsConfirmed, notes, moods, emotionScore, saved.bestPattern]);

  // ── Coffee circles — real, open Jitsi rooms ──
  const coffeeCircles = [
  {
    id: 1, title: 'Morning Sunshine Tea & Chat', icon: '☕',
    time: 'Open Jitsi room · no schedule',
    room: 'CareSphere-MorningSunshineTea-Room2026'
  },
  {
    id: 2, title: 'Classic Movie Trivia & Memories', icon: '🎬',
    time: 'Open Jitsi room · no schedule',
    room: 'CareSphere-ClassicMovieTrivia-Room2026'
  },
  {
    id: 3, title: 'Gentle Stretching & Breathing', icon: '🌿',
    time: 'Open Jitsi room · no schedule',
    room: 'CareSphere-GentleStretchBreathing-Room2026'
  }];


  const launchRoom = (title, room) => setVideoSession({ title, room });
  const launchOpenRoom = () =>
  setVideoSession({
    title: 'CareSphere Open Circle',
    room: `CareSphere-OpenCoffeeCircle-${Math.random().toString(36).slice(2, 8)}`
  });

  const routinesDone = routines.filter((routine) => routine.completedOn === localDay).length;
  const medsTaken = medsConfirmed ? meds.filter((medication) => medication.takenOn === localDay).length : 0;
  const routineIsDone = (routine) => routine.completedOn === localDay;
  const medicationIsTaken = (medication) => medication.takenOn === localDay;
  const nextMed = medsConfirmed ?
  meds.
  filter((medication) => medication.takenOn !== localDay).
  map((medication) => ({ ...medication, t: /^\s*(\d{1,2}):(\d{2})/.exec(medication.time) })).
  filter((m) => m.t).
  sort((a, b) => a.t[1] * 60 + Number(a.t[2]) - (b.t[1] * 60 + Number(b.t[2])))[0] :
  null;

  const tabs = support.simple ? [
  { id: 'home', label: 'My Day', shortLabel: 'My Day', icon: Sun },
  { id: 'games', label: 'Activities', shortLabel: 'Activities', icon: Gamepad2 },
  { id: 'support', label: 'My People & Tools', shortLabel: 'My People', icon: Heart }] :
  [
  { id: 'home', label: 'Overview', shortLabel: 'Today', icon: Sun },
  { id: 'games', label: 'Activities', shortLabel: 'Activities', icon: Gamepad2 },
  { id: 'buddies', label: 'Coffee Circles', shortLabel: 'Connect', icon: Coffee },
  { id: 'care', label: 'Care Circle', shortLabel: 'Care', icon: Shield },
  { id: 'telehealth', label: 'Vitals & Telehealth', shortLabel: 'Vitals', icon: Activity }];


  useEffect(() => {if (activeTab !== 'games') soundEngine.stop();}, [activeTab]);

  const mainRef = useRef(null);
  const previousTab = useRef(activeTab);
  useEffect(() => {
    if (previousTab.current === activeTab) return;
    previousTab.current = activeTab;
    window.scrollTo({ top: 0, behavior: 'instant' });
    mainRef.current?.focus({ preventScroll: true });
  }, [activeTab]);

  const goToSection = (id) => {
    const section = document.getElementById(id);
    section?.scrollIntoView({ behavior: 'instant', block: 'start' });
    section?.focus({ preventScroll: true });
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="app-shell bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">

      <a href="#main-content" className="skip-link">{tr("Skip to main content")}</a>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 pb-4 safe-x ios-header">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <button type="button" aria-label={tr("Go to Overview")} className="flex items-center space-x-3 shrink-0 text-left" onClick={() => setActiveTab('home')}>
            <div className="brand-mark"><Heart className="w-6 h-6" aria-hidden="true" /></div>
            <div className="brand-copy">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-emerald-300">{tr("CareSphere")}</span>
              </div>
              <Info className="text-[11px] text-slate-400">{tr("A little support, every day")}</Info>
            </div>
          </button>

          <nav className="desktop-nav hidden xl:flex items-center space-x-1" aria-label={tr("Main navigation")}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  aria-pressed={activeTab === tab.id}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === tab.id ? 'bg-emerald-600 text-white shadow-md' : 'nav-inactive'}`
                  }>

                  <Icon className="w-4 h-4" />
                  <span>{tr(tab.label)}</span>
                </button>);

            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => openSettings()}
              aria-label={tr("Settings and accessibility")}
              title={tr("Settings and accessibility")}
              className="header-settings p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl border border-slate-700 transition">

              <Settings className="w-4 h-4" /><span className="hidden sm:inline">{tr("Settings")}</span>
            </button>
            <button
              onClick={() => setSosOpen(true)}
              className="bg-red-600/90 hover:bg-red-600 text-white px-3.5 sm:px-4 py-2.5 rounded-2xl font-black text-xs shadow-lg shadow-red-500/30 flex items-center gap-1.5">

              <Phone className="w-3.5 h-3.5" />{tr(" SOS")}
            </button>
          </div>
        </div>
      </header>

      {speechIssue && <div role="alert" className="p-4">{speechIssue}<button className="library-secondary" onClick={()=>setSpeechIssue('')}>{tr('Close')}</button></div>}
      <nav style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }} className="mobile-nav xl:hidden" aria-label={tr("Main navigation")}>
          {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              aria-pressed={activeTab === tab.id}
              aria-label={tr(tab.label)}
              className={`mobile-nav-item ${
              activeTab === tab.id ? 'is-active' : ''}`
              }>

                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{tr(tab.shortLabel)}</span>
              </button>);

        })}
        </nav>

      {/* iOS install tip — Safari requires manual Add to Home Screen */}
      {showInstallTip &&
      <div className="bg-emerald-500/10 border-b border-emerald-500/25 px-4 sm:px-8 py-2.5 text-xs text-emerald-200 flex items-center gap-3 safe-x">
          <span className="flex-1 leading-relaxed">{tr("📲 Install CareSphere on your iPhone: tap ")}
          <span className="font-bold">{tr("Share → Add to Home Screen")}</span>{tr(" in Safari. The app shell works offline; reminders run only while it is open and are not reliably delivered after closing it.")}
        </span>
          <button
          onClick={() => setInstallTipDismissed(true)}
          aria-label={tr("Dismiss install tip")}
          className="p-1.5 text-emerald-300/70 hover:text-white shrink-0">

            <X className="w-4 h-4" />
          </button>
        </div>
      }

      <main id="main-content" ref={mainRef} tabIndex={-1} aria-label={tabs.find((tab) => tab.id === activeTab)?.label} className="main-content flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {activeTab !== 'support' && <div className="flex flex-wrap gap-3 items-center"><button className="library-secondary" onClick={() => setActiveTab('support')}>{tr("My support tools")}</button>{!support.onboarded && <span className="text-sm">{tr("New here? Try an activity or choose your comfort settings—no profile required.")}</span>}</div>}

        {/* ══════════ OVERVIEW ══════════ */}
        {activeTab === 'support' && <SupportHub support={support} setSupport={setSupport} notes={notes} setNotes={setNotes} routines={routines} setRoutines={setRoutines} settings={settings} updateSettings={updateSettings} navigate={setActiveTab} />}
        {activeTab === 'home' && support.simple && <section className="support-card"><h1 className="text-3xl font-bold">{tr("My day, at my pace")}</h1><p>{tr("One thing at a time. Choose what feels useful.")}</p><div className="support-actions"><button className="library-primary" onClick={() => setActiveTab('games')}>{tr("Activities")}</button><button className="library-primary" onClick={() => setActiveTab('support')}>{tr("My people & support tools")}</button></div><h2>{tr("My daily routine")}</h2>{routines.length ? routines.map((r) => <button key={r.id} className="library-choice" aria-pressed={routineIsDone(r)} onClick={() => toggleRoutine(r.id)}>{routineIsDone(r) ? '✓ ' : ''}{r.text}</button>) : <p>{tr("No daily routines yet. Visual routines are in My support tools. Restore the full view to customize your daily checklist.")}</p>}<button className="library-secondary" onClick={() => setSupport((s) => ({ ...s, simple: false }))}>{tr("Restore full view")}</button></section>}
        {activeTab === 'home' && routineUndo?.day === localDayKey() && <button className="library-secondary" onClick={undoRoutine}>{tr("Undo last routine change")}</button>}
        {activeTab === 'home' && !support.simple &&
        <div className="space-y-8">
            <section className="overview-welcome" aria-labelledby="welcome-title">
              <div className="welcome-copy">
                <div className="eyebrow"><span className="welcome-dot" />{tr(" YOUR DAILY SPACE ")}<span className="welcome-date">{new Date().toLocaleDateString(languageTag(), { weekday: 'long', month: 'short', day: 'numeric' })}</span></div>
                <h1 id="welcome-title">{tr('{0}, {1}.',[tr(greeting),settings.name || tr('friend')])}</h1>
                <Info>{tr("A little structure. A moment of calm. A familiar face.")}<br className="hidden sm:block" />{tr(" Take today at your own pace.")}</Info>
                <div className="welcome-actions">
                  <button onClick={() => goToSection('daily-routine')} className="primary-action">{tr("View my routine ")}<ArrowRight className="w-4 h-4" /></button>
                  <button onClick={() => setActiveTab('games')} className="secondary-action"><Wind className="w-4 h-4" />{tr(" Find a calm moment")}</button>
                </div>
              </div>
              <div className="daily-note">
                <div className="daily-note-icon"><TreePine className="w-7 h-7" strokeWidth={1.5} /></div>
                <span className="eyebrow">{tr("ONE THING AT A TIME")}</span>
                <h2>{tr("Your day, your pace.")}</h2>
                <Info>{tr("Check in with yourself, follow a routine, or simply take a break. You choose what feels right.")}</Info>
                <span className="daily-note-footer"><Check className="w-4 h-4" />{tr(" Small steps are enough")}</span>
              </div>
            </section>

            <section aria-labelledby="today-summary">
              <div className="section-heading"><h2 id="today-summary">{tr("Today at a glance")}</h2><span>{tr("Here to help, not to hurry.")}</span></div>
              <div className="summary-grid">
                <button onClick={() => goToSection('daily-routine')} className="summary-card">
                  <span className="summary-top"><span className="summary-icon"><CheckCircle /></span><ChevronRight /></span>
                  <span className="summary-label">{tr("Daily routine")}</span>
                  <span className="summary-value">{routinesDone}<span> / {routines.length}{tr(" done")}</span></span>
                  <span className="summary-hint">{routines.length === 0 ? tr('Create your first routine') : routinesDone === routines.length ? tr('All checked in for today') : tr('Your personal daily checklist')}</span>
                  <span className="routine-progress" aria-hidden="true"><span style={{ width: `${routines.length ? routinesDone / routines.length * 100 : 0}%` }} /></span>
                </button>
                <button onClick={() => goToSection('today-medications')} className="summary-card">
                  <span className="summary-top"><span className="summary-icon rose"><Pill /></span><ChevronRight /></span>
                  <span className="summary-label">{tr("Medications")}</span>
                  <span className="summary-value">{meds.length === 0 ? tr('Not set up') : medsConfirmed ? <>{medsTaken}<span> / {meds.length}{tr(" marked")}</span></> : tr('Review needed')}</span>
                  <span className="summary-hint">{meds.length === 0 ? tr('Add your own reminder schedule') : medsConfirmed ? nextMed ? `Next: ${nextMed.name} at ${nextMed.time}` : tr('All check-ins marked today') : tr('Confirm your saved schedule')}</span>
                </button>
                <button onClick={() => setActiveTab('telehealth')} className="summary-card">
                  <span className="summary-top"><span className="summary-icon blue"><Activity /></span><ChevronRight /></span>
                  <span className="summary-label">{tr("Heart rate")}</span>
                  <span className="summary-value">{hr !== null ? <>{hr}<span>{tr(" bpm")}</span></> : tr('Not connected')}</span>
                  <span className="summary-hint">{hrStatus.mode === 'live' ? tr('Live reading · Bluetooth monitor') : tr('Connect a Bluetooth monitor')}</span>
                </button>
                <button onClick={() => setActiveTab('buddies')} className="summary-card">
                  <span className="summary-top"><span className="summary-icon amber"><Coffee /></span><ChevronRight /></span>
                  <span className="summary-label">{tr("A moment together")}</span>
                  <span className="summary-value">{tr("Coffee circles")}</span>
                  <span className="summary-hint">{tr("Explore video rooms to share")}</span>
                </button>
              </div>
            </section>

            <MoodCheckIn moods={moods} setMoods={setMoods} />

            {/* Routines & meds */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div id="daily-routine" tabIndex={-1} role="region" aria-labelledby="routine-title" className="task-card bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 id="routine-title" className="font-bold text-base text-white">{tr("My daily routine")}</h3>
                    <Info className="text-[11px] text-slate-500 mt-0.5">{tr("Check-ins reset at local midnight.")}</Info>
                  </div>
                  <button
                  onClick={() => setRoutineEditorOpen((open) => !open)}
                  aria-expanded={routineEditorOpen}
                  className="text-xs font-bold text-emerald-300 hover:text-emerald-200 px-3 py-2 rounded-xl border border-emerald-800/60 hover:bg-emerald-950/40">

                    {routineEditorOpen ? tr('Done editing') : tr('Customize')}
                  </button>
                </div>
                {routineEditorOpen &&
              <form onSubmit={addRoutine} className="rounded-2xl border border-emerald-800/50 bg-emerald-950/20 p-3 space-y-2">
                    <label htmlFor="new-routine" className="block text-xs font-bold text-slate-200">{tr("Add a personal routine")}</label>
                    <div className="flex gap-2">
                      <input
                    id="new-routine"
                    value={routineDraft}
                    onChange={(event) => setRoutineDraft(event.target.value.slice(0, 120))}
                    maxLength={120}
                    placeholder={tr("For example: Take a short walk")}
                    className="min-w-0 flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500" />

                      <button type="submit" disabled={!routineDraft.trim() || routines.length >= 24} className="bg-emerald-600 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-xs">{tr("Add")}</button>
                    </div>
                    <Info className="text-[10px] text-slate-500">{tr("Saved only in this browser. Up to 24 routines.")}</Info>
                  </form>
              }
                <div className="space-y-2.5">
                  {routines.length === 0 && <p className="text-xs text-slate-400">{tr("No routines yet. Customize your list to add one.")}</p>}
                  {routines.map((r) =>
                <div key={r.id} className="flex gap-2">
                      <button
                    onClick={() => toggleRoutine(r.id)}
                    aria-pressed={routineIsDone(r)}
                    className={`flex-1 min-w-0 flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition text-left ${
                    routineIsDone(r) ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-slate-800/60 border-slate-700/60 text-slate-200 hover:bg-slate-800'}`
                    }>

                        <span className={`font-semibold text-sm ${routineIsDone(r) ? 'line-through' : ''}`}>{r.text}</span>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ml-3 ${routineIsDone(r) ? 'bg-emerald-500 text-slate-950 font-bold' : 'border border-slate-600'}`}>
                          {routineIsDone(r) && '✓'}
                        </span>
                      </button>
                      {routineEditorOpen &&
                  <button onClick={() => removeRoutine(r.id)} aria-label={`Remove routine ${r.text}`} className="shrink-0 px-3 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-950/40">
                          <X className="w-4 h-4" />
                        </button>
                  }
                    </div>
                )}
                </div>
              </div>

              <div id="today-medications" tabIndex={-1} role="region" aria-labelledby="medications-title" className="task-card bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 id="medications-title" className="font-bold text-base text-white">{tr("Today's medications")}</h3>
                  <button onClick={() => openSettings('medications')} className="text-xs font-bold text-emerald-300 px-3 py-2 rounded-xl border border-emerald-800/60">{meds.length ? tr('Manage') : tr('Set up')}</button>
                </div>
                <div className="space-y-2.5">
                  {meds.length === 0 && <div className="medication-empty">
                    <span className="summary-icon rose"><Pill /></span>
                    <h4>{tr("No medication reminders yet")}</h4>
                    <p>{tr("If you need them, add medicines and times from your label or care team's instructions.")}</p>
                    <button onClick={() => openSettings('medications')} className="secondary-action"><Plus className="w-4 h-4" />{tr(" Add a medication")}</button>
                  </div>}
                  {meds.length > 0 && !medsConfirmed && <p className="text-xs text-amber-200 bg-amber-950/30 border border-amber-800/50 rounded-xl p-3">{tr("A saved schedule needs review in Settings. Reminders and dose check-ins are paused until you confirm every name and time.")}</p>}
                  {medsConfirmed && meds.map((m) =>
                <div key={m.id} className={`medication-item flex items-center justify-between gap-3 p-4 rounded-2xl border transition ${medicationIsTaken(m) ? 'bg-slate-800/40 border-slate-700/50 text-slate-400' : 'bg-rose-950/30 border-rose-500/30 text-slate-100'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                      onClick={() => toggleMed(m.id)}
                      aria-label={`Mark ${m.name} ${medicationIsTaken(m) ? 'not taken' : 'taken'}`}
                      aria-pressed={medicationIsTaken(m)}
                      className={`medication-check w-11 h-11 rounded-full flex items-center justify-center transition shrink-0 ${medicationIsTaken(m) ? 'bg-emerald-500 text-slate-950 font-bold' : 'border border-rose-400 hover:bg-rose-500/20'}`}>

                          {medicationIsTaken(m) && '✓'}
                        </button>
                        <div className="min-w-0">
                          <div className={`font-bold text-sm break-words ${medicationIsTaken(m) ? 'line-through text-slate-500' : 'text-white'}`}>{m.name}</div>
                          <div className="text-xs text-slate-400">{tr("Scheduled ")}{m.time}</div>
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold shrink-0 ml-3 ${medicationIsTaken(m) ? 'bg-slate-800 text-slate-400' : 'bg-rose-500/20 text-rose-300'}`}>
                        {medicationIsTaken(m) ? tr('Marked taken today') : tr('Not marked')}
                      </span>
                    </div>
                )}
                </div>
                {medsConfirmed && <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5 text-amber-400" />{tr("In-app reminders run while this page is open. Browser notifications require permission and do not provide a reliable closed-browser schedule.")}

              </p>}
              </div>
            </div>
          </div>
        }

        {/* ══════════ THERAPY & SENSORY ══════════ */}
        {activeTab === 'games' &&
        <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-black text-white">{tr("Activities & Sensory Tools")}</h1>
              <Info className="text-sm text-slate-400 mt-1 leading-relaxed">{tr("Optional, self-paced activities for shared practice and enjoyment—not therapy, treatment, or assessment. No activity is timed or scored; skip or stop at any time.")}

            </Info>
            </div>
            <ActivityLibrary choices={support.choices} favorites={favorites} onToggleFavorite={(id) => setFavorites((current) => toggleFavorite(id, current))} renderActivity={(id) => {
            switch (id) {
              case 'feelings':return <EmotionMatch />;
              case 'patternRecall':return <PatternRecall reduceVisualMotion={settings.lowSensory} />;
              case 'picturePairs':return <PicturePairs />;
              case 'pictureStory':return <PictureStory />;
              case 'soundscapes':return <Soundscapes />;
              case 'breathing':return <BreathingCoach />;
              default:return null;
            }
          }} />
          </div>
        }

        {/* ══════════ COFFEE CIRCLES ══════════ */}
        {activeTab === 'buddies' &&
        <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-white">{tr("Coffee Circles — Isolation Prevention")}</h1>
                <Info className="text-xs sm:text-sm text-slate-400 mt-1">{tr("These buttons open real ")}
                <span className="text-emerald-300 font-semibold">{tr("meet.jit.si")}</span>{tr(" rooms — join embedded or in a full tab. Rooms are public links with no scheduled host, attendance count, or CareSphere moderation. Share only with people you trust; the provider may require sign-in to start a room. You'll appear as ")}<span className="text-white font-semibold">{settings.name}</span>.
                </Info>
              </div>
              <button
              onClick={launchOpenRoom}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-2xl text-xs shadow-lg transition flex items-center gap-1.5">

                <Video className="w-3.5 h-3.5" />{tr(" Launch open circle")}
            </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {coffeeCircles.map((room) =>
            <div key={room.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col shadow-xl">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{room.icon}</span>
                      <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-bold border border-slate-700">{room.time}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{room.title}</h3>
                    <p className="text-xs text-slate-400">{tr("No CareSphere host, attendance tracking, or moderation is configured. Anyone with the Jitsi room link can join.")}</p>
                    <p className="text-[10px] text-slate-600 font-mono break-all">{tr("meet.jit.si/")}{room.room}</p>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button
                  onClick={() => launchRoom(room.title, room.room)}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3 rounded-2xl text-xs shadow transition flex items-center justify-center gap-1.5">

                      <Video className="w-3.5 h-3.5" />{tr(" Join in app")}
                </button>
                    <a
                  href={`https://meet.jit.si/${room.room}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${room.title} in a new tab`}
                  className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-2xl text-xs transition flex items-center">

                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
            )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-xs text-slate-400 space-y-2">
              <div className="font-bold text-white">{tr("💡 How the video works")}</div>
              <p>{tr("Rooms use Jitsi Meet's encrypted WebRTC transport. \"Join in app\" loads the official Jitsi External API inside CareSphere; camera and microphone permissions are requested only when you enable them. CareSphere does not host, schedule, or moderate rooms; anyone with a room link may join, so verify participants before sharing private health details.")}



            </p>
            </div>
          </div>
        }

        {/* ══════════ CARE CIRCLE ══════════ */}
        {activeTab === 'care' &&
        <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-white">{tr("Care Circle · Local")}</h1>
                <Info className="text-xs sm:text-sm text-slate-400 mt-1">{tr("Private notes and check-ins saved in this browser. No family-sync, clinician portal, or push-alert server is connected.")}</Info>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setVisitBriefOpen(true)} className="text-xs bg-sky-700 hover:bg-sky-600 text-white px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition" aria-haspopup="dialog">
                  <FileText className="w-4 h-4" />{tr(" Prepare visit brief")}
              </button>
                <span className="text-xs bg-purple-500/15 text-purple-300 border border-purple-500/30 px-4 py-2 rounded-2xl font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />{tr(" Stored on this device")}
              </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <CareNotes onDelete={(note) => setSupport((s) => normalizeSupport({ ...s, trash: [{ ...note, deletedAt: Date.now() }, ...s.trash.filter((n) => n.id !== note.id)] }))} notes={notes} setNotes={setNotes} displayName={settings.name} />

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-950 to-purple-950 border border-indigo-500/30 rounded-3xl p-6 space-y-3.5">
                  <div className="inline-flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold text-amber-300">
                    <Sparkles className="w-3.5 h-3.5" />{tr(" Local check-in summary")}
                </div>
                  <h3 className="text-lg font-bold text-white">{tr("From this browser's saved entries")}</h3>
                  <ul className="space-y-2.5 text-xs text-indigo-200/90 leading-relaxed">
                    <li>{tr("• Routine completion: ")}<span className="text-white font-bold">{routinesDone}/{routines.length}</span>{tr(" today — consistency is the goal, not perfection.")}</li>
                    <li>{tr("• Activities: ")}<span className="text-white font-bold">{tr("Optional and unscored")}</span>{tr(" — participation is not tracked.")}</li>
                    <li>{tr("• Coffee-circle attendance: ")}<span className="text-white font-bold">{tr("Not tracked")}</span>{tr(" — no calendar or family-sync connection is configured.")}</li>
                    <li>{tr("• Mood check-ins logged: ")}<span className="text-white font-bold">{moods.length}</span>{tr(" — a gentle emotional pulse over time")}{moods.length ? ` (latest: feeling ${MOODS[moods[moods.length - 1].score - 1].label.toLowerCase()})` : ''}.</li>
                  </ul>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2"><Pill className="w-4 h-4 text-rose-400" />{tr(" Medication check-ins · today")}</h3>
                  <div className="text-2xl font-black text-white">{meds.length === 0 ? '—' : medsConfirmed ? `${medsTaken} / ${meds.length}` : tr('Review')}{medsConfirmed && <span className="text-xs font-normal text-slate-400">{tr(" marked taken")}</span>}</div>
                  <p className="text-[11px] text-slate-500">{meds.length === 0 ? tr('No medication schedule is saved in this browser.') : medsConfirmed ? tr('Local self-reports only. CareSphere cannot verify a dose or send this status to family or a pharmacy.') : tr('Saved schedule is paused; review every name and time in Settings. No dose check-ins are counted until confirmed.')}</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
                  <h3 className="text-sm font-bold text-white">{tr("Your care information stays local")}</h3>
                  <p className="text-sm text-slate-400">{tr("No contacts or clinicians are connected. Use the visit brief to choose what to share with someone you trust. Nobody is invited or notified automatically.")}</p>
                </div>
              </div>
            </div>
          </div>
        }

        {/* ══════════ VITALS & TELEHEALTH ══════════ */}
        {activeTab === 'telehealth' &&
        <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-white">{tr("Wearable Vitals & Telehealth")}</h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">{tr("Pair a real Bluetooth heart-rate monitor and export measurements received in this session. No sensor means no reading.")}

              </p>
              </div>
              <div className="flex gap-2">
                <button
                onClick={exportVitals}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs border border-slate-700 transition flex items-center gap-2">

                  <Download className="w-4 h-4" />{tr(" Export CSV")}
              </button>
                <button
                onClick={() => launchRoom('Telehealth consultation', 'CareSphere-TelehealthConsultation-2026')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2.5 rounded-2xl text-xs shadow-lg transition flex items-center gap-2">

                  <Stethoscope className="w-4 h-4" />{tr(" Start telehealth visit")}
              </button>
              </div>
            </div>

            {/* Sensor bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {hrStatus.mode === 'live' ?
              <BluetoothConnected className="w-5 h-5 text-emerald-400 shrink-0" /> :
              <Bluetooth className="w-5 h-5 text-slate-500 shrink-0" />}
                <div className="min-w-0">
                  <SensorChip mode={hrStatus.mode} label={hrStatus.mode.toUpperCase()} />
                  <p className="text-xs text-slate-400 mt-1.5 truncate">{hrStatus.message}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                onClick={connectHr}
                disabled={!!hrStopRef.current || connectingHr}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-4 py-2.5 rounded-2xl text-xs shadow transition flex items-center gap-1.5">

                  <Bluetooth className="w-3.5 h-3.5" /> {connectingHr ? tr('Pairing…') : tr('Pair real monitor')}
                </button>
                {hrStopRef.current &&
              <button onClick={disconnectHr} className="bg-slate-800 text-white font-bold px-4 py-2.5 rounded-2xl text-xs">{tr("Disconnect")}</button>
              }
              </div>
            </div>

            {/* iPhone capability note — honest about iOS Safari limits */}
            {isIOS &&
          <div className="bg-sky-500/10 border border-sky-500/25 rounded-3xl p-4 text-xs text-sky-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <span className="font-bold">{tr("iPhone note:")}</span>{tr(" iOS Safari doesn't support Web Bluetooth. For real Bluetooth pairing or optional shared Apple Health history, use the native ")}
              <span className="font-bold">{tr("CareSphere iOS app")}</span>{tr(". Apple Health history is not a live stream. On desktop Chrome/Edge and compatible Android browsers, \"Pair real monitor\" pairs standard BLE heart-rate monitors.")}

            </span>
              </div>
          }

            {/* Informational range check only — never clinical triage or notification. */}
            <div className={`rounded-3xl border p-5 flex items-start gap-3 ${
          !hasLiveHeartRate ? 'bg-slate-900 border-slate-700' : anyFlag ? 'bg-amber-950/40 border-amber-500/40' : 'bg-emerald-950/30 border-emerald-500/30'}`
          }>
              {!hasLiveHeartRate ?
            <Activity className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" /> :
            anyFlag ?
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" /> :
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
              <div className="text-xs leading-relaxed">
                <div className={`font-black text-sm ${!hasLiveHeartRate ? 'text-slate-200' : anyFlag ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {!hasLiveHeartRate ? tr('Reference check uses live Bluetooth heart rate only') : anyFlag ? tr('Live heart rate is outside this broad example range') : tr('Live heart rate is within this broad example range')}
                </div>
                <p className={!hasLiveHeartRate ? 'text-slate-300 mt-1' : anyFlag ? 'text-amber-200/80 mt-1' : 'text-emerald-200/70 mt-1'}>{tr("This simple example range checks only a current LIVE BLE heart-rate reading (50–110 bpm). Ranges vary by person; this is not triage, does not notify anyone, and does not create a clinical record.")}

              </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Heart rate */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />{tr(" Heart rate")}
                </span>
                  <SensorChip mode={hrStatus.mode} label={hrStatus.mode === 'live' ? tr('LIVE BLE') : hrStatus.mode === 'disconnected' ? tr('NO SENSOR') : hrStatus.mode.toUpperCase()} />
                </div>
                <div className="text-4xl font-black text-white">
                  {hr ?? '—'} <span className="text-xs text-slate-400 font-normal">{tr("bpm")}</span>
                </div>
                <Sparkline data={hrHistory} />
                <Info className="text-[11px] text-slate-500">{tr("Bluetooth SIG Heart Rate profile (0x180D) · sensor notifications · stale after 15 seconds")}</Info>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 md:col-span-2">
                <h2 className="font-bold text-white">{tr("Other health readings")}</h2>
                <p className="text-sm text-slate-400">{tr("Blood oxygen and blood pressure are not connected in this browser. No values are generated. The optional HealthKit build of the native iOS app can read records you choose to share from Apple Health.")}</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-xs text-slate-400 space-y-2">
              <div className="font-bold text-white">{tr("🫀 How vitals really reach this screen")}</div>
              <p>
                <span className="text-slate-200 font-semibold">{tr("Live mode:")}</span>{tr(" \"Pair real monitor\" opens your browser's Bluetooth chooser (Chrome/Edge desktop & Android) and subscribes to the standard BLE Heart Rate service — the same profile exposed by many chest straps. Readings arrive as GATT notifications, plotted above in real time.")}


            </p>
              <Info>{tr("Canceling pairing, losing the connection, or using an unsupported browser leaves the current reading blank. Only real Bluetooth measurements are exported.")}</Info>
            </div>
          </div>
        }
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
        hrRecords={hrRecords} />

      <VideoModal session={videoSession} displayName={settings.name} onClose={() => setVideoSession(null)} />
      <SosModal open={sosOpen} onClose={() => setSosOpen(false)} />
      <SettingsModal
        open={settingsOpen}
        initialSection={settingsSection}
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
        storageSecurity={storageSecurity} />


      {/* Toast stack */}
      <div className="toast-stack fixed bottom-4 right-4 z-[60] flex flex-col gap-3 pointer-events-none" aria-live="polite">
        {toasts.map((t) =>
        <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
        )}
      </div>

      {/* Footer */}
      <footer className="app-footer border-t border-slate-800 bg-slate-900/60 py-8 text-center text-xs text-slate-500 space-y-2 px-4">
        <div className="font-bold text-slate-300">{tr("CareSphere — a little support, every day")}</div>
        <Info>{tr("Real Jitsi Meet rooms · Web Bluetooth vitals · Web Audio sensory studio · Local by default · You choose what to share.")}</Info>
      </footer>
    </div>);

}
