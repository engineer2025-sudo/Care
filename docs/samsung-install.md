# Install CareSphere on your Samsung Galaxy

## Which download?

Download **CareSphere-Android.apk**, version **1.8.0 (10)**, from this conversation's newly verified download. You do **not** need the iPhone ZIP, Xcode, Android Studio, a computer or a CareSphere account to install the APK.

The app supports **Android 8 or newer**. Check **Settings → About phone → Software information → Android version**. Health Connect has additional requirements: generally Android 9+ with an available/up-to-date provider; Android 14+ includes it in system settings. Availability and permissions vary; the app checks instead of fabricating readings.

**This is a debug-signed testing build, not a Play Store medical product. Use non-sensitive test information.** The feature checklist explains what is still missing.

## Installation, step by step

1. Open this conversation on the Samsung phone and download **CareSphere-Android.apk**. If you downloaded it on a computer, copy the APK to the phone using a trusted method.
2. Open **My Files → Downloads** and tap the APK (or tap the completed download in your browser).
3. If Samsung asks for permission, use the offered **Settings** link and enable **Allow from this source** for **only** the app opening the file (for example My Files or Chrome). Depending on One UI, this is under **Settings → Security and privacy → More security settings → Install unknown apps**; Settings search is often easier.
4. Return to the installation screen, review the app, and tap **Install**. Keep **Google Play Protect enabled**. Do not ignore a malware warning or install a file from an unknown sender.
5. Open **CareSphere**. Its personal records should start empty unless you are upgrading an existing installation. No permissions are required just to try the activities.
6. Turn **Allow from this source** back **off** when finished.

**Samsung Auto Blocker:** some One UI versions block all sideloading. If that is the message you see, first verify that this is the intended APK. On a phone you own and manage, you may choose to temporarily turn off **Settings → Security and privacy → Auto Blocker**, install this trusted test build, then turn Auto Blocker back on. Do not turn off Play Protect. On a work/school-managed phone, ask the administrator; do not bypass its policy. Menu names vary by Samsung model and One UI version.

## If installation fails

- **“App not installed” / “package conflicts” after an older test build:** hosted debug builds may use different signing certificates. **Do not uninstall immediately.** In the old CareSphere, create an encrypted Android backup under **My support tools → Recovery & backup**, save it outside the app, and keep the passphrase separately. Confirm the backup file exists and can be previewed before deciding to remove the old app. Uninstalling erases the app's local data and its encryption key. After reinstalling, restore the Android backup and review medication schedules again. If the old app cannot open or the backup cannot be verified, stop rather than risk the data.
- **Invalid package / parse error:** check Android version, free storage, and download the complete APK again. Do not rename a ZIP to `.apk`.
- **Blocked by administrator:** use an unmanaged test phone or ask its administrator.
- **Security/malware warning:** stop and report the exact warning rather than disabling protections.
- **App opens but a feature has no readings:** no device/data/permission is connected; this is not a download failure. Values must remain blank.

## First things to try

- **Language:** Today → Settings & privacy → App language. Choose English, Español, 中文（简体）, Filipino / Tagalog or Tiếng Việt. Some advanced text remains English.
- **Activities:** choose any of the eleven activities; no profile is needed.
- **Support:** Today → My support tools → choose visual routines, communication, photos, contacts, appointments or interest prompts.
- **Non-AI draft:** My support tools → Visit summary. Select notes/questions, review/edit the copied text, then save as a new note. It does not generate clinical advice.

## Optional app lock — Android 11 or newer

1. Set a secure PIN/pattern/password in Samsung's device settings first.
2. CareSphere → Today → Settings & privacy → **App lock → Enable app lock**.
3. Complete Android's own authentication prompt. The app never receives your PIN or biometric templates. A strong biometric (where supported) or device credential can unlock; weak face recognition may not qualify.
4. Leaving the app locks private screens. Return and tap **Unlock CareSphere**. Cancellation keeps them hidden; there is no endless automatic retry loop. Disabling the lock also requires authentication.
5. While enabled, screenshots/recents capture are blocked. Save unfinished dialogs before leaving; they close for privacy. After using the file picker, unlock before continuing the import. If the activity was recreated, choose the file again.

On Android 8–10 the base app still works, but this app-specific lock is unavailable; use the device screen lock. This gate is separate from the encryption key and does not turn a debug build into production-grade storage. The lock preference is device-local and is not included in care backups. After a fresh installation, enable it separately; restoring a care backup does not enable or disable an existing app lock.

## Optional medication reminders

1. Today → **Medication reminders** → **Add medication**. Enter only a name/time already confirmed by the label or care team. Times use the 24-hour clock, such as `09:30` or `21:30`.
2. Review every entry. Tap **I reviewed the schedule · enable reminders**, grant notification permission if requested, then tap the button again and confirm.
3. If notifications are blocked, open **Settings → Apps → CareSphere → Notifications**. A disabled medication notification category can also block them.
4. Samsung's **Battery → Background usage limits / Sleeping apps** settings may delay notifications. If you intentionally want background reminders, review whether CareSphere is sleeping; menu paths differ by One UI. The app does not silently bypass battery restrictions.
5. Scheduling is **inexact** and can be delayed by Android, power-saving, force-stop or device shutdown. Reopen CareSphere after a force-stop. Do not use it as your only system for time-critical medicines. Editing or restoring the schedule pauses reminders for another review.

### Snooze / cancel

After confirming the schedule and enabling notifications, each untaken entry has **Snooze 10 min**. It adds one same-day review reminder and shows a pending time with **Cancel snooze**. It is not an instruction to take a dose and does not change tomorrow's normal schedule. Android/Samsung can delay delivery. Snooze is unavailable if ten minutes would cross midnight. Editing/removing the schedule, pausing reminders or restoring a backup clears snoozes; marking an entry taken clears its snooze.

### Import receipts

When you import records someone shared, you can create an **import receipt** — a small JSON file that records what was imported, protected by that transfer's passphrase. Send it back if they should know. Anyone with the passphrase can verify it; optionally they can also check it against the original transfer file. It proves an import was recorded by someone who knew the passphrase — not who you are, and not that anything was delivered. Nothing is ever labeled a receipt before the records are actually imported.

### Bare minimum mode

**Settings & privacy → Appearance → Bare minimum mode** hides explanatory and how-to text across the app. Status messages, empty states and safety warnings stay visible. Turn it off to see the guidance again.

## Optional real health data

- **Health → Pair a heart-rate monitor:** requires hardware broadcasting the standard Bluetooth Heart Rate service. A Galaxy phone/watch is not assumed to broadcast this service. Grant Nearby devices permission only when you choose this feature.
- **Health → Health history → Choose Health Connect read permissions:** choose which of heart rate, blood pressure and oxygen CareSphere may read, then tap **Read recent history**. Another health app must already have written real records to Health Connect. CareSphere does not directly sign into Samsung Health or guarantee that every Samsung Health record is shared.
- History is limited to the last seven days/up to 100 records per type and is **not live monitoring**. It is not copied into CareSphere's persistent store or sent to AI. Missing permissions/records stay empty.
- **Add blood pressure / Add blood oxygen** records a measurement you took now. These are explicitly labeled **Manually entered**, not verified sensor readings.

## Share with another phone without a backend

Both phones: My support tools → Device sharing. Join the same private Wi-Fi/hotspot. Sender selects note bodies/routine titles, sets a unique passphrase, reviews/prepares and chooses **Offer to a nearby device**. Receiver uses **Find nearby devices**, the written address/code, or **Read connection QR from a photo**. The sender must keep its offer open; it expires after five minutes. The QR does not include the passphrase, and this release does not have an in-app live-camera scanner.

Receiver enters the separate passphrase, connects, previews and selects copies to import. **A download is not a saved import.** The sender does not receive authenticated import confirmation. If the network blocks it, use an encrypted `.caretransfer` file through Quick Share or another trusted file method. Full Android backups are for Android recovery, not iPhone import.

See [the complete checklist](feature-checklist.md) and [sharing details](device-sharing.md). Physical Samsung installation/notifications/Health Connect/BLE remain acceptance tests; an emulator passing is not a promise that every Samsung setting behaves identically.
