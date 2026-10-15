# Security and Android feature follow-up — October 14, 2026

Versions: **iPhone 3.6.0 (14), Android 1.6.0 (8), web 1.4.0**.

## Implemented in this batch

- iPhone authentication failure/unavailability stays locked; cancel/background/disappearance invalidates its context; late results are ignored. Returning from a cancelled system prompt does not automatically loop into another prompt. Corrected misleading passcode-fallback claims.
- Medication notifications on all three platforms use generic text rather than disclosing medication names/doses. iPhone scheduling rejects obsolete asynchronous callbacks after schedule changes. Browser clock parsing is strict, and a stale taken action cannot undo an already recorded check-in. Browser schedule edits keep the entry identity and require renewed confirmation.
- Android medication reminders: add/edit/remove, confirmed name/time, optional instructions, today's taken/undo check-in, explicit notification permission/confirmation, pause, inexact local alarms, boot/timezone/time-change rescheduling. Recovery pauses reminders. These are not dose verification or guaranteed-time delivery.
- Android read-only Health Connect history (heart rate, oxygen, blood pressure), explicit foreground reads/permissions, source/time labels, bounded recent history, no generated fallback and no automatic persistence/AI submission. Manual BP/oxygen records are separately labeled and encrypted locally.
- Native connection-QR display and decoding from a chosen photo, strict portable setup validation, separate passphrase. No live-camera QR scanner. Android distinguishes transport failure from encrypted-copy unlock failure. No receipt is inferred from sending bytes.
- Android failed-save rollback and corrupt-store protection; transfer imports preserve existing reminder confirmation, while full recovery deliberately resets it.
- Android Visit summary is a selected-text, editable **non-AI template**, saved explicitly as a new note. Web/iPhone retain their structured visit-prep tools. No fake Apple Intelligence implementation.
- Owner-supplied release-keystore configuration, with non-debuggable release variant and no bundled owner secrets. **The downloadable APK remains a debug-signed test build.**
- 36 new shared localized messages: **624 total**, four translations plus English. Advanced content remains partially English; professional review is outstanding.
- Added the [complete feature/status inventory](feature-checklist.md), [Samsung installation guide](samsung-install.md), and [owner signing guide](android-release-signing.md).

## Validation status

**All final validation runs passed.** Native executable sources were tested at `3590b7a0d3959a6644ef346db9cc5d4f731e6823`; web executable sources were tested at `0d2699aa0951f53232aa8ebde59fb96f8f63a545`. Documentation-only updates do not change those executable sources. Fresh packaging verifies the source comparison against each successful run, the APK Git blob/SHA-256, archive CRCs and every packaged file hash. Older downloads do not contain these fixes.

- Final iPhone run: https://github.com/engineer2025-sudo/Care/actions/runs/38665929837 — **passed**: 47 Swift tests, unsigned standard/HealthKit device builds, Simulator build/install/launch.
- Final Android run: https://github.com/engineer2025-sudo/Care/actions/runs/38665929856 — **passed**: 38 JVM tests, lint/build/signature checks, full emulator/UI and instrumentation checks. The emulator exercised medication entry/taken/paused state, manually entered BP source labeling, real notification posting with generic text, QR PNG decoding, failed-write rollback, corrupt-store protection and reminder pause on recovery, alongside all prior language/file/LAN/discovery flows.
- Final web run: https://github.com/engineer2025-sudo/Care/actions/runs/38666243603 — passed: 41 unit tests, 31 browser tests, one offline production check, build and dependency audit.
- Local: 41 unit tests, all 31 browser tests after the final edit, one offline check, production build, catalog/project checks and audit (zero known vulnerabilities).

The first Android attempts exposed the Health Connect stable dependency's required SDK/Gradle upgrade and an AndroidX permission callback signature mismatch. Both were corrected rather than suppressing compiler failures. Earlier runs are not the final artifact source.

## Mandatory acceptance still open

Compilation/emulators cannot establish physical-device behavior. Use harmless test records for:

1. Actual Samsung install/update without data loss, denied/revoked notification permission, battery-saver/sleeping-app/force-stop behavior, midnight, DST/timezone changes and reboot. Verify reminders remain paused after backup recovery.
2. Actual Health Connect provider availability and permission revocation; known real records show the correct source/time and are not presented as live.
3. Real BLE monitor pairing/disconnection, contact-invalid packets and stale-value expiry on each intended device/browser.
4. Every native sharing pairing in both directions, private router/hotspot isolation, QR/photo/manual fallbacks, wrong code/passphrase, expiry, interruption and explicit receiver import.
5. Physical iPhone unavailable/cancelled/failed authentication, backgrounding during the prompt, passcode changes/lockout, app-switcher privacy, notification actions and actual Apple Intelligence availability.
6. Storage exhaustion/interrupted restore on all platforms, migration from existing installations and owner-signed Android updates. The Android emulator rollback test is not an exhaustive storage-failure campaign.
7. Fluent-speaker safety review in all five languages; installed voices; VoiceOver/TalkBack, switch access, smallest devices/largest text and intended-user/caregiver sessions.
8. Owner-controlled signing, privacy/support policy, store/Health Connect declarations and independent clinical/security review. No clinical effectiveness or medical-device validation is claimed.

## Not completed in this batch

See the checklist's explicit No/Limited cells: authenticated import receipts; full-fidelity richer portable data; Android app-specific lock, snooze and several iPhone-only features; iPhone/web manual-vital parity; complete translations; physical-device/user testing; and store/TestFlight/owner-signed distribution.

## Download verification

The CI-built Android APK is 4,662,558 bytes. SHA-256:

`c39df02876a1e7bdc36fbb24d5475b089d2d0e7d816eebe70cd4d5392f3ca2d0`

The APK is signature-verified but **debug-signed and debuggable**. Mobile/Web ZIP hashes are distributed in adjacent `.sha256` files; each ZIP also has a `BUILD_VERIFICATION.json` with the CI runs and per-file hashes. Do not confuse signature verification with owner-controlled production signing or clinical validation.
