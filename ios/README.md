# 💚 CareSphere for iOS & Mac — native SwiftUI

> **2.1.0 integration in progress — not yet released.** The current source adds an optional **on-device Qwen2.5 1.5B** assistant, offline **MedlinePlus references**, a private **Kiwix/Wikipedia ZIM connector**, an opaque full-window Touch ID/Face ID lock, and optional **Kokoro neural speech**. It must pass iOS and Mac CI before these features are downloadable.
>
> The latest public installer is **CareSphere 2.0.0**. See the root [`DOWNLOAD.md`](../DOWNLOAD.md) for the verified current Mac links and accurate iPhone/Xcode limitations.

- 📱 **iOS:** native SwiftUI source, iOS 16+; no public App Store/TestFlight build.
- 🖥️ **Mac:** [download the published CareSphere 2.0.0 `.dmg`](https://github.com/engineer2025-sudo/Care/releases/download/mac-v2.0.0/CareSphere-2.0.0-mac.dmg) · [ZIP](https://github.com/engineer2025-sudo/Care/releases/download/mac-v2.0.0/CareSphere-2.0.0-mac.zip) · [release notes](https://github.com/engineer2025-sudo/Care/releases/tag/mac-v2.0.0). The 2.1 additions below are not in this installer.

## 2.1 integration target (not yet released)

### On-device model — optional, not bundled

- The **Health Guide** can run the open-weight **Qwen2.5 1.5B Instruct, Q4_K_M GGUF** through `llama.cpp` (`llama.swift`). Model weights are fetched only after the user chooses **Download**; the `.dmg`/app bundle does not include a gigabyte of weights.
- The current GGUF is about **1.1 GB**. Expect additional memory use and slower CPU inference on older Intel Macs. First launch loads the model only when asked; CareSphere releases model memory after each answer.
- A user can import a Qwen-family Instruct GGUF using the same ChatML prompt format. Other model families are not supported by this initial chat template.
- The guide retrieves a few local reference passages and adds their actual source links to the answer card. The model is not a clinician and must not be used for diagnosis, emergency triage, drug-interaction checking or dose decisions. It intentionally refuses to guess when it cannot find a source.
- Questions are not sent to a hosted AI. The only AI runtime is local `llama.cpp`; model downloads go directly to the cited model publisher after an explicit tap.

### Medical reference database

- **MedlinePlus Health Topics XML** from the U.S. National Library of Medicine can be downloaded inside the app (about 30 MB uncompressed). CareSphere discovers the latest XML link from MedlinePlus, parses topic titles and summaries, and stores the searchable index in the app's private Application Support directory.
- The starter guide remains available offline before the full dataset is downloaded. Results include publisher and source links. MedlinePlus is general consumer-health information, not an individualized care plan.
- MedlinePlus content is downloaded only when the user selects **Download** or **Update**. CareSphere does not bundle a stale or multi-gigabyte dataset.

### Connect an existing Wikipedia / Kiwix archive

CareSphere does **not** copy or ingest a multi-gigabyte `.zim` file. Instead, Kiwix serves and searches the ZIM in place, and CareSphere sends a query to the user's private/local server and uses the returned snippets as optional context.

On the Mac that holds the `.zim` file:

```bash
brew install kiwix-tools
kiwix-serve --port=8080 --address=0.0.0.0 "/path/to/your-library.zim"
```

Then open **Guide → Connect your Wikipedia ZIM**:

- Mac app: `http://127.0.0.1:8080`; the server can instead bind to `127.0.0.1` for Mac-only use.
- Content name: usually the `.zim` filename without `.zim` (as shown by Kiwix).
- iPhone/iPad: bind Kiwix to `0.0.0.0` as in the command above, then use the Mac's private Wi-Fi address, such as `http://MacBook.local:8080`, with both devices on the same Wi-Fi.

Binding to `0.0.0.0` lets devices on the network reach Kiwix. Use it only on trusted Wi-Fi, do not configure router port forwarding, and use the Mac firewall. CareSphere rejects non-local Kiwix hosts; it does not send the archive or search queries to Wikipedia or a cloud AI. The app needs local-network permission on iOS.

### Touch ID / Face ID and speech

- The lock **replaces the root view** with an opaque full-window screen. CareSphere data is not drawn or refreshed behind a Mac sheet while authentication is pending.
- Authentication uses LocalAuthentication with device passcode fallback; the app locks after backgrounding.
- Apple-installed English voices remain the zero-download default. Users can optionally download the official **Kokoro int8 English v0.19** pack (~100 MB) and choose among its 11 speakers. **Sherpa-ONNX** synthesizes speech offline on CPU; the app keeps the weights in private Application Support, excludes them from backup, and deletes the temporary WAV after playback.
- The voice pack is intended to be a separate ZIP release asset, not bundled in the DMG/iOS app. The workflow is configured to verify the upstream archive SHA-256 and include the separate eSpeak-NG GPL-3.0 notice alongside the Apache-2.0 Kokoro license; this packaging and asset are not verified or published yet. The Sherpa-ONNX runtime is Apache-2.0.
- Neural speech is available for in-app prompts and previews. iOS does not run this local model from a closed-app notification, so scheduled notifications continue to use the normal system notification sound. No generated audio is uploaded.

## Native feature map

| Feature | Implementation |
|---|---|
| 🫀 Wearable vitals | HealthKit with consent; CoreBluetooth standard Heart Rate service `0x180D` / characteristic `0x2A37` for live BLE (including Garmin broadcast mode). No synthetic clinical readings. |
| 🧠 Offline health guide | Optional Qwen2.5 1.5B GGUF via llama.cpp; retrieval-augmented summaries from local MedlinePlus and a private Kiwix server. |
| 🩺 Reference library | Current MedlinePlus topic XML, parsed locally; source and publisher shown for retrieved records. |
| 📚 Wikipedia ZIM | Search existing ZIM through Kiwix on a local/private network. The ZIM remains in its current location. |
| ☕ Video | Jitsi Meet SDK on iOS and real `meet.jit.si` rooms, with macOS browser hand-off. |
| 💊 Medication reminders | UserNotifications calendar triggers with **Taken / Snooze** actions. The app records the schedule the user enters; it does not check a prescription. |
| 🔊 Spoken prompts | Apple AVSpeechSynthesizer voices by default; optional Kokoro int8 English TTS via Sherpa-ONNX, with local voice generation and playback. Closed-app notifications use system sounds. |
| 🎧 Sensory soundscapes | Procedural on-device AVAudioEngine DSP; works without audio downloads. |
| 🚨 Emergency | SOS, one-tap `tel:911`, and a user-confirmed Share sheet for optional GPS details. No automatic Care Circle push server is configured. |
| 🧩 Therapy & routines | SwiftUI emotion recognition, pattern recall, breathing coach, daily mood check-in and predictable routines. |
| 🔒 Privacy | Care content, optional Qwen/Kokoro weights, generated audio, and reference index stay in the app container. No cloud-AI endpoint. Kiwix search is restricted to the configured local/private host. |

## Build & run (Mac with Xcode)

```bash
cd ios
brew install xcodegen        # once
xcodegen generate
open CareSphere.xcodeproj
```

Choose the **CareSphere** scheme for iOS or **CareSphereMac** for macOS. SPM resolves Jitsi, `llama.swift`, Sherpa-ONNX and ZIPFoundation. Qwen/Kokoro model weights and the optional MedlinePlus database are separate, opt-in downloads.

On a real iPhone, grant only the permissions you use: Health, Bluetooth, notifications, contacts, microphone/camera for video, location for SOS, and local-network access if connecting to Kiwix. A Mac ad-hoc build uses BLE for live vitals; HealthKit remains unavailable in the ad-hoc Mac target because restricted entitlements require proper signing.

## First launch on Mac

The release DMG is ad-hoc signed, not Developer ID signed or notarized. On macOS, drag the app to Applications, open it once and dismiss the warning, then go to **System Settings → Privacy & Security → Open Anyway → Open**. Proper notarization requires a paid Apple Developer account and Developer ID signing.

## CI

`.github/workflows/ios.yml` is configured to build the iOS simulator and native Mac Release targets, verify the Mac signature, and package the DMG. The Mac release job now waits for the iOS build; if successful it checksum-verifies and packages the optional Kokoro asset before publishing. This 2.1 run and its assets still need to pass verification before the release can be considered available. The Mac target intentionally has no HealthKit entitlement to avoid the invalid ad-hoc signature issue seen in v1.

## Project layout

```text
ios/
├── project.yml
└── CareSphere/
    ├── App/CareSphereApp.swift
    ├── Models/                  # care data & local persistence
    ├── Services/                # HealthKit, BLE, Llama, MedlinePlus, Kiwix,
    │                             # notifications, speech, location, audio, motion
    ├── Views/                    # tabs, onboarding, Health Guide, lock, SOS, etc.
    └── Resources/Assets.xcassets
```
