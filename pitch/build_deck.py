#!/usr/bin/env python3
"""CareSphere AI — Congressional App Challenge 2026 pitch deck (minimalist, blue, business-pitch style).

Design rules applied — distilled from Kawasaki's 10/20/30 rule, YC / Sequoia deck guidance and
post-mortems of weak decks:
  * 12 slides, ONE idea per slide, the headline IS the takeaway (never a label like "Overview")
  * ≤ ~40 words per slide, ~450 words in the whole deck (investors skim a deck in ~3 minutes)
  * big type: headlines 40–64 pt, body ≥ 17 pt (only source lines are smaller), lots of empty space
  * real screenshots instead of decoration; no icons, clip-art, animations or gimmicks
  * a source under every statistic, contact on slide 1, a memorable close with a call to action
  * everything cut from the slides lives in the speaker notes, so the narration loses nothing

Every image is a real screenshot of CareSphere, its icon, or a shape drawn here.
Usage:  python3 build_deck.py
"""
from pathlib import Path

from deck_engine import (ACCENT, ACCENT_D, BG, BORDER, CW, DIM, H, M, MUTED, PANEL, PANEL2, ROSE, SKY, TEXT, TEXT2,
                         VIOLET, W, WARM, WHITE, Deck, pil_font)

ROOT = Path(__file__).resolve().parent
OUT_PPTX = ROOT / 'CareSphere_Congressional_App_Challenge_Deck.pptx'
PREVIEW = ROOT / 'preview'
TITLE = 40  # headline size on content slides


def build() -> Deck:
    d = Deck()

    # 1 ------------------------------------------------------------- Title
    s = d.slide(footer=False)
    s.image('glow', 6.6, -2.6, 10, 10)
    s.image('icon', M, 1.3, 1.05, 1.05, r=0.24)
    s.text(M, 2.6, 7.8, 1.3, 'CareSphere AI', size=64, color=WHITE, bold=True, anchor='m', fit=False)
    s.text(M, 3.9, 7.6, 0.6, 'Connected care for independent living', size=28, color=ACCENT)
    s.text(M, 4.65, 7.4, 1.0, 'A private care companion for older adults, autistic people and their families.',
           size=20, color=TEXT2, lh=1.3)
    s.text(M, 6.0, 7.6, 0.4, '[Student Name]  ·  [School], [City], CA  ·  [email@example.com]', size=16, color=WHITE, bold=True)
    s.text(M, 6.45, 7.4, 0.35, 'Congressional App Challenge 2026  ·  [CA-XX]', size=13, color=MUTED)
    s.image('phone-overview', 8.9, 0.55, h=6.6)
    s.notes = ("[0:00–0:15] Hi, I'm [NAME], a [GRADE] at [SCHOOL] in [CITY], California. This is CareSphere AI — a private care "
               "companion for older adults, autistic people and the families who look after them, on iPhone and on the web.")

    # 2 ----------------------------------------------------------- Problem
    s = d.slide()
    s.header('The problem', 'Growing older — or growing up autistic — often means facing care alone.', title_size=TITLE)
    stats = [('1 in 4', 'older adults are socially isolated', 'NASEM, 2020', ACCENT),
             ('1 in 31', 'children are autistic', 'CDC, 2025', VIOLET),
             ('50%', 'of long-term medicines are not taken as prescribed', 'WHO', WARM)]
    cw = (CW - 2 * 0.5) / 3
    for i, (n, l, src, c) in enumerate(stats):
        x = M + i * (cw + 0.5)
        s.text(x, 2.6, cw, 1.4, n, size=80, color=c, bold=True, anchor='m', fit=False)
        s.text(x, 4.1, cw, 1.0, l, size=22, color=TEXT, lh=1.2)
        s.text(x, 5.15, cw, 0.35, src, size=12, color=DIM)
    s.text(M, 6.15, CW, 0.5, 'Behind them: 63 million family caregivers.', size=20, color=MUTED)
    s.text(M + 6.2, 6.21, 4, 0.4, 'AARP & NAC, 2025', size=12, color=DIM)
    s.notes = ("[0:15–0:31] One in four older adults is socially isolated — a twenty-nine percent higher risk of early death. "
               "One in thirty-one children is autistic, and they become adults who still need support. Half of long-term "
               "medications aren't taken as prescribed. And sixty-three million family caregivers hold it all together.")

    # 3 ----------------------------------------------------- How they cope
    s = d.slide()
    s.header('Today', 'Four apps. Four accounts. Four clouds.', title_size=TITLE)
    apps = ['Medication\napp', 'Video\ncalls', 'Health\nrecord', 'Family\nupdates']
    bw, bh, gap = 1.9, 2.1, 0.22
    y0 = 2.75
    for i, t in enumerate(apps):
        x = M + i * (bw + gap)
        s.card(x, y0, bw, bh, fill=PANEL)
        s.text(x + 0.3, y0 + 0.3, bw - 0.5, 1.0, t.split('\n'), size=21, color=WHITE, bold=True, lh=1.1)
        s.text(x + 0.3, y0 + 1.5, bw - 0.5, 0.4, 'account · cloud', size=14, color=ROSE, bold=True)
    ax = M + 4 * (bw + gap) - gap + 0.12
    s.line(ax, y0 + bh / 2, ax + 0.6, y0 + bh / 2, color=ACCENT, lw=2.5, arrow=True)
    cx = ax + 0.8
    cw = W - M - cx
    s.card(cx, y0 - 0.25, cw, bh + 0.5, fill=ACCENT_D)
    s.text(cx + 0.3, y0 - 0.05, cw - 0.5, 0.5, 'CareSphere', size=22, color=WHITE, bold=True)
    s.text(cx + 0.3, y0 + 0.55, cw - 0.5, 1.7, ['**1** app', '**0** accounts', '**0** clouds'], size=22, color=TEXT, lh=1.25,
           space_after=2, strong=WHITE)
    s.text(M, 5.75, CW, 0.4, 'Medisafe · FaceTime · MyChart · CaringBridge — none designed for autistic users.', size=16, color=MUTED)
    s.notes = ("[0:31–0:43] Today a family juggles a medication app, a video app, a health portal and a family-update site — "
               "four accounts, four clouds — and none was designed for autistic users. (Optional: one sentence on why you built it.)")

    # 4 ------------------------------------------------------------ Solution
    s = d.slide()
    s.header('The solution', 'One calm app. Five tabs. Zero servers.', title_size=TITLE)
    phones = [('phone-overview', 'Overview'), ('phone-activities', 'Activities'), ('phone-circles', 'Coffee Circles'),
              ('phone-care', 'Care Circle'), ('phone-vitals', 'Vitals')]
    pw = 2.05
    gap = (CW - 5 * pw) / 4
    for i, (img, t) in enumerate(phones):
        x = M + i * (pw + gap)
        s.image(img, x, 1.95, w=pw, h=4.45, valign='t')
        s.text(x, 6.5, pw, 0.4, t, size=17, color=WHITE, bold=True, align='c')
    s.notes = ("[0:43–0:53] CareSphere is one calm app with five tabs — Overview for routines, mood and medication check-ins; "
               "Activities with sensory and memory tools; Coffee Circles, live video rooms; Care Circle for notes and visit prep; "
               "and Vitals with real Bluetooth heart rate — on iPhone and on the web, with no server behind any of it.")

    # 5 ---------------------------------------------------------- Product/demo
    s = d.slide()
    s.header('Live demo', "Let's see it.", title_size=TITLE)
    s.image('web-overview', M, 1.75, w=8.0, h=5.0, valign='t')
    cx = M + 8.3
    items = [('Real video rooms', 'no account needed'),
             ('Honest vitals', 'every card says LIVE or SIMULATED'),
             ('A brief you control', 'pick · preview · download')]
    y = 2.0
    for t, sub in items:
        s.text(cx, y, W - M - cx, 0.45, t, size=21, color=WHITE, bold=True)
        s.text(cx, y + 0.5, W - M - cx, 0.7, sub, size=17, color=TEXT2, lh=1.25)
        y += 1.6
    s.chip(M, 6.9, 'recorded on the real app — nothing staged', color=WARM, size=10, h=0.3)
    s.notes = ("[0:53–1:40] Let me show you. (Switch to the screen recording — six shots, see VIDEO_SCRIPT.md: mood check-in and "
               "routine; medication reminder and Taken; Bluetooth pairing or the labeled demo plus Export CSV; Pattern Recall and "
               "the Rain soundscape; join a Coffee Circle; build and download a visit brief.)")

    # 6 ------------------------------------------------------- Honest design
    s = d.slide()
    s.header('What makes it different', 'Four rules, written into the code.', title_size=TITLE)
    rules = [('Never fabricate', 'every reading says LIVE or SIMULATED', ACCENT),
             ('Nothing sent automatically', 'a person always taps Send', SKY),
             ('Calm by default', 'no timers, scores or auto-advance', VIOLET),
             ('Private by architecture', 'no account, no server, encrypted', WARM)]
    cw = (CW - 0.4) / 2
    ch = 1.95
    for i, (t, b, c) in enumerate(rules):
        x = M + (i % 2) * (cw + 0.4)
        y = 2.15 + (i // 2) * (ch + 0.35)
        s.card(x, y, cw, ch, fill=PANEL)
        s.rect(x, y + 0.35, 0.08, ch - 0.7, fill=c, r=0.04)
        s.text(x + 0.5, y + 0.4, cw - 0.8, 0.55, t, size=25, color=WHITE, bold=True)
        s.text(x + 0.5, y + 1.05, cw - 0.8, 0.6, b, size=18, color=TEXT2)
    s.notes = ("[1:40–1:51] What makes it different isn't a feature — it's four rules in the code: never fabricate a reading "
               "(cancel a pairing and the card stays blank); never send anything automatically — briefs, texts and SOS messages "
               "end with a human tap; calm by default — reduce-motion and high-contrast built in; private by architecture — "
               "no account, no server, AI that runs on the phone.")

    # 7 ------------------------------------------------------------ Audience
    s = d.slide()
    s.header("Who it's for", 'Three people who rarely get the same app.', title_size=TITLE)
    personas = [('Older adults', 'routines, reminders, real company', 'crop-routine'),
                ('Autistic teens & adults', 'predictable, untimed, sensory-calm', 'crop-soundscapes'),
                ('Family caregivers', 'notes and a brief they can trust', 'crop-summary')]
    cw = (CW - 2 * 0.4) / 3
    for i, (t, b, img) in enumerate(personas):
        x = M + i * (cw + 0.4)
        s.card(x, 2.15, cw, 4.5, fill=PANEL)
        s.text(x + 0.35, 2.45, cw - 0.7, 0.5, t, size=22, color=WHITE, bold=True)
        s.text(x + 0.35, 3.0, cw - 0.7, 0.8, b, size=17, color=TEXT2, lh=1.25)
        s.image(img, x + 0.35, 4.0, w=cw - 0.7, h=2.35, valign='b')
    s.notes = ("[1:51–1:58] Three people who rarely get the same app: older adults living independently, autistic teens and "
               "adults, and the family caregivers who support them — in large type, with no account.")

    # 8 -------------------------------------------------------------- Privacy
    s = d.slide()
    s.header('Privacy', 'Everything stays on the device.', title_size=TITLE)
    zeros = [('0', 'accounts'), ('0', 'servers'), ('0', 'trackers')]
    zw = 2.3
    for i, (n, l) in enumerate(zeros):
        x = M + i * (zw + 0.2)
        s.text(x, 2.1, zw, 1.5, n, size=84, color=ACCENT, bold=True, anchor='m', fit=False)
        s.text(x, 3.6, zw, 0.5, l, size=22, color=TEXT)
    facts = ['AES-256 encrypted store', 'AI runs on the phone', 'Bluetooth & HealthKit read locally', 'Face ID lock · export · erase']
    fx = M + 3 * (zw + 0.2) + 0.5
    fw = W - M - fx
    s.rect(fx - 0.5, 2.3, 0.04, 2.6, fill=BORDER)
    s.text(fx, 2.25, fw, 2.8, facts, size=20, color=TEXT2, lh=1.25, space_after=12)
    s.text(M, 5.6, CW, 0.5, 'Only live video calls and a message you tap to send ever leave the phone.', size=18, color=MUTED)
    s.notes = ("[1:58–2:09] Everything stays on the device: AES-256 encryption with a key that cannot be exported, Bluetooth and "
               "HealthKit read locally, and a 1.5-billion-parameter model that answers health questions offline. Zero accounts, "
               "zero servers, zero trackers. Why now: phones can finally run a useful language model offline, so private AI help "
               "no longer needs a cloud.")

    # 9 ---------------------------------------------------------- Built with
    s = d.slide()
    s.header("How it's built", 'Two clients. One promise. No server.', title_size=TITLE)
    cols = [('Web app', 'JavaScript', ['React · Vite · Tailwind', 'Web Bluetooth · Web Audio', 'Web Crypto · installable PWA'], SKY),
            ('iPhone app', 'Swift', ['SwiftUI · HealthKit · CoreBluetooth', 'CryptoKit · Face ID', 'llama.cpp · Sherpa-ONNX · Jitsi'], ACCENT)]
    cw = (CW - 0.4) / 2
    for i, (t, lang, items, c) in enumerate(cols):
        x = M + i * (cw + 0.4)
        s.card(x, 2.1, cw, 2.6, fill=PANEL)
        s.text(x + 0.45, 2.4, cw - 0.9, 0.5, t, size=24, color=WHITE, bold=True)
        s.chip(x + cw - 0.45 - 1.6, 2.47, lang, color=c, w=1.6, h=0.36)
        s.bullets(x + 0.45, 3.05, cw - 0.9, 1.6, items, size=18, gap=6)
    nums = [('11,400+', 'lines of code'), ('17 / 17', 'tests passing'), ('2', 'CI pipelines'), ('3', 'public releases')]
    nw = (CW - 3 * 0.4) / 4
    for i, (n, l) in enumerate(nums):
        x = M + i * (nw + 0.4)
        s.text(x, 5.05, nw, 0.9, n, size=44, color=ACCENT if i < 3 else WARM, bold=True, align='c', anchor='m', fit=False)
        s.text(x, 5.95, nw, 0.4, l, size=16, color=MUTED, align='c')
    s.notes = ("[2:09–2:20] It's React and JavaScript on the web, Swift and SwiftUI on iPhone — Web Bluetooth, HealthKit, "
               "CryptoKit and llama.cpp. Eleven thousand lines, seventeen tests, two CI pipelines, three public releases.")

    # 10 ------------------------------------------------------ Hardest problem
    s = d.slide()
    s.header('Hardest problem', 'Making Bluetooth honest.', title_size=TITLE)
    s.text(M, 1.95, CW, 0.6, 'Heart-rate notifications arrive late and out of order — a stale sensor could repaint a new card.',
           size=19, color=TEXT2)
    steps = [('1', 'Parse the standard', 'service 0x180D · flags byte → 8/16-bit BPM'),
             ('2', 'Label at the source', 'each sample born LIVE or SIMULATED'),
             ('3', 'Drop stale sessions', 'a generation counter ignores old pairings')]
    sw = (CW - 2 * 0.4) / 3
    for i, (n, t, b) in enumerate(steps):
        x = M + i * (sw + 0.4)
        s.card(x, 2.95, sw, 2.55, fill=PANEL)
        s.text(x + 0.4, 3.15, 0.7, 0.7, n, size=34, color=ACCENT, bold=True)
        s.text(x + 0.4, 3.9, sw - 0.8, 0.5, t, size=21, color=WHITE, bold=True)
        s.text(x + 0.4, 4.4, sw - 0.8, 0.9, b, size=16.5, color=TEXT2, lh=1.3)
    s.card(M, 5.85, CW, 0.85, fill=PANEL2)
    s.text(M + 0.3, 5.85, CW - 0.6, 0.85, 'const bpm = flags & 0x1 ? dv.getUint16(1, true) : dv.getUint8(1)   // src/lib/bluetooth.js',
           size=13.5, color=ACCENT, anchor='m', mono=True, fit=False)
    s.notes = ("[2:20–2:33] The hardest problem was keeping Bluetooth honest. Notifications arrive late and out of order, so I parse "
               "the standard heart-rate profile, label every sample live or simulated at the source — the tag follows it into the "
               "CSV export — and drop stale sessions with a generation counter.")

    # 11 ------------------------------------------------------ Traction/roadmap
    s = d.slide()
    s.header('Where it stands', 'Shipped and tested. Next: built with the people it serves.', title_size=TITLE)
    stages = [('Today', 'v2.2 on GitHub', '3 releases · 17 tests · CI for web and iOS', ACCENT),
              ('Next · v2.0 of this entry', 'Co-design & TestFlight', 'sessions with autistic people, people with dementia, caregivers', SKY),
              ('Then', 'Real data, no server', 'sensor history in the visit brief · encrypted backup · Spanish', VIOLET)]
    sw = (CW - 2 * 0.4) / 3
    y0 = 2.35
    s.line(M + 0.3, y0 + 0.16, W - M - 0.3, y0 + 0.16, color=BORDER, lw=2)
    for i, (k, t, b, c) in enumerate(stages):
        x = M + i * (sw + 0.4)
        s.oval(x + 0.18, y0, 0.32, 0.32, fill=c)
        s.text(x + 0.7, y0 - 0.05, sw - 0.7, 0.4, k.upper(), size=12, color=c, bold=True)
        s.text(x + 0.18, y0 + 0.7, sw - 0.3, 0.5, t, size=23, color=WHITE, bold=True)
        s.text(x + 0.18, y0 + 1.35, sw - 0.4, 1.4, b, size=18, color=TEXT2, lh=1.3)
    sy = 5.55
    s.card(M, sy, CW, 0.78, fill=PANEL)
    s.text(M + 0.35, sy, 2.6, 0.78, 'RELEASES · 2026', size=12, color=ACCENT, bold=True, anchor='m')
    rx = M + 2.9
    for label, c in [('v1.0 · Sep 8', ACCENT), ('v2.0 · Sep 8', ACCENT), ('v2.1 · Sep 28', ACCENT), ('v2.2 · building in CI', SKY)]:
        rx += s.chip(rx, sy + 0.22, label, color=c, fill=BG, size=11, h=0.34) + 0.25
    s.notes = ("[2:33–2:45] Version 2.2 is on GitHub with three public releases and seventeen tests. Version 2.0 of this entry starts "
               "with co-design sessions with autistic people, people living with dementia and caregivers, then a TestFlight beta and "
               "sensor history in the visit brief — still with no server. Deliberately not planned: cloud sync, a clinician portal "
               "or a drug-interaction checker — not without clinical review.")

    # 12 ---------------------------------------------------------- Close
    s = d.slide(footer=False)
    s.image('glow', -3, -3, 10, 10)
    s.image('icon', M, 1.2, 1.1, 1.1, r=0.25)
    s.text(M, 2.5, 8.5, 1.2, 'Care that stays yours.', size=56, color=WHITE, bold=True, anchor='m', fit=False)
    s.text(M, 3.8, 7.4, 0.9, 'Connected, calm and private — with no account, no server and no fabricated number.',
           size=20, color=TEXT2, lh=1.3)
    s.text(M, 5.2, 7.4, 0.4, 'Try the web app  ·  read the code  ·  watch the demo', size=17, color=ACCENT, bold=True)
    s.text(M, 5.65, 7.4, 0.4, 'github.com/engineer2025-sudo/Care', size=17, color=WHITE)
    s.text(M, 6.2, 7.4, 0.4, '[Student Name]  ·  [email@example.com]  ·  [School], [City], CA', size=14, color=MUTED)
    s.card(W - M - 3.3, 1.7, 3.3, 4.1, fill=PANEL)
    s.image('qr', W - M - 3.3 + 0.45, 2.0, w=2.4, r=0.15)
    s.text(W - M - 3.3, 4.6, 3.3, 0.4, 'Source, docs & install guide', size=13, color=WHITE, bold=True, align='c')
    s.text(W - M - 3.3, 4.95, 3.3, 0.6, 'Demo video: [YouTube link]', size=12.5, color=MUTED, align='c')
    s.notes = ("[2:45–2:51] CareSphere AI — care that stays yours. The code and install guide are on GitHub. Thank you.")

    return d


if __name__ == '__main__':
    deck = build()
    deck.write_pptx(OUT_PPTX)
    deck.write_previews(PREVIEW)
    words = []
    for sl in deck.slides:
        n = sum(len(' '.join(t for t, _ in p['runs']).split()) for kind, it in sl.items if kind == 'text' for p in it['paras'])
        words.append(n)
    print(f'wrote {OUT_PPTX.name} ({OUT_PPTX.stat().st_size / 1e6:.1f} MB), {len(deck.slides)} slides; '
          f'words per slide: {words} (total {sum(words)})')
    for w in deck.warnings:
        print('WARNING:', w)
