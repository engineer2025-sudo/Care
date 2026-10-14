# Install CareSphere

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

## Real data and safety

No generated heart-rate, oxygen, or blood-pressure values. Missing data stays blank. Only user-entered care records are saved; fresh installs have no pretend people, medications, or notes. Existing data is preserved until you explicitly erase it in Settings.

Activities are optional wellbeing/practice, not validated dementia/autism treatments. CareSphere is not a medical device and does not provide diagnosis, dosing or emergency monitoring. Never trigger real emergency calls or medication actions simply to test the UI.
