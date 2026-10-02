# CareSphere download & setup

## Current public Mac download

The latest **published and CI-verified** Mac release is **CareSphere 2.1.0**:

- [Download the Mac `.dmg`](https://github.com/engineer2025-sudo/Care/releases/download/mac-v2.1.0/CareSphere-2.1.0-mac.dmg)
- [Download the Mac `.zip`](https://github.com/engineer2025-sudo/Care/releases/download/mac-v2.1.0/CareSphere-2.1.0-mac.zip)
- [View 2.1.0 release notes and assets](https://github.com/engineer2025-sudo/Care/releases/tag/mac-v2.1.0)
- [Download the optional Kokoro English voice pack](https://github.com/engineer2025-sudo/Care/releases/download/mac-v2.1.0/CareSphere-Kokoro-Int8-En-v0.19.zip) (~158 MB / 151 MiB) · [SHA-256 file](https://github.com/engineer2025-sudo/Care/releases/download/mac-v2.1.0/CareSphere-Kokoro-Int8-En-v0.19.zip.sha256)

The 2.1.0 Mac app includes the optional local Qwen health guide, MedlinePlus search, a local Kiwix/ZIM connector, biometric lock, and optional Kokoro speech. Model weights, MedlinePlus data, and the Wikipedia ZIM are **not bundled**: Qwen and MedlinePlus are downloaded only when requested in the app, and the existing ZIM stays in its current Kiwix library. The Kokoro pack is a separate opt-in release asset. The previous [2.0.0 release](https://github.com/engineer2025-sudo/Care/releases/tag/mac-v2.0.0) remains available.

### Install the Mac app

1. Download and open the `.dmg`.
2. Drag CareSphere into **Applications** and eject the mounted disk image.
3. Open CareSphere once. If macOS blocks the ad-hoc-signed app, click **Done**, then open **System Settings → Privacy & Security**, scroll down, choose **Open Anyway**, and confirm **Open**. Do not disable Gatekeeper globally.

The app requires macOS 13 or later. The installer is ad-hoc signed; it is not Developer ID signed or notarized.

## iPhone / iPad

There is **no public App Store, TestFlight, or signed `.ipa` download** yet. CareSphere for iOS is a native SwiftUI app (not the Mac DMG or a web wrapper). The iOS target already includes HealthKit read access; the Mac build deliberately has no HealthKit entitlement. CI compiles the iOS target unsigned, so it is a compile check—not an app you can install by opening the artifact on your phone. A simulator build is also unavailable with the current llama.cpp package.

### Install the native development build on your iPhone

You need a Mac, Xcode, your iPhone, and a cable (wireless device debugging can be enabled later). Keep the phone unlocked and tap **Trust This Computer** if prompted.

1. Install Xcode from the Mac App Store. Install XcodeGen in Terminal: `brew install xcodegen`.
2. Clone the development branch on your Mac (or use your existing checkout), then generate/open the native project:
   ```bash
   git clone --branch arena/01a0626b-care https://github.com/engineer2025-sudo/Care.git
   cd Care/ios
   xcodegen generate
   open CareSphere.xcodeproj
   ```
3. In Xcode, choose the **CareSphere** scheme—not **CareSphereMac**—and select your connected iPhone as the run destination.
4. Select the **CareSphere** target → **Signing & Capabilities**. Turn on **Automatically manage signing** and select your Apple development team. If Xcode says the bundle identifier is unavailable, set a unique identifier under **General → Identity**.
5. Press **Run** (⌘R). Wait for Xcode to resolve the Swift packages on the first build. If the iPhone requests **Developer Mode**, enable it under **Settings → Privacy & Security**, restart, and confirm. If iOS asks you to trust the developer, follow the on-device prompt.
6. Finish CareSphere onboarding. On the permissions step, tap the Apple Health row to request read-only access, or open **Vitals → Enable**. Review the requested categories in Apple Health if no records appear.

The project requests HealthKit plus background delivery, so Xcode signing must support those capabilities. A free **Personal Team** can install development apps on a registered iPhone, but Apple says its provisioning expires after 7 days, requiring a rebuild and reinstall. HealthKit/background-delivery entitlement availability depends on the team; if Xcode reports that your team or provisioning profile does not support HealthKit, you need an eligible Apple Developer team. [Apple's account guide](https://developer.apple.com/help/account/basics/about-your-developer-account) explains Personal Team provisioning limits and membership requirements.

Apple Health is available on iPhone/iPad only—not in the Mac DMG. CareSphere asks for permission but cannot tell whether HealthKit read access was denied; an empty list may also mean no matching Health records exist. Garmin workouts must first sync from Garmin Connect to Apple Health on the iPhone. The current simulator limitation and unsigned CI compile check are documented in the [iOS build notes](ios/README.md).

## Optional 2.1.0 Mac features and setup

### On-device health guide

In the Mac 2.1.0 release, the Guide can use an optional **Qwen2.5 1.5B Instruct GGUF** download (about 1.1 GB), source-linked MedlinePlus references, and on-device summaries. The model is not bundled. It is for general health education—not diagnosis, emergency triage, drug-interaction checking, or dosing advice. Do not rely on it for urgent or clinical decisions.

### Existing Wikipedia ZIM through Kiwix

CareSphere does not download or duplicate your 6.9 GB ZIM. The 2.1.0 connector queries a Kiwix server that you run where the archive already lives. Keep it on a trusted private network; do not port-forward it. Searches go to the local/private address you configure.

On the Mac that holds the `.zim` file:

```bash
brew install kiwix-tools
kiwix-serve --port=8080 --address=0.0.0.0 "/path/to/your-library.zim"
```

Then open **Guide → Connect your Wikipedia ZIM**:

- Mac app: `http://127.0.0.1:8080`; the server can instead bind to `127.0.0.1` for Mac-only use.
- Content name: usually the `.zim` filename without `.zim` (as shown by Kiwix).
- iPhone/iPad development build: bind Kiwix to `0.0.0.0` as above, then use the Mac's private Wi-Fi address, such as `http://MacBook.local:8080`, with both devices on the same Wi-Fi.

Binding to `0.0.0.0` lets devices on the network reach Kiwix. Use it only on trusted Wi-Fi, do not configure router port forwarding, and use the Mac firewall. CareSphere rejects non-local Kiwix hosts; it does not send the archive or search queries to Wikipedia or a cloud AI. The iOS app needs local-network permission.

### Optional Kokoro neural speech

Apple voices remain the default. In Settings, choose **Download Kokoro English voices** to install the separate [Kokoro int8 English v0.19 pack](https://github.com/engineer2025-sudo/Care/releases/download/mac-v2.1.0/CareSphere-Kokoro-Int8-En-v0.19.zip) (~158 MB / 151 MiB compressed; allow about 250 MB free while installing). The [SHA-256 file](https://github.com/engineer2025-sudo/Care/releases/download/mac-v2.1.0/CareSphere-Kokoro-Int8-En-v0.19.zip.sha256) is published with the pack. Kokoro weights are Apache-2.0; the included eSpeak-NG pronunciation data is GPL-3.0, and both license notices ship in the archive. Speech is synthesized on-device; generated audio is not uploaded.

Scheduled iOS notifications use the normal iOS notification sound while CareSphere is closed; they do not speak the selected neural voice in the background.

## Garmin heart-rate pairing (Mac 2.1.0)

On a supported Garmin watch, enable **Broadcast Heart Rate**, keep the broadcast screen open, then choose **Vitals → Pair** in CareSphere. This is a direct Bluetooth LE connection to the standard Heart Rate profile—not a Garmin Connect cloud/API integration. Menu names and support vary by model and firmware. Turn off broadcasting afterward to conserve battery.

## Privacy and safety

The native app stores care data locally. Optional downloads are user-initiated. Health readings retain their source labels; CareSphere is not a medical device and does not replace a clinician or emergency services. Medication reminders require a schedule you enter and explicitly confirm; old saved schedules are preserved but paused until reviewed. The app does not prescribe, verify doses, check interactions, or confirm that a dose was taken.
