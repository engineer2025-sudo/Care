# CareSphere AI — Congressional App Challenge 2026 video script

Target length: **2:50** (hard limit is 3:00). Slide narration is ~320 words plus ~100 words over the demo —
a calm 150–155 words per minute. If your first take runs long, shorten your story on slide 2 and tighten
demo shots 4 and 5.

Judges' checklist covered: student name(s) ✔ app name ✔ purpose ✔ intended audience ✔ tools & languages ✔
app shown in use ✔ (plus the three written-answer themes: challenge, how it was overcome, version 2.0).

Fill in every `[bracket]` before recording. Slide numbers are the same in both decks
(`CareSphere_Congressional_App_Challenge_Deck.pptx` — Version A, and `..._Deck_B.pptx` — Version B); the speaker
notes of each slide contain the same lines. Slide 12's headline differs (A: "Shipped and tested…", B: "Six weeks from
first commit to v2.2.") — the narration below fits both.

---

## Run of show

| Time | On screen | Say |
|---|---|---|
| 0:00–0:14 | **Slide 1** — title | Hi, I'm **Arnav Kochar**, a **[grade]** at **[School]** in **[City]**, California. This is **CareSphere AI** — a private care companion for older adults, autistic people and their families, on iPhone and on the web. |
| 0:14–0:26 | **Slide 2** — why I built it | **[Your story in one sentence — name a specific person and a specific moment. e.g. "My grandmother lives alone, and every call started the same way: did you take your pills? did you talk to anyone today?"]** So I built the app I wished she had: calm, honest, and private by design. |
| 0:26–0:39 | **Slide 3** — problem | One in four older adults is socially isolated — a twenty-nine percent higher risk of early death. One in thirty-one children is autistic. Half of long-term medications aren't taken as prescribed. And sixty-three million family caregivers hold it all together. |
| 0:39–0:47 | **Slide 4** — today | Today a family juggles four apps — four accounts, four clouds — and none of them was designed for autistic users. |
| 0:47–0:57 | **Slide 5** — solution | CareSphere is one calm app with five tabs — Overview, Activities, Coffee Circles, Care Circle and Vitals — with no server behind any of it. |
| 0:57–1:42 | **Slide 6 → screen recording** | Let me show you. *(narrate the shot list below)* |
| 1:42–1:53 | **Slide 7** — four rules | What makes it different isn't a feature — it's four rules in the code: never fabricate a reading, never send anything automatically, calm by default, private by architecture. |
| 1:53–2:01 | **Slide 8** — audience | It's built for three people at once: older adults, autistic teens and adults, and the caregivers who support them. |
| 2:01–2:12 | **Slide 9** — privacy | Everything stays on the device: AES-256 encryption, Bluetooth and HealthKit read locally, and a 1.5-billion-parameter model that answers health questions offline. Zero accounts, zero servers, zero trackers. |
| 2:12–2:23 | **Slide 10** — built with | It's React and JavaScript on the web, Swift and SwiftUI on iPhone — Web Bluetooth, HealthKit, CryptoKit and llama.cpp. Eleven thousand lines, seventeen tests, three public releases. |
| 2:23–2:35 | **Slide 11** — hardest problem | The hardest problem was keeping Bluetooth honest: notifications arrive late and out of order, so I label every sample live or simulated at the source and drop stale sessions with a generation counter. |
| 2:35–2:47 | **Slide 12** — next | Version 2.0 starts with co-design sessions with autistic people, people living with dementia and caregivers, then a TestFlight beta and sensor history in the visit brief — still with no server. |
| 2:47–2:53 | **Slide 13** — close | CareSphere AI — care that stays yours. The code and install guide are on GitHub. Thank you. |

---

## Demo shot list (0:57–1:42, ~45 seconds)

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
- Replace `[School]`, `[City]`, `[grade]` (slides 1, 2, 13), your story (slide 2) and `[YouTube link]` (slide 13) before exporting — name, district (CA-10) and email are already filled in.
- Upload the video as **public** on YouTube or Vimeo; paste the link into the CAC portal before **Oct 26, 2026, 12:00 PM ET**.

---

## Written answers (CAC portal)

The portal's "Full Application" has six long answers (400 words each), plus the language / platform / cover-photo
fields. Complete drafts, word counts, the cover photo and a pre-submit checklist are in **`APPLICATION_ANSWERS.md`**.

---

## Statistics cited on slide 3 (sources)

- 1 in 4 adults 65+ socially isolated — National Academies of Sciences, Engineering, and Medicine, *Social Isolation and Loneliness in Older Adults* (2020).
- 29 % higher risk of premature death from social isolation — U.S. Surgeon General, *Our Epidemic of Loneliness and Isolation* (2023), citing Holt-Lunstad et al. (2015).
- 1 in 31 eight-year-olds identified with autism — CDC ADDM Network, MMWR Surveillance Summaries, April 2025 (2022 data).
- ~50 % of long-term medications not taken as prescribed — World Health Organization, *Adherence to Long-Term Therapies* (2003).
- 63 million family caregivers — AARP & National Alliance for Caregiving, *Caregiving in the US 2025*.
