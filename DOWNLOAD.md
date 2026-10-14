# CareSphere iOS build and setup

CareSphere's native development target and build pipeline are **iOS only**. Earlier macOS release artifacts are archived and are not a current product target. The separate web PWA remains available from the repository's web source.

There is **no public App Store, TestFlight, or signed `.ipa` download**. CareSphere for iOS is a native SwiftUI app, not a web wrapper. The CI artifact is an unsigned compile check; it cannot be installed on an iPhone by opening the artifact.

## Install the native development build on your iPhone

You need a Mac with **Xcode 16 or newer** (and an Xcode release that supports your iPhone’s installed iOS), an **iPhone running iOS 16 or newer**, and a cable (wireless device debugging can be enabled later). Keep the phone unlocked and tap **Trust This Computer** if prompted.

1. Install full Xcode, open it once, accept its license, and let it install the required platform support. **You do not need XcodeGen to open this checkout.**
2. Clone the development branch on your Mac (or use your existing checkout), then open the included native project:
   ```bash
   git clone --branch arena/f42f5cbc-care https://github.com/engineer2025-sudo/Care.git
   cd Care/ios
   open CareSphere.xcodeproj
   ```
3. In Xcode, choose the **CareSphere** scheme and select your connected iPhone as the run destination.
4. Select the **CareSphere** target → **Signing & Capabilities**. Turn on **Automatically manage signing** and select your Apple development team. If Xcode says the bundle identifier is unavailable, set a unique identifier under **General → Identity**.
5. Press **Run** (⌘R). Wait for Xcode to resolve Swift packages on the first build. If the iPhone requests **Developer Mode**, enable it under **Settings → Privacy & Security**, restart, and confirm. If iOS asks you to trust the developer, follow the on-device prompt.
6. Choose **Explore first · set up later** to try the activities without permissions or model downloads, or complete the optional setup. Apple Health can be enabled later under **Health → Vitals → Enable**. Review the requested categories in Apple Health if no records appear.

### Before installing: optional compile check

```bash
cd Care/ios
./scripts/preflight.sh
```

This runs project/resource checks, the 15 activity-logic tests, package resolution, and an **unsigned device-target compile**. It does not install the app, select a signing team, or prove that device features work. Successful CI results are visible in the repository's **iOS Build** workflow. Its `CareSphere-Xcode-Source` artifact is source code, not an installable app.

The project, shared scheme, Info.plist, entitlements, and assets are checked in. `project.yml` remains available for maintainers who want to regenerate with XcodeGen; regeneration is not a prerequisite for Run. Direct package versions are pinned, including the Jitsi/Giphy pairing, to reduce dependency drift.

### First-install troubleshooting

| Symptom | What to check |
|---|---|
| “Signing requires a development team” | Select your own team under Signing & Capabilities. Never share your Apple credentials. |
| Bundle identifier not available | Choose a unique identifier in the app target. |
| HealthKit not supported by provisioning profile | Use a team/profile eligible for the required capabilities. Do not silently remove entitlements while expecting HealthKit to work. |
| Phone OS is unsupported by Xcode | Update Xcode to a release that supports that iOS version. |
| Package download fails | Check internet access, free disk space, and the dependency host. Retry **File → Packages → Resolve Package Versions**. First resolution includes large native frameworks. |
| Phone is not a run destination | Unlock it, trust the Mac, enable Developer Mode, and finish device preparation in Xcode. |
| Source archive opened at the wrong level | Open the `CareSphere.xcodeproj` beside `CareSphere/` and `ActivityKit/`; keep those directories together. |

No project can guarantee zero errors across Apple signing, network services, Xcode/iOS versions, and device hardware. A successful unsigned compile must be followed by actual installation and the [device checklist](docs/ios-device-test-plan.md).

**Use a connected physical iPhone.** The current `llama.cpp` package does not provide an iOS Simulator slice. If Xcode reports `While building for iOS Simulator, no library for this platform was found in llama.xcframework`, select the connected iPhone instead; don't change the package or try to install a simulator build on the phone.

The project requests HealthKit plus background delivery, so Xcode signing must support those capabilities. A free **Personal Team** can install development apps on a registered iPhone, but Apple says its provisioning expires after 7 days, requiring a rebuild and reinstall. HealthKit/background-delivery entitlement availability depends on the team; if Xcode reports that your team or provisioning profile does not support HealthKit, you need an eligible Apple Developer team. [Apple's account guide](https://developer.apple.com/help/account/basics/about-your-developer-account) explains Personal Team provisioning limits and membership requirements.

CareSphere asks for read-only Apple Health access but cannot tell whether read access was denied; an empty list may also mean no matching Health records exist. Garmin workouts must first sync from Garmin Connect to Apple Health on the iPhone.

## Optional iOS features

### On-device Health Guide

The Guide can use an optional **Qwen2.5 1.5B Instruct GGUF** model (about 1.1 GB), source-linked MedlinePlus references, and local summaries. Model weights are not bundled; downloading or importing a model is optional. This is general health education, not diagnosis, emergency triage, drug-interaction checking, or dosing advice. A local phrase-based safety gate runs before reference search and model inference for a narrow set of self-harm and possible-poisoning phrases; it is not a validated or complete crisis detector.

### Optional local Kiwix/Wikipedia ZIM bridge

CareSphere does not download or duplicate your ZIM archive. The iOS app can query the separately running Kiwix server on your trusted private network; the archive stays where it already lives. Do not port-forward the server.

On the Mac or other computer that holds the `.zim` file:

```bash
brew install kiwix-tools
kiwix-serve --port=8080 --address=0.0.0.0 "/path/to/your-library.zim"
```

Then open **Health → Health Guide → Connect your Wikipedia ZIM** in CareSphere:

- Use the `.zim` content name, usually the filename without `.zim`.
- Enter the host computer's private Wi-Fi address, such as `http://MacBook.local:8080`, with both devices on the same trusted Wi-Fi.
- Binding to `0.0.0.0` lets other devices on the network reach Kiwix. Keep the host firewall enabled and do not configure router port forwarding.

CareSphere rejects non-local Kiwix hosts; it does not send the archive or searches to Wikipedia or a cloud AI. The iOS app needs local-network permission. Keep the existing Kiwix bridge separate; CareSphere does not bundle or link CoreKiwix.

### Optional Kokoro neural speech

Apple voices remain the default. In Settings, choose **Download Kokoro English voices** to install the optional int8 English v0.19 pack (~158 MB / 151 MiB compressed; allow about 250 MB free while installing). The [pack](https://github.com/engineer2025-sudo/Care/releases/download/mac-v2.1.0/CareSphere-Kokoro-Int8-En-v0.19.zip) and its [SHA-256 file](https://github.com/engineer2025-sudo/Care/releases/download/mac-v2.1.0/CareSphere-Kokoro-Int8-En-v0.19.zip.sha256) are legacy release assets. Kokoro weights are Apache-2.0; included eSpeak-NG pronunciation data is GPL-3.0, and both license notices ship in the archive. Speech is synthesized on-device; generated audio is not uploaded. Scheduled iOS notifications use the system notification sound while the app is closed; they do not speak the selected neural voice in the background.

### Bluetooth heart-rate monitors

On a supported Garmin watch, enable **Broadcast Heart Rate**, keep the broadcast screen open, then choose **Health → Vitals → Pair** in CareSphere. This is a direct Bluetooth LE connection to the standard Heart Rate profile—not a Garmin Connect cloud/API integration. Menu names and support vary by model and firmware. Turn off broadcasting afterward to conserve battery.

## Optional support check-ins and safety

- Heart-rate check-ins are off by default and must be enabled in **Settings → Support check-ins**. They use fresh paired Bluetooth readings only while CareSphere is foregrounded and unlocked; sustained high readings offer a self-check, not a diagnosis or alert. Activity can raise heart rate.
- A person may choose **I'm stressed** on Today and follow a short paced-breathing exercise. The app does not measure breathing with the microphone or camera.
- A possible self-harm or poisoning phrase in Health Guide gets a short, fixed response before search or model inference. The filter is limited and may miss messages; it does not provide clinical triage.
- CareSphere has no remote caregiver account, push service, or delivery acknowledgement. A text action opens the iOS Messages composer, and the person must review and tap **Send**. Jitsi video is optional; anyone with the room link may join.
- The app does not scan social media, Messages, or other apps, and it never silently sends a caregiver message or claims delivery.

## Privacy and safety

Care data is stored locally on the device with encrypted storage and iOS file protection. Optional downloads are user-initiated. Health readings retain their source labels; CareSphere is not a medical device and does not replace a clinician or emergency services. Medication reminders require a schedule you enter and explicitly confirm. The app does not prescribe, verify doses, check interactions, or confirm that a dose was taken.
