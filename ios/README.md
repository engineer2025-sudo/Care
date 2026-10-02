# CareSphere for iOS

CareSphere's native SwiftUI target and native build pipeline are **iOS only**. Older macOS release artifacts are archived; there is no current Mac target. The separate web PWA remains in the repository. There is no public App Store, TestFlight, or signed `.ipa` build.

## Build and install on a physical iPhone

The project uses XcodeGen and Swift Package Manager. The `llama.cpp` dependency does not provide an iOS Simulator slice, so use a connected iPhone for the native build.

```bash
cd ios
brew install xcodegen
xcodegen generate
open CareSphere.xcodeproj
```

In Xcode, select the **CareSphere** scheme and a connected iPhone, configure **Signing & Capabilities** with your Apple development team, then Run. See the root [`DOWNLOAD.md`](../DOWNLOAD.md) for the signing, first-launch, permission, and troubleshooting steps. HealthKit read/background-delivery capabilities depend on the signing team. Physical-device testing is still required.

## Current native features

| Feature | Implementation and limits |
|---|---|
| 🫀 Vitals | Read-only Apple HealthKit heart rate, SpO₂, blood pressure, and workout summaries when available; live standard BLE Heart Rate service (`0x180D` / `0x2A37`), including supported Garmin broadcast mode. Source labels are shown. No fabricated readings. |
| 🧠 Health Guide | Optional Qwen2.5 1.5B Instruct GGUF via `llama.cpp`; model is opt-in and not bundled. Source-linked MedlinePlus XML is downloaded only on request. An existing ZIM can be searched through a separately running local Kiwix bridge. The model is educational, not diagnosis, triage, a medication checker, or dosing advice. |
| 🚦 Question safety gate | A narrow deterministic check handles possible self-harm and poisoning phrases before local retrieval/model inference. It is not a validated or complete detector. It avoids methods, lethality, and symptom details and offers local emergency/contact actions. |
| 🫶 Support check-in | Optional Settings opt-in for a local prompt after live BLE readings stay above 110 BPM for 90 seconds while the app is foregrounded and unlocked; gaps over 15 seconds reset the interval. The prompt asks whether the person is moving and how they feel. Heart rate alone never labels a crisis or sends an alert. Overview also offers **I'm stressed**. |
| 🌬️ Paced breathing | Three short guided cycles and a self-check. Breathing is not measured by camera, microphone, or another sensor. The person can stop or request help at any time. |
| 💬 Caregiver / video | A saved contact can be prefilled in the iOS Messages composer; the person must review and tap Send. There is no remote caregiver account, push service, or delivery acknowledgement. Optional Jitsi video opens in-app; anyone with the room link may join. |
| ☕ Social connection | Embedded Jitsi Meet rooms. CareSphere does not host or moderate rooms; verify participants before sharing private information. |
| 💊 Medication reminders | Local UserNotifications based on a schedule the person enters and confirms. Reminders and taken/snoozed responses are self-reports, not prescription verification or proof of a dose. |
| 🔊 Speech and sound | Apple voices by default; optional local Kokoro/Sherpa-ONNX speech. Soundscapes are generated on-device. Closed-app notifications use system notification sounds. |
| 🧩 Activities and routines | Optional, non-clinical pattern/emoji activities, paced breathing, routines, and mood check-ins. These are not validated autism or dementia treatments and are not presented as therapy. |
| ♿ Accessibility | Dynamic Type, accessibility labels, appearance and high-contrast choices, and reduced-motion settings. Review on-device behavior with VoiceOver and larger text before release. |
| 🔐 Privacy | Care data is stored locally with AES-GCM 256-bit encryption and iOS file protection. HealthKit is read-only. Model/reference downloads are opt-in. Exports and sharing require an explicit user action. |
| 🆘 Emergency actions | User-initiated phone links and a user-controlled share/message action. No silent caregiver notification or automatic emergency escalation. |

## Support-flow safety and privacy boundaries

- Live heart-rate check-ins are disabled by default. When enabled, they use only fresh paired CoreBluetooth notifications while CareSphere is open; HealthKit history is not monitored. Exercise and other factors affect heart rate. The prompt is a wellness self-check, not a medical threshold or crisis inference.
- The app does not scan social media, Messages, or other apps. The safety gate sees only the question a person enters in Health Guide.
- Possible poisoning/self-harm questions get a short fixed response before reference search and model inference. A phrase list can miss messages; it cannot determine intent or provide clinical triage.
- A caregiver text is not delivered until the user taps Send in Messages. Jitsi rooms are link-accessible and unmoderated. Do not place private health information in a room name or invitation.
- No UI copy should promise that CareSphere or its AI prevents self-harm, provides clinical triage, or automatically contacts a caregiver.

See [`safety-support-flow.md`](safety-support-flow.md) for the detailed step sequence and behavior.

## Local Kiwix bridge

The iOS app does not bundle a Wikipedia archive or GPL-3.0 CoreKiwix. To search an existing ZIM, run the user's separate Kiwix server on the same trusted private network; the archive remains in place. For example, on the computer that holds the ZIM:

```bash
brew install kiwix-tools
kiwix-serve --port=8080 --address=0.0.0.0 "/path/to/your-library.zim"
```

Use that computer's private address from **Guide → Connect your Wikipedia ZIM** on iPhone. Keep its firewall enabled, do not port-forward the server, and use trusted Wi-Fi only. CareSphere rejects non-local Kiwix hosts.

## Project layout

```text
ios/
├── project.yml
├── README.md
├── safety-support-flow.md
└── CareSphere/
    ├── App/       # SwiftUI app, dependencies, and live support presentation
    ├── Models/    # care data and encrypted local persistence
    ├── Services/  # HealthKit, BLE, local model, Kiwix, notifications, speech
    ├── Views/     # tabs, onboarding, Guide, support flow, SOS, activities
    └── Resources/ # app assets
```
