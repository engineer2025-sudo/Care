# CareSphere iOS — product and deck-preparation brief

**Scope:** native SwiftUI iPhone/iPad development app, version 2.3.0 (6). The web app is a separate client, not the iOS implementation. This is an implementation brief, not evidence of clinical efficacy or a release certification.

## Product in one sentence

A local-first daily companion that brings personal routines, medication self-check-ins, accessible activities, optional social video, and source-labeled health information into one iPhone app.

## Who it is designed to support

People who want a predictable, low-pressure daily interface, including older adults, people living with dementia, autistic people, and people playing or organizing a day with someone they trust. Needs vary widely: the app does not select a treatment or infer an ability level from a diagnosis, age, or game performance. The adult-autism guidance used in this design is not pediatric efficacy evidence.

## Five primary destinations

| Destination | What the person can do | Important boundary |
|---|---|---|
| **Today** | See date and greeting, choose an activity, open social rooms, record mood, customize routines, review medication check-ins, optionally enable steps | Routines and medication check-ins are self-reports. There is no adherence verification. Step counting is user-initiated. |
| **Activities** | Search/filter 11 activities, open a single focused session, use hints, reduce choices, repeat, skip, or leave | No game scores, streaks, diagnoses, clinical progress reports, or saved answers. |
| **Connect** | Join Jitsi coffee rooms or create an ad-hoc room; open in app or browser | No CareSphere host, scheduling, moderation, attendance tracking, or private-room guarantee. Calls need network access. |
| **Care** | Save private notes, view local check-ins, prepare a user-selected visit brief, view a saved emergency contact | No remote caregiver portal, family sync, or notification backend. Sharing is explicit. |
| **Health** | Switch visibly between Vitals and Health Guide | HealthKit is read-only. Live BLE and HealthKit history are different sources. The optional model is educational and can be wrong. |

Settings and SOS remain in the root header. Five tabs avoid iOS hiding a sixth destination in “More.” Activity sessions keep a clearly labeled **Done** exit and prevent unrelated games from playing or running in the background.

## Activity inventory

### Five additions

| Activity | Interaction | Supports and intended use — not a proven benefit |
|---|---|---|
| **Sort together** | Place familiar objects into a named group | Picture + word cues; 2 or 3 choices; hints include the answer; manual next. An opportunity for category discussion and shared attention. |
| **Complete the pattern** | Choose the next symbol in a visible repeating row | The full row stays visible; numbered positions; 2 or 3 choices; written rule/answer hint. An opportunity to notice predictable patterns without requiring recall. |
| **Find the same** | Match a visible target picture to an option | Target stays visible; matching words and symbols; 2 or 4 choices; no speed component. An opportunity for visual comparison. |
| **Everyday order** | Tap three example steps in order | No dragging; next-step cue, undo, repeat, skip. Examples are books, drawing, music, and writing a card—not medication, cooking, or safety-critical routines. |
| **Conversation cards** | Talk, point, imagine, listen, or pass | Eight present-day/memory/imagined prompts; optional ideas; previous/next; no recording. Personal memories are not marked correct or incorrect. |

### Six retained and refined activities

- **Picture pairs:** 2–4 pairs; pictures initially visible; optionally hide them; selected and matched states have text as well as borders; mismatches do not auto-disappear.
- **Remember a pattern:** user-selected 1–4 steps; pattern visible by default; optional hiding; no flashing playback, time limit, or automatic increase in difficulty.
- **Feelings explorer:** accepts any interpretation or “Not sure”; does not equate an emoji with a reliable rule for reading real people.
- **Picture story:** forward/back through short examples; not a prescribed personal routine.
- **Soundscapes:** locally generated audio; begins only after a tap; stops on leaving the screen or backgrounding.
- **Paced breathing:** optional comfort tool; no breath hold by default; optional 4-second hold; pause/stop; stops on backgrounding; does not measure breathing.

All eleven work without model downloads or an internet connection after the app is installed. Research links open an external browser only when selected.

## Research rationale and limits

1. **Dementia:** a Cochrane review found small, short-term cognitive benefits from structured cognitive-stimulation programs in mild-to-moderate dementia. Those programs differ from standalone app games; their effect sizes must not be applied to CareSphere. [1](https://www.cochrane.org/evidence/CD005562_can-cognitive-stimulation-benefit-people-dementia)
2. **Clinical distinction:** NICE recommends preference-led activities and group cognitive stimulation therapy, but specifically advises against cognitive training as treatment for mild-to-moderate Alzheimer's disease. CareSphere must not be described as delivering validated CST or treating Alzheimer's. [2](https://www.nice.org.uk/guidance/ng97/chapter/recommendations)
3. **Autistic adults:** NICE emphasizes autonomy, interests and abilities, predictable structure, visual supports, sensory adjustments, and structured leisure options. Those principles inform the interface; they do not establish that these games change autism symptoms or clinical outcomes. [3](https://www.nice.org.uk/guidance/cg142/chapter/recommendations)
4. **Conversation:** reminiscence research reports small, inconsistent effects depending on setting and delivery. This supports cautious exploration of optional conversation prompts, not an efficacy claim for CareSphere's cards. [4](https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD001120.pub3/full)

**Appropriate deck language:** “Accessible, evidence-informed activity design; clinical efficacy not evaluated.”

**Do not claim:** prevents dementia, reverses cognitive decline, treats autism, clinically improves memory, delivers validated CST, detects distress from gameplay, prevents isolation, or automatically alerts caregivers.

## Privacy and system boundaries

- Care data: encrypted local storage with iOS file protection; explicit export/erase.
- Activity answers: transient session state only; no analytics, score history, or health inference.
- HealthKit: user-authorized read-only queries. Absence of a reading is not replaced by a fabricated number.
- BLE: compatible standard heart-rate monitors; no general-purpose medical sensor emulation.
- Health Guide: optional Qwen GGUF; reference downloads are opt-in. Model output is not diagnosis, clinical triage, drug-interaction checking, or dosing advice.
- Safety gate: narrow deterministic phrase handling, not validated or complete crisis detection.
- Support check-in: optional, foreground/unlocked-only flow; heart rate is not a crisis detector.
- SOS/messages/video: user-initiated. The user reviews and sends a message; no delivery assurance or silent contact escalation.

## Build and test handoff

- The repository now contains `ios/CareSphere.xcodeproj`, a shared scheme, Info.plist, entitlements, and source assets. XcodeGen is not needed merely to open the app.
- Direct third-party versions are pinned, including the existing Jitsi/Giphy ABI-compatible pairing. Initial package resolution still needs internet access and can fail for external reasons.
- `ios/ActivityKit` is an independent Swift package with 15 tests for catalogue integrity, choice reduction, answer transitions, no auto-advance, invalid input, skipping/wrapping, sequence undo, and content validity.
- `ios/scripts/preflight.sh` runs portable file checks, activity tests, package resolution, and an unsigned physical-iOS-target compile on a Mac.
- macOS CI compiles the **checked-in project**, not a separately generated project. It does not sign or install on a physical iPhone.
- Device acceptance checklist: [ios-device-test-plan.md](ios-device-test-plan.md).
- Build results and remaining gaps must be reported separately from implementation. No physical-device, VoiceOver, performance, or clinical validation is implied by a successful compile.

## Suggested later deck structure

1. Everyday usability problem and who is involved.
2. Five-destination product tour and one realistic daily journey.
3. Activity library: person chooses interest, support level, and pace.
4. Research rationale vs. the app's unvalidated outcomes.
5. Native architecture, offline boundaries, and privacy.
6. What works now, what was tested, and what needs device/user validation.
7. Proposed co-design and evaluation with autistic people, people living with dementia, caregivers, and qualified clinicians.

Use real native screenshots only after running the app. Do not present the web preview or an illustrative mockup as an iPhone screenshot.
