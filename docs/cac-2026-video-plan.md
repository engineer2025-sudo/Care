# Congressional App Challenge 2026 — video and deck plan

## Verified national requirements

The 2026 national rulebook calls for a **1–3 minute demonstration video**, with participant names, app name, a clear purpose sentence, intended audience, development tools/languages, and demonstrated functionality. The upload must be public on YouTube or Vimeo. It states a deadline of **October 26, 2026, noon EDT**. Local office instructions should also be checked. [1](https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf)

Judging can consider idea quality, implementation/user experience, and programming excellence. A deck supports the video; attractive slides do not replace demonstrating the working app. [1](https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf)

### Authorship and AI assistance — do not omit

The official rules permit AI assistance only as support for specific aspects of the project, require full disclosure, and require significant individual student contributions and technical understanding. Open-source libraries/frameworks/tools must also be documented. Do not represent agent-authored implementation as independently student-written code. Eligibility and compliance are for the organizers to determine. [1](https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf)

This session includes substantial AI assistance with native SwiftUI layouts, activity implementations, tests, Xcode project preparation, download/pairing UX, documentation, and presentation preparation. The student must add an accurate account of their own contributions. A generic “I used AI for ideas” statement would not adequately describe this session.

## Inputs still needed for the final deck

- Civic Snap PDF contents or a readable share link, so its actual slide count, aspect ratio, and visual hierarchy can be matched. The filename appeared in chat twice, but neither upload was accessible to the file tools. No slide count has been assumed.
- Participant name(s); use a clearly marked placeholder until supplied.
- The student's genuine inspiration, learning, and technical contributions. Do not invent a personal caregiving story or claim authorship based only on repository ownership.
- Actual iPhone screen recordings. Native unsigned compilation passed, but no physical-device screenshots or recordings were produced in this environment.

## Narrative blocks to fit the reference's slide count

These are content blocks, **not an assumed number of slides**. Combine or split them only after the reference is available.

1. **CareSphere:** “A local-first iPhone companion for personal routines, accessible activities, and optional care connections.” Participant name(s) and CAC 2026.
2. **The design problem:** dense interfaces and pressured activities can make everyday support harder to use. Frame this as the project's design motivation, not an unmeasured population statistic.
3. **One calm daily space:** Today, Activities, Connect, Care, Health. Show the actual Today-to-Activities journey.
4. **Eleven offline activities:** demonstrate one new activity, then show hints/fewer choices/skip. Explain that the games are optional, unscored, and not clinically validated treatments.
5. **A meaningful choice:** show an example such as Sort Together or Everyday Order; explain manual progression and supportive feedback.
6. **Native implementation:** Swift/SwiftUI, local activity logic, CryptoKit storage, HealthKit/CoreBluetooth, Jitsi, optional local Qwen/Kokoro. Separate offline core from network/permission-dependent features.
7. **Reliability challenge:** choose a genuine challenge the student can explain. Observable implemented examples include explicit monitor selection and stale-reading handling, cancelable model downloads, and deterministic activity state with tests. Do not claim the student authored those solutions unless accurate.
8. **Trust and limits:** local care data, explicit sharing, source-labeled readings; no diagnosis, silent caregiver alerts, clinical benefit claims, or guarantee of emergency delivery.
9. **Demo and next steps:** show the real app, then outline physical-device/user accessibility validation and co-design as future work. No invented user adoption, trial results, or endorsements.

## Video timing target

Target approximately **2:40–2:50**, leaving a buffer under the three-minute cap. [1](https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf)

- 0:00–0:15 — names, app, one-sentence purpose.
- 0:15–0:35 — audience and design motivation.
- 0:35–1:35 — real iPhone demo: Today → activity library → one game with a hint/skip → Care note or medication setup (use fictitious test data).
- 1:35–2:10 — tools, architecture, and a technical challenge the student understands.
- 2:10–2:35 — privacy, evidence limits, and what was actually tested.
- 2:35–2:50 — learning/next steps and accurate contribution/AI acknowledgment.

Do not call emergency numbers, expose private health records, or contact unsuspecting people for the demo.

## Visual direction requested

Blue palette: deep navy, medium royal blue, pale sky, and warm white. Large readable headings, short voiceover-friendly text, consistent numbering, and pictures with clear provenance. Editable PowerPoint text/shapes; images embedded locally. Match Civic Snap's style/count once readable.

AI-generated editorial artwork may illustrate the concept but must not be described as actual users or clinical evidence. Any interface mockup must be labeled as an illustration and must not substitute for the recorded functionality demonstration.

## Current build evidence

Native commit `48e2691df59daa7fa9e52371dfffb641f0e1f7ce` passed the checked-in-project preflight, all 15 activity-logic tests, dependency resolution, Jitsi/Giphy compatibility verification, and unsigned iOS-device-target build on macOS CI:

https://github.com/engineer2025-sudo/Care/actions/runs/38508968464

This is not proof of a signed installation, physical-device behavior, successful optional model downloads on the user's network, clinical benefit, or competition eligibility.
