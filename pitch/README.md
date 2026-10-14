# CareSphere AI — Congressional App Challenge 2026 pitch kit

Everything needed to record the 3-minute submission video.

| File | What it is |
|---|---|
| `CareSphere_Congressional_App_Challenge_Deck.pptx` | 13-slide editable deck, 16:9, with the typefaces **embedded** so it looks the same on any PowerPoint (2016+ / 365). Speaker notes on every slide carry the timed narration. |
| `VIDEO_SCRIPT.md` | Run-of-show with timings, the click-by-click demo shot list, a recording checklist, and drafts of the three CAC written answers (within the 350 / 1,500 / 750-character limits). |
| `preview/slide-NN.jpg`, `preview/contact-sheet.jpg` | Pixel-exact renders of each slide (same fonts, same layout). Use them to check on a phone — or drop them straight into the video editor if you don't have PowerPoint. |
| `assets/` | Every picture in the deck: real screenshots of the running web app in drawn device frames, the app icon, a QR code to the repo, a soft glow. `assets/extra/` holds spare framed screenshots and crops (SOS, Settings, Visit brief, light theme, high-contrast, games, breathing…) for swapping in or as video B-roll. |
| `fonts/` | Plus Jakarta Sans (Regular / Medium / Bold / ExtraBold) and JetBrains Mono — SIL Open Font License. Embedded in the .pptx; install them only if you edit in Keynote or Google Slides. |
| `build_deck.py` | The slide content — 13 slides described in plain Python (text, cards, images). Generates the .pptx **and** the previews. |
| `deck_engine.py` | The design system (type scale, palette, cards, chips, stats) and the two renderers (python-pptx and Pillow). |
| `embed_fonts.py` | Wraps the TTFs as Embedded OpenType and registers them in the .pptx (`<p:embeddedFontLst>`). |
| `make_assets.py` | Frames screenshots (navy bezel + soft shadow), builds icon / glow / QR; re-frames existing assets when raw captures are absent. |
| `make_fonts.py` | Regenerates the static font files from Google Fonts' variable sources (needs `fonttools`). |
| `tools/` | Headless-Chromium capture scripts that seed realistic demo data into the web app and screenshot every tab, crop and overlay. |

**No AI-generated imagery is used anywhere.** All visuals are screenshots of CareSphere, its icon, or vector shapes drawn by the scripts.

## Design system — everything matches the app icon

- **Colour.** The background is a gradient of the icon's navy (`#0B1733 → #0F2659`); panels are translucent white; the **only accent is the icon's mint-green `#06E288`** (eyebrow labels, key numbers, the CTA). No second or third hue anywhere.
- **Type.** One family, Plus Jakarta Sans: ExtraBold for the two display lines, Bold 40 pt for headlines, Regular/Medium 15–22 pt for body, 11.5 pt tracked capitals for eyebrows. JetBrains Mono for the single code panel.
- **Images.** Real screenshots only, all in the same navy bezel with the same soft shadow and corner radius.
- **Rhythm.** Every content slide: eyebrow + headline at the same position, 0.8" margins, one footer (brand mark left, `NN / 13` right).

## Why the deck is built this way

From YC's deck guidance ("legible, simple, obvious"), Kawasaki's 10/20/30 rule, Sequoia's structure and write-ups of
Congressional App Challenge winners: ≤ 12–15 slides, **one idea per slide**, the headline *is* the takeaway, ≈ 30–40 words
per slide, large type, strong contrast, real screenshots instead of clip-art, a source under every statistic, a
**personal story** (what winning CAC videos have in common), a visible roadmap, contact on the first and last slide and a
close that asks for something — never a bare "Thank you". Everything trimmed from the slides lives in the speaker notes.

| # | Slide | Headline |
|---|---|---|
| 1 | Title | CareSphere AI — Connected care for independent living |
| 2 | Why I built it | “[your story]” |
| 3 | Problem | Growing older — or growing up autistic — too often means facing care alone. |
| 4 | Today | Four apps. Four accounts. Four clouds. |
| 5 | Solution | One calm app. Five tabs. Zero servers. |
| 6 | Live demo | Let's see it. |
| 7 | Different | Four rules, written into the code. |
| 8 | Audience | Built for three people at once. |
| 9 | Privacy | Everything stays on the device. |
| 10 | Built with | Two clients. One promise. No server. |
| 11 | Hardest problem | Making Bluetooth honest. |
| 12 | Where it stands | Shipped and tested. Next: built with the people it serves. |
| 13 | Close | Care that stays yours. |

## Before you record

1. Replace the placeholders: `[Student Name]`, `[School]`, `[City]`, `[email]`, `[CA-XX]` (slides 1, 2, 13) and `[YouTube link]` (slide 13).
2. Write **your own story** on slide 2 — one or two sentences about a real person and a real moment (edit in PowerPoint or in `build_deck.py` and rebuild).
3. Follow `VIDEO_SCRIPT.md`: slides 1 → 2 → 3 → 4 → 5 → 6 *(screen recording)* → 7 … 13, about 2:50 in total.

## Rebuilding

```bash
pip install python-pptx pillow qrcode fonttools    # Python 3.10+
python3 pitch/build_deck.py                         # writes the .pptx (fonts embedded) + preview/
python3 pitch/make_assets.py                        # re-frames screenshots, rebuilds icon / glow / QR
```

To re-capture screenshots: `npm run build && npx serve -s dist -l 4173`, then in `pitch/tools`
`npm install && node capture.js && node capture2.js && node capture3.js` (writes `tools/out/`, which is git-ignored),
and run `make_assets.py` again.

## Facts used in the deck

All feature claims were read from the code (`src/App.jsx`, `src/lib/*`, `ios/CareSphere/**`, `docs/*`, `ROADMAP.md`):
BLE service 0x180D / 0x2A37 and the connection generation counter (the code panel on slide 11 quotes `src/lib/bluetooth.js` and `src/App.jsx` verbatim), 15-second reminder loop with 10-minute snooze, local-midnight day keys, AES-256-GCM with a non-extractable Web Crypto key / device-only Keychain key, Jitsi External API + JitsiMeetSDK 13.1, Qwen2.5-1.5B Q4_K_M via llama.cpp (`n_ctx = 2048`, ChatML prompt), MedlinePlus XML + Kiwix ZIM, Kokoro via Sherpa-ONNX, support check-in thresholds (110 bpm / 90 s / 30-min cooldown), 17 node:test cases, two GitHub Actions workflows, three public GitHub releases (v1.0, v2.0, v2.1), and the line counts (3,420 web + 7,741 Swift). Public-health statistics and their sources are listed at the end of `VIDEO_SCRIPT.md`.
