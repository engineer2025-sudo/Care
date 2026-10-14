# CareSphere AI — Congressional App Challenge 2026 pitch kit

Everything needed to record the 3-minute submission video.

| File | What it is |
|---|---|
| `CareSphere_Congressional_App_Challenge_Deck.pptx` | 12-slide editable deck (16:9, Arial, deep-blue minimalist theme). Speaker notes on every slide carry the timed narration. |
| `VIDEO_SCRIPT.md` | Run-of-show with timings, the click-by-click demo shot list, a recording checklist, and drafts of the three CAC written answers (within the 350 / 1,500 / 750-character limits). |
| `preview/slide-NN.jpg`, `preview/contact-sheet.jpg` | Rendered previews of each slide — handy for checking on a phone or sharing without PowerPoint. |
| `assets/` | Every picture used in the deck: real screenshots of the running web app wrapped in drawn phone/browser frames, the app icon, a QR code to the repo, and a soft glow. `assets/extra/` holds spare framed screenshots and crops (SOS, Settings, Visit brief, light theme, high-contrast, games, breathing…) for swapping in or for video B-roll. |
| `build_deck.py` | The slide content — 12 slides described in plain Python (text, cards, images). Generates the .pptx **and** the previews. |
| `deck_engine.py` | The shared theme (colours, type scale, cards, chips) and the two renderers (python-pptx and Pillow). |
| `make_assets.py` | Turns raw captures into framed/trimmed assets and the QR code; parks unused assets in `assets/extra/`. |
| `fonts/` | Arimo + Cousine (SIL Open Font License) — metric-compatible with Arial / Courier New, used only to render previews. |
| `tools/` | Headless-Chromium capture scripts that seed realistic demo data into the web app and screenshot every tab, crop and overlay. |

**No AI-generated imagery is used anywhere.** All visuals are screenshots of CareSphere, its icon, or vector shapes drawn by the scripts.

## How the deck is organised

The deck follows the arc investors and judges expect — hook → problem → status quo → solution → demo →
differentiation → audience → privacy/why now → how it's built → hardest problem → traction & roadmap → close — and
the design rules that separate good pitch decks from bad ones: one idea per slide, the headline *is* the
takeaway, ≤ ~35 words of body text, big type (headlines 36–62 pt, body ≥ 14 pt), real product screenshots instead
of decoration, a source on every statistic, contact details on the first slide, and a close that asks for something.

| # | Slide | Headline |
|---|---|---|
| 1 | Title | CareSphere AI — Connected care for independent living |
| 2 | Problem | Growing older — or growing up autistic — too often means facing care alone. |
| 3 | Today | Families juggle four apps, four accounts — and hand their health data to the cloud. |
| 4 | Solution | One calm app. Five tabs. Zero servers. |
| 5 | Live demo | Let's see it. |
| 6 | Different | Four rules, written into the code. |
| 7 | Audience | Three people who rarely get the same app. |
| 8 | Privacy | Everything stays on the device. |
| 9 | Built with | Two clients. One promise. No server. |
| 10 | Hardest problem | Making Bluetooth honest. |
| 11 | Where it stands | Shipped, tested — and next, built with the people it serves. |
| 12 | Close | Care that stays yours. |

## Before you record

1. Replace the placeholders: `[Student Name]`, `[School]`, `[City]`, `[email]`, `[CA-XX]` on slide 1 and
   `[Student Name]`, `[email]`, `[YouTube link]` on slide 12 (edit in PowerPoint or in `build_deck.py` and rebuild).
2. Optionally add your own one-sentence story to the slide-3 narration (see `VIDEO_SCRIPT.md`).
3. Follow `VIDEO_SCRIPT.md`: slides 1 → 2 → 3 → 4 → 5 *(screen recording)* → 6 → 7 → 8 → 9 → 10 → 11 → 12, about 2:50 in total.

## Rebuilding

```bash
pip install python-pptx pillow qrcode            # Python 3.10+
python3 pitch/build_deck.py                       # writes the .pptx + preview/ (fonts ship in pitch/fonts)
python3 pitch/make_assets.py                      # regenerates icon / glow / QR; re-frames screenshots if tools/out exists
```

To re-capture screenshots: `npm run build && npx serve -s dist -l 4173`, then in `pitch/tools`
`npm install && node capture.js && node capture2.js && node capture3.js` (writes `tools/out/`, which is git-ignored),
and run `make_assets.py` again.

## Facts used in the deck

All feature claims were read from the code (`src/App.jsx`, `src/lib/*`, `ios/CareSphere/**`, `docs/*`, `ROADMAP.md`):
BLE service 0x180D / 0x2A37 and the connection generation counter, 15-second reminder loop with 10-minute snooze, local-midnight day keys, AES-256-GCM with a non-extractable Web Crypto key / device-only Keychain key, Jitsi External API + JitsiMeetSDK 13.1, Qwen2.5-1.5B Q4_K_M via llama.cpp (`n_ctx = 2048`, ChatML prompt), MedlinePlus XML + Kiwix ZIM, Kokoro via Sherpa-ONNX, support check-in thresholds (110 bpm / 90 s / 30-min cooldown), 17 node:test cases, two GitHub Actions workflows, three public GitHub releases (v1.0, v2.0, v2.1), and the line counts (3,420 web + 7,741 Swift). Public-health statistics and their sources are listed at the end of `VIDEO_SCRIPT.md`.
