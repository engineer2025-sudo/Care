# Personal support tools — feature guide

Find **My support tools** on the web/Android Today screen and in the iPhone header. No profile or diagnosis is needed. These are optional accessibility and organization features, not validated treatments or a replacement for existing communication support.

| Requested feature | Implementation and boundary |
| --- | --- |
| Simple Mode | Three navigation destinations; simpler web/iPhone Today content; reversible from support/comfort settings. No permanent loss of access to the full app. |
| Visual routines | User-authored steps, an optional chosen photo, read-step control, Done/Skip, Pause and End. No scores or automatic medication instructions. |
| Communication board | Visible default communication phrases and custom phrases; tap to display, explicitly choose speech, stop/clear. Speech availability depends on installed OS voices/browser support. |
| Personal photo activities | Up to ten resized local photos, conversation view and matching. No face recognition or tests of someone's identity. Photos are encrypted with local care data and included in an explicitly requested backup. |
| Comfort preferences | Simple view, speech-step opt-in and choice limits; web/iPhone motion and contrast controls; Android system font/accessibility settings and appearance. Controls differ by platform; sound does not autoplay. |
| Trusted contacts | Actual user-entered people. Call/message/video handoffs require deliberate action and recipient review. No automatic alerts or fake contacts. |
| Appointment preparation | Questions, Important/Discussed flags, follow-up text and explicit export/share, alongside the existing visit-brief tools. Not an appointment scheduler or clinical portal. |
| Undo/recovery/backup | Undo a routine change; restore recently deleted notes for up to 30 days; optionally create/passphrase-unlock a platform-specific encrypted backup with preview before replacement. Exported backups retain their own historical copies until you delete them. |
| Interest activities | Nature, music and familiar-object conversation packs. Nine extra prompts, with explicit next/skip and no recording of answers; not a clinical activity program. |
| First-use guidance | Optional Start here tool with activity/comfort/routine routes. Existing iPhone onboarding remains. Permissions remain feature-triggered, not prerequisites for trying activities. |
| Apple Intelligence drafting | Native iPhone only, on eligible enabled iOS 26+ hardware: simplify selected wording, propose neutral appointment questions or format the user's everyday steps. Preview/edit and explicitly save as a new note. No diagnosis, medication changes or fabricated model fallback. |
| Cross-device sharing | Backend-free encrypted file snapshots on all three platforms, with selected notes/routines and preview/merge on receipt. Native iPhone/Android apps can connect directly on private Wi-Fi or a hotspot using opt-in nearby-device discovery (with manual address fallback) and an eight-digit code; all platforms retain OS share sheets/saved-file delivery. No built-in phone-to-phone Bluetooth pairing, live sync or remote revocation. See device-sharing.md. |

## Recovery safeguards

- Web backups use AES-256-GCM and a PBKDF2 passphrase key. iPhone/Android use their native authenticated encryption implementations and a passphrase-derived key, separately from the local Keychain/Keystore key.
- Backups are **platform-specific**. Use the interoperable transfer flow for selected records moving between platforms.
- Save a current backup before restoring an older one. Restoration replaces local records. Browser/iPhone medication schedules require fresh confirmation afterward; Android does not implement medication reminders.
- Passphrases are not recoverable. Keep them separately from the file and do not post them in chat.
- A recently deleted note is retained locally until restored, permanently erased or expired; expiration is purged when the relevant app data is refreshed. Previously exported/shared copies are outside CareSphere's control.
- Native personal-photo matching resets when its screen is recreated. Activity practice is not a tracked assessment. Web's library-wide pause stops and unmounts the activity, so Continue starts that activity again; visual-routine pause retains the current step.

## Plaintext exports versus protected files

The older whole-data JSON exports on iPhone/web are unencrypted and can include personal tools, photos and retained deleted notes. They are not the selected-record device transfer. Android's basic text export excludes those support-tool records and is size-limited to avoid Android transaction errors. Prefer encrypted backup for full recovery or encrypted device sharing for selected records.

## Acceptance checks still needed

Use a consenting test partner and non-sensitive records for actual nearby sharing. Test the smallest intended phones, maximum font sizes, VoiceOver/TalkBack, interrupted file pickers and speech, real offline voices, wrong passphrases, cancelled restore, and device storage exhaustion. Confirm the original records remain intact on a rejected import. Do not test by placing emergency calls or acting on medication instructions.

No production medical data should be entrusted to a debuggable Android build. All activity and AI outputs remain optional and unvalidated for clinical benefit.
