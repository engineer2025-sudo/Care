# Instant SOS sending, without a server

CareSphere has no backend, account, or push service. “Instant” therefore means **through your phone’s own carrier or Apple’s own automation**, never through a CareSphere server.

**The one thing that differs by platform is what the operating system permits.** This page states exactly what each platform does, so nothing is implied that the OS blocks.

## Android 1.8.0 (10): a real background text

1. Set an emergency contact in **Settings & privacy → Emergency contact**.
2. Open **Health → Other health data → Emergency SOS**.
3. Tap **Send now to {name}**. The first time, Android asks for SMS permission; that is the only prompt.
4. CareSphere hands one text to your carrier immediately. You do not leave the app and no messaging app opens.

What the screen reports:

- **“Message handed to your carrier…”** — the phone accepted it for sending. This is not proof the recipient received it.
- **“Your carrier reported delivery to your contact’s phone.”** — only if your carrier sends a delivery report. It still does not mean the message was read.
- If sending fails, the screen says so and the attempt stays in **Recent SOS attempts** (last 20, stored locally with your encrypted care data).

Limits that remain:

- The message is one SMS plus any location line; long messages split into multiple parts and count as multiple messages with your carrier.
- No signal, airplane mode, or a carrier block means no message. CareSphere cannot retry in the background.
- Google Play restricts `SEND_SMS` for distributed apps. This APK is sideloaded; a Play Store release would need an approved exception. Nothing is hidden: the permission is declared in the manifest and requested only when you tap send.
- Multi-SIM phones send from the default SMS subscription; there is no SIM picker yet.

## iPhone 3.7.0 (16): Apple does not allow silent SMS

**There is no public iOS API for a third-party app to send a text without the person tapping Send.** Any app claiming otherwise is either using a server (CareSphere does not) or is not on iOS. Apple’s own **Emergency SOS** (hold the side button with a volume button, or use Crash Detection) is an OS feature and apps cannot trigger it.

The closest legitimate path, and what CareSphere offers:

1. Open the **Shortcuts** app and create a new shortcut.
2. Add the **Send Message** action, choose your contact, and set the message to **Shortcut Input**.
3. Turn off **Show When Run**, name the shortcut exactly **CareSphere SOS**, and save.
4. In CareSphere: **Emergency SOS → Send it now → Send now with Shortcuts**.

CareSphere hands the current message (including location if you added it) to Apple Shortcuts, and the Shortcut sends it immediately. The shortcut is yours, lives on your phone, and has no server involvement. CareSphere cannot see whether Shortcuts sent it, so the screen never claims it did.

Without that shortcut, use **Choose how to share** — Messages opens a draft you send yourself.

## Web 1.5.0: one tap to your messaging app

A browser cannot send an SMS by itself without a server. With a saved contact, **Emergency SOS** shows **Message {name} now**, which opens your messaging app with the message and location already written. You still tap Send there.

On a computer without a messaging app, use **Share SOS details** to copy the message.

## What no platform does

- No automatic alert to anyone when the app is closed.
- No server, account, or cloud relay.
- No delivery, read, or response confirmation invented by CareSphere.
- No claim that any of this replaces calling emergency services. In immediate danger, call your local emergency number — in the US, 911.
