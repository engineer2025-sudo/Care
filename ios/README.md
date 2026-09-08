# 📱 CareSphere for iOS — native SwiftUI app

> **⬇️ Download for Mac:** [CareSphere-1.0.0-mac.dmg](https://github.com/engineer2025-sudo/Care/releases/download/mac-v1.0.0/CareSphere-1.0.0-mac.dmg) (macOS 13+, native Apple Silicon/Intel build from CI)
> Install: open the DMG → drag **CareSphere** to Applications → first launch right-click → **Open** (ad-hoc signed).
> 📡 **Garmin:** on your watch enable *Settings → Health & Wellness → Wrist Heart Rate → Broadcast Heart Rate* (Venu/vivoactive) or *Settings → Sensors & Accessories → Wrist Heart Rate → Broadcast Heart Rate* (Forerunner/Fenix), then tap **Pair** in the app's Vitals tab — Garmin broadcasts the standard Bluetooth Heart Rate profile.

The official **CareSphere AI** iOS application, written in **Swift 5.9 / SwiftUI** (iOS 16+), with the full feature set of the web app implemented on Apple's native stacks — and a **native Mac (.dmg) target** built by CI.

## Feature ↔ native stack map

| Feature | Official Apple / open technology |
|---|---|
| 🫀 **Apple Watch vitals** | **HealthKit** — reads heart rate (`HKQuantityType.heartRate`), SpO₂ (`oxygenSaturation`) and blood pressure (`HKCorrelationType.bloodPressure`) with live `HKObserverQuery` updates + background delivery |
| 📡 **BLE heart-rate straps** | **CoreBluetooth** — standard Bluetooth SIG Heart Rate profile (service `0x180D`, characteristic `0x2A37`), GATT notification parsing per spec (8/16-bit BPM flag) |
| ☕ **Video coffee circles** | **Jitsi Meet iOS SDK** (official Swift package `jitsi-meet-ios-sdk-releases`) — `JitsiMeetView` embedded via `UIViewRepresentable`, joining the same real `meet.jit.si` rooms as the web app |
| 💊 **Medication reminders** | **UserNotifications** — daily `UNCalendarNotificationTrigger` per dose, actionable lock-screen buttons **✓ Taken / Snooze 10 min** handled by `UNUserNotificationCenterDelegate` |
| 🔊 **Spoken prompts** | **AVSpeechSynthesizer** (on-device text-to-speech) |
| 🎧 **Sensory soundscapes** | **AVAudioEngine + AVAudioSourceNode** — rain/ocean/forest/hearth synthesized in a real-time render callback (noise shaping, LFOs, procedural birdsong & crackle). No audio files |
| 🚨 **Emergency SOS** | `tel:911` dial link + **CoreLocation** GPS attach + **MapKit** hand-off |
| 🧩 **Therapy games** | SwiftUI — Emotion Recognition, Pattern Recall (working memory), guided 4·4·6 breathing, daily mood check-in |
| 🔒 **Privacy** | All user content persists locally as JSON in the app Documents directory — no network storage |

## Build & run (needs a Mac with Xcode 15+)

The repo ships an **XcodeGen** spec, so the `.xcodeproj` is generated (never hand-edited):

```bash
cd ios
brew install xcodegen        # once
xcodegen generate            # creates CareSphere.xcodeproj
open CareSphere.xcodeproj
```

Then in Xcode:

1. Select your team under **Signing & Capabilities** (personal Apple ID works for device runs).
2. Pick a connected iPhone or a simulator → **⌘R**.
3. First launch: grant **HealthKit**, **Bluetooth**, **Notifications** and (for SOS) **Location** permissions.

> The HealthKit entitlement is declared in `CareSphere.entitlements`. On a real device you may also need to add the HealthKit capability in the Signing pane once.

### Continuous Integration

`.github/workflows/ios.yml` compiles the app on every push using a **macOS GitHub Actions runner** (`xcodegen generate` → `xcodebuild build`), so Swift code in this repo is always verified to compile.

### App Store / TestFlight readiness

- Bundle id: set `bundleIdPrefix` in `project.yml` (currently `org.caresphere` → `org.caresphere.CareSphere`).
- All required `Info.plist` usage strings (camera, mic, HealthKit, Bluetooth, location) are already declared.
- `UIBackgroundModes: [audio, voip]` per the Jitsi SDK recommendation.
- To publish: archive with a distribution certificate, upload via Xcode Organizer → TestFlight.

## Project layout

```
ios/
├── project.yml                     # XcodeGen spec (target, Info.plist, SPM deps)
└── CareSphere/
    ├── App/CareSphereApp.swift     # @main entry, environment wiring
    ├── Models/                     # CareModels.swift, CareStore.swift (persistence)
    ├── Services/                   # HealthKit, CoreBluetooth, Notifications,
    │                               # Speech+Location, SoundScapeEngine (DSP)
    ├── Views/                      # RootTabView, Overview, Therapy, CoffeeCircles,
    │                               # JitsiConferenceView, CareCircle, Vitals, SOS, Settings
    └── Resources/Assets.xcassets   # AppIcon (1024), AccentColor
```

## Notes on realism

- The Jitsi SDK joins **real public rooms** on `meet.jit.si` — anyone (web app, Android, phone dial-in) can be in the same call.
- Vitals are never invented: HealthKit values come from Apple Watch / cuff apps only after explicit user consent; BLE values stream only from paired monitors. Cards are labeled with their true source (`LIVE BLE`, `APPLE WATCH`, …).
- Simulated-free: if no source has data, cards show "—" instead of fake numbers.
