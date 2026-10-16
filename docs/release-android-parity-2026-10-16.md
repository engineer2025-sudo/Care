# Android/web parity: SOS, references, mood history, steps and workouts — October 16, 2026

Versions: **Android 1.8.0 (10), iPhone 3.7.0 (16), web 1.5.0** (third delivery of this version set). Packaging uses the matching-source CI runs below.

## Changes

- **Emergency SOS on Android** — the same reviewed flow as iPhone and web: a **Call 911** dialer action (nothing is dialed automatically), a help message previewed exactly as sent, an optional location line the user adds and can remove (accuracy and time shown first), and the system share sheet. CareSphere never contacts anyone automatically and cannot confirm delivery. Location permission is requested only when the user taps **Add my location**.
- **Built-in health reference search on Android and web** — the same five CareSphere safety notes as iPhone (medication lists, home fall hazards, sensory-aware support, recording readings, urgent symptoms) with offline token search. Nothing is fetched or uploaded. Web gets it in My support tools; Android under Other health data.
- **Mood history on Android** — self-reports are now day-keyed (one per day, 365 max) like iPhone and web, with a recent list in Today and selectable rows in the structured visit draft. Backups validate the new history shape.
- **Steps and workout summaries on Android** — Health Connect foreground explicit reads (same pattern as the existing history): **Today's steps** as an aggregate total and **Recent workouts** up to 20 exercise-session summaries from the last 7 days, each labeled with source and time. No data is read in the background, kept, or sent anywhere; missing permissions stay empty, never "normal".
- **701 shared interface messages** (30 new) with four translations each — the SOS, reference, workout and mood-history chrome that previously fell back to English on every platform now translates everywhere, including iPhone's SOS screen.
- **Emulator-smoke hardening** — the smoke dismisses a system "isn't responding" dialog (taps Wait) instead of failing on a frozen launcher.

## Honest limits (unchanged and restated)

Step totals and workout summaries come from Health Connect records other apps wrote; Samsung Health must be configured to share into Health Connect. Browsers have no pedometer, so web step counting stays a documented No. Reference content is general offline safety notes, not personal medical advice. The SOS share is a reviewed message through other apps — not an alert system, not monitored, not delivery-confirmed.

## Validation runs

- iPhone [38950191402](https://github.com/engineer2025-sudo/Care/actions/runs/38950191402): **passed** — 54 Swift tests, three build/launch paths (SOS string localization included).
- Web [38948747741](https://github.com/engineer2025-sudo/Care/actions/runs/38948747741): **passed** — 53 unit tests (reference search included), 31 browser tests, offline reopening.
- Android [38951410598](https://github.com/engineer2025-sudo/Care/actions/runs/38951410598): **passed** — 56 JVM tests (mood history, reference search, exercise names), lint, APK signature, full emulator smoke.

Two earlier Android attempts in this batch were not distributed: a health-connect constant absent from 1.1.0 and an API-30-only duration helper failed the Kotlin compile, and the location API needed explicit SecurityException handling for the lint permission rule. The failure-surfacing step named each one from the file:line error lines. Exact APK and archive hashes are in `BUILD_VERIFICATION.json` inside the archives.
