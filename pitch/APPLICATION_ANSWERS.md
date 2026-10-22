# CareSphere AI — Congressional App Challenge 2026 application answers

Portal: Submittable, "Full Application" — **Arnav Kochar, CA-10 (Rep. Mark DeSaulnier)**. Deadline **Oct 26, 2026, 12:00 PM ET**.
Each long answer has a **400-word** limit (the portal counts words, not characters). The drafts below are all under 385
words, so a few edits will not push them over; paste as plain text (the boxes have no formatting).

Ground rules used for every draft: every feature, number and file name is taken from the repository (not from the
pitch), statistics carry their source, and anything only you can know is in **[brackets]** — fill or delete every
bracket before you submit. Save a draft in the portal early; never open the application in two windows.

---

## About your app

| Field | Enter |
|---|---|
| **What is your app called?** | `CareSphere AI` |
| **Programming language(s)** | ☑ **JavaScript** (React web app, tests) · ☑ **Swift** (SwiftUI iPhone app). Optional: ☑ Other → "HTML/CSS, YAML (CI)". Do **not** tick C/C++ or Objective-C: llama.cpp and Sherpa-ONNX are C/C++ libraries you *call* from Swift, not code you wrote. |
| **Platform(s)** | ☑ **Web** · ☑ **Mobile (iOS)**. Optional: ☑ Other → "macOS (releases 1.0–2.1 shipped as Mac builds; the current native target is iOS)". |
| **Video demonstration link** | `[https://youtu.be/…]` — upload as **Public** (the portal says public; Unlisted is riskier), title it "CareSphere AI — Congressional App Challenge 2026 — Arnav Kochar (CA-10)", keep it ≤ 3:00, and open the link in a private window to confirm it plays without signing in. |
| **Cover photo** | `pitch/cover/CareSphere_cover_600x800.jpg` — exactly the requested 3:4, 600×800 px JPEG (67 KB). A 1200×1600 version sits beside it in case they ever want larger. Built from the real app icon and a real screenshot; no AI imagery. |
| **Project link** (optional — do it) | `https://github.com/engineer2025-sudo/Care` — README, build guide (DOWNLOAD.md), roadmap and three public releases are all there. |
| **Congressional Certification (Hack Club)** | Tick **Yes**. It is free and the project is already public. One gap: the repository has **no LICENSE file**, and "open source" formally requires one. Add an MIT (or Apache-2.0) `LICENSE` at the repo root before submitting, and keep the existing notices for the optional Kokoro pack (Apache-2.0 weights, GPL-3.0 eSpeak-NG data, separate download). |

### 1. Please briefly describe what your app does?

*380 words of 400.*

CareSphere AI is a private care companion for older adults, autistic teens and adults, and the family members who look after them. It runs as a native iPhone app (Swift/SwiftUI) and as an installable web app (React), and both are built around one promise: everything stays on the device. There is no account, no server and no cloud AI.

The app has five everyday tabs:

Overview: a calm day at a glance. A personal routine checklist that resets at local midnight, a one-tap mood check-in with a 14-day history, and medication self-check-ins. After the person reviews their own schedule, the open app checks every 15 seconds and can raise an in-app reminder, a notification and a spoken prompt, with Taken and Snooze 10 min buttons.

Activities: optional, untimed and unscored. Feelings Explorer, Pattern Recall, Picture Pairs and Picture Story; four soundscapes (rain, ocean, forest, hearth) synthesized live with the Web Audio API; and 4-4-6 paced breathing.

Coffee Circles: one-tap video rooms on meet.jit.si, so an isolated person can join real company without creating an account.

Care Circle: private care notes and a visit-prep brief. The person picks exactly which fields to include (routine, moods, medications, notes, questions), sees the exact text before it is saved, and nothing is shared unless they tap Share.

Vitals & Telehealth: pairs a real Bluetooth heart-rate monitor over the standard Heart Rate profile (service 0x180D), plots it live and exports CSV. Every reading is labeled LIVE or SIMULATED, and a cancelled pairing never shows a number.

The iPhone app adds a nine-step onboarding, read-only Apple Health access, a Health Guide that answers general health questions with an optional 1.5-billion-parameter language model running entirely on the phone alongside MedlinePlus references, an opt-in support check-in (after a sustained high heart rate it offers paced breathing, then a message to a caregiver that only the person can send), a one-tap SOS that dials 911 with optional GPS, Face ID lock, and AES-256-GCM encrypted storage with export and erase.

Accessibility is built in rather than bolted on: adjustable text sizes, high contrast, reduced motion, spoken prompts, VoiceOver and Dynamic Type, and no timers, scores or auto-advancing screens.

The code is public at github.com/engineer2025-sudo/Care: about 11,400 lines, 17 automated tests, two CI pipelines and three public releases since September 2026.

> **Before you paste:** Every claim is from the code (src/App.jsx, src/lib/*, ios/CareSphere/**). If you have removed or renamed a feature since, change it here too.

### 2. What inspired you to create this app?

*337 words of 400.*

[Open with the real moment, in your own words, 3 to 5 sentences. Who is the person? What did you watch happen? For example: a grandparent living alone whose every phone call turned into "did you take your pills?", a sibling or classmate on the spectrum who shut down when an app beeped a timer at them, or a parent juggling a relative's medications across four different apps. Judges remember one specific person far more than any statistic.]

When I looked at what already existed, I realized the people I cared about were being served by apps that were never designed for them. A medication app wants an account and a cloud. A video app wants everyone on the same brand of phone. A patient portal is built for the clinic, not the person. A family-update site is public by default. Nothing was calm enough for someone who is overwhelmed by timers and scores, and nothing kept the data on the device.

The numbers made it feel bigger than one family. About one in four adults over 65 is socially isolated (National Academies, 2020), and isolation raises the risk of premature death by roughly 29 percent (U.S. Surgeon General, 2023). One in 31 children is autistic (CDC, 2025). Around half of long-term medicines are not taken as prescribed (WHO). Behind all of that are 63 million family caregivers (AARP and NAC, 2025).

So I set out to build the app I wished [she/he/they] had, with three rules I would not break. Calm: no timers, no scores, nothing that auto-advances, and sensory settings the person controls. Honest: a reading is either measured or it is labeled SIMULATED, and a cancelled Bluetooth pairing shows nothing at all, because an older adult or a caregiver should never make a decision on a fabricated number. Private: no account, no server, no cloud AI, so the most sensitive information a family has never leaves the phone.

[Optional closing sentence: what you hope happens when the person you built it for uses it.]

> **Before you paste:** The bracketed opening is the part only you can write, and the part judges weigh most. Keep the statistics as they are: each one is sourced (list at the end of VIDEO_SCRIPT.md).

### 3. What technical difficulties did you face programming your app?

*382 words of 400.*

The hardest problems were all about being honest and private without a server.

Making Bluetooth honest. The web app pairs a heart-rate monitor through the Web Bluetooth API and the standard Heart Rate profile (service 0x180D, characteristic 0x2A37). Parsing was easy: the flags byte says whether the BPM is 8- or 16-bit, and values outside 20-250 are rejected. The hard part was time. Notifications arrive late and out of order, and when a person cancelled a pairing and started again, a stale session could still repaint a new card with an old number. The fix is a connection generation counter: every pairing increments it, every reading carries the generation it was born in, and anything older is dropped. Each sample is also labeled at the source as LIVE_BLE or SIMULATED, and that label follows it onto every card and into the CSV export. A cancelled pairing now shows nothing; sample data needs a separate, explicit "Start labeled demo" tap.

Running a language model on a phone. The iPhone Health Guide can use an optional Qwen2.5 1.5B Instruct model (about 1.1 GB) through llama.cpp. Memory was the constraint: the context is capped at 2,048 tokens and the model is freed after every answer. Qwen's ChatML format needs an exact assistant prefix with a trailing newline, and a missing newline was enough to break generation. The llama.cpp package has no iOS Simulator slice, so the model path can only be exercised on a real iPhone. A deterministic safety gate runs before retrieval or inference for a narrow set of self-harm and poisoning phrases, because a 1.5B model is not a crisis counselor.

Encrypting without an account. On the web, care data is encrypted with AES-256-GCM using a non-extractable Web Crypto key kept in IndexedDB, with tests that reject extractable keys and tampered ciphertext; existing entries were migrated without losing anything. On iOS, the store moved to Application Support with Complete File Protection, AES-GCM and a Keychain key, plus a backup-exclusion fix so a device backup cannot quietly carry it off.

Small things that break trust. Check-ins must reset at local midnight, not UTC. Marking a medicine as taken must not cancel tomorrow's notification. A web page can only check reminders every 15 seconds while open, so the app says so instead of pretending otherwise.

> **Before you paste:** Every difficulty here is visible in the repository (the generation counter and source labels in src/App.jsx and src/lib/bluetooth.js, the ChatML / n_ctx / llama_free code in LocalAssistantService.swift, secureCareStorage.js and its tests, the backup-exclusion commit, the ROADMAP notes). Keep a sentence only if you remember living through it, and swap in the problem that actually cost you the most nights.

### 4. What improvements would you make if you were to create a 2.0 version of your app?

*342 words of 400.*

Version 2.0 would be built with the people it serves, not just for them.

Co-design before new features. The accessibility notes in the repository already say the activities and palettes should be reviewed with autistic people, people living with dementia, caregivers and accessibility specialists before making stronger claims. That review is the first item of 2.0: short sessions with [a local senior center, an autism support group, or families you know], watching real people use the Overview, the reminders and the activities, and changing whatever confuses them. Then a TestFlight beta, so families can install the iPhone app without Xcode.

Finish verification on real devices. The iOS build compiles in CI, but HealthKit delivery, the timing of the Bluetooth support check-in, the Face ID lock, data migration, export and erase all need to be exercised on signed physical iPhones, together with a full VoiceOver, Dynamic Type, high-contrast and reduced-motion pass and keyboard focus trapping in the web dialogs.

A better visit brief. Today the brief includes routine, moods, medications, notes and questions. 2.0 adds carefully permissioned Apple Health and Bluetooth observations with date filters and true source labels, excludes simulated values by default, keeps user-entered medicines clearly separate from pharmacy records, and shows simple, non-diagnostic trends only when there are enough real observations. Automated tests would prove that generating a brief makes no network request.

Reminders people can rely on. The web app can only check every 15 seconds while the page is open. 2.0 would make that limit impossible to miss, point families to the iPhone app when background reminders matter, and let a caregiver help set up the schedule on the person's own device.

What 2.0 would deliberately not do. Cloud sync, a clinician portal, FHIR integration and a drug-interaction checker would all look impressive on a slide. Each needs separate security, privacy, licensing and clinical-safety work that has not been done, so they stay out until it has. The point of CareSphere is that a family can trust it, and that trust is worth more than a feature list.

> **Before you paste:** Items 1-3 and the 'deliberately not' list come from ROADMAP.md and docs/activities-and-accessibility.md. Replace the bracketed co-design partners with a real group you could reach. Item 4 (reminders) is a suggestion: keep it only if you agree.

### 5. Did you use AI in the creation, development, or functionality of your app?

*332 words of 400.*

Yes, in two different ways, and I want to be precise about both.

AI inside the app. The iPhone Health Guide can use an optional Qwen2.5 1.5B Instruct model (a 1.1 GB GGUF file the user chooses to download) running through llama.cpp entirely on the phone, with MedlinePlus references from the National Library of Medicine. Questions are never sent to a cloud service; the context is limited to 2,048 tokens and the model is unloaded after each answer. A rules-based safety gate runs before any search or inference for a narrow set of self-harm and poisoning phrases. The guide is general health education only: it does not diagnose, triage, check drug interactions or advise doses, and the app says so on screen. Spoken prompts can optionally use Kokoro, a small neural text-to-speech model, also on-device through Sherpa-ONNX. Nothing else in the app uses AI; vitals are real sensor readings or clearly labeled simulations.

AI in development. I used [Arena.ai Agent Mode, an AI coding agent] throughout the project [add any other tools you actually used, e.g. ChatGPT, Claude, GitHub Copilot]. It helped me [write first drafts of React components and SwiftUI views, debug the llama.cpp integration, write the GitHub Actions workflows, generate test cases, and draft documentation and release notes]. What I did directly: [set the requirements and the three non-negotiable rules (calm, honest, private) and decided what the app would not do; designed the tabs and flows; reviewed every change before it was committed; tested in Chrome and Safari and on my own iPhone; found and reported the bugs that came out of that testing; chose the libraries and the licensing; wrote the final release notes]. [Make every item in these brackets true for you. The form says honest disclosure helps judges; describe the real tasks you did and the real tasks the AI did.]

[Optional transparency line: "The pitch deck, video script and first drafts of these answers were produced with the same AI assistance and then edited by me."]

> **Before you paste:** The first paragraph is factual and should stay. The second paragraph MUST be edited to match what really happened: the repository history shows the app was developed with an AI coding agent (commits carry an arena-agent co-author), so say so plainly and be specific about your own contributions. Honest, specific disclosure is rewarded; vague or missing disclosure is not.

### 6. What did you learn or take away from participating in the Congressional App Challenge?

*379 words of 400.*

[Start with one personal sentence: what surprised you most, or the moment the app first worked for the person you built it for.]

The biggest lesson was that honesty is a feature you have to engineer. It is easy to make a demo look impressive with a heart-rate number that is always there; it is much harder to build software that shows nothing when it knows nothing. Labeling every reading LIVE or SIMULATED at the source, dropping stale Bluetooth sessions with a generation counter and refusing to fabricate values changed how I look at every app I use, especially the ones older adults and caregivers rely on.

I learned that calm is a design decision, not a color scheme. Reading the AASPIRE guidelines for autistic web users and the design-for-dementia guidance taught me why timers, scores, auto-advancing screens and surprise animations are the problem, and why the person, not the designer, should control text size, contrast and motion.

I learned that privacy is an architecture choice. Deciding on day one that there would be no account, no server and no cloud AI shaped everything after it: Web Crypto keys that cannot be exported, Keychain-backed encryption on iOS, a language model that has to fit in a phone's memory, and a visit brief that is previewed exactly before anything is shared.

I learned to read specifications and real documentation (the Bluetooth SIG Heart Rate profile, Apple's HealthKit rules, llama.cpp's constraints) instead of guessing, and to ship: three public releases, continuous integration on every push, and a release process that cannot accidentally overwrite a published version.

I learned to say no. A drug-interaction checker, cloud sync and a clinician portal would all look good on a slide. Each would also be unsafe or untrustworthy without clinical review, licensing and security work I have not done, so they are not in the app, and the roadmap says why.

[Add 2-3 sentences of your own: what you learned about working with AI tools (for example, that reviewing and testing generated code is the real engineering work), or about explaining your work in a three-minute video.]

Most of all, the Congressional App Challenge made me build for people who are usually left out of technology, and it made me want to keep doing that.

> **Before you paste:** Personal by nature. Keep what rings true, delete what does not, and fill the two bracketed slots with your own sentences.

---

## About your process

| Field | Enter |
|---|---|
| **Where did you do most of the coding?** | `[At Home]` — pick the true answer. |
| **On what date did you complete the coding for your app?** | Format `m/d/Y`. Use the date of your **last code change before you submit**. The repository's last app commit is `10/2/2026` ("Fix iOS backup exclusion API"); if you change code again before Oct 26, use that later date instead. |
| **Part of a project for school / club / organization?** | `[No]` unless a teacher or club was formally involved; if Yes, fill the school/organization, mentor name and mentor email truthfully (they may be contacted). |
| **Ambassador referral email** | Leave blank unless an App Challenge Ambassador actually referred you. |
| **Application Ready to Submit** | Only after the checklist below. |

## Pre-submit checklist

1. Every **[bracket]** in the six answers is filled or deleted; each answer re-counted at ≤ 400 words (`wc -w`, or the portal's own counter).
2. Answer 5 (AI) describes what *you* did and what the AI did, specifically and truthfully.
3. The video is **Public**, under 3:00, says your name and "CareSphere AI" in the first ten seconds, and shows the real app running (shot list in VIDEO_SCRIPT.md).
4. Cover photo uploaded: `CareSphere_cover_600x800.jpg`.
5. `LICENSE` added to the repository if you opted into the Hack Club certification; the GitHub link opens in a private window.
6. Deck placeholders (school, city, grade, YouTube link, your story on slide 2) filled — in PowerPoint, or in the Python and rebuilt with `python3 build_deck.py` / `python3 build_deck_b.py`.
