# Emergency contact on Android and web — October 16, 2026

Versions: **Android 1.8.0 (10), iPhone 3.7.0 (16), web 1.5.0** (fifth delivery of this version set). This closes checklist row 14: only iPhone had a profile-level emergency contact, so Android and web could not offer “message my caregiver” in the check-in flow.

## What changed

- **One optional emergency contact** (name + phone) in settings on Android and web. It is stored locally with the rest of the profile and is **never** used automatically: the app only builds a draft when the person taps the button.
- **Validation is shared in spirit on both platforms:** names collapse whitespace and cap at 40 characters; numbers keep a leading `+` only, drop formatting, and need at least 7 digits. Invalid entries are rejected with a concrete message rather than silently saved.
- **The check-in support step now matches iPhone:** when a usable contact exists, **Message {name}** appears first and opens the device’s messaging app on a prefilled draft containing the support message and the room link. The generic **Share a support message** stays available underneath for anyone else.
- **Android restores accept the new fields** with the same bounds (`contactName` ≤ 40, `contactPhone` ≤ 30) and no new permission is needed; `sms:` handoff uses the standard `ACTION_SENDTO` intent.
- **Interface catalog grew 738 → 746 messages** with four translations each for the new settings labels and error text.

## Honest limits (unchanged)

This is not an emergency service, alert system, or delivery confirmation. The draft opens in another app, the person taps Send themselves, and CareSphere cannot know whether it was sent, delivered, read, or answered. CareSphere does not read the contacts list or request contacts permission; the number is typed once and stored locally with the profile. Nothing is uploaded, and no message is composed without an explicit tap.

## Validation

- Web unit: **63** (5 new in `test/emergencyContact.test.js`: formatting cleanup, single leading `+`, name bounds, 7-digit usability, and that the draft link encodes the message without claiming delivery).
- Web browser: the new check-in walkthrough saves a contact, asserts the **Message Sam Lee** link is `sms:5551234567?body=…` with the support text encoded and no “sent/delivered” wording, and that the generic share button remains.
- Android unit: **64** (4 new in `EmergencyContactTest.kt`, same rules).
- Android emulator smoke: sets the contact through the real dialog, asserts the saved row reads `Emergency contact: Sam · 5551234567`, then asserts **Message Sam** appears in the check-in support step, and finally clears it back to `Not set`.
- iPhone: 54 Swift tests, unchanged; its own contact flow already behaves this way.

Exact APK and archive hashes are recorded in `BUILD_VERIFICATION.json` inside each archive by `scripts/package_mobile.py`.
