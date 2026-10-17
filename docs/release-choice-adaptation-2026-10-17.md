# User-controlled choice reduction — October 17, 2026

Android now matches iPhone and web for the choice-based activity's **Fewer choices** control. It is offered inside each relevant activity, defaults to two options for an easier-to-scan screen, and can be switched off to show the full set. The correct option remains in view. The setting is user-controlled and applies only to the current activity session.

CareSphere does **not** estimate a person's ability, adapt difficulty from answers, retain answer history, or turn choices into a score or health measure. This deliberately applies the accessibility principle of making task complexity adjustable without claiming to reproduce a research intervention or adaptive clinical protocol.

Validation: two Android unit tests verify both the full and reduced choice sets for every structured choice round, including that the answer remains available; emulator smoke toggles the control and checks that an option appears/disappears before selecting. The interaction is still an app UI check, not a clinical evaluation.
