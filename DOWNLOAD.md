# Install CareSphere

## Downloads for the October 18, 2026 source update

- [**CareSphere-Mobile-Source-3.8.0-1.9.0.zip**](https://github.com/engineer2025-sudo/Care/releases/download/caresphere-mobile-3.8.0-1.9.0/CareSphere-Mobile-Source-3.8.0-1.9.0.zip) — iPhone 3.8.0 (17) Xcode source, Android 1.9.0 (11) source, local activity package, translations, tests, and installation guides.
- [**SHA-256 checksum**](https://github.com/engineer2025-sudo/Care/releases/download/caresphere-mobile-3.8.0-1.9.0/CareSphere-Mobile-Source-3.8.0-1.9.0.zip.sha256)
- **CareSphere-Web-1.5.1.zip** — deployable production website plus source, tests, and setup instructions. No `node_modules` or personal data included.

The mobile asset is source code, not an installer. GitHub Actions passed for web checks, the Android Gradle/emulator workflow, and iOS logic/device/HealthKit/Simulator builds; see [run links and verification details](docs/release-2026-10-18.md). No signed iOS IPA or production-signed Android installer is included. The source projects require a Mac/Xcode and Android Studio/JDK to build locally.

## Languages

Use **Settings → App language** for English, Español, 中文（简体）, Filipino / Tagalog or Tiếng Việt. The iPhone setup wizard also has a globe picker. Core interface translation is offline; some advanced content remains English. Notes and records keep their original language. See [coverage and limitations](docs/languages.md).

## Android

**Samsung Galaxy:** this source update does not include an APK. Build your own from the Android source below, then follow the [Samsung-specific installation guide](docs/samsung-install.md), including Auto Blocker and installation/update precautions.

[Complete feature checklist](docs/feature-checklist.md) · [Current source-update validation](docs/release-2026-10-18.md)

To build a local development APK, open `android/` in Android Studio with JDK 17, install SDK 36 components, then build/run. Or use:

```bash
cd android
./gradlew testDebugUnitTest lintDebug assembleDebug
```

The resulting local `app-debug.apk` is a debuggable development build, not a Play Store release. The Android Gradle tests, lint, APK assembly, signature check, and emulator smoke passed in [hosted CI](https://github.com/engineer2025-sudo/Care/actions/runs/39164164447). Use your own protected release-signing key for production. See [Android guide](android/README.md).

## iPhone

The mobile source ZIP includes the iPhone project, but is **source code**, not a signed installer. It cannot install from iPhone Files.

1. Unzip the whole folder on a Mac and open `ios/CareSphere.xcodeproj`.
2. Use Xcode 26+ for Apple Intelligence support. The baseline app supports iOS 16+ and can compile with Xcode 16+, but your Xcode must support your phone's installed OS.
3. First select **CareSphere → iPhone Simulator → Run**. No Apple signing credential is needed.
4. For your phone, select the connected iPhone, your own signing team, and **Automatically manage signing**, then Run. Trust the Mac and enable Developer Mode if requested.
5. The standard scheme has no HealthKit capability requirement. For optional read-only Apple Health, select **CareSphere-HealthKit** with an eligible profile/team.

There are no remote Swift packages to retrieve. Keep `ios/ActivityKit/` with the project. No XcodeGen step is needed. If codesign repeatedly asks for a password or you still see retrieval errors, follow [the signing and keychain guide](docs/signing-troubleshooting.md); do not keep guessing passwords.

Apple Intelligence in the app requires iOS 26+, eligible hardware, Apple Intelligence enabled and its model ready. It never runs on Android. On unsupported iPhones, references and all activities still work; there is no fake AI fallback.

See [iPhone guide](ios/README.md). No App Store/TestFlight/signed IPA release is provided. Automated compile/tests are not physical-device verification.

## Web

Unzip **CareSphere-Web-1.5.1.zip**. For local development run `npm ci` then `npm run dev` (Node.js 20.19+ or 22.12+). To host the prepared build, upload the **contents** of `production/` to a static HTTPS site's root. Do not double-click `index.html`: browser encryption, service workers and Bluetooth need a proper secure origin.

Offline routines, notes and activities work after the first completed online installation. Video, external references and new downloads still need internet. Web Bluetooth is browser-dependent and is not supported in iPhone Safari; use the native iPhone app for BLE. See [web deployment](docs/web-deployment.md).

## Share between devices without a backend

Both people open **My support tools → Device sharing**. The sender selects notes/routines, enters a unique passphrase, reviews the selection, then uses the share sheet or saves the encrypted file. The recipient chooses that file, enters the passphrase provided separately, previews it and selects copies to import. Full backups are for same-platform recovery, not cross-platform transfers.

For direct native app-to-app transfer on all three phone pairings, join the same private Wi-Fi/hotspot, choose **Offer to a nearby device** on the sender, and enter its address/code in **Connect to a nearby device** on the recipient (iPhone: **Connect and receive encrypted copy**). No hosted service or internet is required. Keep both apps open; offers expire after five minutes. Use **Find nearby devices** to select the sender’s offer label without typing an address. Manual address/code entry remains available when discovery is blocked.

Alternatively, use AirDrop on compatible Apple devices, Quick Share where available on Android, or another file-transfer method you choose. CareSphere does not implement direct Bluetooth pairing or silent live sync. A received copy cannot be remotely revoked. See [step-by-step sharing](docs/device-sharing.md) and [all personal tools](docs/personal-tools.md).

## Real data and safety

No generated heart-rate, oxygen, or blood-pressure values. Missing data stays blank. Only user-entered care records are saved; fresh installs have no pretend people, medications, or notes. Existing data is preserved until you explicitly erase it in Settings.

Activities are optional wellbeing/practice, not validated dementia/autism treatments. CareSphere is not a medical device and does not provide diagnosis, dosing or emergency monitoring. Never trigger real emergency calls or medication actions simply to test the UI.
