# CareSphere

Local routines, connection, and optional accessible activities. **Native iPhone and Android apps**, plus a separate React web app. No generated vital signs, pretend contacts, prefilled medication lists, or automatic caregiver messages.

## This release — October 14, 2026

- **All three platforms:** searchable activity libraries, private favorites, searchable/editable care notes and confirmed deletion.
- **iPhone 3.1.0 (8):** favorite filtering, note-edit discard protection and updated timestamps. Existing encrypted care data migrates without a reset.
- **Android 1.1.0 (2):** system/light/dark appearance, native themed dialogs, live search that retains the keyboard, and a two-row navigation layout at large font sizes.
- **Web 1.1.0:** 11 optional activities, one focused session at a time, five added supported-choice/conversation activities, note-edit discard protection and verified offline reopening after the first completed installation.

Downloads are documented in [DOWNLOAD.md](DOWNLOAD.md). See [release verification](docs/release-2026-10-14.md) and [web deployment](docs/web-deployment.md).

## Native apps

| | iPhone 3.1 | Android 1.1 |
|---|---|---|
| Project | `ios/CareSphere.xcodeproj` | `android/` in Android Studio |
| Minimum OS | iOS 16 | Android 8 / API 26 |
| Activities | 11 optional, unscored activities | 11 untimed activities |
| Local care | Routines, notes, mood, confirmed medication reminders | Routines, notes, daily mood; no medication reminders yet |
| Heart rate | Real BLE; optional dated/source-labeled Apple Health history | Real standard BLE monitor only |
| Other vitals | Optional read-only Apple Health records | No oxygen/BP/Health Connect integration; no substitute values |
| AI | Apple's Foundation Models on eligible iOS 26+ devices, explicitly optional | No AI; Apple Intelligence is not available on Android |
| Speech | Installed Apple voices | No speech feature in this release |
| Video | Explicit browser handoff | Explicit browser handoff |
| Privacy | Encrypted local care storage, iOS file protection, optional biometric lock | AES-256-GCM local storage with Android Keystore; backup disabled |
| Distribution | Source ZIP, own Xcode signing; no signed IPA/TestFlight | Debug-signed development APK; not a Play Store release |

**[Install and troubleshoot](DOWNLOAD.md)** · [iOS guide](ios/README.md) · [Android guide](android/README.md) · [codesign/keychain help](docs/signing-troubleshooting.md)

The iOS standard scheme requires no HealthKit capability and has no remote Swift package downloads. Simulator builds do not need signing credentials. Apple Intelligence requires Xcode 26+, iOS 26+, compatible hardware, enabled Apple Intelligence and a ready model in a supported language/region; unavailable/error states are shown, never a fake answer. Standard iPhone builds work without it.

Android is a native development release, **not full iOS feature parity**. Hosted debug signing is for testing, not production security. Physical Bluetooth, accessibility with intended users, and actual Apple Intelligence responses still require device testing.

## Web app

- Real Web Bluetooth notifications only; no generated pulse, oxygen or blood pressure. Missing/invalid readings stay blank, and live readings expire after 15 seconds without an update.
- User-created routines, notes, mood self-reports and medication reminders. No illustrative care roster.
- Explicit CSV/visit-brief sharing. Old non-BLE entries are excluded from health exports.
- Optional Web Audio soundscapes and untimed activities. Synthesized sound is audio output, not a health measurement.
- Video embeds Jitsi or opens its real website after a user action. No host, schedule, attendance tracking, moderation or family-sync server is provided.
- Browser care data uses AES-GCM with a non-extractable key in IndexedDB. Shared exports are no longer protected. The app cannot guard against a compromised device or same-origin script.
- Medication browser reminders need the page open and a user-confirmed schedule; they are not prescription verification. iOS native reminders use system notifications.

```bash
npm ci
npm run dev      # http://localhost:3000
npm test
npm run build
```

Node.js 20.19+ or 22.12+ required. Real Web Bluetooth requires a supported browser such as Chrome/Edge on desktop or Android; Safari/iOS uses the native app instead.

### UI usability checks

```bash
npx playwright install chromium
npm run test:ui
npm run build
npm run test:offline
```

The browser suite checks task shortcuts, mood check-ins, medication form validation,
settings focus retention, favorites persistence, note editing/deletion, dialog keyboard behavior, no generated-vitals controls,
and navigation without horizontal overflow at 320–1440px with default and largest
text. Light, dark, and high-contrast settings remain available. Tests do not call
video services, pair hardware or request notification permissions.
Use an existing Chromium with `CHROMIUM_EXECUTABLE_PATH=/path/to/chromium`.

## Validation and boundaries

Native CI builds/tests iOS and Android separately. Android also validates its APK signature and exercises basic navigation/persistence in an emulator. iOS compiles standard device, optional HealthKit and Simulator targets, and launches the Simulator. Compile and emulator checks do not certify signing on your Mac, real hardware sensors, VoiceOver/TalkBack usability, or clinical effectiveness.

Activities are research-informed accessibility/wellbeing features, **not clinically validated dementia or autism treatments**, group cognitive stimulation therapy, or diagnostic tests. AI can be wrong. CareSphere does not diagnose, triage, prescribe or monitor emergencies. Sharing always requires explicit action; no clinical or caregiver account is implied.

Old Mac release files are archival; there is no current native macOS target. No slide deck is part of this delivery.
