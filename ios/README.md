# CareSphere for iOS

CareSphere's native SwiftUI target and native build pipeline are **iOS only**. Older macOS release artifacts are archived; there is no current Mac target. The separate web PWA remains in the repository. There is no public App Store, TestFlight, or signed `.ipa` build.

## Build and install on a physical iPhone

The checked-in `CareSphere.xcodeproj` is ready to open directly. Use **Xcode 16+**, a version that supports your iPhone's installed iOS, and a physical **iPhone with iOS 16+**. The pinned `llama.cpp` binary has no simulator slice; this full app uses an iPhone destination.

```bash
cd ios
open CareSphere.xcodeproj
```

Choose **CareSphere** scheme → your iPhone → **Signing & Capabilities** → your own development team, then **Run**. No XcodeGen installation, model download, or account inside CareSphere is required to try the games. On first launch, **Explore first · set up later** goes directly to the app without requesting health/motion permissions.

Optional Mac preflight:

```bash
./scripts/preflight.sh
# Or test the dependency-free activity logic separately:
swift test --package-path ActivityKit
```

The preflight runs file checks, 15 game-logic tests, dependency resolution, and an unsigned device compile. It does not sign/install on your phone. CI performs these checks against the checked-in project and publishes an open-in-Xcode source artifact after a successful build. Network downloads, Apple signing, device behavior, and clinical efficacy are separate concerns; no error-free or physical-device verification is implied.

For source maintainers, `project.yml` is still the XcodeGen specification (`brew install xcodegen && xcodegen generate`). Regenerate and commit the resulting project whenever new source files or dependencies are added. See the root [installation guide](../DOWNLOAD.md) and [device test checklist](../docs/ios-device-test-plan.md).

## Layout and activities in 2.3

- Five visible destinations: **Today · Activities · Connect · Care · Health**. Health contains both **Vitals** and **Health Guide**, so no feature is hidden in iOS's sixth-tab More menu.
- Overview shortcuts now work; medication setup opens the correct Settings section. Check-ins have visible labels, larger controls, and layouts that respond to Dynamic Type.
- Searchable/filterable library with **11 offline activities**, one focused session at a time.
- Five additions: **Sort together, Complete the pattern, Find the same, Everyday order, Conversation cards**.
- Retained/refined: **Picture pairs, Remember a pattern, Feelings explorer, Picture story, Soundscapes, Paced breathing**.
- No scores or clinical assessments; hints, fewer choices, skip/repeat, visible cues, and clear exits. Pattern playback no longer flashes. A breath hold is opt-in. Soundscapes and breathing stop on backgrounding.
- In-app **Research, safety & playing together** explains evidence and its limits with links to Cochrane and NICE. These are not validated dementia or autism treatments.

[Product and evidence brief for the future deck](../docs/ios-product-brief.md).

## Current native features

| Feature | Implementation and limits |
|---|---|
| 🫀 Vitals | Read-only Apple HealthKit heart rate, SpO₂, blood pressure, and workout summaries when available; live standard BLE Heart Rate service (`0x180D` / `0x2A37`), including supported Garmin broadcast mode. Source labels are shown. No fabricated readings. |
| 🧠 Health Guide | Optional Qwen2.5 1.5B Instruct GGUF via `llama.cpp`; model is opt-in and not bundled. Source-linked MedlinePlus XML is downloaded only on request. An existing ZIM can be searched through a separately running local Kiwix bridge. The model is educational, not diagnosis, triage, a medication checker, or dosing advice. |
| 🚦 Question safety gate | A narrow deterministic check handles possible self-harm and poisoning phrases before local retrieval/model inference. It is not a validated or complete detector. It avoids methods, lethality, and symptom details and offers local emergency/contact actions. |
| 🫶 Support check-in | Optional Settings opt-in for a local prompt after live BLE readings stay above 110 BPM for 90 seconds while the app is foregrounded and unlocked; gaps over 15 seconds reset the interval. The prompt asks whether the person is moving and how they feel. Heart rate alone never labels a crisis or sends an alert. Today also offers **I'm stressed**. |
| 🌬️ Paced breathing | Three short guided cycles and a self-check. Breathing is not measured by camera, microphone, or another sensor. The person can stop or request help at any time. |
| 💬 Caregiver / video | A saved contact can be prefilled in the iOS Messages composer; the person must review and tap Send. There is no remote caregiver account, push service, or delivery acknowledgement. Optional Jitsi video opens in-app; anyone with the room link may join. |
| ☕ Social connection | Embedded Jitsi Meet rooms. CareSphere does not host or moderate rooms; verify participants before sharing private information. |
| 💊 Medication reminders | Local UserNotifications based on a schedule the person enters and confirms. Reminders and taken/snoozed responses are self-reports, not prescription verification or proof of a dose. |
| 🔊 Speech and sound | Apple voices by default; optional local Kokoro/Sherpa-ONNX speech. Soundscapes are generated on-device. Closed-app notifications use system notification sounds. |
| 🧩 Activities and routines | Eleven optional, offline activities with supported choice, pattern, sequencing, and conversation experiences, plus routines and mood check-ins. These are not validated autism or dementia treatments and are not presented as therapy. |
| ♿ Accessibility | Dynamic Type, accessibility labels, appearance and high-contrast choices, and reduced-motion settings. Review on-device behavior with VoiceOver and larger text before release. |
| 🔐 Privacy | Care data is stored locally with AES-GCM 256-bit encryption and iOS file protection. HealthKit is read-only. Model/reference downloads are opt-in. Exports and sharing require an explicit user action. |
| 🆘 Emergency actions | User-initiated phone links and a user-controlled share/message action. No silent caregiver notification or automatic emergency escalation. |

## Support-flow safety and privacy boundaries

- Live heart-rate check-ins are disabled by default. When enabled, they use only fresh paired CoreBluetooth notifications while CareSphere is open; HealthKit history is not monitored. Exercise and other factors affect heart rate. The prompt is a wellness self-check, not a medical threshold or crisis inference.
- The app does not scan social media, Messages, or other apps. The safety gate sees only the question a person enters in Health Guide.
- Possible poisoning/self-harm questions get a short fixed response before reference search and model inference. A phrase list can miss messages; it cannot determine intent or provide clinical triage.
- A caregiver text is not delivered until the user taps Send in Messages. Jitsi rooms are link-accessible and unmoderated. Do not place private health information in a room name or invitation.
- No UI copy should promise that CareSphere or its AI prevents self-harm, provides clinical triage, or automatically contacts a caregiver.

See [`safety-support-flow.md`](../docs/safety-support-flow.md) for the detailed step sequence and behavior.

## Local Kiwix bridge

The iOS app does not bundle a Wikipedia archive or GPL-3.0 CoreKiwix. To search an existing ZIM, run the user's separate Kiwix server on the same trusted private network; the archive remains in place. For example, on the computer that holds the ZIM:

```bash
brew install kiwix-tools
kiwix-serve --port=8080 --address=0.0.0.0 "/path/to/your-library.zim"
```

Use that computer's private address from **Health → Health Guide → Connect your Wikipedia ZIM** on iPhone. Keep its firewall enabled, do not port-forward the server, and use trusted Wi-Fi only. CareSphere rejects non-local Kiwix hosts.

## Project layout

```text
ios/
├── project.yml
├── README.md
├── CareSphere.xcodeproj/ # open directly in Xcode
├── ActivityKit/         # pure Swift activity logic + 15 tests
├── scripts/             # file checks + Mac compile preflight
└── CareSphere/
    ├── App/       # SwiftUI app, dependencies, and live support presentation
    ├── Models/    # care data and encrypted local persistence
    ├── Services/  # HealthKit, BLE, local model, Kiwix, notifications, speech
    ├── Views/     # tabs, onboarding, Guide, support flow, SOS, activities
    └── Resources/ # app assets
```
