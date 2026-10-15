# Install CareSphere

## Current downloadable files

- **CareSphere-Mobile.zip** — iPhone 3.5.0 (12) Xcode project, Android 1.5.0 (6) source and verified debug APK, install guides and `BUILD_VERIFICATION.json`.
- **CareSphere-Android.apk** — the same verified Android development build separately.
- **CareSphere-Web.zip** — web 1.3.0 source, locked dependencies, tests and the built `production/` website. No `node_modules` or personal data included.

Each archive has a `.sha256` checksum. These replace the earlier mobile downloads; do not mix old APKs with the new source. See [release checks](docs/release-2026-10-14.md).

## Languages

Use **Settings → App language** for English, Español, 中文（简体）, Filipino / Tagalog or Tiếng Việt. The iPhone setup wizard also has a globe picker. Core interface translation is offline; some advanced content remains English. Notes and records keep their original language. See [coverage and limitations](docs/languages.md).

## Android

Use the APK attached with the current build or the **CareSphere-Android** artifact in the repository's **Android Build** Actions run. The artifact ZIP includes `app/outputs/apk/debug/app-debug.apk` (look for `app-debug.apk` if the artifact directory layout differs).

1. Download the APK onto an Android 8+ phone.
2. Open it and, if Android asks, temporarily allow installation from that specific browser or Files app.
3. Review the app identity and install. You can turn that installation permission off afterward. Do not disable Play Protect globally.
4. Open CareSphere. No account, sensor, or sample profile is required. Only tap **Pair a heart-rate monitor** if you want to connect real hardware.

This is a **debug-signed development APK**, not a Play Store release. It is debuggable; do not entrust it with sensitive production data. It does not include every iOS feature. CI's ephemeral debug certificate may differ between builds; if Android refuses an update because signatures differ, export anything you want to retain before uninstalling the old development build (uninstalling erases its local data). A production release needs a stable protected release-signing key, not the CI debug key.

To build it yourself: open `android/` in Android Studio, use JDK 17, let Gradle install SDK 35 components, and Run. Or:

```bash
cd android
./gradlew testDebugUnitTest lintDebug assembleDebug
```

See [Android guide](android/README.md).

## iPhone

The iPhone ZIP is **source code**, not a signed installer. It cannot install from iPhone Files.

1. Unzip the whole folder on a Mac and open `ios/CareSphere.xcodeproj`.
2. Use Xcode 26+ for Apple Intelligence support. The baseline app supports iOS 16+ and can compile with Xcode 16+, but your Xcode must support your phone's installed OS.
3. First select **CareSphere → iPhone Simulator → Run**. No Apple signing credential is needed.
4. For your phone, select the connected iPhone, your own signing team, and **Automatically manage signing**, then Run. Trust the Mac and enable Developer Mode if requested.
5. The standard scheme has no HealthKit capability requirement. For optional read-only Apple Health, select **CareSphere-HealthKit** with an eligible profile/team.

There are no remote Swift packages to retrieve. Keep `ios/ActivityKit/` with the project. No XcodeGen step is needed. If codesign repeatedly asks for a password or you still see retrieval errors, follow [the signing and keychain guide](docs/signing-troubleshooting.md); do not keep guessing passwords.

Apple Intelligence in the app requires iOS 26+, eligible hardware, Apple Intelligence enabled and its model ready. It never runs on Android. On unsupported iPhones, references and all activities still work; there is no fake AI fallback.

See [iPhone guide](ios/README.md). No App Store/TestFlight/signed IPA release is provided. Automated compile/tests are not physical-device verification.

## Web

Unzip **CareSphere-Web.zip**. For local development run `npm ci` then `npm run dev` (Node.js 20.19+ or 22.12+). To host the prepared build, upload the **contents** of `production/` to a static HTTPS site's root. Do not double-click `index.html`: browser encryption, service workers and Bluetooth need a proper secure origin.

Offline routines, notes and activities work after the first completed online installation. Video, external references and new downloads still need internet. Web Bluetooth is browser-dependent and is not supported in iPhone Safari; use the native iPhone app for BLE. See [web deployment](docs/web-deployment.md).

## Share between devices without a backend

Both people open **My support tools → Device sharing**. The sender selects notes/routines, enters a unique passphrase, reviews the selection, then uses the share sheet or saves the encrypted file. The recipient chooses that file, enters the passphrase provided separately, previews it and selects copies to import. Full backups are for same-platform recovery, not cross-platform transfers.

For direct native app-to-app transfer on all three phone pairings, join the same private Wi-Fi/hotspot, choose **Offer to a nearby device** on the sender, and enter its address/code in **Connect to a nearby device** on the recipient (iPhone: **Connect and receive encrypted copy**). No hosted service or internet is required. Keep both apps open; offers expire after five minutes. Use **Find nearby devices** to select the sender’s offer label without typing an address. Manual address/code entry remains available when discovery is blocked.

Alternatively, use AirDrop on compatible Apple devices, Quick Share where available on Android, or another file-transfer method you choose. CareSphere does not implement direct Bluetooth pairing or silent live sync. A received copy cannot be remotely revoked. See [step-by-step sharing](docs/device-sharing.md) and [all personal tools](docs/personal-tools.md).

## Real data and safety

No generated heart-rate, oxygen, or blood-pressure values. Missing data stays blank. Only user-entered care records are saved; fresh installs have no pretend people, medications, or notes. Existing data is preserved until you explicitly erase it in Settings.

Activities are optional wellbeing/practice, not validated dementia/autism treatments. CareSphere is not a medical device and does not provide diagnosis, dosing or emergency monitoring. Never trigger real emergency calls or medication actions simply to test the UI.
