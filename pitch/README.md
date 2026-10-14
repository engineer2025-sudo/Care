# CareSphere AI — Congressional App Challenge 2026 pitch kit

Everything needed to record the 3-minute submission video.

| File | What it is |
|---|---|
| `CareSphere_Congressional_App_Challenge_Deck.pptx` | 19-slide editable deck (16:9, Arial, dark CareSphere palette). Speaker notes on every slide carry the timed narration. |
| `VIDEO_SCRIPT.md` | Run-of-show with timings, the click-by-click demo shot list, a recording checklist, and drafts of the three CAC written answers (within the 350 / 1,500 / 750-character limits). |
| `preview/slide-NN.jpg`, `preview/contact-sheet.jpg` | Rendered previews of each slide — handy for checking on a phone or sharing without PowerPoint. |
| `assets/` | Every picture used in the deck: real screenshots of the running web app wrapped in drawn phone/browser frames, the app icon, a QR code to the repo, and a blurred glow. `assets/extra/` holds spare framed screenshots (SOS, Settings, Visit brief, light theme, high-contrast, Vitals) for swapping in or for video B-roll. |
| `build_deck.py` | Generates the .pptx **and** the previews from one slide description. |
| `make_assets.py` | Turns raw captures into framed/trimmed assets and the QR code. |
| `tools/` | Headless-Chromium capture scripts that seed realistic demo data into the web app and screenshot every tab, crop and overlay. |

**No AI-generated imagery is used anywhere.** All visuals are screenshots of CareSphere, its icon, or vector shapes drawn by the scripts.

## Before you record

1. Replace the placeholders: `[CA-XX]`, `[Student Name]`, `[Grade]`, `[School]`, `[City]`, `[email]`, `[YouTube link]` (slides 1, 3, 19) and the personal-story sentence on slide 3.
2. Add a real iPhone screenshot of the Health Guide tab: either paste it over the dashed box on slide 13 in PowerPoint, or save it as `assets/iphone-health-guide.png` and rebuild.
3. Follow `VIDEO_SCRIPT.md`. The deck slides used in the 3-minute cut are 1 → 2 → 3 → 4/5 → 6 → *(demo)* → 15 → 16 → 18 → 19; slides 7–14 and 17 are appendix/overlay material.

## Rebuilding

```bash
pip install python-pptx pillow qrcode            # Python 3.10+
# Preview fonts (metric-compatible with Arial / Courier New): Arimo + Cousine from Google Fonts (OFL)
#   → put Arimo[wght].ttf, Arimo-Italic[wght].ttf, Cousine-Regular.ttf in ~/fonts (or set PITCH_FONT_DIR)
python3 pitch/make_assets.py                      # only needed if raw captures changed
python3 pitch/build_deck.py                       # writes the .pptx + preview/
```

To re-capture screenshots: `npm run build && npx serve -s dist -l 4173`, then in `pitch/tools`
`npm install && node capture.js && node capture2.js && node capture3.js` (writes `tools/out/`, which is git-ignored).

## Facts used in the deck

All feature claims were read from the code (`src/App.jsx`, `src/lib/*`, `ios/CareSphere/**`, `docs/*`, `ROADMAP.md`):
BLE service 0x180D / 0x2A37 and the connection generation counter, 15-second reminder loop with 10-minute snooze, local-midnight day keys, AES-256-GCM with a non-extractable Web Crypto key / device-only Keychain key, Jitsi External API + JitsiMeetSDK 13.1, Qwen2.5-1.5B Q4_K_M via llama.cpp (`n_ctx = 2048`, ChatML prompt), MedlinePlus XML + Kiwix ZIM, Kokoro via Sherpa-ONNX, support check-in thresholds (110 bpm / 90 s / 30-min cooldown), 17 node:test cases, two GitHub Actions workflows, and the line counts (3,420 web + 7,741 Swift). Public-health statistics and their sources are listed at the end of `VIDEO_SCRIPT.md`.
