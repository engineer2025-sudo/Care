# CareSphere AI — Congressional App Challenge 2026 video script

Target length: **2:50** (hard limit is 3:00). Slide narration is ~320 words plus ~110 words over the demo —
a calm 150–155 words per minute. If your first take runs long, drop the optional sentence on slide 3 and tighten
demo shots 4 and 5.

Judges' checklist covered: student name(s) ✔ app name ✔ purpose ✔ intended audience ✔ tools & languages ✔
app shown in use ✔ (plus the three written-answer themes: challenge, how it was overcome, version 2.0).

Fill in every `[bracket]` before recording. Slide numbers refer to
`CareSphere_Congressional_App_Challenge_Deck.pptx` — the speaker notes of each slide contain the same lines.

---

## Run of show

| Time | On screen | Say |
|---|---|---|
| 0:00–0:15 | **Slide 1** — title | Hi, I'm **[Name]**, a **[grade]** at **[School]** in **[City]**, California. This is **CareSphere AI** — a private care companion for older adults, autistic people and the families who look after them, on iPhone and on the web. |
| 0:15–0:31 | **Slide 2** — problem | One in four older adults is socially isolated — a twenty-nine percent higher risk of early death. One in thirty-one children is autistic, and they become adults who still need support. Half of long-term medications aren't taken as prescribed. |
| 0:31–0:43 | **Slide 3** — today | Today a family juggles a medication app, a video app, a health portal and a family-update site — four accounts, four clouds — and none was designed for autistic users. *(Optional, one sentence: why you built it — e.g. "My grandmother lives alone, and every call started with: did you take your pills? did you talk to anyone today?")* |
| 0:43–0:53 | **Slide 4** — solution | CareSphere is one calm app with five tabs — Overview, Activities, Coffee Circles, Care Circle and Vitals — with no server behind any of it. |
| 0:53–1:40 | **Slide 5 → screen recording** | Let me show you. *(narrate the shot list below)* |
| 1:40–1:51 | **Slide 6** — four rules | What makes it different isn't a feature — it's four rules in the code: never fabricate a reading, never send anything automatically, calm by default, private by architecture. |
| 1:51–1:58 | **Slide 7** — audience | Three people who rarely get the same app: older adults, autistic teens and adults, and their caregivers. |
| 1:58–2:09 | **Slide 8** — privacy | Everything stays on the device: AES-256 encryption, Bluetooth and HealthKit read locally, and a 1.5-billion-parameter model that answers health questions offline. Zero accounts, zero servers, zero trackers. |
| 2:09–2:20 | **Slide 9** — built with | It's React and JavaScript on the web, Swift and SwiftUI on iPhone — Web Bluetooth, HealthKit, CryptoKit and llama.cpp. Eleven thousand lines, seventeen tests, three public releases. |
| 2:20–2:33 | **Slide 10** — hardest problem | The hardest problem was keeping Bluetooth honest. Notifications arrive late and out of order, so I parse the standard profile, label every sample at the source, and drop stale sessions with a generation counter. |
| 2:33–2:45 | **Slide 11** — next | Version 2.0 starts with co-design sessions with autistic people, people living with dementia and caregivers, then a TestFlight beta and sensor history in the visit brief — still with no server. |
| 2:45–2:51 | **Slide 12** — close | CareSphere AI — care that stays yours. The code and install guide are on GitHub. Thank you. |

---

## Demo shot list (0:53–1:40, ~47 seconds)

Record the **web app** in Chrome or Edge (needed for Web Bluetooth) at 1920×1080. Keep the cursor slow;
each shot is 6–9 seconds. Shots 7 and 8 are optional extras — use them only if the take is comfortably under 3:00.

Prepare before recording (so the screen is not empty):
- Settings → **Profile name**: your first name. Routines → **Customize**: add 4–5 items, tick two.
- Settings → **Medication schedule**: add two medicines; tick the "I reviewed every saved medication…" checkbox.
- Care Circle: post two or three care notes. Turn on **Voice reminders** in Settings if you want the spoken prompt audible.

| # | Where | Do | Say |
|---|---|---|---|
| 1 | Overview | Tap a mood face ("Today: feeling good" appears); tick one routine item (count goes up). | A one-tap mood check-in and a routine that resets every midnight. |
| 2 | Settings → Medication schedule | Add "Vitamin D" at the **next minute**, tick the review checkbox, close. When the toast appears ("Time for Vitamin D"), tap **Taken**. | Reminders start only after you confirm the schedule yourself — and "Taken" is a self-report, never a verified dose. |
| 3 | Vitals & Telehealth | With a Bluetooth heart-rate strap or a watch that broadcasts HR: **Pair real monitor** → pick the device → the card shows **LIVE BLE** and a moving sparkline. Otherwise tap **Start labeled demo** and point at the **SIMULATED** chips. Tap **Export CSV**. | Real Web Bluetooth. Every card is labeled live or simulated, and the label travels into the CSV. |
| 4 | Activities | **Start pattern** in Pattern Recall and repeat it; tap **Rain** in Soundscapes (2 s), **Stop**. | Untimed, unscored activities; the soundscapes are synthesized live — no audio files. |
| 5 | Coffee Circles | Tap **Join in app** on "Morning Sunshine Tea & Chat"; allow camera/mic; show the room for 3 s; leave. | Coffee Circles are real video rooms — no account, nothing to install. |
| 6 | Care Circle | **Prepare visit brief** → tick "Medication reminders", type a question → **Exact file preview** → **Download .txt**. | Before a doctor's visit you choose what goes in the brief, see the exact text and download it. Nothing is uploaded. |
| 7 *(optional)* | Settings | Switch **Text size** to **A++**, theme to **Warm light**, scroll to **Privacy & your data**. | Three text sizes, warm-light and high-contrast themes — and every byte encrypted on the device. |
| 8 *(optional)* | iPhone → Health Guide | Ask "What helps with leg cramps at night?" Show the MedlinePlus sources and the on-device answer. | On iPhone, a 1.5-billion-parameter model answers health questions fully offline, behind a safety gate. |

Tip: if shot 2's timing is awkward, record it separately and cut it in. Keep the microphone narration continuous.

---

## Recording checklist

- Deck in **Slide Show** mode, 16:9, 1080p export; record with OBS, QuickTime or Zoom (local recording).
- Browser zoom 100 %, window 1920×1080, no bookmarks bar, no other tabs. Use the **calm charcoal** theme for the demo (matches the screenshots in the deck).
- Say your name and "CareSphere AI" in the first ten seconds (judging requirement).
- Replace `[Student Name]`, `[School]`, `[City]`, `[email]`, `[CA-XX]` (slide 1) and `[YouTube link]` (slide 12) before exporting.
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
