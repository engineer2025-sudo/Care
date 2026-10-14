#!/usr/bin/env python3
"""CareSphere AI — Congressional App Challenge 2026 pitch deck (minimalist, blue).

Design rules applied (from YC / Sequoia / Kawasaki guidance on what makes decks work):
  * one idea per slide, 12 slides, headline = the takeaway, not a label
  * big type (headlines ≥ 36 pt, body ≥ 16 pt), ≤ ~35 words per slide, lots of space
  * real screenshots instead of decoration; no icons, clip-art or gimmicks
  * no jargon without a plain-English anchor; sources on every statistic
  * contact on the first slide, a memorable close with a call to action

Every image is a real screenshot of CareSphere, its icon, or a shape drawn here.
Usage:  python3 build_deck.py
"""
from pathlib import Path

from deck_engine import (ACCENT, ACCENT_D, BG, BORDER, CW, DIM, H, M, MUTED, PANEL, PANEL2, ROSE, SKY, TEXT, TEXT2,
                         VIOLET, W, WARM, WHITE, Deck, pil_font)

ROOT = Path(__file__).resolve().parent
OUT_PPTX = ROOT / 'CareSphere_Congressional_App_Challenge_Deck.pptx'
PREVIEW = ROOT / 'preview'


def big_stat(s, x, y, w, number, label, source=None, color=ACCENT, num_size=76):
    s.text(x, y, w, 1.3, number, size=num_size, color=color, bold=True, anchor='m', fit=False)
    s.text(x, y + 1.4, w, 1.0, label, size=20, color=TEXT, lh=1.2)
    if source:
        s.text(x, y + 2.45, w, 0.35, source, size=12, color=DIM)


def build() -> Deck:
    d = Deck()

    # 1 ------------------------------------------------------------- Title
    s = d.slide(footer=False)
    s.image('glow', 6.6, -2.6, 10, 10)
    s.image('icon', M, 1.35, 1.05, 1.05, r=0.24)
    s.text(M, 2.65, 7.6, 1.2, 'CareSphere AI', size=62, color=WHITE, bold=True, anchor='m', fit=False)
    s.text(M, 3.85, 7.4, 0.6, 'Connected care for independent living', size=26, color=ACCENT)
    s.text(M, 4.6, 7.2, 1.0, 'A private companion for older adults, autistic people and the families who care for them.',
           size=19, color=TEXT2, lh=1.3)
    s.text(M, 6.0, 7.4, 0.4, '[Student Name]  ·  [School], [City], CA  ·  [email@example.com]', size=15, color=WHITE, bold=True)
    s.text(M, 6.42, 7.4, 0.35, 'Congressional App Challenge 2026  ·  [CA-XX]', size=13, color=MUTED)
    s.image('phone-overview', 8.9, 0.55, h=6.6)
    s.notes = "[0:00–0:15] Hi, I'm [NAME], a [GRADE] at [SCHOOL] in [CITY], California. This is CareSphere AI — a private care companion for older adults, autistic people and the families who look after them, on iPhone and on the web."

    # 2 ----------------------------------------------------------- Problem
    s = d.slide()
    s.header('The problem', 'Growing older — or growing up autistic — too often means facing care alone.')
    cols = [('1 in 4', 'older adults in the U.S. are socially isolated', 'NASEM, 2020', ACCENT),
            ('1 in 31', 'children are autistic — and become adults who still need support', 'CDC, 2025', VIOLET),
            ('50%', 'of long-term medications are not taken as prescribed', 'WHO', WARM)]
    cw = (CW - 2 * 0.5) / 3
    for i, (n, l, src, c) in enumerate(cols):
        big_stat(s, M + i * (cw + 0.5), 2.55, cw, n, l, src, c)
    s.text(M, 6.1, CW, 0.5, 'Behind them: 63 million family caregivers, nearly one in four American adults.  (AARP & NAC, 2025)',
           size=16, color=MUTED)
    s.notes = "[0:15–0:31] One in four older adults is socially isolated — a twenty-nine percent higher risk of early death. One in thirty-one children is autistic, and they become adults who still need support. Half of long-term medications aren't taken as prescribed."

    # 3 ----------------------------------------------------- How they cope
    s = d.slide()
    s.header('Today', 'Families juggle four apps, four accounts — and hand their health data to the cloud.')
    apps = [('Medication app', 'reminders'), ('Video calls', 'staying in touch'), ('Health record', 'vitals & visits'), ('Family updates', 'care notes')]
    bw, bh, gap = 1.9, 2.0, 0.22
    y0 = 2.55
    for i, (t, sub) in enumerate(apps):
        x = M + i * (bw + gap)
        s.card(x, y0, bw, bh, fill=PANEL)
        s.text(x + 0.28, y0 + 0.3, bw - 0.5, 0.8, t, size=19, color=WHITE, bold=True, lh=1.1)
        s.text(x + 0.28, y0 + 1.0, bw - 0.5, 0.4, sub, size=14, color=MUTED)
        s.text(x + 0.28, y0 + 1.45, bw - 0.5, 0.4, 'account · cloud', size=13, color=ROSE, bold=True)
    ax = M + 4 * (bw + gap) - gap + 0.12
    s.line(ax, y0 + bh / 2, ax + 0.6, y0 + bh / 2, color=ACCENT, lw=2.5, arrow=True)
    cx = ax + 0.8
    cw = W - M - cx
    s.card(cx, y0 - 0.2, cw, bh + 0.4, fill=ACCENT_D)
    s.text(cx + 0.3, y0 + 0.05, cw - 0.5, 0.5, 'CareSphere', size=21, color=WHITE, bold=True)
    s.text(cx + 0.3, y0 + 0.65, cw - 0.5, 1.6, ['one app', 'no account', 'nothing in the cloud'], size=16, color=WHITE, lh=1.3, space_after=3)
    s.text(M, 5.4, CW, 0.8, 'Medisafe · FaceTime · MyChart · CaringBridge — each solves one slice, each needs an account, none was designed for autistic users.',
           size=15, color=MUTED, lh=1.3)
    s.notes = '[0:31–0:43] Today a family juggles a medication app, a video app, a health portal and a family-update site — four accounts, four clouds — and none was designed for autistic users. (Optional: one sentence on why you built it.)'

    # 4 ------------------------------------------------------------ Solution
    s = d.slide()
    s.header('The solution', 'One calm app. Five tabs. Zero servers.')
    phones = [('phone-overview', 'Overview'), ('phone-activities', 'Activities'), ('phone-circles', 'Coffee Circles'),
              ('phone-care', 'Care Circle'), ('phone-vitals', 'Vitals')]
    pw = 2.05
    gap = (CW - 5 * pw) / 4
    for i, (img, t) in enumerate(phones):
        x = M + i * (pw + gap)
        s.image(img, x, 1.95, w=pw, h=4.45, valign='t')
        s.text(x, 6.5, pw, 0.4, t, size=16, color=WHITE, bold=True, align='c')
    s.notes = '[0:43–0:53] CareSphere is one calm app with five tabs — Overview, Activities, Coffee Circles, Care Circle and Vitals — with no server behind any of it.'

    # 5 ---------------------------------------------------------- Product/demo
    s = d.slide()
    s.header('Live demo', 'Let\'s see it.')
    s.image('web-overview', M, 1.75, w=8.0, h=5.0, valign='t')
    cx = M + 8.3
    items = [('Real video rooms', 'Coffee Circles open live Jitsi rooms — no account.', 'crop-circle-card'),
             ('Honest vitals', 'Bluetooth heart-rate, labeled LIVE or SIMULATED.', 'crop-hr'),
             ('A brief you control', 'Pick the fields, see the text, download it.', 'crop-summary')]
    y = 2.0
    for t, sub, img in items:
        s.text(cx, y, W - M - cx, 0.45, t, size=19, color=WHITE, bold=True)
        s.text(cx, y + 0.45, W - M - cx, 0.8, sub, size=15, color=TEXT2, lh=1.25)
        y += 1.6
    s.chip(M, 6.9, 'recorded on the real app — nothing staged', color=WARM, size=10, h=0.3)
    s.notes = '[0:53–1:40] Let me show you. (Switch to the screen recording — six shots, see VIDEO_SCRIPT.md: mood check-in and routine; medication reminder and Taken; Bluetooth pairing or the labeled demo plus Export CSV; Pattern Recall and the Rain soundscape; join a Coffee Circle; build and download a visit brief.)'

    # 6 ------------------------------------------------------- Honest design
    s = d.slide()
    s.header('What makes it different', 'Four rules, written into the code.')
    rules = [('Never fabricate', 'Every reading is tagged LIVE or SIMULATED. Cancel a pairing and the card stays blank.', ACCENT),
             ('Nothing sent automatically', 'Briefs, texts and SOS messages always end with a human tap.', SKY),
             ('Calm by default', 'No timers, no scores, no auto-advance. Reduce-motion and high-contrast built in.', VIOLET),
             ('Private by architecture', 'No account, no server, encrypted on the device, AI that runs on the phone.', WARM)]
    cw = (CW - 0.4) / 2
    ch = 2.05
    for i, (t, b, c) in enumerate(rules):
        x = M + (i % 2) * (cw + 0.4)
        y = 2.1 + (i // 2) * (ch + 0.35)
        s.card(x, y, cw, ch, fill=PANEL)
        s.rect(x, y + 0.35, 0.08, ch - 0.7, fill=c, r=0.04)
        s.text(x + 0.45, y + 0.35, cw - 0.7, 0.5, t, size=22, color=WHITE, bold=True)
        s.text(x + 0.45, y + 0.95, cw - 0.7, 1.0, b, size=15.5, color=TEXT2, lh=1.3)
    s.notes = "[1:40–1:51] What makes it different isn't a feature — it's four rules in the code: never fabricate a reading, never send anything automatically, calm by default, private by architecture."

    # 7 ------------------------------------------------------------ Audience
    s = d.slide()
    s.header('Who it\'s for', 'Three people who rarely get the same app.')
    personas = [('Older adults', 'Routines, reminders and real company — in large type.', 'crop-routine', ACCENT),
                ('Autistic teens & adults', 'Predictable screens, untimed activities, soundscapes, breathing.', 'crop-soundscapes', VIOLET),
                ('Family caregivers', 'Care notes, a visit brief they can trust, honest vitals.', 'crop-summary', WARM)]
    cw = (CW - 2 * 0.4) / 3
    for i, (t, b, img, c) in enumerate(personas):
        x = M + i * (cw + 0.4)
        s.card(x, 2.1, cw, 4.5, fill=PANEL)
        s.text(x + 0.35, 2.4, cw - 0.7, 0.5, t, size=21, color=WHITE, bold=True)
        s.text(x + 0.35, 2.95, cw - 0.7, 1.1, b, size=15.5, color=TEXT2, lh=1.3)
        s.image(img, x + 0.35, 3.95, w=cw - 0.7, h=2.35, valign='b')
    s.notes = '[1:51–1:58] Three people who rarely get the same app: older adults, autistic teens and adults, and their caregivers.'

    # 8 -------------------------------------------------------------- Privacy
    s = d.slide()
    s.header('Privacy', 'Everything stays on the device.')
    bx, by, bw, bh = M, 2.1, 7.9, 4.35
    s.rect(bx, by, bw, bh, fill=None, line=ACCENT, lw=2, r=0.3, dash=True)
    s.text(bx + 0.35, by + 0.25, bw - 0.7, 0.4, 'YOUR PHONE OR BROWSER', size=12, color=ACCENT, bold=True)
    inner = [('Encrypted store', 'AES-256-GCM · key never leaves the device'),
             ('On-device AI guide', 'Qwen 1.5B via llama.cpp · MedlinePlus offline'),
             ('Real sensors', 'Bluetooth heart-rate · HealthKit (read-only)'),
             ('Face ID lock', 'Export or erase everything in one tap')]
    iw = (bw - 0.7 - 0.3) / 2
    for i, (t, b) in enumerate(inner):
        x = bx + 0.35 + (i % 2) * (iw + 0.3)
        y = by + 0.8 + (i // 2) * 1.65
        s.card(x, y, iw, 1.4, fill=PANEL)
        s.text(x + 0.25, y + 0.25, iw - 0.5, 0.4, t, size=17, color=WHITE, bold=True)
        s.text(x + 0.25, y + 0.68, iw - 0.5, 0.6, b, size=13.5, color=TEXT2, lh=1.25)
    ox = bx + bw + 0.5
    ow = W - M - ox
    s.text(ox, by + 0.1, ow, 0.4, 'THE ONLY THINGS THAT LEAVE', size=12, color=DIM, bold=True)
    s.text(ox, by + 0.55, ow, 2.2, ['Live video in rooms you choose to join', 'Optional one-time downloads: MedlinePlus, the AI model, the voice', 'A text or call — after you tap Send'],
           size=15, color=TEXT2, lh=1.3, space_after=8)
    s.text(ox, 4.75, ow, 1.5, ['**0** accounts', '**0** servers', '**0** trackers'], size=24, color=ACCENT, lh=1.25, strong=WHITE)
    s.text(M, 6.62, CW, 0.4, 'Why now: phones can finally run a useful language model offline — private AI help no longer needs a cloud.',
           size=14, color=MUTED)
    s.notes = '[1:58–2:09] Everything stays on the device: AES-256 encryption, Bluetooth and HealthKit read locally, and a 1.5-billion-parameter model that answers health questions offline. Zero accounts, zero servers, zero trackers.'

    # 9 ---------------------------------------------------------- Built with
    s = d.slide()
    s.header('How it\'s built', 'Two clients. One promise. No server.')
    cols = [('Web app', 'JavaScript', ['React 18 · Vite · Tailwind', 'Web Bluetooth · Web Audio', 'Web Crypto (AES-256-GCM)', 'Installable PWA, works offline'], SKY),
            ('iPhone app', 'Swift', ['SwiftUI · HealthKit · CoreBluetooth', 'CryptoKit · Face ID', 'llama.cpp · Sherpa-ONNX', 'Jitsi Meet SDK'], ACCENT)]
    cw = (CW - 0.4) / 2
    for i, (t, lang, items, c) in enumerate(cols):
        x = M + i * (cw + 0.4)
        s.card(x, 2.05, cw, 2.9, fill=PANEL)
        s.text(x + 0.4, 2.3, cw - 0.8, 0.5, t, size=22, color=WHITE, bold=True)
        s.chip(x + cw - 0.4 - 1.5, 2.36, lang, color=c, w=1.5, h=0.34)
        s.bullets(x + 0.4, 2.95, cw - 0.8, 1.9, items, size=15.5, gap=4)
    nums = [('11,400+', 'lines of code'), ('17 / 17', 'automated tests'), ('2', 'CI pipelines'), ('3', 'public releases')]
    nw = (CW - 3 * 0.4) / 4
    for i, (n, l) in enumerate(nums):
        x = M + i * (nw + 0.4)
        s.text(x, 5.3, nw, 0.8, n, size=40, color=ACCENT if i < 3 else WARM, bold=True, align='c', anchor='m', fit=False)
        s.text(x, 6.1, nw, 0.4, l, size=14, color=MUTED, align='c')
    s.notes = "[2:09–2:20] It's React and JavaScript on the web, Swift and SwiftUI on iPhone — Web Bluetooth, HealthKit, CryptoKit and llama.cpp. Eleven thousand lines, seventeen tests, three public releases."

    # 10 ------------------------------------------------------ Hardest problem
    s = d.slide()
    s.header('Hardest problem', 'Making Bluetooth honest.')
    s.text(M, 1.95, 7.5, 0.9, 'Heart-rate notifications arrive late and out of order — a stale sensor could repaint a new card with a wrong number.',
           size=17, color=TEXT2, lh=1.3)
    steps = [('1', 'Parse the standard profile', 'Heart Rate service 0x180D; the flags byte picks 8- or 16-bit BPM'),
             ('2', 'Label at the source', 'Each sample is tagged LIVE or SIMULATED when it is produced — the tag follows it into the CSV'),
             ('3', 'Drop stale sessions', 'A generation counter discards callbacks from any earlier pairing')]
    sw = (CW - 2 * 0.4) / 3
    for i, (n, t, b) in enumerate(steps):
        x = M + i * (sw + 0.4)
        s.card(x, 3.15, sw, 2.5, fill=PANEL)
        s.text(x + 0.35, 3.35, 0.6, 0.6, n, size=30, color=ACCENT, bold=True)
        s.text(x + 0.35, 4.0, sw - 0.7, 0.45, t, size=18, color=WHITE, bold=True)
        s.text(x + 0.35, 4.45, sw - 0.7, 1.1, b, size=14, color=TEXT2, lh=1.3)
    s.card(M, 5.9, CW, 0.85, fill=PANEL2)
    s.text(M + 0.3, 5.9, CW - 0.6, 0.85, ['const bpm = flags & 0x1 ? dv.getUint16(1, true) : dv.getUint8(1)   // src/lib/bluetooth.js'],
           size=13, color=ACCENT, anchor='m', mono=True, fit=False)
    s.notes = '[2:20–2:33] The hardest problem was keeping Bluetooth honest. Notifications arrive late and out of order, so I parse the standard profile, label every sample at the source, and drop stale sessions with a generation counter.'

    # 11 ------------------------------------------------------ Traction/roadmap
    s = d.slide()
    s.header('Where it stands', 'Shipped, tested — and next, built with the people it serves.')
    stages = [('Today', 'v2.2 on GitHub', ['3 public releases since September', '17 automated tests · CI for web and iOS'], ACCENT),
              ('Next · v2.0 of this entry', 'Co-design & TestFlight', ['Sessions with autistic people, people with dementia and caregivers', 'TestFlight beta · VoiceOver testing on devices'], SKY),
              ('Then', 'Real data, no server', ['Sensor history inside the visit brief — real, labeled data only', 'Encrypted backup · Spanish'], VIOLET)]
    sw = (CW - 2 * 0.4) / 3
    y0 = 2.25
    s.line(M + 0.3, y0 + 0.16, W - M - 0.3, y0 + 0.16, color=BORDER, lw=2)
    for i, (k, t, items, c) in enumerate(stages):
        x = M + i * (sw + 0.4)
        s.oval(x + 0.18, y0, 0.32, 0.32, fill=c)
        s.text(x + 0.7, y0 - 0.05, sw - 0.7, 0.4, k.upper(), size=12, color=c, bold=True)
        s.text(x + 0.18, y0 + 0.65, sw - 0.3, 0.5, t, size=22, color=WHITE, bold=True)
        s.bullets(x + 0.18, y0 + 1.35, sw - 0.3, 2.0, items, size=16.5, gap=10)
    # credibility strip: the public release history
    sy = 5.55
    s.card(M, sy, CW, 0.78, fill=PANEL)
    s.text(M + 0.35, sy, 2.6, 0.78, 'RELEASES · 2026', size=12, color=ACCENT, bold=True, anchor='m')
    rx = M + 2.9
    for label, c in [('v1.0 · Sep 8', ACCENT), ('v2.0 · Sep 8', ACCENT), ('v2.1 · Sep 28', ACCENT), ('v2.2 · building in CI', SKY)]:
        rx += s.chip(rx, sy + 0.22, label, color=c, fill=BG, size=11, h=0.34) + 0.25
    s.text(M, 6.6, CW, 0.4, 'Deliberately not planned: cloud sync, a clinician portal or a drug-interaction checker — not without clinical review.',
           size=13.5, color=MUTED)
    s.notes = '[2:33–2:45] Version 2.0 starts with co-design sessions with autistic people, people living with dementia and caregivers, then a TestFlight beta and sensor history in the visit brief — still with no server.'

    # 12 ---------------------------------------------------------- Close
    s = d.slide(footer=False)
    s.image('glow', -3, -3, 10, 10)
    s.image('icon', M, 1.2, 1.1, 1.1, r=0.25)
    s.text(M, 2.5, 8.0, 1.2, 'Care that stays yours.', size=52, color=WHITE, bold=True, anchor='m', fit=False)
    s.text(M, 3.75, 7.4, 1.0, 'Keeping older adults connected, autistic users calm and caregivers informed — with no account, no server and no fabricated number.',
           size=18, color=TEXT2, lh=1.3)
    s.text(M, 5.2, 7.4, 0.4, 'Try the web app  ·  read the code  ·  watch the demo', size=16, color=ACCENT, bold=True)
    s.text(M, 5.65, 7.4, 0.4, 'github.com/engineer2025-sudo/Care', size=16, color=WHITE)
    s.text(M, 6.2, 7.4, 0.4, '[Student Name]  ·  [email@example.com]  ·  [School], [City], CA', size=14, color=MUTED)
    s.card(W - M - 3.3, 1.7, 3.3, 4.1, fill=PANEL)
    s.image('qr', W - M - 3.3 + 0.45, 2.0, w=2.4, r=0.15)
    s.text(W - M - 3.3, 4.6, 3.3, 0.4, 'Source, docs & install guide', size=13, color=WHITE, bold=True, align='c')
    s.text(W - M - 3.3, 4.95, 3.3, 0.6, 'Demo video: [YouTube link]', size=12.5, color=MUTED, align='c')
    s.notes = '[2:45–2:51] CareSphere AI — care that stays yours. The code and install guide are on GitHub. Thank you.'

    return d


if __name__ == '__main__':
    deck = build()
    deck.write_pptx(OUT_PPTX)
    deck.write_previews(PREVIEW)
    words = []
    for i, sl in enumerate(deck.slides, 1):
        n = sum(len(' '.join(t for t, _ in p['runs']).split()) for kind, it in sl.items if kind == 'text' for p in it['paras'])
        words.append(n)
    print(f'wrote {OUT_PPTX.name} ({OUT_PPTX.stat().st_size / 1e6:.1f} MB), {len(deck.slides)} slides; words per slide: {words}')
    for w in deck.warnings:
        print('WARNING:', w)
