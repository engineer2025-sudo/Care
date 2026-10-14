# CareSphere AI — Congressional App Challenge 2026 video script

Target length: **2:52** (hard limit is 3:00). Narration is ~440 words — a calm 150 words per minute.
Judges' checklist covered: student name(s) ✔ app name ✔ purpose ✔ intended audience ✔ tools & languages ✔ app shown in use ✔.

Fill in every `[bracket]` before recording. Slide numbers refer to
`CareSphere_Congressional_App_Challenge_Deck.pptx` (speaker notes contain the same lines).

---

## Run of show

| Time | On screen | Say |
|---|---|---|
| 0:00–0:15 | **Slide 1** (title) | Hi, I'm **[Name]**, a **[grade]** at **[School]** in **[City]**, California. This is **CareSphere AI** — a privacy-first care companion for older adults, autistic people and the families who look after them, built as a native iPhone app and an installable web app. |
| 0:15–0:33 | **Slide 2** (problem) | One in four older adults is socially isolated — a twenty-nine percent higher risk of early death. One in thirty-one children is autistic. Half of long-term medications aren't taken as prescribed. And sixty-three million family caregivers are coping with apps that demand an account and send everything to the cloud. |
| 0:33–0:50 | **Slide 3** (inspiration) | **[Your story in one sentence — e.g. "My grandmother lives alone, and every call started with: did you take your pills? did you talk to anyone today?"]** I wrote four rules into the code: never fabricate a reading, never send anything automatically, stay calm by default, and keep everything private by architecture. |
| 0:50–1:02 | **Slide 4 → Slide 5** | Five calm tabs — Overview, Activities, Coffee Circles, Care Circle and Vitals — plus an offline Health Guide on iPhone, designed for older adults, autistic teens and adults, and their caregivers. |
| 1:02–1:05 | **Slide 6** (demo divider) | Let me show you. |
| 1:05–2:05 | **Screen recording** (see shot list below) | *(narrate the shot list)* |
| 2:05–2:25 | **Slide 15 → Slide 16** | The web app is React and JavaScript with Web Bluetooth, Web Audio and Web Crypto; the iPhone app is Swift and SwiftUI with HealthKit, CoreBluetooth, CryptoKit and llama.cpp — eleven thousand lines of code, seventeen automated tests, zero servers. The hardest problem was keeping Bluetooth honest: a late notification from an old sensor could repaint a new card, so I label every sample at the source and drop stale connections with a generation counter. |
| 2:25–2:43 | **Slide 18** (learned / v2.0) | I learned that honest engineering beats impressive demos, and that accessibility is a design input, not a checkbox. Version 2.0 starts with co-design sessions with autistic people, people living with dementia and caregivers, adds real sensor data to the visit brief, and encrypted backup that still needs no server. |
| 2:43–2:52 | **Slide 19** (close) | CareSphere AI — care that stays yours. The code and install guide are on GitHub. Thank you. |

Slides 7–14 and 17 are reference/appendix slides: use them if you present live, or cut them into the
demo as overlays where a feature needs explaining. The 3-minute video does not need them.

---

## Demo shot list (1:05–2:05, ~60 seconds)

Record the **web app** in Chrome or Edge (needed for Web Bluetooth) at 1920×1080, then the last shot on an iPhone if you have the Health Guide model installed. Keep the cursor slow; each shot is 6–10 seconds.

Prepare before recording (so the screen is not empty):
- Settings → **Profile name**: your first name. Routines → **Customize**: add 4–5 items, tick two.
- Settings → **Medication schedule**: add two medicines; tick the "I reviewed every saved medication…" checkbox.
- Care Circle: post two or three care notes. Turn on **Voice reminders** in Settings if you want the spoken prompt audible.

| # | Where | Do | Say |
|---|---|---|---|
| 1 | Overview | Tap a mood face ("Today: feeling good" appears); tick one routine item (count goes up). | The Overview: a one-tap mood check-in and a routine that resets at local midnight. |
| 2 | Settings → Medication schedule | Add "Vitamin D" at the **next minute**, tick the review checkbox, close. When the reminder toast appears ("Time for Vitamin D"), tap **Taken**. | Reminders only start after you confirm the schedule yourself. The toast speaks, and "Taken" is a self-report — never a verified dose. |
| 3 | Vitals & Telehealth | If you own a Bluetooth heart-rate strap or a watch that broadcasts HR: **Pair real monitor** → pick the device → the card shows **LIVE BLE** and a moving sparkline. Otherwise tap **Start labeled demo** and point at the **SIMULATED** chips. Tap **Export CSV**. | This is real Web Bluetooth. Every card is labeled live or simulated, and the label travels into the CSV export. Cancel pairing and nothing is invented. |
| 4 | Activities | **Start pattern** in Pattern Recall and repeat it; tap **Rain** in Soundscapes (let it play 2 s), **Stop**; tap **Begin session** in Guided breathing. | Activities are untimed and unscored; the soundscapes are synthesized live with Web Audio — no audio files. |
| 5 | Coffee Circles | Tap **Join in app** on "Morning Sunshine Tea & Chat"; allow camera/mic; show the Jitsi room for 3–4 s; leave. | Coffee Circles are real Jitsi video rooms — no account, nothing to install. |
| 6 | Care Circle | **Prepare visit brief** → tick "Medication reminders" and type a question → show the **Exact file preview** → **Download .txt**. | Before a doctor's visit you pick exactly what goes in the brief, see the exact text, and download it. Nothing is uploaded. |
| 7 | Settings | Switch **Text size** to **A++**, theme to **Warm light**, scroll to **Privacy & your data** (shows AES-256-GCM and the export/erase buttons). | Three text sizes, warm-light and high-contrast themes — and every byte encrypted on the device. |
| 8 *(optional)* | iPhone → Health Guide | Ask: "What helps with leg cramps at night?" Show the MedlinePlus sources and the on-device answer. | On iPhone, a 1.5-billion-parameter model answers health questions fully offline, behind a deterministic safety gate. |

Tip: if shot 2's timing is awkward, record it separately and cut it in. Keep the microphone narration continuous.

---

## Recording checklist

- Deck in **Slide Show** mode, 16:9, 1080p export; record with OBS, QuickTime or Zoom (local recording).
- Browser zoom 100 %, window 1920×1080, no bookmarks bar, no other tabs. Use the **calm charcoal** theme for the demo (matches the deck); switch to warm light only in shot 7.
- Say your name and "CareSphere AI" in the first ten seconds (judging requirement).
- Add the iPhone Health Guide screenshot to **slide 13** (placeholder box) before exporting the deck.
- Replace `[CA-XX]`, `[Student Name]`, `[Grade]`, `[School]`, `[City]`, `[email]` and the `[YouTube link]` on slide 19.
- Upload the video as **public** on YouTube or Vimeo; paste the link into the CAC portal before **Oct 26, 2026, 12:00 PM ET**.

---

## Written-answer drafts (CAC portal)

### Short description (≤ 350 characters) — 321 chars
CareSphere AI is a privacy-first care companion for older adults, autistic people and their caregivers: live Jitsi coffee circles against isolation, honest Bluetooth vitals, calm sensory activities, medication self-check-ins, visit-prep briefs and an on-device AI health guide. No account, no server, encrypted on device.

### Technical difficulty and how I overcame it (≤ 1,500 characters) — 1,421 chars
The hardest part was making the vitals screen honest. Web Bluetooth delivers heart-rate notifications asynchronously, so a cancelled pairing dialog, a dropped connection or a late callback from an old sensor could leave misleading numbers on screen—exactly the kind of "fake data" that makes families distrust health apps. I studied the Bluetooth SIG Heart Rate profile (service 0x180D, characteristic 0x2A37), parsed the flags byte to read 8- or 16-bit BPM correctly, and tagged every sample LIVE_BLE or SIMULATED at the moment it is produced. A connection generation counter discards notifications from any previous session, cancelling the chooser never starts a demo stream, and the label travels through the sparkline, the range check and the CSV export. The same rule shaped the iPhone app, where CoreBluetooth and read-only HealthKit feed one labeled pipeline.

The second challenge was privacy without a server. Browser localStorage is plaintext, so I rebuilt storage on AES-256-GCM through Web Crypto with a non-extractable key kept in IndexedDB, then wrote a migration that decrypts legacy JSON, re-encrypts it and deletes the plaintext, with node:test covering round-trips and tampered ciphertext. On iPhone the key lives in the Keychain (device-only) with Complete File Protection. Running Qwen2.5-1.5B through llama.cpp offline took careful ChatML prompt formatting and releasing the model after every answer.

### What I would improve in version 2.0 (≤ 750 characters) — 691 chars
Version 2.0 starts with co-design sessions with autistic people, people living with dementia, caregivers and accessibility specialists, then VoiceOver and Dynamic Type testing on real devices and a TestFlight beta. I will bring real HealthKit and Bluetooth observations into the visit brief with 7/30/90-day filters, add non-diagnostic trends computed only from source-labeled data, offer passphrase-protected encrypted backup and restore that still needs no server, and add Spanish localization. I am deliberately not adding cloud sync, a clinician portal or a drug-interaction checker until there is clinical review and a licensed knowledge base—honesty about limits is part of the design.

---

## Statistics cited on slide 2 (sources)

- 1 in 4 adults 65+ socially isolated — National Academies of Sciences, Engineering, and Medicine, *Social Isolation and Loneliness in Older Adults* (2020).
- 29 % higher risk of premature death from social isolation — U.S. Surgeon General, *Our Epidemic of Loneliness and Isolation* (2023), citing Holt-Lunstad et al. (2015).
- 1 in 31 eight-year-olds identified with autism — CDC ADDM Network, MMWR Surveillance Summaries, April 2025 (2022 data).
- ~50 % of long-term medications not taken as prescribed — World Health Organization, *Adherence to Long-Term Therapies* (2003).
- 63 million family caregivers — AARP & National Alliance for Caregiving, *Caregiving in the US 2025*.
