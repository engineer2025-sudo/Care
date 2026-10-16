# CareSphere — complete user-facing feature/status checklist

Scope: iPhone **3.7.0 (16)**, Android **1.8.0 (10)**, web **1.5.0**. This is an inventory, **not a claim of complete parity or production readiness**. Each separate activity and major action is listed below. “Yes” means implemented; it does not mean physically validated on your Samsung/iPhone. See the release validation report for automated evidence.

**Legend:** Yes = implemented; Limited = only the stated subset/equivalent; No = not implemented on that platform; Optional = needs hardware, permissions, configuration or an external service. Nothing marked No is replaced with fake data or a pretend button.

## 1. Starting, navigation and daily care

| Feature | iPhone | Android / Samsung | Web |
|---|---|---|---|
| Empty-by-default personal records; no sample patients, contacts, medications or vital signs | Yes | Yes | Yes |
| Use activities without creating an account/profile | Yes | Yes | Yes |
| Local optional display name | Yes | Yes | Yes |
| Expanded profile and emergency-contact settings | Yes | Limited: name and support-tool contacts | Limited: name and support-tool contacts |
| First-use guidance | Onboarding + Start here | Start here | Start here |
| Today dashboard and shortcuts | Yes | Yes | Yes |
| Daily routine: add, edit, remove | Yes | Yes | Yes |
| Routine done/not-done check-in with local-day reset | Yes | Yes | Yes |
| Undo last routine change | Yes | Yes | Yes |
| Optional mood self-report | Yes | Yes | Yes |
| Mood history / visit-brief inclusion | Yes | Limited: today's mood | Yes |
| Medication names and daily reminder times | Yes | Yes: 24-hour time; up to 24 entries | Yes |
| Edit/remove medication reminder entries | Yes | Yes | Yes |
| Explicit schedule confirmation before reminders | Yes | Yes | Yes |
| Pause reminders after schedule edits / backup recovery | Yes | Yes | Yes |
| Mark taken / undo self-report | Yes | Yes | Yes |
| OS medication notifications while app is closed | Optional: iOS scheduling/permissions | Optional: inexact Android alarms/permissions; Samsung can delay them | **No:** page must remain open; browser timers can be suspended |
| Snooze ten minutes | Yes | Yes: same-day in-app review reminder; cancel/pending time | Yes, while page remains active |
| Notification “taken” action | Authenticated iOS action | No: open app to review/check in | In-app reminder action |
| Private generic notification text | Yes: no drug name/dose in notification | Yes: no drug name/dose in notification | Yes: no drug name/dose in OS notification |
| Step counting | Optional: iPhone motion permission | No | No |
| Local scheduled appointment calendar / clinician booking | No | No | No |

Reminder confirmations are user review, not prescription verification. A taken check-in is not proof of ingestion. Do not depend on this app for time-critical medication delivery.

## 2. All eleven library activities

All eleven below exist on **iPhone, Android and web**. They are optional leisure/practice activities, not validated dementia/autism treatments or cognitive assessments.

1. **Picture pairs** — reveal cards and match pictures; supportive reveal/hint controls.
2. **Sort together** — explore familiar object categories.
3. **Complete the pattern** — choose the next item in a visible pattern.
4. **Find the same** — match a visible picture/symbol without a time limit.
5. **Everyday order** — arrange a short example sequence; not personal-care instructions.
6. **Conversation cards** — preference, present-day, memory or imagined-story prompts; skip allowed.
7. **Feelings explorer** — feeling words and conversation, not a test of reading faces.
8. **Picture story** — move forward/back through a short illustrated sequence.
9. **Remember a pattern** — adjustable short pattern practice; not a measure of cognitive decline.
10. **Soundscapes** — opt-in sound with stop/volume controls; no autoplay.
11. **Paced breathing** — optional pacing, pause/exit; stop if uncomfortable.

| Library action | iPhone | Android | Web |
|---|---|---|---|
| Search, category filters, private favorites | Yes | Yes | Yes |
| Clear empty-search/favorites states | Yes | Yes | Yes |
| One chosen activity at a time, explicit exit | Yes | Yes | Yes |
| Hints / reveal / next / retry where appropriate | Yes | Yes | Yes |
| Background sound stop | Yes | Yes | Yes, with browser lifecycle limits |
| Pause/continue retains every game state | Limited: depends on screen | Limited: depends on screen | Limited: library pause unmounts/restarts game; visual routines retain step |
| Research rationale and limitations | In-app references + docs | Docs and activity descriptions | In-app descriptions + docs |
| Clinical efficacy / diagnostic scoring / outcome monitoring | No | No | No |

## 3. Personal support tools (the original twelve requested improvements)

| Feature and actions | iPhone | Android | Web |
|---|---|---|---|
| Simple Mode: three destinations, reversible | Yes | Yes | Yes |
| Bare minimum mode: hides explanatory/how-to copy; status, empty states and safety warnings stay | Yes: Comfort + Settings | Yes: Settings · Appearance | Yes: Settings + comfort tools |
| Visual routines: user title, steps, optional chosen photo | Yes | Yes | Yes |
| Visual routines: read step, done, skip, pause, continue, end | Yes | Yes | Yes |
| Communication board: built-in and custom phrases | Yes | Yes | Yes |
| Communication: display first, explicitly speak, stop/clear | Optional installed local voice | Optional installed local voice | Optional matching local browser/OS voice |
| Photo import: resize and store locally, caption, remove | Yes; up to 10 | Yes; up to 10 | Yes; up to 10 |
| Personal-photo conversation view / next photo | Yes | Yes | Yes |
| Personal-photo matching / reveal / clear mismatch / restart | Yes | Yes | Yes |
| Facial recognition / identity quizzes | No, deliberately | No, deliberately | No, deliberately |
| Comfort: simple view, speech-step opt-in, choice limits | Yes | Yes | Yes |
| Trusted contacts: add/edit/remove real contacts | Yes | Yes | Yes |
| Deliberate call/message/video handoff and recipient review | Optional external apps | Optional external apps | Optional browser/OS support |
| Appointment questions: add/delete, Important, Discussed, follow-up | Yes | Yes | Yes |
| Review/share appointment questions | Yes | Yes | Yes |
| Visit preparation: choose content, preview before sharing | Yes: name/meds/moods/notes/questions | Limited: selected notes/questions → editable new note → existing note sharing | Yes: name/meds/moods/notes/questions/session BLE samples |
| Offline non-AI alternative for organizing a visit | Existing structured visit brief | **Visit summary:** deterministic selected-text template; no invented advice | Existing structured visit brief |
| Recently deleted notes: restore or erase; 30-day retention | Yes | Yes | Yes |
| Encrypted backup: create, unlock, preview, confirm replacement | Yes, iPhone format | Yes, Android format | Yes, web format |
| Backup passphrase recovery | No | No | No |
| Cross-platform full-backup restore | No; use selected-record transfers | No | No |
| Interest prompts: Nature, Music, Familiar objects (three each) | Yes | Yes | Yes |
| Optional first-use routes to activities, comfort, routines | Yes | Yes | Yes |
| AI: simplify selected wording, propose questions, format everyday steps | Optional Apple Intelligence; preview/edit, explicit save as new note | No generative AI; structured draft alternative above | No generative AI; structured brief alternative above |
| Cross-device copies | Yes; detailed below | Yes; detailed below | Yes; files only |

The Android template is **not an AI model** and does not paraphrase or generate medical answers. Apple's Foundation Models cannot be installed on Samsung or into the browser.

## 4. Care notes, connection and exports

| Feature | iPhone | Android | Web |
|---|---|---|---|
| Create/search/edit notes; preserve creation date, mark edit | Yes | Yes | Yes |
| Confirm discard/delete/share | Yes | Yes; native dialog cancel before saving | Yes |
| Local note sentiment label | Yes; not a clinical measure | No | No |
| Share a selected note | Yes | Yes | Yes |
| Whole-data export | Yes: plaintext JSON, sensitive | Limited: bounded plaintext basic text export | Yes: plaintext JSON, sensitive |
| Full encrypted recovery export | Yes | Yes | Yes |
| Live BLE session CSV export | No dedicated CSV equivalent | No | Yes, source-labeled real samples only |
| Create/share a real video-room invitation | Yes | Yes | Yes |
| Video conversation | External provider/browser handoff | External provider/browser handoff | Embed or external provider/browser |
| Hosted caregiver account, clinician portal, room moderation, attendance | No | No | No |
| Automatic caregiver messaging / proof of delivery or read | No | No | No |

Exports and messages outside the app lose its local-storage protections. External video/messaging providers have their own terms and may require internet or accounts. CareSphere itself requires no hosted backend.

## 5. Real health readings, references and safety tools

| Feature | iPhone | Android / Samsung | Web |
|---|---|---|---|
| Standard BLE Heart Rate service scan, choose, pair, disconnect | Optional real monitor | Optional real monitor | Optional compatible browser; not iPhone Safari |
| Feature-triggered Bluetooth permissions; cancel/timeouts | Yes | Yes | Browser-controlled |
| Reject invalid/no-contact packets; clear stale reading after 15 seconds | Yes | Yes | Yes |
| Source/time labeling; no simulated values / camera pulse estimates | Yes | Yes | Yes |
| Live heart-rate sparkline | Yes | Limited: numeric current reading | Yes |
| Read-only health history | Optional HealthKit scheme/profile | **Health Connect**, foreground explicit read | No browser equivalent |
| Historical heart rate, oxygen and blood pressure | Optional Apple Health records | Optional Health Connect; last 7 days, up to 100 records/type; latest sample per heart-rate record | No |
| Health history saved automatically into care records or sent to AI | No | No | No |
| Missing/denied permissions remain empty, not “normal” | Yes | Yes | Yes |
| Manual BP / oxygen entry with source and date | No | Yes: records taken now; up to 100; remove | No |
| Read workout summaries | Optional Apple Health | No | No |
| Direct Garmin / Samsung Health account sync | No | No; another app must first write to Health Connect | No |
| Garmin/watch BLE broadcast compatibility | Optional if that model broadcasts standard BLE HR | Same | Same, browser permitting |
| Built-in health reference search | Yes | No dedicated reference library | No dedicated reference library |
| Optional MedlinePlus download / private-network Kiwix lookup | Yes; explicit configuration/action | No | No |
| On-device educational answer from actual Apple Intelligence | Optional eligible enabled iOS 26+ hardware | No | No |
| AI model unavailable state, cancellation and no fabricated fallback | Yes | No model used | No model used |
| “I'm stressed” guided support flow | Yes | Limited: breathing + contacts separately | Limited: breathing + contacts separately |
| Opt-in sustained live-HR check-in flow | Yes; off by default, not diagnosis | No | No |
| Phrase-based safety interruption before Health Guide AI | Yes; incomplete, not validated crisis detection | No Health Guide AI | No Health Guide AI |
| SOS emergency action | Yes | Limited: use phone emergency calling / trusted contacts | Yes, browser/phone handoff |
| Optional location in reviewed help message | Yes, permission-based | No dedicated equivalent | No dedicated equivalent |
| Diagnosis, triage, medical-device accuracy certification | No | No | No |

Manual entries are never passed off as sensor measurements. Apple Health/Health Connect history is not a live reading. Hardware/platform differences remain visible rather than being concealed with mock information.

## 6. Backend-free sharing — every stage and limitation

| Feature | iPhone | Android | Web |
|---|---|---|---|
| Select outgoing records; preview before preparing encrypted copy | Yes | Yes | Yes |
| Portable content | **Note bodies and daily-routine titles only** | Same | Same |
| Passphrase-protected AES-256-GCM transfer; PBKDF2 derivation | Yes | Yes | Yes |
| Transfer file through OS sharing / saved file | Yes | Yes | Yes; browser-dependent share-sheet support |
| Open file, decrypt, preview, selectively import copies | Yes | Yes | Yes |
| Duplicate markers; capacity validation; no automatic overwrite | Yes | Yes | Yes |
| Direct private Wi-Fi/hotspot send and receive | Yes | Yes | No native TCP access; encrypted file fallback |
| Native iPhone↔iPhone, Android↔Android, iPhone↔Android protocol | Implemented; **physical pairings still unverified** | Same | Not applicable |
| Nearby Bonjour/NSD discovery, generic offer labels, Stop | Yes | Yes | No; file fallback |
| Manual private IPv4 address + eight-digit code fallback | Yes | Yes | No; file fallback |
| Display connection QR | Yes | Yes | Not needed for file transport |
| Read connection QR from chosen photo | Yes | Yes | No |
| Built-in live-camera QR scanner | **No:** current implementation reads photos | **No:** current implementation reads photos | No |
| QR privacy and validation | Address/code only; rejects public/DNS/extra-field destinations | Same | Not applicable |
| Separate encryption passphrase remains required | Yes | Yes | Yes |
| Offer expires in five minutes; stops when leaving/backgrounding | Yes | Yes | No server offer |
| Visible prepared/offered/received-unlocked/imported stages | Yes | Yes | File preparation/unlock/import stages |
| Import receipt created only after real import (passphrase-authenticated HMAC) | Yes: save/share/copy | Yes: save/share | Yes: save/copy |
| Verify returned receipt with passphrase; optional transfer-file binding (hash + record IDs) | Yes | Yes | Yes |
| Receipt as identity verification or delivery/read proof | **No: deliberately not — passphrase-authenticated record only** | Same | Same |
| Sender gets authenticated proof that recipient imported | **No** | **No** | **No** |
| Complete visual plans, photos, contacts, meds or health records in portable transfer | **No** | **No** | **No** |
| Automatic sync, conflict resolution, remote revocation | No | No | No |
| Built-in phone-to-phone Bluetooth transport | No; local Wi-Fi/files instead | No; local Wi-Fi/files instead | No |

The connection code, QR and discovery label are not verified identities. Opening or downloading a file is **not** evidence of importing it. Ask the receiver to confirm the actual saved records in the receiving app. Never include the passphrase in a publicly shared QR/screenshot.

## 7. Security, languages, accessibility and distribution

| Feature | iPhone | Android | Web |
|---|---|---|---|
| Encrypted local care data | AES-GCM / Keychain | AES-GCM / Keystore / AtomicFile | AES-GCM / IndexedDB non-extractable key |
| Visible save/read errors; no silent replacement of corrupt store | Yes | Yes; failed-save rollback now tested in emulator | Yes; browser storage limits apply |
| Optional app authentication lock | **Yes: fails closed; stale/background result invalidation** | **Optional Android 11+:** strong biometric/device credential; background relock, screenshot block; older Android uses device lock only | **No app-specific lock:** protect device/browser profile |
| Authentication unavailable does not unlock | Yes | Yes: enabled lock stays closed | Not an app feature |
| Android automatic OS backup disabled | Not applicable | Yes | Not applicable |
| Explicit local erase | Yes | Yes | Yes |
| Offline after installation | Core local features | Core local features | After completed first HTTPS/PWA load |
| Five-language core UI; saved selector; device-language choice | Yes | Yes | Yes |
| English / Spanish / Simplified Chinese / Filipino-Tagalog / Vietnamese | Yes | Yes | Yes |
| 641 shared messages with English fallback | Yes | Yes | Yes |
| Translate personal records automatically | No, deliberately | No, deliberately | No, deliberately |
| All advanced UI/errors/exports fully translated and professionally reviewed | **No** | **No** | **No** |
| Matching installed-local speech, no forced English/network fallback | Optional matching OS voice | Optional matching OS voice | Optional matching browser voice |
| System font scaling / large text | Yes | Yes | In-app sizes + browser zoom |
| Light/dark/system appearance | Yes | Yes | Yes |
| In-app contrast and reduced-motion controls | Yes | Limited: system accessibility and activity comfort controls | Yes |
| Screen-reader labels and accessible controls | Implemented; physical VoiceOver review pending | Implemented; physical TalkBack review pending | Implemented; automated keyboard/dialog checks; human review pending |
| User/caregiver/switch-control usability review | Outstanding | Outstanding | Outstanding |
| Installable supplied build | Xcode source ZIP; not signed IPA | Debug-signed test APK | Static website/PWA package |
| Owner release-signing configuration | Xcode team/profile | Environment-supplied keystore config added | HTTPS hosting owner |
| Stable owner-signed Android production build / update channel | Not applicable | **Not delivered** | Not applicable |
| App Store / TestFlight / Play Store release | **Not delivered** | **Not delivered** | Not applicable |

## Still open — do not mistake this batch for completion

- Identity-bound import receipts (current receipts are passphrase-authenticated, not identity-verified) and full-fidelity broader portable record sharing.
- Android extended mood/step/workout/reference/SOS equivalents; iPhone/web manual-vital parity.
- Complete advanced translations and fluent-speaker safety review; no blanket accessibility conformance claim.
- Real Samsung notification timing/battery behavior, Health Connect grants/revocation, real BLE hardware, and all three native sharing pairings in both directions.
- Physical iPhone authentication failure/cancellation/background tests, Apple Intelligence hardware responses, VoiceOver/TalkBack/switch-access and intended-user sessions.
- Owner-controlled signing, backup/update migration acceptance, store/privacy/support release procedures and clinical safety review.

### App-lock behavior on Samsung

The Android lock is a screen-access gate, **not a biometric-bound Keystore key** and not protection against a compromised/debuggable device. Set a secure device screen lock first. Turning it on/off uses Android authentication; it does not ask you to type a PIN into a CareSphere form. A session is not saved across process death. External pause (including Home or another app) invalidates the session immediately, even if Android delays onStop. Deliberate navigation between CareSphere screens preserves the session. Multiwindow/partially visible sessions need physical-device review. Private dialogs close on leaving; unfinished dialog drafts may be discarded. Returning from a system file picker may require unlocking before its result is processed; activity/process recreation can require choosing the file again. Screenshots are intentionally blocked while enabled, including QR screenshots; another phone can photograph the displayed QR or use manual connection details.

Those are genuine remaining tasks, not completed features. Build/emulator/browser checks cannot replace these checks. Use non-sensitive test records in the supplied development build.
