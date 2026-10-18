# Instant SOS sending, no server — October 16, 2026

Versions: **Android 1.8.0 (10), iPhone 3.7.0 (16), web 1.5.0** (seventh delivery of this version set). This implements the request: an immediate alert/message with no backend, as far as each operating system legally and technically allows.

## Android: a real background text

- With a saved emergency contact, **Emergency SOS** shows **Send now to {name}**.
- `SEND_SMS` is declared and requested only when that button is tapped. On grant, `SmsManager.sendMultipartTextMessage` hands the message to the carrier immediately — no messaging app opens, no server is involved.
- Status is reported precisely: **handed to your carrier** on success, a carrier **delivery report** if one arrives, and a clear failure line otherwise. Neither is presented as “read”.
- Every attempt is kept in **Recent SOS attempts** (last 20, inside the encrypted local store), so the person can see what happened without a server.
- `<uses-feature android:name="android.hardware.telephony" android:required="false" />` keeps the APK installable on tablets without SMS; those devices get an explanatory line instead of the button.
- Multi-SIM phones use the default SMS subscription. Play Store distribution restricts `SEND_SMS`; this build is sideloaded, so a Play release would need an approved exception.

## iPhone: Apple does not allow silent SMS

There is no public iOS API for a third-party app to send a text without the user tapping Send. CareSphere therefore does not pretend to:

- **Send now with Shortcuts** hands the current message (including location, if added) to a Shortcut named **CareSphere SOS** that the person creates once. The Shortcut sends it; Apple Shortcuts does the sending, with no server.
- In-app three-step setup instructions, localized, plus a button that opens Shortcuts.
- **Call {name}** dials the saved contact directly.
- The existing **Choose how to share** composer remains as the fallback.

The screen says explicitly that Apple does not let an app send silently and that CareSphere cannot confirm delivery or a response. Apple’s own Emergency SOS (side + volume buttons, or Crash Detection) remains the OS-level path to emergency services and cannot be triggered by an app.

## Web: one tap to the messaging app

- With a saved contact, SOS shows **Message {name} now**, an `sms:` link with the message and location already written, plus **Call {name}**.
- Browsers cannot send an SMS without a server, and the UI says so. The share sheet / clipboard fallback remains.

## Validation

- **Web unit 67** (4 new `sosMessage` tests: wording, location link, honest missing timestamp, encoded `sms:` link with no delivery claim).
- **Web browser 34** — the new test saves a contact, opens SOS, checks the `sms:` href contains the SOS text and no “sent/delivered” wording, checks the `tel:` link, and that the 911 action is present.
- **Android unit 74** (6 new `SosText` tests: shared wording, maps link, unrecorded-time wording, 20-entry newest-first log, empty log, status lines that never claim receipt).
- **Android emulator smoke** asserts the instant-send UI, the exact carrier caption, **Send now to Sam**, **Call Sam**, and that no attempt log exists before sending. It does **not** grant `SEND_SMS` or send a real SMS — that remains a physical Samsung acceptance test.
- **iPhone 60 Swift tests** (6 new `SosMessage` tests: anonymous and named wording, location, Shortcut URL carrying the text as input, dial URL validation, setup steps). One iOS build attempt before this batch passed; the final run is recorded in the delivery message.

## Files

`android/.../SosActivity.kt`, `SosText.kt`, `SosTextTest.kt`; `ios/ActivityKit/Sources/CareActivityKit/SosMessage.swift` + tests; `ios/CareSphere/Views/SosView.swift`; `src/lib/sosMessage.js` + tests; `src/App.jsx`; `docs/instant-sos.md`.
