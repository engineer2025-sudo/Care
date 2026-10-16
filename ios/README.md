# CareSphere for iPhone — 3.6

Open **CareSphere.xcodeproj** directly. No XcodeGen, remote Swift packages, binary SDKs, or model downloads are needed to build the app. The only package is `ActivityKit/`, included locally.

## New in 3.6.1 (15)

Shared catalog expanded to 641 messages for the new platform controls; native iPhone functionality from 3.6.0 is retained. See the current validation report.


Authentication now fails closed when system verification is unavailable; contexts are invalidated on background/disappearance and stale results cannot unlock. Returning from the authentication sheet itself does not automatically re-prompt after cancellation. Medication notification text no longer reveals names/doses, and late scheduling callbacks are ignored. Native sharing displays a connection QR and can read it from a chosen photo; it never includes the passphrase. Live-camera scanning and authenticated import receipts are still missing.

[Full platform checklist](../docs/feature-checklist.md) · [Current validation](../docs/release-lock-2026-10-14.md)

Offline core-interface localization in English, Spanish, Simplified Chinese, Filipino/Tagalog and Vietnamese, with a persistent App language selector. Untranslated advanced content falls back to English; private records are unchanged. [Coverage and review limits](../docs/languages.md).

Personal support tools in the header: Simple Mode, visual routines, communication cards and installed-voice speech, personal photos/conversation/matching, trusted contacts, comfort settings, appointment questions/follow-ups, routine undo, retained-note recovery, encrypted backup/restore, interest prompts and optional Apple Intelligence drafting with human review.

**Device sharing needs no backend.** Select notes/routines, create an encrypted `.caretransfer` file, and send it through AirDrop/the share sheet or Files. Preview/select before importing on another CareSphere device. Existing records are not overwritten. No live synchronization or remote revocation is claimed. [Sharing guide](../docs/device-sharing.md) · [tools and limitations](../docs/personal-tools.md).

CI now runs 47 Swift tests, including Web Crypto-to-Swift transfer decryption, tamper/wrong-passphrase checks and UTF-8 payload limits. Physical AirDrop and Apple Intelligence still need hardware validation.

## Previously added in 3.1.0 (8)

- Save favorites privately and filter the 11-activity library.
- Search, edit and confirm deletion of care notes. Edits retain the original date, show an updated date and refresh the on-device text sentiment label; this label is not a clinical assessment.
- Unsaved note edits require an explicit discard decision. Notes are capped at 4,000 characters.
- Existing encrypted records remain readable; the new fields are optional during migration.
- 25 Swift activity/preference/packet tests pass in CI, alongside unsigned device/HealthKit builds and Simulator launch.

## Start without signing

1. Open in Xcode 26+ (recommended; required to compile Apple Intelligence).
2. Select **CareSphere** and an installed **iPhone Simulator**.
3. Press Run. No Apple account or keychain signing access is needed for this path.

The baseline app also builds with Xcode 16+, with Apple Intelligence excluded. iOS 16+ is the deployment target.

## Install on your iPhone

Select **CareSphere**, your connected iPhone, and your own team under **Signing & Capabilities → Automatically manage signing**. Use a unique bundle ID if required. Press Run. Your Xcode version must support your phone's OS; enable Developer Mode and trust the Mac when prompted.

The standard scheme **does not request HealthKit entitlements**. Activities, routines, notes, reminders, Apple speech and real BLE heart-rate pairing work without HealthKit. Apple's Personal Team/device provisioning limits still apply; signing cannot be solved by changing application code alone.

For **read-only Apple Health**: select **CareSphere-HealthKit**, with an eligible development team/profile. This explicitly enables HealthKit via the `Debug-HealthKit` configuration. No background HealthKit delivery entitlement is requested. Standard Release builds omit HealthKit; a distribution build with HealthKit needs its own eligible profile and equivalent configuration. Missing readings remain blank, and history is labeled with its date and source, not as live data.

See [signing and keychain troubleshooting](../docs/signing-troubleshooting.md).

## Apple Intelligence

**Health → Health Guide** checks `SystemLanguageModel.default.availability` and uses Apple's **Foundation Models** framework. Requires a build made with Xcode 26+, iOS 26+, an Apple Intelligence-compatible device, Apple Intelligence enabled, and Apple's model ready in a supported language/region. Otherwise an explicit unavailable message appears; references and activities remain usable. Simulator compilation does not demonstrate actual model availability on a phone.

Only the entered question and matching educational reference excerpts are used. No care records or sensor data are passed automatically. Summaries are optional, cancelable, potentially inaccurate, and not diagnosis, treatment, triage, or dosing advice. No model answer is fabricated when generation fails. A narrow phrase-based safety gate is not a validated or complete crisis detector.

## What's changed from 2.3

- Removed remote Jitsi/Giphy, llama.cpp, Sherpa-ONNX, ZIPFoundation packages from the build.
- Replaced Qwen downloads with Apple's optional on-device model; speech uses installed Apple voices.
- Video is an explicit browser handoff to Jitsi, not an embedded SDK. The provider may require sign-in; CareSphere does not host/moderate rooms.
- Added Simulator support and separate optional HealthKit configuration.
- Fresh profiles, routines, notes, medication lists and mood histories start empty. Existing saved user data is preserved, not automatically erased.
- Heart rate comes only from real Bluetooth notifications or explicitly enabled Apple Health history. Invalid/no-contact packets and expired readings are not displayed.
- Retained eleven accessible, optional, unscored activities, five navigation tabs, local care notes/routines, user-confirmed medication reminders, explicit SOS sharing, reduced motion, and encrypted local storage.

Activities are for optional practice/enjoyment, not clinically validated dementia/autism treatments or group cognitive stimulation therapy.

## Tests and verification

```bash
./scripts/preflight.sh
# Or the portable Swift package tests alone:
swift test --package-path ActivityKit
```

CI builds standard iPhone, optional HealthKit, and Simulator targets with Xcode 26; it launches the Simulator and runs activity/packet tests. These do not validate signing on your Mac, real Bluetooth hardware, Apple Intelligence responses, or physical-device accessibility. Follow the [device checklist](../docs/ios-device-test-plan.md).

`project.yml` is for maintainers. Regenerating is optional, not an installation step. Keep all included folders beside the Xcode project.

## Optional references

Built-in general references work offline. MedlinePlus data downloads only on request. Kiwix requires a separately running server on your trusted private network; no ZIM is bundled. In Health Guide enter its private address and content name. Never port-forward that server. No archive or question is sent to a cloud AI.

## Direct local phone connection

The native iPhone/Android apps now include **Offer to a nearby device** and a receive connection form. Join the same private Wi-Fi or hotspot, enter the sender's address and eight-digit code inside CareSphere, then unlock with the separate encryption passphrase and preview/select copies to import. Supports either phone as sender without a hosted backend or internet relay. Offers stop on leaving/backgrounding, after five minutes, or explicitly with Stop. Choose **Find nearby devices**, select the generic offer label shown on the sender, then enter its code and encryption passphrase. Discovery is opt-in, limited to one minute, and is not Bluetooth pairing or identity verification. Manual address/code entry remains available. Web retains encrypted-file sharing. See [the sharing guide](../docs/device-sharing.md) for limits and physical-device checks.

## Five-language interface preview

Settings → App language supports English, Spanish, Simplified Chinese, Filipino/Tagalog and Vietnamese, plus automatic device-language selection. Core interface text is localized offline; some advanced text remains English. Private user content is not translated. Speech requires a matching installed local voice. See [scope, setup and review limitations](../docs/languages.md).
