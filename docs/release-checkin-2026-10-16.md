# “I'm stressed” guided check-in on all three platforms — October 16, 2026

Versions: **Android 1.8.0 (10), iPhone 3.7.0 (16), web 1.5.0** (fourth delivery of this version set). This closes the last named checklist gap: the flow was iPhone-only, and Android/web had paced breathing and contacts as separate tools.

## The flow

1. **Let's pause together** — an optional paced pause (in 4 seconds, out 6, three cycles) with Pause/Start, **Skip to check-in**, and **I need help now**. It is not treatment or assessment, and nothing is measured.
2. **How are you now?** — **Better** (closes), **Contact my caregiver**, **Still stressed**, **I need help** (all three open the support step).
3. **Would you like someone with you?** — **Share a support message** and **Open video support**.

Every platform states the same limits: the share opens a draft the person sends themselves, CareSphere cannot confirm delivery, and anyone with the room link can join. Nobody is invited automatically. No crisis detection or triage is claimed anywhere in the flow.

## Platform notes

- **Web:** entry button in the “How are you feeling today?” card. Support step uses the system share sheet when the browser has one, otherwise the clipboard with an explicit “paste it into a message” instruction — the copy never says a message was sent. Video uses the existing in-app Jitsi room modal with a freshly generated `CareSphere-Support-…` room.
- **Android:** entry button in the “How are you feeling?” card, opening a new `CheckInActivity`. Share runs through the system chooser with the message prefilled; **Open video support** opens the room link in the browser; the link is also shown as selectable text.
- **iPhone:** the flow itself is unchanged, but its remaining hard-coded strings (step titles, breathing actions, urgent-safety sentences, the Messages caption and `Text {name}`) now pass through the shared catalog, so the whole flow follows the selected language instead of only parts of it.

## Interface catalog

**738 messages** (up from 701) with four translations each. The 37 additions cover this flow plus iPhone-only safety strings that previously fell back to English: `Call 988`, `Text 988`, `Call Poison Control`, `I'm safe right now`, `Please don't hurt yourself.`, `This could be dangerous.`, and the device-level “no sharing app/browser” messages.

## Validation

- Web unit: **58** (5 new in `test/stressFlow.test.js`: phase alternation, cycle counting and stop-at-three, paused state, cycle-counter clamp, room/message wording).
- Web browser: the new `e2e/usability.spec.js` check walks pause → skip → check-in → support, asserts a clipboard-or-share status appears and that **no** status line claims delivery, opens the video room, and confirms Escape closes it and focus returns to the entry button.
- Android unit: **60** (4 new in `CheckInFlowTest.kt`).
- Android emulator smoke: taps **I'm stressed**, asserts the pause screen, skips to check-in, asserts the support options render, and closes back to Today.
- iPhone: 54 Swift tests, unchanged; the flow's strings now resolve from the generated catalog.

Combined totals are asserted by `scripts/package_mobile.py`, which also records the exact APK/archive hashes in `BUILD_VERIFICATION.json` inside each archive.
