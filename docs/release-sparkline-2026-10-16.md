# Live heart-rate sparkline on Android — October 16, 2026

Versions: **Android 1.8.0 (10), iPhone 3.7.0 (16), web 1.5.0** (sixth delivery of this version set). This closes checklist row 121: Android showed only the current numeric reading while iPhone and web drew a trend line.

## Behavior

- The Heart rate card keeps the **last 36 readings the connected monitor actually sent**, in arrival order, and draws them as a line.
- **Nothing is interpolated, synthesized, or backfilled.** Below two readings there is no line at all — the card shows “Awaiting real readings…”, so an empty chart never implies data.
- Implausible values (outside 20–250 bpm) and failed/no-contact packets are ignored, matching the web client's rule.
- Disconnecting or leaving the foreground clears the buffer, so a reconnection starts a new line instead of drawing a jump between sessions.
- The buffer is display-only. It is not saved, not part of care records, not exported, and not sent anywhere; the existing “not a medical device or an emergency monitor” line stays on the card.

## Validation

- Android unit: **68** (4 new in `HrSparklineTest.kt`: rejecting null/out-of-range readings, keeping the newest 36, producing no points below two samples, and staying inside the view with a full-width span including a flat series).
- The view is a plain `Canvas` path draw with a 2 dp stroke — no chart library, no new dependency.

Exact APK and archive hashes are recorded in `BUILD_VERIFICATION.json` inside each archive by `scripts/package_mobile.py`.
