# 💚 CareSphere AI

**Proactive Senior Care · Isolation Prevention · Autism Support** — a multi-client platform with native Apple apps and an installable web PWA:

- 📱 **iOS app (Swift/SwiftUI)** — [`ios/`](ios/README.md) · native source; no public App Store/TestFlight build. The 2.1 integration is still awaiting macOS CI verification.
- 🖥️ **Mac app (.dmg)** — [download the latest published CareSphere 2.0.0](https://github.com/engineer2025-sudo/Care/releases/download/mac-v2.0.0/CareSphere-2.0.0-mac.dmg) · native SwiftUI on macOS 13+, Intel/Apple Silicon, Garmin BLE heart-rate pairing. **The 2.1 AI/medical-library/Kiwix/Kokoro features are not in this installer and are not released yet.**
- 🌐 **Web app (React + Vite)** — an installable PWA sharing real `meet.jit.si` rooms with family on other devices.

> Live tabs: **Overview · Therapy & Sensory · Coffee Circles · Care Circle · Vitals & Telehealth**

---

## What makes it realistic (not a demo toy)

| Area | How it actually works |
|---|---|
| 🫀 **Wearable vitals** | "Pair heart-rate monitor" uses the **Web Bluetooth API** and subscribes to the standard **Bluetooth SIG Heart Rate profile (service `0x180D`, characteristic `0x2A37`)** — the same GATT profile exposed by Polar, Wahoo, and Apple-Watch-bridged straps. BPM values arrive as real GATT notifications and plot on a live sparkline. When the browser can't do Web Bluetooth (Safari/Firefox/iOS) or nothing is paired, CareSphere streams **clearly-labeled** physiologically-plausible data (`LIVE BLE` vs `SIMULATED` chips on every card — never faking "clinical"). |
| 🩺 **Measurement flows** | The web SpO₂/BP animations are **simulated demonstrations**, not sensor readings (shown with `SIMULATED` source labels). Real SpO₂/BP values require a compatible device and supported HealthKit data; no cuff or optical sensor is emulated as clinical hardware. |
| ☕ **Video coffee circles** | Real [meet.jit.si](https://meet.jit.si) Jitsi rooms load in-app. They have no CareSphere host, schedule, attendance tracking, or moderation; anyone with a link may join. Verify participants before sharing private health information. |
| 🔔 **Medication reminders** | After you review and confirm your entered schedule, the open page checks every 15 s and can raise an in-app toast, browser notification, and spoken prompt. Browser delivery varies by platform; this web app cannot reliably schedule while the browser is closed. |
| 🎧 **Sensory soundscapes** | Rain, ocean, forest, and hearth are **synthesized live with the Web Audio API** — filtered noise beds, LFO swells, procedurally scheduled birdsong and crackle transients. No audio files, works offline. |
| 🚨 **Emergency SOS** | Real **`tel:911`** dial link, optional GPS coordinates, and a user-confirmed share-sheet/clipboard message. No automatic Care Circle push backend is configured; the app never claims a message was sent or acknowledged. |
| 📊 **Vitals export** | One-click CSV preserves real BLE readings separately from clearly labeled simulated SpO₂/BP spot-checks. It is a data export—not a clinical record or diagnosis. |
| 📲 **Installable PWA** | Web app manifest + icons + service worker (production builds). Seniors and families can install it to a home screen; routines still open offline. |
| ♿ **Accessibility** | Text-size scaling (A / A+ / A++), high-contrast mode, `prefers-reduced-motion` support, ARIA roles/labels throughout, one-tap daily mood check-in. |
| 🔒 **Privacy** | Web content persists in browser local storage. Native care data stays in the app container. The optional 1.5B GGUF assistant runs on-device; Kiwix search is sent only to a configured local/private host. |
| 🧠 **Native Health Guide (2.1, pending release)** | The unreleased 2.1 source adds optional Qwen2.5 1.5B Instruct GGUF via `llama.cpp`, offline MedlinePlus references, and a local Kiwix/ZIM connector. No cloud AI endpoint. |
| 🩺 **Offline medical references (2.1, pending release)** | The 2.1 source can download MedlinePlus XML from the U.S. National Library of Medicine after an explicit tap; it is not bundled and is not individualized medical advice. |
| 🔐 **Biometric privacy** | Native Touch ID/Face ID replaces the root view with an opaque lock screen; private care content is not drawn behind the prompt. |
| 🔊 **Native spoken prompts (2.1, pending release)** | Apple voices remain the default; the unreleased 2.1 source adds an optional int8 Kokoro English pack (~100 MB) and local Sherpa-ONNX synthesis. Audio is not uploaded. Scheduled iOS notifications still use system sounds when the app is closed. |

## Feature tour

- **Overview** — greeting, day-at-a-glance metrics, daily mood check-in (saved + 14-day history dots), predictable-routine checklist, and today's medications with the next due dose.
- **Therapy & Sensory** — Emotion Recognition match (autism emotional-literacy training), Pattern Recall (working-memory game with persisted best score), Web-Audio soundscapes, and a guided 4·4·6 breathing coach.
- **Coffee Circles** — three real Jitsi room links plus an ad-hoc room; join embedded or in a new tab. No CareSphere host, schedule, attendance tracking, or moderation is configured; anyone with a link may join.
- **Care Circle** — browser/device-local care notes and summaries of saved check-ins. The illustrative roster is sample content only; no account sync, clinician portal, family notifications, or shared backend is configured.
- **Vitals & Telehealth** — BLE pairing, clearly-labeled source chips, live sparkline, spot-checks, CSV export, and one-tap Jitsi telehealth visit.
- **Native Health Guide (2.1 development, not released)** — source-linked offline MedlinePlus search, optional Qwen2.5 1.5B on-device summaries, and a local Kiwix connection for an existing Wikipedia/ZIM file. The AI is educational only—not diagnosis, triage, a drug-interaction checker, or dosing advice.

## Download & install

See the [download and setup guide](DOWNLOAD.md). The latest published Mac installer is **CareSphere 2.0.0**; the `mac-v2.1.0` release does not exist yet. The new 2.1 native features and Kokoro asset must first pass Mac CI and have their release assets verified. There is no public App Store/TestFlight iOS build.

## Run the web app

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production bundle + PWA in dist/
```

> 💡 For real BLE pairing use Chrome or Edge on desktop/Android — that's a browser/platform capability, not an app limitation.

## Stack

Web: React 18 · Vite 5 · Tailwind CSS 3 · Web Bluetooth / Web Audio / WebRTC / Notifications / Speech / Geolocation.

Native: SwiftUI · HealthKit · CoreBluetooth · `llama.cpp` GGUF · Sherpa-ONNX/Kokoro offline TTS · ZIPFoundation · FoundationXML · UserNotifications · AVFoundation · LocalAuthentication · Kiwix local-search connector.

## Roadmap ideas

- Push-based family notifications (requires a small backend + VAPID keys)
- FHIR/HL7 integration for EHR-shared vitals
- Caregiver realtime sync via WebRTC data channels or CRDTs
- App Store / TestFlight distribution (requires Apple signing, entitlements, and release review)
