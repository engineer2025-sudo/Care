# User-controlled choice reduction — October 17, 2026

Android now matches iPhone and web for the choice-based activity's **Fewer choices** control. It is offered inside each relevant activity, defaults to two options for an easier-to-scan screen, and can be switched off to show the full set. The correct option remains in view. The setting is user-controlled and applies only to the current activity session.

CareSphere does **not** estimate a person's ability, adapt difficulty from answers, retain answer history, or turn choices into a score or health measure. This deliberately applies the accessibility principle of making task complexity adjustable without claiming to reproduce a research intervention or adaptive clinical protocol.

Validation:

- Android [39061723874](https://github.com/engineer2025-sudo/Care/actions/runs/39061723874): passed — 77 unit tests, lint, APK signature verification, and emulator smoke. Two new tests verify full and reduced choice sets for every structured round and ensure the answer remains available. Emulator smoke toggles the control and checks an option appears/disappears before selecting. This is an app UI check, not a clinical evaluation.
- iPhone [39061723303](https://github.com/engineer2025-sudo/Care/actions/runs/39061723303): passed — 61 Swift tests and device, HealthKit, and Simulator builds.
- Web [39061723325](https://github.com/engineer2025-sudo/Care/actions/runs/39061723325): passed — 67 unit tests, 35 browser tests, and offline production check.
