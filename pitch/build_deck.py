#!/usr/bin/env python3
"""CareSphere AI — Congressional App Challenge 2026 pitch deck.

Thirteen slides in the arc judges and investors expect (YC / Sequoia / Kawasaki): hook → why → problem → status quo →
solution → demo → what's different → who it's for → privacy → how it's built → hardest problem → traction → close.
One idea per slide, the headline is the takeaway, ≤ ~40 words per slide, a source on every statistic, contact on the
first and last slide.  Everything cut from the slides lives in the speaker notes, so the narration loses nothing.

Design system: Plus Jakarta Sans, icon-navy gradient, one accent (the icon's mint-green), real screenshots only.
Usage:  python3 build_deck.py
"""
from pathlib import Path

from deck_engine import ACCENT, CW, DIM, H, INK, M, MUTED, TEXT, W, WHITE, Deck

ROOT = Path(__file__).resolve().parent
OUT_PPTX = ROOT / 'CareSphere_Congressional_App_Challenge_Deck.pptx'
PREVIEW = ROOT / 'preview'


def build() -> Deck:
    d = Deck()

    # 1 ------------------------------------------------------------------ Title
    s = d.slide(footer=False)
    s.image('glow', 6.9, -2.9, 9.5, 9.5)
    s.eyebrow('Congressional App Challenge 2026  ·  [CA-XX]', y=1.05)
    s.text(M, 1.55, 7.6, 1.4, 'CareSphere AI', size=70, color=WHITE, weight=800, anchor='t', lh=1.05, fit=False)
    s.text(M, 3.15, 7.6, 0.6, 'Connected care for independent living', size=27, color=ACCENT, weight=500)
    s.text(M, 3.95, 6.7, 1.1, 'A private care companion for older adults, autistic people and the families who care for them.',
           size=20, color=TEXT, lh=1.35)
    s.text(M, 5.75, 7.4, 0.45, '[Student Name]', size=19, color=WHITE, weight=700)
    s.text(M, 6.2, 7.4, 0.4, '[School]  ·  [City], California  ·  [email@example.com]', size=15, color=MUTED)
    s.image('phone-overview', 8.45, 0.95, h=7.3)
    s.notes = "[0:00–0:14] Hi, I'm [NAME], a [GRADE] at [SCHOOL] in [CITY], California. This is CareSphere AI — a private care companion for older adults, autistic people and their families, on iPhone and on the web."

    # 2 ------------------------------------------------------------- Why I built it
    s = d.slide()
    s.eyebrow('Why I built it')
    s.text(M, 1.55, 7.0, 3.2, '“[Your story in one or two sentences — e.g. My grandmother lives alone, and every call started '
           'the same way: did you take your pills? did you talk to anyone today?]”',
           size=30, color=WHITE, weight=700, lh=1.3)
    s.text(M, 5.05, 7.0, 0.5, '— [Student Name], [grade], [School]', size=17, color=ACCENT, weight=500)
    s.text(M, 5.6, 7.0, 0.8, 'So I built the app I wished she had: calm, honest, and private by design.', size=18, color=MUTED, lh=1.3)
    s.image('phone-toast', 8.4, 0.75, h=6.9)
    s.notes = '[0:14–0:26] (Your story in one sentence — name a specific person, a specific moment. E.g.: My grandmother lives alone, and every call started the same way: did you take your pills? did you talk to anyone today?) So I built the app I wished she had: calm, honest, and private by design.'

    # 3 ------------------------------------------------------------------ Problem
    s = d.slide()
    s.header('The problem', 'Growing older — or growing up autistic — too often means facing care alone.', title_w=11.2)
    stats = [('1 in 4', 'older adults are socially isolated', 'NASEM, 2020'),
             ('1 in 31', 'children are autistic', 'CDC, 2025'),
             ('50%', 'of long-term medicines aren’t taken as prescribed', 'WHO')]
    cw = (CW - 2 * 0.5) / 3
    for i, (n, l, src) in enumerate(stats):
        x = M + i * (cw + 0.5)
        s.stat(x, 2.95, cw, n, l, size=92)
        s.text(x, 5.55, cw, 0.3, src, size=12, color=DIM, weight=500)
    s.text(M, 6.25, CW, 0.4, 'Behind them: 63 million family caregivers.   ~~AARP & NAC, 2025~~', size=17, color=TEXT)
    s.notes = "[0:26–0:39] One in four older adults is socially isolated — a twenty-nine percent higher risk of early death. One in thirty-one children is autistic. Half of long-term medications aren't taken as prescribed. And sixty-three million family caregivers hold it all together."

    # 4 -------------------------------------------------------------------- Today
    s = d.slide()
    s.header('Today', 'Four apps. Four accounts. Four clouds.')
    apps = [('Medication', 'app'), ('Video', 'calls'), ('Health', 'record'), ('Family', 'updates')]
    bw, bh, gap = 1.95, 2.2, 0.22
    y0 = 2.7
    for i, (a, b) in enumerate(apps):
        x = M + i * (bw + gap)
        s.card(x, y0, bw, bh)
        s.text(x + 0.3, y0 + 0.32, bw - 0.5, 1.0, [a, b], size=22, color=WHITE, weight=700, lh=1.1)
        s.text(x + 0.3, y0 + 1.55, bw - 0.5, 0.4, 'account · cloud', size=14, color=MUTED, weight=500)
    ax = M + 4 * (bw + gap) - gap + 0.15
    s.line(ax, y0 + bh / 2, ax + 0.62, y0 + bh / 2, color=ACCENT, lw=2.5, arrow=True)
    cx = ax + 0.85
    cw = W - M - cx
    s.card(cx, y0 - 0.25, cw, bh + 0.5, fill=ACCENT, alpha=1.0, line=None)
    s.text(cx + 0.32, y0 - 0.02, cw - 0.5, 0.5, 'CareSphere', size=22, color=INK, weight=800)
    s.text(cx + 0.32, y0 + 0.62, cw - 0.5, 1.7, ['1 app', '0 accounts', '0 clouds'], size=22, color=INK, weight=500, lh=1.3)
    s.text(M, 5.85, CW, 0.4, 'Medisafe · FaceTime · MyChart · CaringBridge — none designed for autistic users.', size=16, color=MUTED)
    s.notes = '[0:39–0:47] Today a family juggles four apps — four accounts, four clouds — and none of them was designed for autistic users.'

    # 5 ----------------------------------------------------------------- Solution
    s = d.slide()
    s.header('The solution', 'One calm app. Five tabs. Zero servers.')
    phones = [('phone-overview', 'Overview'), ('phone-activities', 'Activities'), ('phone-circles', 'Coffee Circles'),
              ('phone-care', 'Care Circle'), ('phone-vitals', 'Vitals')]
    iw = 2.5                               # image width incl. shadow padding; visible phone ≈ 76 % of it
    vis = iw * 778 / 1018
    pad = (iw - vis) / 2
    step = (CW - vis) / 4
    for i, (img, t) in enumerate(phones):
        x = M - pad + i * step
        s.image(img, x, 1.9, w=iw)
        s.text(x, 6.62, iw, 0.35, t, size=15.5, color=WHITE, weight=700, align='c')
    s.notes = '[0:47–0:57] CareSphere is one calm app with five tabs — Overview, Activities, Coffee Circles, Care Circle and Vitals — with no server behind any of it.'

    # 6 --------------------------------------------------------------------- Demo
    s = d.slide()
    s.header('Live demo', 'Let’s see it.')
    s.image('web-overview', M - 0.45, 1.5, w=8.5)
    cx = M + 8.55
    items = [('Real video rooms', 'no account needed'),
             ('Honest vitals', 'every card says LIVE or SIMULATED'),
             ('A brief you control', 'pick · preview · download')]
    y = 2.15
    for t, sub in items:
        s.rect(cx, y + 0.08, 0.04, 0.95, fill=ACCENT, r=0.02)
        s.text(cx + 0.3, y, W - M - cx - 0.3, 0.45, t, size=20, color=WHITE, weight=700)
        s.text(cx + 0.3, y + 0.5, W - M - cx - 0.3, 0.7, sub, size=16, color=MUTED, lh=1.3)
        y += 1.45
    s.chip(cx + 0.3, 6.4, 'real app · nothing staged', size=10)
    s.notes = '[0:57–1:42] Let me show you. (Switch to the screen recording — six shots, see VIDEO_SCRIPT.md: mood check-in and routine; medication reminder and Taken; Bluetooth pairing or the labeled demo plus Export CSV; Pattern Recall and the Rain soundscape; join a Coffee Circle; build and download a visit brief.)'

    # 7 ---------------------------------------------------------------- Four rules
    s = d.slide()
    s.header('What makes it different', 'Four rules, written into the code.')
    rules = [('Never fabricate', 'every reading says LIVE or SIMULATED'),
             ('Nothing sent automatically', 'a person always taps Send'),
             ('Calm by default', 'no timers, scores or auto-advance'),
             ('Private by architecture', 'no account, no server, encrypted')]
    cw = (CW - 0.4) / 2
    ch = 1.95
    for i, (t, b) in enumerate(rules):
        x = M + (i % 2) * (cw + 0.4)
        y = 2.3 + (i // 2) * (ch + 0.35)
        s.card(x, y, cw, ch)
        s.text(x + 0.45, y + 0.38, 0.8, 0.5, f'0{i + 1}', size=15, color=ACCENT, weight=700, tracking=1.0)
        s.text(x + 1.25, y + 0.33, cw - 1.6, 0.55, t, size=25, color=WHITE, weight=700)
        s.text(x + 1.25, y + 0.98, cw - 1.6, 0.6, b, size=18, color=MUTED)
    s.notes = "[1:42–1:53] What makes it different isn't a feature — it's four rules in the code: never fabricate a reading, never send anything automatically, calm by default, private by architecture."

    # 8 ------------------------------------------------------------------ Audience
    s = d.slide()
    s.header('Who it’s for', 'Built for three people at once.')
    personas = [('Older adults', 'routines, reminders, real company', 'crop-routine'),
                ('Autistic teens & adults', 'predictable, untimed, sensory-calm', 'crop-soundscapes'),
                ('Family caregivers', 'notes and a brief they can trust', 'crop-summary')]
    cw = (CW - 2 * 0.4) / 3
    for i, (t, b, img) in enumerate(personas):
        x = M + i * (cw + 0.4)
        s.card(x, 2.3, cw, 4.35)
        s.text(x + 0.4, 2.65, cw - 0.8, 0.5, t, size=21, color=WHITE, weight=700)
        s.text(x + 0.4, 3.2, cw - 0.8, 0.7, b, size=17, color=MUTED, lh=1.3)
        s.image(img, x + 0.4, 4.05, w=cw - 0.8, h=2.3, valign='b')
    s.notes = "[1:53–2:01] It's built for three people at once: older adults, autistic teens and adults, and the caregivers who support them."

    # 9 ------------------------------------------------------------------- Privacy
    s = d.slide()
    s.header('Privacy', 'Everything stays on the device.')
    zeros = [('0', 'accounts'), ('0', 'servers'), ('0', 'trackers')]
    zw = 2.25
    for i, (n, l) in enumerate(zeros):
        s.stat(M + i * (zw + 0.15), 2.55, zw, n, l, size=96)
    fx = M + 3 * (zw + 0.15) + 0.55
    fw = W - M - fx
    s.rect(fx - 0.55, 2.75, 0.03, 3.0, fill=WHITE, alpha=0.15)
    facts = ['AES-256 encrypted on the device', 'AI health guide runs on the phone', 'Bluetooth & HealthKit read locally', 'Face ID lock · export · erase']
    s.text(fx, 2.7, fw, 3.2, facts, size=19, color=TEXT, lh=1.3, space_after=13)
    s.text(M, 6.3, CW, 0.4, 'Only live video calls — and a message you tap to send — ever leave the phone.', size=16, color=MUTED)
    s.notes = '[2:01–2:12] Everything stays on the device: AES-256 encryption, Bluetooth and HealthKit read locally, and a 1.5-billion-parameter model that answers health questions offline. Zero accounts, zero servers, zero trackers.'

    # 10 --------------------------------------------------------------- Built with
    s = d.slide()
    s.header('How it’s built', 'Two clients. One promise. No server.')
    cols = [('Web app', 'JavaScript', ['React · Vite · Tailwind', 'Web Bluetooth · Web Audio', 'Web Crypto · installable PWA']),
            ('iPhone app', 'Swift', ['SwiftUI · HealthKit · CoreBluetooth', 'CryptoKit · Face ID', 'llama.cpp · Sherpa-ONNX · Jitsi'])]
    cw = (CW - 0.4) / 2
    for i, (t, lang, items) in enumerate(cols):
        x = M + i * (cw + 0.4)
        s.card(x, 2.3, cw, 2.45)
        s.text(x + 0.45, 2.6, cw - 0.9, 0.5, t, size=24, color=WHITE, weight=700)
        s.chip(x + cw - 0.45 - 1.55, 2.66, lang, w=1.55, h=0.36)
        s.bullets(x + 0.45, 3.25, cw - 0.9, 1.5, items, size=18, gap=5)
    nums = [('11,400+', 'lines of code'), ('17 / 17', 'tests passing'), ('2', 'CI pipelines'), ('3', 'public releases')]
    nw = (CW - 3 * 0.4) / 4
    for i, (n, l) in enumerate(nums):
        x = M + i * (nw + 0.4)
        s.text(x, 5.15, nw, 0.9, n, size=44, color=WHITE, weight=800, align='c', anchor='m', fit=False)
        s.text(x, 6.05, nw, 0.4, l, size=15, color=ACCENT, weight=500, align='c')
    s.notes = "[2:12–2:23] It's React and JavaScript on the web, Swift and SwiftUI on iPhone — Web Bluetooth, HealthKit, CryptoKit and llama.cpp. Eleven thousand lines, seventeen tests, three public releases."

    # 11 ---------------------------------------------------------- Hardest problem
    s = d.slide()
    s.header('Hardest problem', 'Making Bluetooth honest.')
    s.text(M, 2.2, 5.5, 1.3, 'Heart-rate notifications arrive late and out of order — a stale sensor could repaint a new card '
           'with a wrong number.', size=19, color=TEXT, lh=1.35)
    steps = [('01', 'Parse the standard', 'service 0x180D · flags byte → 8/16-bit BPM'),
             ('02', 'Label at the source', 'each sample is born LIVE or SIMULATED'),
             ('03', 'Drop stale sessions', 'a generation counter ignores old pairings')]
    y = 3.55
    for n, t, b in steps:
        s.text(M, y + 0.02, 0.7, 0.4, n, size=14, color=ACCENT, weight=700, tracking=1.0)
        s.text(M + 0.75, y - 0.02, 5.0, 0.45, t, size=20, color=WHITE, weight=700)
        s.text(M + 0.75, y + 0.42, 5.0, 0.45, b, size=15.5, color=MUTED)
        y += 1.0
    cx = M + 6.5
    cw = W - M - cx
    s.card(cx, 2.2, cw, 4.3, fill=INK, alpha=0.75)
    s.text(cx + 0.4, 2.45, cw - 0.8, 0.3, 'src/lib/bluetooth.js  ·  src/App.jsx', size=11.5, color=ACCENT, weight=700, tracking=1.2)
    code = ['const flags = dv.getUint8(0)',
            'const bpm = flags & 0x1',
            '  ? dv.getUint16(1, true)',
            '  : dv.getUint8(1)',
            'if (bpm > 20 && bpm < 250) onReading(bpm)',
            '',
            'const source =',
            "  hrModeRef.current === 'live'",
            "    ? 'LIVE_BLE' : 'SIMULATED'",
            '',
            'if (generation !==',
            '    hrConnectionGenerationRef.current)',
            '  return']
    s.text(cx + 0.4, 2.9, cw - 0.8, 3.5, code, size=11.5, color=TEXT, mono=True, lh=1.42, fit=False)
    s.notes = '[2:23–2:35] The hardest problem was keeping Bluetooth honest: notifications arrive late and out of order, so I label every sample live or simulated at the source and drop stale sessions with a generation counter.'

    # 12 ------------------------------------------------------------------ Traction
    s = d.slide()
    s.header('Where it stands', 'Shipped and tested. Next: built with the people it serves.', title_w=11.5)
    stages = [('Today', 'v2.2 on GitHub', '3 releases · 17 tests · CI for web and iOS'),
              ('Next · v2.0 of this entry', 'Co-design & TestFlight', 'sessions with autistic people, people with dementia, caregivers'),
              ('Then', 'Real data, no server', 'sensor history in the visit brief · encrypted backup · Spanish')]
    sw = (CW - 2 * 0.4) / 3
    y0 = 2.75
    s.line(M + 0.2, y0 + 0.14, W - M - 0.2, y0 + 0.14, color=WHITE, lw=1.5, alpha=0.18)
    for i, (k, t, b) in enumerate(stages):
        x = M + i * (sw + 0.4)
        s.oval(x + 0.06, y0, 0.28, 0.28, fill=ACCENT if i == 0 else INK, line=ACCENT, lw=2)
        s.text(x + 0.55, y0 - 0.04, sw - 0.6, 0.35, k.upper(), size=11.5, color=ACCENT, weight=700, tracking=1.4)
        s.text(x + 0.06, y0 + 0.65, sw - 0.3, 0.5, t, size=23, color=WHITE, weight=700)
        s.text(x + 0.06, y0 + 1.3, sw - 0.4, 1.4, b, size=17.5, color=MUTED, lh=1.3)
    sy = 5.7
    s.card(M, sy, CW, 0.8)
    s.text(M + 0.4, sy, 2.6, 0.8, 'RELEASES · 2026', size=11.5, color=ACCENT, weight=700, anchor='m', tracking=1.4)
    rx = M + 3.0
    for label in ['v1.0 · Sep 8', 'v2.0 · Sep 8', 'v2.1 · Sep 28', 'v2.2 · building in CI']:
        rx += s.chip(rx, sy + 0.22, label, color=WHITE, alpha=0.1, size=10.5) + 0.22
    s.notes = '[2:35–2:47] Version 2.0 starts with co-design sessions with autistic people, people living with dementia and caregivers, then a TestFlight beta and sensor history in the visit brief — still with no server. (Deliberately not planned: cloud sync, a clinician portal or a drug-interaction checker — not without clinical review.)'

    # 13 --------------------------------------------------------------------- Close
    s = d.slide(footer=False)
    s.image('glow', -3.2, -3.4, 9.5, 9.5)
    s.image('icon', M, 1.35, 1.0, 1.0, r=0.24)
    s.text(M, 2.65, 8.6, 1.3, 'Care that stays yours.', size=54, color=WHITE, weight=800, anchor='t', lh=1.05, fit=False)
    s.text(M, 3.95, 7.4, 1.0, 'Connected, calm and private — with no account, no server and no fabricated number.',
           size=20, color=TEXT, lh=1.35)
    s.text(M, 5.35, 7.4, 0.4, 'Try the web app  ·  read the code  ·  watch the demo', size=16, color=ACCENT, weight=700)
    s.text(M, 5.8, 7.4, 0.4, 'github.com/engineer2025-sudo/Care', size=17, color=WHITE, weight=500)
    s.text(M, 6.35, 7.4, 0.4, '[Student Name]  ·  [email@example.com]  ·  [School], [City], California', size=14, color=MUTED)
    qx = W - M - 3.2
    s.card(qx, 1.75, 3.2, 4.0)
    s.image('qr', qx + 0.45, 2.05, w=2.3, r=0.14)
    s.text(qx, 4.6, 3.2, 0.4, 'Source, docs & install guide', size=13, color=WHITE, weight=700, align='c')
    s.text(qx, 4.95, 3.2, 0.5, 'Demo video: [YouTube link]', size=12.5, color=MUTED, align='c')
    s.notes = '[2:47–2:53] CareSphere AI — care that stays yours. The code and install guide are on GitHub. Thank you.'

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
