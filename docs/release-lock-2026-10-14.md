# Android lock and snooze follow-up — October 14, 2026

Versions: **Android 1.7.0 (9), iPhone 3.6.1 (15), web 1.4.1**. Current source additions are undergoing validation; earlier APKs do not contain them. Fresh packaging requires successful matching-source CI, not merely passing unit tests.

## Changes

- Added optional Android 11+ app lock using Android's BiometricPrompt with strong biometrics or device credentials. Device security must be configured. No PIN collection, cloud identity service or custom biometric storage.
- Gate applies to all native activities, including medication notification entry and support/health tools. Locked contents are invisible and hidden from accessibility traversal. FLAG_SECURE blocks screenshots while the lock is enabled. Private dialogs close and keyboard focus is cleared on leaving; save before backgrounding.
- Unlock sessions exist only in memory. Backgrounding relocks; cancellation, stale attempts, background callbacks and unavailable authentication cannot unlock. Enable and disable both require authentication. Preference-save failure remains locked in the running session.
- Deferred file-picker/permission results are bounded and held only in the living activity until unlock. Recreation/process loss may require reselecting the file. This is a screen gate, not a biometric-bound encryption key or a guarantee against rooted/debuggable access.
- Added same-day ten-minute medication review snooze, pending time and cancel. It requires an enabled, confirmed schedule/notification permission and an untaken entry. It does not change prescribed instructions, tomorrow's schedule or a taken check-in. It cannot cross midnight and delivery remains inexact. Pausing, editing, recovery and taken check-ins cancel relevant snoozes.
- Fixed the Android About screen to report the installed package version and refreshed support-tool data on resume to avoid retaining a stale snapshot after another screen's edits.
- Added 17 shared translated messages (641 total). iPhone/web version updates contain the shared-catalog change, not a claim of new native browser biometrics.

## Required automated evidence

- Android: 44 JVM tests, lint/build/signature, the existing full emulator smoke, new screen-gate/screenshot-flag checks for each protected entry point, snooze persistence/cancel, and **real emulator system-PIN** enable/cancel/unlock/disable plus Home/background relock.
- iPhone: 47 Swift tests, standard/HealthKit unsigned builds, Simulator install/launch for the updated catalog/version.
- Web: 41 unit tests, 31 browser tests, offline production reopening, build and dependency audit.
- Local npm tests/build/audit and catalog/project checks are required too. An initial local attempt lacked restored npm dependencies; `npm ci` restored them, after which all 41 tests and build passed, with zero audit findings.
- CI caught AndroidX nullable `setContentView` signatures during the first compile attempt. They were corrected. The new instrumentation also exposed a test-harness wait on a reused Activity: fresh test tasks and stage diagnostics now avoid that ambiguous wait. Security checks were moved ahead of the longer UI suite so new failures surface sooner. The real-PIN test then caught a rapid Home/return race: waiting for onStop could retain an unlocked session. External onPause now invalidates immediately, while deliberate internal navigation preserves the session. Later emulator runs exposed harness flakes, not app regressions: a one-shot notification read now polls with enabled/permitted/active-notice diagnostics and compares the live translated text; every activity launch wakes the emulator display and clears any keyguard so UI dumps can never come back empty after the screen sleeps; and the system file picker is navigated deliberately (roots drawer → Downloads → file) with retries instead of a swallowed half-move plus swiping inside the open drawer. Instrumentation checks report clean FAIL messages on the test thread instead of crashing the app process on the main looper. Failed earlier builds are not distributed.

Current validation runs:

- iPhone [38675813676](https://github.com/engineer2025-sudo/Care/actions/runs/38675813676): **passed**, including all 47 Swift tests and the three build/launch paths.
- Web [38675813720](https://github.com/engineer2025-sudo/Care/actions/runs/38675813720): **passed**, including all 41 unit, 31 browser and one offline check.
- Android [38858182108](https://github.com/engineer2025-sudo/Care/actions/runs/38858182108): **passed** on the app-lock/snooze source — 44 JVM tests, lint, APK signature verification, native DNS-SD discovery/encrypted transfer instrumentation, and the full emulator smoke: real system-PIN enable/cancel/unlock/disable, rapid Home/return relock, locked file-picker return that shows the lock before preview and processes the file only after real system authentication, snooze persistence/cancel, and the five-language UI suite. Earlier APKs are not the artifact source.

Android artifact verification (exact APK SHA-256, byte count, git blob mirror, archive file hashes) is recorded in `BUILD_VERIFICATION.json` inside `CareSphere-Mobile.zip` and `CareSphere-Web.zip`.

## Still needs actual phones / owner action

Samsung PIN/pattern/strong-biometric behavior, failed/locked-out authentication, OS credential changes, app-switcher privacy, rotation during prompts/imports, split-screen/multiwindow, TalkBack and maximum font sizes, Android 11 compatibility, snooze battery-saver/reboot/timezone behavior and physical BLE/Health Connect/sharing acceptance remain device checks. The API-35 emulator is not a substitute for those.

The download remains **debug-signed**. Owner-controlled production signing, store/privacy/support release procedures, clinical review, authenticated import receipts and broader full-fidelity portable records remain outstanding. See the [complete checklist](feature-checklist.md), [Samsung guide](samsung-install.md) and [signing guide](android-release-signing.md).
