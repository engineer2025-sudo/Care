# 💚 CareSphere AI

**Proactive Senior Care · Isolation Prevention · Autism Support** — a multi-client platform with native Apple apps and an installable web PWA:

- 📱 **iOS app (Swift/SwiftUI)** — native iOS source; no public App Store, TestFlight, or signed `.ipa` yet. [Build and install it on your iPhone with Xcode](DOWNLOAD.md#install-the-native-development-build-on-your-iphone).
- 🖥️ **Mac app (.dmg)** — [download CareSphere 2.1.0](https://github.com/engineer2025-sudo/Care/releases/download/mac-v2.1.0/CareSphere-2.1.0-mac.dmg) · [ZIP](https://github.com/engineer2025-sudo/Care/releases/download/mac-v2.1.0/CareSphere-2.1.0-mac.zip) · [release notes and optional assets](https://github.com/engineer2025-sudo/Care/releases/tag/mac-v2.1.0). Native SwiftUI for macOS 13+, Intel/Apple Silicon; includes the local health-guide features and Garmin BLE heart-rate pairing.
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
| 🔒 **Privacy** | Web data is stored in browser localStorage (not encrypted by CareSphere), with explicit JSON export and erase controls. The 2.2 native development code stores care data in protected Application Support with iOS file protection and owner-only Mac permissions, and adds explicit JSON export/erase controls; physical-device verification remains pending. The optional 1.5B GGUF assistant runs on-device; Kiwix search is sent only to a configured local/private host. |
| 🧠 **Native Health Guide (Mac 2.1.0)** | Optional Qwen2.5 1.5B Instruct GGUF via `llama.cpp`, local MedlinePlus references, and a private Kiwix/ZIM connector. Qwen weights are a separate opt-in download; questions are not sent to a cloud AI. |
| 🩺 **Offline medical references (Mac 2.1.0)** | The app can download MedlinePlus XML from the U.S. National Library of Medicine after an explicit tap; it is not bundled and is not individualized medical advice. |
| 🔐 **Biometric privacy** | Native Touch ID/Face ID replaces the root view with an opaque lock screen; private care content is not drawn behind the prompt. |
| 🔊 **Native spoken prompts (Mac 2.1.0)** | Apple voices remain the default; the optional int8 Kokoro English pack (~158 MB compressed) enables local Sherpa-ONNX synthesis. Audio is not uploaded. Scheduled iOS notifications still use system sounds when the app is closed. |

## Feature tour

- **Overview** — greeting, day-at-a-glance metrics, daily mood check-in (saved + 14-day history dots), user-customizable routines with daily resets, and today's medication self-check-ins.
- **Therapy & Sensory** — optional, non-clinical emoji and pattern games, Web Audio soundscapes, and paced breathing with clear stop/comfort guidance.
- **Coffee Circles** — three real Jitsi room links plus an ad-hoc room; join embedded or in a new tab. No CareSphere host, schedule, attendance tracking, or moderation is configured; anyone with a link may join.
- **Care Circle** — browser/device-local care notes and summaries of saved check-ins, plus a user-selected visit-prep text brief. It previews exactly which notes, self-reports, medication reminders and source-labeled vitals will be included; simulated readings require an explicit choice and remain labeled. The illustrative roster is sample content only; no account sync, clinician portal, family notifications, or shared backend is configured.
- **Vitals & Telehealth** — real BLE pairing, a separate explicitly labeled demo stream, source chips, live sparkline, generated sample values, RFC-escaped CSV export, and one-tap Jitsi visit.
- **Native Health Guide (Mac 2.1.0)** — source-linked offline MedlinePlus search, optional Qwen2.5 1.5B on-device summaries, and a local Kiwix connection for an existing Wikipedia/ZIM file. The AI is educational only—not diagnosis, triage, a drug-interaction checker, or dosing advice.

## Download & install

See the [download and setup guide](DOWNLOAD.md). The latest published Mac installer is **CareSphere 2.1.0**, released after both iOS-device and Mac CI passed; its optional Kokoro pack and checksum are separate release assets. There is no public App Store, TestFlight, or signed `.ipa` iOS build.

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

Native (2.2 development source): SwiftUI · read-only HealthKit vitals/workouts (Garmin workouts via Apple Health on iPhone) · CoreBluetooth · `llama.cpp` GGUF · Sherpa-ONNX/Kokoro offline TTS · ZIPFoundation · FoundationXML · UserNotifications · AVFoundation · LocalAuthentication · Kiwix local-search connector.

## Versions 2.2 and 2.3

CareSphere for Mac **2.1.0** remains the latest public release. Versions 2.2 and 2.3 are under development—not published builds. See the [2.2/2.3 roadmap](ROADMAP.md) for current implementation status, competitor research, privacy boundaries, and acceptance criteria. Development pushes are CI-only; the release workflow refuses to overwrite an existing versioned release.
