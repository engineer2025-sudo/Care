# CareSphere AI — Congressional App Challenge 2026 pitch kit

## Latest screenshot-led update

**Recommended:** `CareSphere_Congressional_App_Challenge_Deck_Updated.pptx`.
Preview all 13 slides in `preview-updated/contact-sheet.jpg`.

- Actual CareSphere web screenshots only; no generated photography or imagery.
- Screenshot-led reminders / routines / Coffee Circles slide replaces the competitor comparison.
- Neutral design motivation replaces the unfilled example family story. Add your truthful personal story in narration if desired.
- Privacy language distinguishes local care storage from external Jitsi calls and online reference requests.
- No visible school, city or video-link placeholders; source link and contact details remain.
- Editable text and layouts, five embedded fonts, fade / demo-push / closing transitions.
- Screenshot figures are seeded sample data, not patient outcomes; screenshots are web UI, not native iOS UI.

Rebuild: `python3 pitch/build_deck_updated.py`. The previous A/B decks remain unchanged.
The existing video script needs the revised motivation and everyday-support narration from the updated slide notes; rehearse and keep the final video under three minutes.

Validation: all 17 Node tests passed; PowerPoint reopened with 13 slides; ZIP integrity and XML parsing passed; five font parts present; no visible bracket placeholders.

Everything needed to record the 3-minute submission video.

Two versions of the same 13-slide deck ship side by side. They share the arc, the narration, the slide numbers and
the timings in `VIDEO_SCRIPT.md`, so you can switch between them (or mix slides) without touching the script.

| File | What it is |
|---|---|
| `CareSphere_Congressional_App_Challenge_Deck.pptx` | **Version A — clean.** Translucent panels on the navy gradient, Bold 40 pt headlines, one accent. Previews in `preview/`. |
| `CareSphere_Congressional_App_Challenge_Deck_B.pptx` | **Version B — editorial.** Same palette and type, re-composed: dot-grid backdrop with two soft glows, a faint slide numeral top-right, ExtraBold headlines with the key phrase in the accent, ink-dark cards, layered screenshots (stacked phones on the title, phone over browser on the demo, a heart-rate card over the code), plus three new visuals — an on-device architecture diagram (privacy), a date-proportional six-week timeline (traction) and a need / today / CareSphere comparison table (status quo). Previews in `preview-b/`. |
| both | 16:9, typefaces **embedded** (identical on any PowerPoint 2016+ / 365), speaker notes with the timed narration, and **slide transitions**: a 600 ms fade between slides, a push into the demo slide and a fade-through-black into the close. Set `AUTO_ADVANCE = True` in `build_deck_b.py` to make the slides advance on the script's timings while you record. |
| `VIDEO_SCRIPT.md` | Run-of-show with timings, the click-by-click demo shot list and a recording checklist. |
| `APPLICATION_ANSWERS.md` | The CAC portal form, field by field: what to tick, complete drafts of the six 400-word answers (with word counts and fact notes), the process questions and a pre-submit checklist. |
| `cover/CareSphere_cover_600x800.jpg` | The portal's cover photo — 3:4, 600×800 px JPEG, built from the real icon and a real screenshot (`make_cover.py`; a 1200×1600 version is beside it). |
| `preview/`, `preview-b/` | Pixel-exact renders of each slide (`slide-NN.jpg` + `contact-sheet.jpg`, same fonts, same layout). Use them to check on a phone — or drop them straight into the video editor if you don't have PowerPoint. Transitions only show in PowerPoint / Keynote / Google Slides. |
| `assets/` | Every picture in the deck: real screenshots of the running web app in drawn device frames, the app icon, a QR code to the repo, a soft glow. `assets/extra/` holds spare framed screenshots and crops (SOS, Settings, Visit brief, light theme, high-contrast, games, breathing…) for swapping in or as video B-roll. |
| `fonts/` | Plus Jakarta Sans (Regular / Medium / Bold / ExtraBold) and JetBrains Mono — SIL Open Font License. Embedded in the .pptx; install them only if you edit in Keynote or Google Slides. |
| `build_deck.py`, `build_deck_b.py` | The slide content of Version A / Version B — 13 slides described in plain Python (text, cards, images). Each generates its .pptx **and** its previews; B reuses A's speaker notes so the narration can never drift apart. |
| `deck_engine.py` | The design system (type scale, palette, cards, chips, stats), slide transitions, and the two renderers (python-pptx and Pillow). |
| `embed_fonts.py` | Wraps the TTFs as Embedded OpenType and registers them in the .pptx (`<p:embeddedFontLst>`). |
| `make_assets.py` | Frames screenshots (navy bezel + soft shadow), builds icon / glow / dot-grid backdrop / QR; re-frames existing assets when raw captures are absent. |
| `make_fonts.py` | Regenerates the static font files from Google Fonts' variable sources (needs `fonttools`). |
| `make_cover.py` | Renders the portal cover photo from the same assets as the deck. |
| `tools/` | Headless-Chromium capture scripts that seed realistic demo data into the web app and screenshot every tab, crop and overlay. |

**No AI-generated imagery is used anywhere.** All visuals are screenshots of CareSphere, its icon, or vector shapes drawn by the scripts.

## Design system — everything matches the app icon

- **Colour.** The background is a gradient of the icon's navy (`#0B1733 → #0F2659`); panels are translucent white; the **only accent is the icon's mint-green `#06E288`** (eyebrow labels, key numbers, the CTA). No second or third hue anywhere.
- **Type.** One family, Plus Jakarta Sans: ExtraBold for the two display lines, Bold 40 pt for headlines, Regular/Medium 15–22 pt for body, 11.5 pt tracked capitals for eyebrows. JetBrains Mono for the single code panel.
- **Images.** Real screenshots only, all in the same navy bezel with the same soft shadow and corner radius.
- **Rhythm.** Every content slide: eyebrow + headline at the same position, 0.8" margins, one footer (brand mark left; A adds `NN / 13` right, B a faint numeral top-right).
- **Motion.** Transitions only where they mean something: a quiet fade everywhere, a push when the live demo "enters", a fade through black before the close. No object animations — judges watch a video, not a slideshow.

## Why the deck is built this way

From YC's deck guidance ("legible, simple, obvious"), Kawasaki's 10/20/30 rule, Sequoia's structure and write-ups of
Congressional App Challenge winners: ≤ 12–15 slides, **one idea per slide**, the headline *is* the takeaway, ≈ 30–40 words
per slide, large type, strong contrast, real screenshots instead of clip-art, a source under every statistic, a
**personal story** (what winning CAC videos have in common), a visible roadmap, contact on the first and last slide and a
close that asks for something — never a bare "Thank you". Everything trimmed from the slides lives in the speaker notes.

| # | Slide | Headline | Version B treatment |
|---|---|---|---|
| 1 | Title | CareSphere AI — Connected care for independent living | B: two stacked phones |
| 2 | Why I built it | “[your story]” | B: medication list + reminder toast |
| 3 | Problem | Growing older — or growing up autistic — too often means facing care alone. | B: stat cards |
| 4 | Today | Four apps. Four accounts. Four clouds. | B: need / today / CareSphere table |
| 5 | Solution | One calm app. Five tabs. Zero servers. | B: staggered phones |
| 6 | Live demo | Let's see it. | B: phone over browser + six-shot list |
| 7 | Different | Four rules, written into the code. | B: each rule with its line of code |
| 8 | Audience | Built for three people at once. | B: phones rising out of the cards |
| 9 | Privacy | Everything stays on the device. | B: on-device architecture diagram |
| 10 | Built with | Two clients. One promise. No server. | B: stack chips + metric cards |
| 11 | Hardest problem | Making Bluetooth honest. | B: real HR card over the code |
| 12 | Where it stands | A: Shipped and tested. Next: built with the people it serves. · B: Six weeks from first commit to v2.2. | B: dated timeline + Next / Then / Deliberately not |
| 13 | Close | Care that stays yours. | B: centred, three CTA chips |

## Before you record

1. Replace the remaining placeholders: `[School]`, `[City]`, `[grade]` (slides 1, 2, 13) and `[YouTube link]` (slide 13). Name, district and email are filled in.
2. Write **your own story** on slide 2 — one or two sentences about a real person and a real moment (edit in PowerPoint or in `build_deck.py` and rebuild).
3. Follow `VIDEO_SCRIPT.md`: slides 1 → 2 → 3 → 4 → 5 → 6 *(screen recording)* → 7 … 13, about 2:50 in total.
4. Fill the portal from `APPLICATION_ANSWERS.md` (answers, cover photo, links) and save a draft there early.

## Rebuilding

```bash
pip install python-pptx pillow qrcode fonttools    # Python 3.10+
python3 pitch/build_deck.py                         # Version A → .pptx (fonts embedded, transitions) + preview/
python3 pitch/build_deck_b.py                       # Version B → _B.pptx + preview-b/
python3 pitch/make_assets.py                        # re-frames screenshots, rebuilds icon / glow / backdrop / QR
```

To re-capture screenshots: `npm run build && npx serve -s dist -l 4173`, then in `pitch/tools`
`npm install && node capture.js && node capture2.js && node capture3.js` (writes `tools/out/`, which is git-ignored),
and run `make_assets.py` again.

## Facts used in the deck

All feature claims were read from the code (`src/App.jsx`, `src/lib/*`, `ios/CareSphere/**`, `docs/*`, `ROADMAP.md`):
BLE service 0x180D / 0x2A37 and the connection generation counter (the code panel on slide 11 quotes `src/lib/bluetooth.js` and `src/App.jsx` verbatim), 15-second reminder loop with 10-minute snooze, local-midnight day keys, AES-256-GCM with a non-extractable Web Crypto key / device-only Keychain key, Jitsi External API + JitsiMeetSDK 13.1, Qwen2.5-1.5B Q4_K_M via llama.cpp (`n_ctx = 2048`, ChatML prompt), MedlinePlus XML + Kiwix ZIM, Kokoro via Sherpa-ONNX, support check-in thresholds (110 bpm / 90 s / 30-min cooldown), 17 node:test cases, two GitHub Actions workflows, three public GitHub releases (v1.0, v2.0, v2.1), and the line counts (3,420 web + 7,741 Swift). Public-health statistics and their sources are listed at the end of `VIDEO_SCRIPT.md`.

## 36 iPhone-framed screenshots

The downloadable ZIP is stored in `pitch/downloads/CareSphere_iPhone_Screenshots_36.zip`. It contains 36 numbered high-resolution PNGs,
a visual index, and provenance notes. Captures are the mobile web app with
fictional sample data, not native iOS screenshots. Frames are script-drawn;
no AI-generated imagery is used.

Reproduce with `node pitch/tools/capture_gallery.js` (requires the app on port
4173 and Chromium runtime dependencies), then
`python3 pitch/make_screenshot_gallery.py`. Output stays in ignored
`deliverables/`; raw captures stay in ignored `pitch/tools/out-gallery/`.
