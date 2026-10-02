# CareSphere 2.2 and 2.3 development plan

**Status (2026-10-02):** Earlier Mac 2.1.0 artifacts remain archived but are no longer a native product target. Native development and CI are now iOS only; the separate web PWA is preserved. Versions 2.2 and 2.3 are development work only; there is no public iOS App Store, TestFlight, or signed `.ipa` build.

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
- [x] Native private-data controls: migrate the old `Documents/carestore.json` without discarding data; write the new store in Application Support; use iOS Complete File Protection and AES-GCM 256-bit encryption with a Keychain key; offer a user-directed JSON file export; erase care data and pending medication notifications with a clear confirmation.
- [x] Native HealthKit read path requests workouts alongside vitals, lists up to 25 recent workout summaries, and refreshes through observer/background delivery. Garmin workouts are supported through Garmin Connect → Apple Health, not a direct Garmin API; Garmin Connect must complete its Health transfer, and it does not write GPS tracks.
- [x] Local assistant generation now supplies the Qwen2.5 ChatML assistant prefix with its required newline, grows the token-output buffer safely, preserves source results, and exposes stage-specific llama.cpp failures with local-only retry. Validate generation on a real device with the optional model installed before calling the user-reported failure closed.
- [x] Release safety: ordinary development pushes build CI artifacts only. A release now requires an explicit manual workflow dispatch, a version-matching tag, version-specific reviewed notes, and a tag/release that does not already exist. The workflow no longer clobbers the public 2.1.0 release.
- [x] Daily check-ins are local-day scoped in web and native: routine completion and medication self-reports reset at local midnight, old Boolean records migrate safely, and marking a medicine taken no longer cancels its next-day system notification. The native overview refreshes at the next local day boundary.
- [x] Personal routines can be added/removed in both clients (up to 24 in the native editor and web checklist); reminders remain personal checklists, not proof of activity.
- [x] Added an opt-in, foreground-only live Bluetooth HR self-check after sustained readings above 110 BPM; the app asks about movement and does not infer a crisis or contact anyone. Paused/stale BLE samples do not count.
- [x] Added a direct self-reported-stress entry, short paced-breathing flow, after-check, and optional user-initiated caregiver text/Jitsi invitation. Breathing is guided, not measured; message delivery requires the person to tap Send.
- [x] Added a deterministic local safety gate before Health Guide retrieval/model inference and direct assistant generation for a narrow set of possible self-harm/poisoning phrases. Safe responses avoid method, lethality, and symptom details; the gate is not validated crisis detection.
- [x] Web BLE pairing cancellation/failure and unsupported browsers no longer start fabricated heart-rate streams; sample data requires a separate explicit demo action. Disconnect handlers are cleaned up, stale live values clear on disconnect, simulated SpO₂/BP examples are excluded from live-range messaging, and CSV exports escape commas/quotes/newlines.
- [x] UI/performance pass: restore browser pinch-zoom, add Escape-closing and dialog semantics, defer the confetti bundle until first use while respecting reduced motion, stabilize toast callbacks, bound offline asset caching, and display actual note timestamps instead of leaving `Just now` forever.
- [ ] Verify native changes on a signed physical iPhone: compile/run, test HealthKit and Garmin BLE delivery, check-in timing/false positives, accessibility, messaging/video handoff, file migration/export/erase, and data retention. Xcode is unavailable in this workspace, so this remains pending.
- [x] Licensing decision: keep the current local Kiwix server bridge and avoid linking the GPL-3.0 `CoreKiwix` framework or changing CareSphere's licensing. Wikipedia is therefore **not** built into this version; the existing ZIM stays where it is and still requires a separately running local Kiwix server. Revisit only if a compatible alternative or a licensing change is approved.
- [ ] Continue accessibility review on supported devices: add and test modal focus trapping/restoration, screen-reader navigation, larger native Dynamic Type behavior, and high-contrast/reduced-motion details. Escape-to-close is implemented in the web dialogs, but keyboard and assistive-technology testing remains.

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

A working branch, CI artifact, or roadmap entry is **not** a public release. Native release work must target iOS only and follow Apple signing, privacy, and distribution requirements; do not publish a Mac app unless the user explicitly requests that scope. Preserve the existing web app as a separate deliverable.
