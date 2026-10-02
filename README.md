# 💚 CareSphere AI

**Proactive Senior Care · Isolation Prevention · Autism Support** — a native iOS app plus the existing installable web PWA:

- 📱 **iOS app (Swift/SwiftUI)** — native iOS source; no public App Store, TestFlight, or signed `.ipa` yet. [Build and install it on your iPhone with Xcode](DOWNLOAD.md#install-the-native-development-build-on-your-iphone).
- 🧭 **Native scope** — new native product work, Xcode target, and build pipeline are iOS only. Earlier Mac release artifacts are archived; there is no current Mac app target.
- 🌐 **Web app (React + Vite)** — an installable PWA sharing real `meet.jit.si` rooms with family on other devices.

> Live tabs: **Overview · Therapy & Sensory · Coffee Circles · Care Circle · Vitals & Telehealth**

---

## What makes it realistic (not a demo toy)

| Area | How it actually works |
|---|---|
| 🫀 **Wearable vitals** | "Pair real monitor" uses the **Web Bluetooth API** and subscribes to the standard **Bluetooth SIG Heart Rate profile (service `0x180D`, characteristic `0x2A37`)**. BPM values arrive as real GATT notifications and plot on a live sparkline. Canceling or failing to pair shows no reading; a separate **Start labeled demo** button is required to generate `SIMULATED` sample data. `LIVE BLE` and `SIMULATED` remain distinct on every card and export. |
| 🩺 **Measurement flows** | The web SpO₂/BP cards generate **simulated examples only**, not sensor readings. This web app has no connected SpO₂/BP sensor path; the native iPhone app can display readings only when Apple Health supplies them. No cuff or optical sensor is emulated as clinical hardware. |
| ☕ **Video coffee circles** | Real [meet.jit.si](https://meet.jit.si) Jitsi rooms load in-app. They have no CareSphere host, schedule, attendance tracking, or moderation; anyone with a link may join. Verify participants before sharing private health information. |
| 🔔 **Medication reminders** | After you review and confirm your entered schedule, the open page checks every 15 s and can raise an in-app toast, browser notification, and spoken prompt. Browser delivery varies by platform; this web app cannot reliably schedule while the browser is closed. |
| 🎧 **Sensory soundscapes** | Rain, ocean, forest, and hearth are **synthesized live with the Web Audio API** — filtered noise beds, LFO swells, procedurally scheduled birdsong and crackle transients. No audio files, works offline. |
| 🚨 **Emergency SOS** | Real **`tel:911`** dial link, optional GPS coordinates, and a user-confirmed share-sheet/clipboard message. No automatic Care Circle push backend is configured; the app never claims a message was sent or acknowledged. |
| 📊 **Vitals export** | One-click, CSV-escaped export preserves real BLE readings separately from clearly labeled simulated SpO₂/BP examples. It is a data export—not a clinical record or diagnosis. |
| 📲 **Installable PWA** | Web app manifest + icons + service worker (production builds). Seniors and families can install it to a home screen; routines still open offline. |
| ♿ **Accessibility** | Text-size scaling (A / A+ / A++), high-contrast mode, `prefers-reduced-motion` support, ARIA roles/labels throughout, one-tap daily mood check-in. |
| 🔒 **Privacy** | Web data is stored in browser localStorage (not encrypted by CareSphere), with explicit JSON export and erase controls. The native iOS development app stores care data in encrypted local storage with iOS file protection and provides explicit export/erase controls; physical-device verification remains pending. The optional 1.5B GGUF assistant runs on-device; Kiwix search is sent only to a configured local/private host. |
| 🧠 **Native Health Guide (iOS)** | Optional Qwen2.5 1.5B Instruct GGUF via `llama.cpp`, local MedlinePlus references, and a private Kiwix/ZIM connector. Qwen weights are a separate opt-in download; questions are not sent to a cloud AI. A narrow local safety gate checks submitted questions before search/model inference. |
| 🩺 **Offline medical references (iOS)** | The app can download MedlinePlus XML from the U.S. National Library of Medicine after an explicit tap; it is not bundled and is not individualized medical advice. |
| 🔐 **Biometric privacy** | Native Touch ID/Face ID replaces the root view with an opaque lock screen; private care content is not drawn behind the prompt. |
| 🔊 **Native spoken prompts (iOS)** | Apple voices remain the default; an optional int8 Kokoro English pack enables local Sherpa-ONNX synthesis. Audio is not uploaded. Scheduled notifications use system sounds when the app is closed. |

## Feature tour

- **Overview** — greeting, day-at-a-glance metrics, daily mood check-in (saved + 14-day history dots), user-customizable routines with daily resets, and today's medication self-check-ins.
- **Therapy & Sensory** — optional, non-clinical emoji and pattern games, Web Audio soundscapes, and paced breathing with clear stop/comfort guidance.
- **Coffee Circles** — three real Jitsi room links plus an ad-hoc room; join embedded or in a new tab. No CareSphere host, schedule, attendance tracking, or moderation is configured; anyone with a link may join.
- **Care Circle** — browser/device-local care notes and summaries of saved check-ins, plus a user-selected visit-prep text brief. It previews exactly which notes, self-reports, medication reminders and source-labeled vitals will be included; simulated readings require an explicit choice and remain labeled. The illustrative roster is sample content only; no account sync, clinician portal, family notifications, or shared backend is configured.
- **Vitals & Telehealth** — real BLE pairing, a separate explicitly labeled demo stream, source chips, live sparkline, generated sample values, RFC-escaped CSV export, and one-tap Jitsi visit.
- **Native Health Guide (iOS)** — source-linked offline MedlinePlus search, optional Qwen2.5 1.5B on-device summaries, and a local Kiwix connection for an existing Wikipedia/ZIM file. A rules-first safety gate handles a narrow set of self-harm and possible-poisoning phrases before search/model inference; it is not complete or validated crisis detection. The AI is educational only—not diagnosis, triage, a drug-interaction checker, or dosing advice.
- **Native support check-in (iOS)** — opt-in foreground-and-unlocked live Bluetooth HR prompt, self-reported stress entry, paced breathing, an after-check, and optional caregiver text/Jitsi actions. No caregiver message is sent automatically, and the app does not measure breathing.

## Download & install

See the [iOS build and setup guide](DOWNLOAD.md). There is no public App Store, TestFlight, or signed `.ipa` iOS build. Earlier Mac release files are archival; the current native target and CI pipeline are iOS only.

## Run the web app

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # storage, daily check-in, CSV, and visit-brief tests
npm run build    # production bundle + PWA in dist/
```

Requires Node.js **20.19+** or **22.12+** (Vite 8). For real BLE pairing use Chrome or Edge on desktop/Android — that's a browser/platform capability, not an app limitation.

## Stack

Web: React 18 · Vite 8 · Tailwind CSS 3 · Web Bluetooth / Web Audio / WebRTC / Notifications / Speech / Geolocation.

Native iOS (development source): SwiftUI · read-only HealthKit vitals/workouts · CoreBluetooth · `llama.cpp` GGUF · Sherpa-ONNX/Kokoro offline TTS · ZIPFoundation · FoundationXML · UserNotifications · AVFoundation · LocalAuthentication · Kiwix local-search connector.

## Current development scope

Earlier CareSphere Mac releases are archived and no longer have a native target. Current native development is iOS only; the web PWA remains separate. See the [roadmap](ROADMAP.md) for implementation status and acceptance criteria. Development pushes are CI-only.
