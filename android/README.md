# CareSphere for Android — 1.1

Native Kotlin/Android Views app. Android 8+ (API 26), JDK 17, Gradle 8.9, Android SDK 35. Open this folder in Android Studio; no project-generation or Node toolchain needed. First Gradle sync requires internet for the Android build tools and Kotlin/JUnit. No third-party runtime UI, health, video, analytics, or AI SDK is bundled.

## New in 1.1.0 (2)

Activity search and private favorites; note search/editing with preserved creation dates and edited dates; system/light/dark appearance; themed dialogs; Bluetooth and app-permission settings shortcuts. Large text uses two rows of navigation so no destination disappears offscreen. Search updates results without rebuilding the focused input.

The emulator smoke also checks saved favorites after restart, note editing, delete cancellation, dark appearance and navigation at 160% font size. Real TalkBack and BLE remain device checks.

## Implemented

- Four primary destinations: Today, Activities, Care, Health; Settings from Today.
- Empty-by-default profile/routines/notes/mood. Only your entries become care records.
- AES-256-GCM local care-data encryption with Android Keystore key, atomic file writes, backup disabled, and visible storage errors. Corrupt/unreadable data is not overwritten automatically.
- Editable routines with daily completion reset, optional daily mood self-report, notes with explicit delete/share confirmation, and explicit export/erase.
- Eleven untimed activities with hints, manual next steps and exits. Native controls follow Android font scaling and expose text to TalkBack. Sound/breathing stop on backgrounding.
- Explicit Bluetooth permission request and standard 0x180D/0x2A37 monitor discovery/selection, cancel, 20-second timeouts, subscription confirmation, valid-contact packet parsing, and 15-second stale-reading expiry. No scan until requested. No generated or cached health values.
- Deliberate browser handoff to video provider and user-controlled share sheet; no automatic messages or emergency calls.

## Not included / not claimed

No Health Connect, cloud Garmin sync, blood oxygen/pressure integrations, medication reminders, Apple Intelligence, AI chatbot, biometric lock, or remote family/clinician account. These are not mocked. This release is not full iOS parity. Apple Intelligence is an Apple-only framework. Activities are not clinically validated treatments. No real-device BLE/TalkBack or medical accuracy certification is claimed.

## Build

```bash
./gradlew testDebugUnitTest lintDebug assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

CI builds the APK, runs 13 activity/preference/packet tests and Android lint. Debug APKs are installable, but debuggable and not production releases. Android Studio maintains its own local debug signing key; hosted CI debug certificates can change between runs. Never commit a private production signing key. See [installation guide](../DOWNLOAD.md).

## Manual acceptance checklist (not completed by compilation)

- Fresh start: no name, notes, mood, routines, or heart-rate number populated.
- Add a routine and note; force-close/reopen and verify. Check date-rollover behavior.
- Rotation preserves an active game; pause/end/background stops sound/breathing.
- Permission denial, Bluetooth off, no devices, cancel, actual device selection, contact loss, stale interval, reconnect.
- Text at Android's largest font setting; TalkBack names/order/focus; small portrait and landscape windows.
- Export shares only after confirmation; cancel shares nothing. Erase clears care data and key.
- Never test by calling real emergency services or acting on a medication dose.
