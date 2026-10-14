# iPhone acceptance checklist — CareSphere 2.3

A passing compile is not a passing device test. Fill this out on the intended iPhone before demonstrating or distributing the app. Never use real medication or emergency actions just to test UI.

## Build and first launch

- [ ] Open `ios/CareSphere.xcodeproj` directly; choose CareSphere scheme.
- [ ] Choose your team, a unique bundle identifier if necessary, and your connected iPhone (iOS 16+).
- [ ] Confirm the installed Xcode supports your phone's iOS version. Use Xcode 16+ for the Swift 6 package manifest.
- [ ] Resolve packages, compile, sign, install, and launch without a crash.
- [ ] On a clean install, use **Explore first · set up later**. No camera, microphone, motion, health, or notification permission should be needed to play games.
- [ ] Repeat with guided setup; large text can scroll each step; birth date can remain absent; voice reminders do not turn on based on age.
- [ ] Settings version shows 2.3.0 (6).

## Layout and navigation

- [ ] All five tabs are visible: Today, Activities, Connect, Care, Health. No hidden More tab.
- [ ] Today routine/medication tiles scroll to the correct section; activities and heart-rate tiles open the correct tab.
- [ ] Health visibly switches between Vitals and Health Guide.
- [ ] Medication setup shortcut opens the actual medication section and retains a visible Done control.
- [ ] Try the smallest supported phone and an iPad; repeat with largest Accessibility text, Bold Text, light, dark, and higher contrast.
- [ ] VoiceOver announces buttons, mood labels/selected state, card positions, hints, feedback, and exits in a sensible order. Test Switch Control if available.

## Every activity

- [ ] Search, filter, clear an empty result, open and exit each of the 11 activities.
- [ ] Try fewer/more choices; answer correctly/incorrectly; use hints; skip; restart; reach the last example and wrap.
- [ ] Wrong/duplicate taps do not advance or lock the game; correct taps wait for explicit Next.
- [ ] Picture Pairs: visible and hidden modes, duplicate taps, mismatched pair, clear selection, all pairs matched, change pair count.
- [ ] Pattern: choose each length, hide/show guide, retry wrong input, replay, change length midway, leave/reopen.
- [ ] Everyday Order: wrong step, duplicate step, next-step cue, undo at empty/partial/complete states, next example.
- [ ] Conversation: previous on first card, next on last card, hints, skip; no personal answer is recorded.
- [ ] Take a break: content is hidden from VoiceOver and touch; Continue restores the same session. Done always exits.
- [ ] Background/lock during games; return without surprise playback. Close/reopen starts a new session; no game scores are stored.
- [ ] Airplane mode: all 11 activities remain usable (research links and video are network features).

## Sound and breathing

- [ ] No sound starts automatically. Test headphones and silent mode at a comfortable volume.
- [ ] Each soundscape starts/stops; leaving or backgrounding stops it. Test an interruption such as an incoming call.
- [ ] Breathing starts without a hold. Enable optional hold while paused; pause/resume; leave/background; return without automatic restart.
- [ ] Reduced motion keeps the visual cue static. Stop if the pace is uncomfortable; never treat completion as a measured breath.

## Existing care and health functions

- [ ] Routine check-ins persist and reset after local midnight/app return.
- [ ] Add a clearly fictitious medication reminder, review/confirm it, then remove it after the test. Editing pauses reminders until reconfirmed.
- [ ] Denied notifications, motion, Bluetooth, and HealthKit permissions have understandable states; missing data is not presented as a measurement.
- [ ] Step counting starts only after enabling; test return across local midnight.
- [ ] Pair compatible BLE hardware, disconnect/reconnect, verify source labels; check real HealthKit records if available.
- [ ] Test optional model/reference/voice downloads on real Wi-Fi with sufficient space. Failed downloads show an error; do not claim they are network-proof.
- [ ] Test Face ID/Touch ID lock and background privacy, local export/erase, visit-brief selection.
- [ ] Open SOS and cancel. **Do not dial emergency numbers as a test.** Use a consenting non-emergency recipient for any message/video testing.

Record iPhone model, iOS version, Xcode version, build commit, checks passed/failed, and reproducible issues. Clinical benefit, usability with target users, and App Store review require separate work.
