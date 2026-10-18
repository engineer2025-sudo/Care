# Manual vital parity and bare-minimum completion — October 16, 2026

Versions: **Android 1.8.0 (10), iPhone 3.7.0 (16), web 1.5.0** (unchanged numbers; this is the second delivery of this version set). Packaging uses the matching-source CI runs below.

## Changes

- **Manual BP / oxygen entry now on every platform.** Android's manually entered records were already present; iPhone and web gained the same feature with the same rules: blood pressure first 1–400 / second 1–300 / first ≥ second, oxygen 1–100 as a single value, up to 100 saved records, each labeled **Manually entered** with the entry time, removable behind a confirm. Rows read `120/80 mmHg` and `97% SpO₂` identically on all three platforms. An out-of-bounds value shows "Check the units and values. This is not a medical interpretation." — never a reference-range verdict. Records live in each device's local storage only (web export includes them; the transfer/record-selection format is unchanged).
- **Shared bounds rules and tests.** `VitalRules` (Android), `VitalRules.swift` (iPhone) and `vitalRules.js` (web) implement the same input-format bounds — deliberately not reference ranges, not advice. Each platform has bounds tests (iPhone +3 → 54; web +5 → 50; Android already covered).
- **Bare minimum mode completion.** The last explanatory hints (care notes, activity library, sharing, support hub, iOS activity/games/personal-support screens) are now hidden with the rest when the mode is on. Status messages, empty states, safety warnings and emergency lines remain.
- **Comment cleanup.** Narration comments ("this line does this") were removed across the codebase; warnings, safety-scope lines, wire-format/interop references and legacy-migration constraints stay. Statements that followed deleted comments had their original indentation restored.
- **671 shared interface messages** with English/Spanish/Simplified Chinese/Filipino/Vietnamese translations, cross-platform identical catalogs (new key: the invalid-value notice above).

## Required automated evidence

- Bounds matrix per platform: integer bounds, first ≥ second for BP, oxygen rejects a second value, unknown kinds rejected.
- iPhone: 54 Swift tests + three build/launch paths. Android: 48 JVM tests + lint + APK signature + full emulator smoke (including the five-language suite). Web: 50 unit tests + 31 browser tests + offline reopening.

## Still needs actual phones / owner action

Manual values were exercised in unit/emulator tests, not on physical devices. Health Connect grants, real BLE hardware, and the physical sharing pairings remain device checks. The download remains **debug-signed**. See the [complete checklist](feature-checklist.md) and [Samsung guide](samsung-install.md).

## Validation runs

- iPhone [38875622209](https://github.com/engineer2025-sudo/Care/actions/runs/38875622209): **passed** — 54 Swift tests (including the new vitals bounds suite), unsigned physical build, optional HealthKit build, Simulator build/install/launch.
- Android [38875622197](https://github.com/engineer2025-sudo/Care/actions/runs/38875622197): **passed** — 48 JVM tests, lint, APK signature verification, full emulator smoke.
- Web [38874635461](https://github.com/engineer2025-sudo/Care/actions/runs/38874635461): **passed** — 50 unit tests, 31 browser tests, offline production reopening.

One earlier Android run failed lintDebug because the comment-strip pass had re-indented statements that followed deleted comments; indentation was restored from the pre-strip code before these runs. The Android failure-surfacing step now leads with file:line error lines so a lint failure names the exact rule. Exact APK and archive hashes are in `BUILD_VERIFICATION.json` inside the archives.
