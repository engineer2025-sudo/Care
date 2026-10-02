# CareSphere 2.2 and 2.3 development plan

**Status (2026-09-27):** CareSphere for Mac 2.1.0 is the latest public release. Versions 2.2 and 2.3 are development work only; neither has been built as a release candidate or published. The 2.1.0 download remains unchanged.

## Product direction from a current competitor review

CareSphere should complement—not claim to replace—official health records, a pharmacy, or a clinician:

- **Medisafe** markets medication schedules and reminders, caregiver notifications, progress reports, measurements, and drug-interaction alerts ([official app page](https://medisafe.com/download-the-app)). CareSphere can improve its locally configured reminders and handoff tools, but must not imitate interaction checking without a validated, licensed medication knowledge base and a clinical safety review.
- **Apple Health** offers user-controlled sharing of selected health categories with trusted people and providers ([Apple Health privacy details](https://www.apple.com/legal/privacy/data/en/health-app/)). CareSphere should keep data sharing explicit and source-labeled, and use HealthKit with the user's permission rather than imply that CareSphere itself is a clinical record.
- **MyChart** lets patients view, download, and share visit summaries and records supplied by participating health systems ([MyChart features](https://www.mychart.org/l/en-us/explore/)). CareSphere has no health-system connection and must not label user-entered material as an official visit record.
- **CaringBridge** focuses on private health updates and family support ([CaringBridge](https://www.caringbridge.org/)). CareSphere's current Care Circle has no account, host, family-sync backend, or delivery confirmation; keep that limitation visible unless a properly secured service is built.

**Differentiation:** a privacy-first, accessibility-focused companion for older adults and autistic users, with optional on-device AI/references, real source-labeled BLE/HealthKit observations, offline use, and careful user-controlled exports. Never fabricate clinical readings or imply that simulated values are measured.

## Version 2.2 — Privacy, security and everyday polish

**In progress; the source targets 2.2.0, but no public release tag or installer exists.**

- [x] Web Privacy & Data panel: disclose that browser `localStorage` is not encrypted by CareSphere; download a JSON export; confirm erasure of saved entries; reset other open CareSphere tabs too. Restored records are restricted to known fields and validated/bounded before rendering.
- [x] Native private-data controls: migrate the old `Documents/carestore.json` without discarding data; write the new store in Application Support; use iOS Complete File Protection and restrictive macOS directory/file permissions; offer a user-directed JSON file export; erase care data and pending medication notifications with a clear confirmation.
- [x] Native HealthKit read path requests workouts alongside vitals, lists up to 25 recent workout summaries, and refreshes through observer/background delivery. Garmin workouts are supported through Garmin Connect → Apple Health, not a direct Garmin API; Garmin Connect must complete its Health transfer, and it does not write GPS tracks.
- [x] Local assistant generation now supplies the Qwen2.5 ChatML assistant prefix with its required newline, grows the token-output buffer safely, preserves source results, and exposes stage-specific llama.cpp failures with local-only retry. Validate generation on a real device with the optional model installed before calling the user-reported failure closed.
- [x] Release safety: ordinary development pushes build CI artifacts only. A release now requires an explicit manual workflow dispatch, a version-matching tag, version-specific reviewed notes, and a tag/release that does not already exist. The workflow no longer clobbers the public 2.1.0 release.
- [ ] Verify the native changes in actual iOS-device and Mac builds, test HealthKit/Garmin delivery on a signed physical iPhone, test file migration/export/erase on physical Apple devices and supported browsers, and complete a data-retention review.
- [ ] Make Wikipedia truly in-app by opening the user's existing ZIM file in place, without bundling the 6.9 GB archive or requiring `kiwix-serve`. The official Apple Kiwix integration uses GPL-3.0 `CoreKiwix`; decide CareSphere's redistribution/source-notice obligations before linking it. Until then, the current feature still requires a separately running local Kiwix server.
- [ ] Continue the accessibility/UI pass: larger touch targets, clearer care-state hierarchy, readable empty states, and consistent high-contrast/reduced-motion behavior.

**Security boundary:** biometrics are a screen lock, not a separately derived encryption key. The web app's localStorage is not encrypted; users should secure their device/browser profile. Downloaded exports are outside app protections. Clearing CareSphere care data does not revoke OS permissions or delete separately downloaded AI/reference files.

## Version 2.3 — User-controlled visit preparation and trends

**Web and native prototypes are started; broader verification and release work remain.**

- [x] Web prototype: a local visit-prep preview lets the user choose whether to include name, medication reminders, mood self-reports, notes, live BLE samples, and simulated demonstrations. It shows the exact plain-text file before download; simulation is opt-in and remains labeled `SIMULATED`.
- [x] Native SwiftUI prototype: choose name, reminders, moods, notes and personal questions; filter notes/moods by 7/30/90 days or all; inspect the exact preview; share only after an explicit system-share-sheet action. It does not yet include HealthKit readings or vitals.
- [ ] Add carefully permissioned HealthKit/BLE observations with date filters and true source labels; exclude simulated values by default and keep all selected fields reviewable before sharing.
- [ ] Keep user-entered medicines clearly distinct from verified pharmacy records; include whether a schedule was reviewed, and never turn adherence self-reports into verified doses.
- [ ] Add meaningful, non-diagnostic trends only for sufficient real observations. Do not chart simulated values as health outcomes; disclose missing data and source changes.
- [ ] Add focused tests for date filtering, redaction, source labeling, accessibility, and export contents. Verify that generating or previewing a brief makes no network request.

No cloud sync, clinician portal, FHIR integration, or medication-interaction checker is promised by this roadmap. Those require separate security, privacy, licensing, clinical-safety, and interoperability work before implementation.

## Release policy

A working branch, CI artifact, or roadmap entry is **not** a public release. Do not create `mac-v2.2.0` or `mac-v2.3.0` until that version's code has been tested, its release notes reviewed, and its installers/checksums verified. Versioned GitHub releases are immutable in the automated workflow; development builds must never replace 2.1.0 assets.
