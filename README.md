# 💚 CareSphere AI

**Proactive Senior Care · Isolation Prevention · Autism Support** — a production-grade platform with **two native clients**:

- 📱 **iOS app (Swift/SwiftUI)** — [`ios/`](ios/README.md) · HealthKit + CoreBluetooth vitals, official Jitsi Meet SDK video, UserNotifications medication reminders, AVAudioEngine sensory soundscapes. Compiles in CI on macOS runners.
- 🌐 **Web app (React + Vite)** — the original installable PWA below, sharing the same real `meet.jit.si` rooms so family on any device joins the same calls.

> Live tabs: **Overview · Therapy & Sensory · Coffee Circles · Care Circle · Vitals & Telehealth**

---

## What makes it realistic (not a demo toy)

| Area | How it actually works |
|---|---|
| 🫀 **Wearable vitals** | "Pair heart-rate monitor" uses the **Web Bluetooth API** and subscribes to the standard **Bluetooth SIG Heart Rate profile (service `0x180D`, characteristic `0x2A37`)** — the same GATT profile exposed by Polar, Wahoo, and Apple-Watch-bridged straps. BPM values arrive as real GATT notifications and plot on a live sparkline. When the browser can't do Web Bluetooth (Safari/Firefox/iOS) or nothing is paired, CareSphere streams **clearly-labeled** physiologically-plausible data (`LIVE BLE` vs `SIMULATED` chips on every card — never faking "clinical"). |
| 🩺 **Measurement flows** | SpO₂ runs a 4-second spot-check (like Apple Watch); blood pressure runs a proper oscillometric cuff sequence (inflate → deflate → result). |
| ☕ **Video coffee circles** | Every room is a **real, open [meet.jit.si](https://meet.jit.si) Jitsi Meet room** (encrypted WebRTC, zero installs, zero accounts). Rooms load via the **official Jitsi Meet External API** embedded inside the app, with automatic iframe fallback, plus "open full tab" links. |
| 🔔 **Medication reminders** | A background engine checks doses every 15 s against scheduled times, then raises an in-app **toast** (Taken / Snooze 10 min), an optional **browser notification** (Notifications API), and an optional **spoken prompt** (Speech Synthesis). |
| 🎧 **Sensory soundscapes** | Rain, ocean, forest, and hearth are **synthesized live with the Web Audio API** — filtered noise beds, LFO swells, procedurally scheduled birdsong and crackle transients. No audio files, works offline. |
| 🚨 **Emergency SOS** | Real **`tel:911`** dial link, Care Circle broadcast, and optional **live GPS attach** via the Geolocation API (with a Google Maps link of the coordinates). |
| 📊 **Clinician export** | One-click **CSV download** of the session's heart-rate stream and spot-check readings, ready to email a doctor. |
| 📲 **Installable PWA** | Web app manifest + icons + service worker (production builds). Seniors and families can install it to a home screen; routines still open offline. |
| ♿ **Accessibility** | Text-size scaling (A / A+ / A++), high-contrast mode, `prefers-reduced-motion` support, ARIA roles/labels throughout, one-tap daily mood check-in. |
| 🔒 **Privacy** | Routines, meds, notes, mood history, scores, and settings persist in **browser local storage only** — nothing is uploaded anywhere. |

## Feature tour

- **Overview** — greeting, day-at-a-glance metrics, daily mood check-in (saved + 14-day history dots), predictable-routine checklist, and today's medications with the next due dose.
- **Therapy & Sensory** — Emotion Recognition match (autism emotional-literacy training), Pattern Recall (working-memory game with persisted best score), Web-Audio soundscapes, and a guided 4·4·6 breathing coach.
- **Coffee Circles** — three themed rooms plus an ad-hoc "open circle" generator; join embedded or in a new tab; your display name (set in Settings) enters the room with you.
- **Care Circle** — postable shared care log, AI-style weekly insights (routine/mood/engagement/adherence), 7-day medication adherence strip, and the member directory (family, PCP, wellness coach, activity lead).
- **Vitals & Telehealth** — BLE pairing bar, triage banner against clinical thresholds (HR 50–110, SpO₂ ≥ 94%, BP < 140/90), live sparkline, spot-checks, CSV export, and one-tap Jitsi telehealth visit.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production bundle + PWA in dist/
```

> 💡 For real BLE pairing use Chrome or Edge on desktop/Android — that's a browser/platform capability, not an app limitation.

## Stack

React 18 · Vite 5 · Tailwind CSS 3 · lucide-react · canvas-confetti · Web Bluetooth / Web Audio / WebRTC (Jitsi) / Notifications / Speech / Geolocation browser APIs.

## Roadmap ideas

- Push-based family notifications (requires a small backend + VAPID keys)
- FHIR/HL7 integration for EHR-shared vitals
- Caregiver realtime sync via WebRTC data channels or CRDTs
