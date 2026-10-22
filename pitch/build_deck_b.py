#!/usr/bin/env python3
"""CareSphere AI — Congressional App Challenge 2026 pitch deck, Version B.

Same thirteen-slide arc, narration and timings as build_deck.py (Version A), re-composed as an editorial variant:
  * dot-grid backdrop with a mint and a blue glow, a faint slide numeral top-right
  * ExtraBold headlines with the key phrase picked out in the accent
  * ink-dark cards instead of translucent white panels; chips for the tech stack
  * layered screenshots (stacked phones on the title, phone over browser on the demo, a HR card over the code)
  * an on-device architecture diagram (privacy), a date-proportional timeline (traction),
    a need / today / CareSphere comparison table (status quo), evidence-in-code on the four rules
  * slide transitions: 600 ms fade, push into the demo, fade-through-black into the close
Usage:  python3 build_deck_b.py
"""
from pathlib import Path

import build_deck
from deck_engine import ACCENT, CW, DIM, H, INK, M, MUTED, TEXT, W, WHITE, Deck, pil_font, PX

ROOT = Path(__file__).resolve().parent
OUT_PPTX = ROOT / 'CareSphere_Congressional_App_Challenge_Deck_B.pptx'
PREVIEW = ROOT / 'preview-b'
AUTO_ADVANCE = False      # True → slides advance by themselves on the script's timings (handy for recording the video)

NOTES = [s.notes for s in build_deck.build().slides]
# seconds per slide from the script (0:00–2:53); used when AUTO_ADVANCE is on
TIMES = [14, 12, 13, 8, 10, 45, 11, 8, 11, 11, 12, 12, 6]

CARD_FILL, CARD_ALPHA, CARD_LINE_ALPHA = INK, 0.55, 0.09
TITLE_W = 10.6           # headlines stop short of the big slide numeral


# ------------------------------------------------------------------ helpers
def card(s, x, y, w, h, accent=False, alpha=CARD_ALPHA, r=0.22):
    s.rect(x, y, w, h, fill=CARD_FILL, alpha=alpha, line=ACCENT if accent else WHITE,
           line_alpha=0.55 if accent else CARD_LINE_ALPHA, lw=1.0 if accent else 0.75, r=r)


def eyebrow(s, label, x=M, y=0.62, color=ACCENT):
    s.oval(x, y + 0.055, 0.13, 0.13, fill=color)
    s.text(x + 0.26, y - 0.04, 7, 0.3, label.upper(), size=11.5, color=color, weight=700, tracking=1.6)


def header(s, label, title, size=38, w=TITLE_W, y=0.98):
    eyebrow(s, label)
    return y + s.text(M, y, w, 1.5, title, size=size, color=WHITE, weight=800, anchor='t', lh=1.1)


def label(s, x, y, w, text, color=DIM):
    s.text(x, y, w, 0.3, text.upper(), size=10.5, color=color, weight=700, tracking=1.4)


def tag_width(text, size=12.5, weight=500, pad=0.34, mono=False):
    return pil_font(size, weight, mono).getlength(text) / PX + pad


def tag(s, x, y, text, size=12.5, color=TEXT, fill=WHITE, alpha=0.08, h=0.34, mono=False):
    w = tag_width(text, size, 400 if mono else 500, 0.34, mono)
    s.rect(x, y, w, h, fill=fill, alpha=alpha, r=h / 2)
    s.text(x, y, w, h, text, size=size, color=color, weight=500, align='c', anchor='m', fit=False, mono=mono)
    return w


def tag_flow(s, x, y, maxw, items, gap=0.1, row=0.44, **kw):
    cx, cy = x, y
    for t in items:
        w = tag_width(t, kw.get('size', 12.5))
        if cx + w > x + maxw + 0.01:
            cx, cy = x, cy + row
        tag(s, cx, cy, t, **kw)
        cx += w + gap
    return cy + row


def mini_stat(s, x, y, w, number, text, size=40, align='l'):
    s.text(x, y, w, size / 72 * 1.2, number, size=size, color=WHITE, weight=800, align=align, anchor='t', lh=1.05, fit=False)
    s.text(x, y + size / 72 * 1.2 + 0.02, w, 0.5, text, size=13.5, color=ACCENT, weight=500, align=align)


# ------------------------------------------------------------------ deck
def build() -> Deck:
    d = Deck(backdrop='bg-mesh', numeral=True, footer_page=False, transition='fade')

    # 1 ------------------------------------------------------------------ Title
    s = d.slide(footer=False, chrome=False)
    s.image('bg-mesh', 0, 0, w=W, h=H)
    s.image('glow', 6.6, -2.4, 9.0, 9.0)
    eyebrow(s, 'Congressional App Challenge 2026  ·  CA-10', y=1.5)
    s.text(M, 1.95, 7.3, 1.3, 'CareSphere AI', size=64, color=WHITE, weight=800, anchor='t', lh=1.05, fit=False)
    s.text(M, 3.3, 7.3, 0.6, 'Connected care for independent living', size=26, color=ACCENT, weight=500)
    s.text(M, 3.95, 6.0, 1.1, 'A private care companion for older adults, autistic people and the families who care for them.',
           size=19, color=TEXT, lh=1.35)
    s.rect(M, 5.12, 0.5, 0.04, fill=ACCENT, r=0.02)
    s.text(M, 5.38, 7.0, 0.45, 'Arnav Kochar', size=18, color=WHITE, weight=700)
    s.text(M, 5.78, 7.0, 0.4, '[School]  ·  [City], California  ·  kochar4646@gmail.com', size=14.5, color=MUTED)
    s.image('phone-vitals', 7.6, 1.45, h=6.3, rot=-8)
    s.image('phone-overview', 9.5, 1.0, h=7.0)

    # 2 ------------------------------------------------------------- Why I built it
    s = d.slide()
    eyebrow(s, 'Why I built it')
    s.text(M - 0.08, 0.62, 2.0, 2.7, '“', size=190, color=ACCENT, weight=800, fit=False, lh=1.0)
    for p in s.items[-1][1]['paras']:
        p['runs'] = [(t, {**st, 'alpha': 0.3}) for t, st in p['runs']]
    s.text(M + 0.1, 1.95, 6.9, 2.9, '[Your story in one or two sentences — e.g. My grandmother lives alone, and every call started '
           'the same way: did you take your pills? did you talk to anyone today?]', size=27, color=WHITE, weight=500, lh=1.3)
    s.text(M + 0.1, 4.95, 6.9, 0.4, '— Arnav Kochar, [grade], [School]', size=16, color=ACCENT, weight=700)
    s.text(M + 0.1, 5.55, 6.9, 0.8, 'So I built the app I wished she had: **calm, honest, and private by design.**',
           size=18, color=MUTED, lh=1.35)
    s.image('crop-meds', 8.45, 1.5, w=4.1)
    s.image('crop-toast', 7.85, 4.25, w=3.3)

    # 3 ------------------------------------------------------------------ Problem
    s = d.slide()
    header(s, 'The problem', 'Growing older — or growing up autistic — too often means ==facing care alone.==')
    gap, y0, hh = 0.3, 2.7, 3.0
    cw = (CW - 2 * gap) / 3
    stats = [('1 in 4', 'older adults are socially isolated', 'NASEM · 2020'),
             ('1 in 31', 'children are autistic', 'CDC · 2025'),
             ('50%', 'of long-term medicines aren’t taken as prescribed', 'WHO')]
    for i, (num, lab, src) in enumerate(stats):
        x = M + i * (cw + gap)
        card(s, x, y0, cw, hh)
        s.text(x + 0.35, y0 + 0.3, cw - 0.7, 1.3, num, size=74, color=WHITE, weight=800, anchor='t', lh=1.05, fit=False)
        s.text(x + 0.35, y0 + 1.55, cw - 0.7, 0.95, lab, size=17, color=ACCENT, weight=500, lh=1.25)
        s.text(x + 0.35, y0 + hh - 0.4, cw - 0.7, 0.3, src, size=10.5, color=DIM, mono=True)
    s.rect(M, 6.08, 0.06, 0.42, fill=ACCENT, r=0.03)
    s.text(M + 0.25, 6.08, 10, 0.42, 'Behind them: **63 million** family caregivers.  ~~AARP & NAC, 2025~~', size=17, color=TEXT, anchor='m')

    # 4 ---------------------------------------------------------------- Status quo
    s = d.slide()
    header(s, 'Today', 'Four apps. Four accounts. ==Four clouds.==', size=36)
    c1, c2, c3 = M, M + 3.3, M + 7.75
    w3 = W - M - c3
    ty = 2.55
    s.rect(c3 - 0.3, ty - 0.1, w3 + 0.3, 4.2, fill=ACCENT, alpha=0.07, r=0.22)
    label(s, c1, ty, 3, 'The need')
    label(s, c2, ty, 4, 'Today')
    label(s, c3, ty, 3, 'CareSphere', ACCENT)
    rows = [('Medication reminders', 'Medisafe', 'Overview tab'),
            ('Video calls', 'FaceTime', 'Coffee Circles · Jitsi'),
            ('Health record', 'MyChart', 'Visit brief · .txt'),
            ('Family updates', 'CaringBridge', 'Care Circle notes')]
    rh = 0.72
    for i, (need, app, ours) in enumerate(rows):
        y = ty + 0.5 + i * rh
        s.line(c1, y, W - M, y, color=WHITE, lw=0.75, alpha=0.1)
        s.text(c1, y + 0.18, 3.1, 0.5, need, size=17, color=WHITE, weight=700)
        s.text(c2, y + 0.18, 4.2, 0.5, f'{app}  ~~account · cloud~~', size=16, color=TEXT)
        s.text(c3, y + 0.18, w3, 0.5, f'=={ours}==', size=16, color=TEXT, weight=500)
    yb = ty + 0.5 + 4 * rh
    s.line(c1, yb, W - M, yb, color=WHITE, lw=0.75, alpha=0.1)
    s.text(c1, yb + 0.2, 3.1, 0.5, 'Total', size=17, color=WHITE, weight=700)
    s.text(c2, yb + 0.2, 4.2, 0.5, '4 apps · 4 accounts · 4 clouds', size=16, color=MUTED)
    s.text(c3, yb + 0.2, w3, 0.5, '**1 app · 0 accounts · 0 clouds**', size=16, color=ACCENT, strong=ACCENT)
    s.text(M, 6.62, CW, 0.35, 'None of the four was designed for autistic users.', size=13.5, color=DIM)

    # 5 ---------------------------------------------------------------- Solution
    s = d.slide()
    header(s, 'The solution', 'One calm app. Five tabs. ==Zero servers.==')
    tabs = [('phone-overview', 'Overview'), ('phone-activities', 'Activities'), ('phone-circles', 'Coffee Circles'),
            ('phone-care', 'Care Circle'), ('phone-vitals', 'Vitals')]
    iw = 2.15
    g = (CW - 5 * iw) / 4
    for i, (img, lab) in enumerate(tabs):
        x = M + i * (iw + g)
        y = 2.55 if i % 2 == 0 else 2.85
        s.image(img, x, y, w=iw)
        tw = tag_width(lab.upper(), 11, 700, 0.46) + len(lab) * 1.0 / 72
        s.chip(x + (iw - tw) / 2, 2.05, lab, size=11)

    # 6 ---------------------------------------------------------------- Live demo
    s = d.slide(transition='push')
    header(s, 'Live demo', 'Let’s see it.')
    s.image('web-overview', M - 0.42, 1.95, w=7.4)
    s.image('phone-overview', 6.75, 2.25, h=4.95)
    rx = 9.55
    rw = W - M - rx
    label(s, rx, 2.05, rw, 'Six shots · one take')
    shots = ['Mood check-in & routine', 'Reminder → Taken', 'Pair a sensor · export CSV',
             'Pattern Recall · Rain', 'Join a Coffee Circle', 'Build the visit brief']
    for i, t in enumerate(shots):
        y = 2.5 + i * 0.56
        s.text(rx, y, 0.45, 0.4, f'{i + 1:02d}', size=12, color=ACCENT, weight=700, mono=True, anchor='m')
        s.text(rx + 0.45, y, rw - 0.45, 0.4, t, size=15, color=TEXT, anchor='m')
    s.chip(rx, 6.05, 'same app · two clients', size=10)

    # 7 ---------------------------------------------------------- What's different
    s = d.slide()
    header(s, 'What makes it different', 'Four rules, ==written into the code.==')
    rules = [('Never fabricate', 'every reading labeled where it is born', "'LIVE_BLE' : 'SIMULATED'"),
             ('Nothing sent automatically', 'a person always taps Send', 'navigator.share() · ShareLink'),
             ('Calm by default', 'no timers, scores or auto-advance', 'Untimed · No scores'),
             ('Private by architecture', 'no account, no server, encrypted', "'AES-GCM', length: 256")]
    y0, rh = 2.55, 1.0
    for i, (rule, why, code) in enumerate(rules):
        y = y0 + i * rh
        s.line(M, y, W - M, y, color=WHITE, lw=0.75, alpha=0.1)
        s.text(M, y + 0.3, 0.6, 0.4, f'0{i + 1}', size=13, color=ACCENT, weight=700, mono=True)
        s.text(M + 0.6, y + 0.22, 3.9, 0.5, rule, size=21, color=WHITE, weight=700)
        s.text(M + 4.6, y + 0.27, 3.5, 0.5, why, size=15.5, color=MUTED)
        tag(s, M + 8.3, y + 0.29, code, size=10.5, color=ACCENT, fill=ACCENT, alpha=0.1, mono=True, h=0.38)
    s.line(M, y0 + 4 * rh, W - M, y0 + 4 * rh, color=WHITE, lw=0.75, alpha=0.1)

    # 8 ---------------------------------------------------------------- Audience
    s = d.slide()
    header(s, 'Who it’s for', 'Built for ==three people== at once.')
    gap = 0.35
    cw = (CW - 2 * gap) / 3
    people = [('phone-overview', 'Older adults', 'routines, reminders, real company'),
              ('phone-activities', 'Autistic teens & adults', 'predictable, untimed, sensory-calm'),
              ('phone-visitbrief', 'Family caregivers', 'notes and a brief they can trust')]
    y0, hh = 2.45, 4.2
    for i, (img, who, what) in enumerate(people):
        x = M + i * (cw + gap)
        card(s, x, y0, cw, hh)
        s.text(x + 0.35, y0 + 0.32, cw - 0.7, 0.5, who, size=20, color=WHITE, weight=700)
        s.text(x + 0.35, y0 + 0.78, cw - 0.7, 0.6, what, size=15, color=MUTED, lh=1.3)
        pw = 2.75
        ph = hh - 1.5
        s.image(img, x + (cw - pw) / 2, y0 + hh - ph, w=pw, crop=(0, 0, 0, 1 - (ph / pw) * 1018 / 2000))

    # 9 ----------------------------------------------------------------- Privacy
    s = d.slide()
    header(s, 'Privacy', 'Everything ==stays on the device.==')
    dx, dy, dw, dh = M, 2.45, 7.3, 4.15
    s.rect(dx, dy, dw, dh, fill=INK, alpha=0.35, line=ACCENT, line_alpha=0.5, lw=1.5, r=0.45)
    s.chip(dx + 0.35, dy + 0.3, 'on the device', size=10)
    mods = [('Vitals', 'BLE 0x180D · HealthKit, read-only'), ('Health Guide', 'Qwen2.5-1.5B · llama.cpp, offline'),
            ('Encrypted store', 'AES-256-GCM · Face ID lock'), ('Activities', 'Web Audio · untimed, unscored'),
            ('Visit brief', 'fields you pick · exact preview'), ('Coffee Circles', 'links to real Jitsi rooms')]
    mw, mh, mg = (dw - 0.7 - 2 * 0.2) / 3, 1.2, 0.2
    for i, (t, sub) in enumerate(mods):
        mx = dx + 0.35 + (i % 3) * (mw + mg)
        my = dy + 0.85 + (i // 3) * (mh + mg)
        card(s, mx, my, mw, mh, alpha=0.6, r=0.16)
        s.text(mx + 0.22, my + 0.22, mw - 0.4, 0.4, t, size=15, color=WHITE, weight=700)
        s.text(mx + 0.22, my + 0.58, mw - 0.4, 0.55, sub, size=12, color=MUTED, lh=1.25)
    rx = dx + dw + 0.55
    rw = W - M - rx
    label(s, rx, dy + 0.05, rw, 'What leaves the device')
    leaves = [('Live video', 'only while you are in a Jitsi room'), ('A visit brief', 'only when you tap Share')]
    for i, (t, sub) in enumerate(leaves):
        y = dy + 0.5 + i * 0.95
        s.line(dx + dw, y + 0.32, rx - 0.12, y + 0.32, color=ACCENT, lw=1.25, arrow=True, dash=True)
        s.text(rx, y, rw, 0.4, t, size=17, color=WHITE, weight=700)
        s.text(rx, y + 0.38, rw, 0.4, sub, size=13.5, color=MUTED)
    label(s, rx, dy + 2.5, rw, 'Never')
    for i, (num, lab) in enumerate([('0', 'accounts'), ('0', 'servers'), ('0', 'trackers')]):
        mini_stat(s, rx + i * 1.3, dy + 2.85, 1.3, num, lab, size=40)

    # 10 ------------------------------------------------------------ How it's built
    s = d.slide()
    header(s, 'How it’s built', 'Two clients. One promise. ==No server.==')
    gap = 0.35
    cw = (CW - gap) / 2
    cols = [('Web app', 'JavaScript', ['React 18', 'Vite 8', 'Tailwind 3', 'Web Bluetooth', 'Web Audio', 'Web Crypto', 'installable PWA']),
            ('iPhone app', 'Swift', ['SwiftUI', 'HealthKit', 'CoreBluetooth', 'CryptoKit', 'Face ID', 'llama.cpp', 'Sherpa-ONNX', 'Jitsi SDK'])]
    y0, hh = 2.5, 2.35
    for i, (t, lang, chips) in enumerate(cols):
        x = M + i * (cw + gap)
        card(s, x, y0, cw, hh)
        s.text(x + 0.35, y0 + 0.3, 3, 0.5, t, size=22, color=WHITE, weight=700)
        s.chip(x + cw - 0.35 - tag_width(lang.upper(), 10.5, 700, 0.46) - len(lang) / 72, y0 + 0.36, lang, size=10.5)
        tag_flow(s, x + 0.35, y0 + 0.95, cw - 0.7, chips)
    metrics = [('11,400+', 'lines of code'), ('17 / 17', 'tests passing'), ('2', 'CI pipelines'), ('3', 'public releases')]
    mw = (CW - 3 * 0.3) / 4
    for i, (num, lab) in enumerate(metrics):
        x = M + i * (mw + 0.3)
        card(s, x, 5.15, mw, 1.45, alpha=0.4)
        mini_stat(s, x + 0.3, 5.33, mw - 0.6, num, lab, size=38)

    # 11 ----------------------------------------------------------- Hardest problem
    s = d.slide()
    header(s, 'Hardest problem', 'Making Bluetooth ==honest.==')
    s.text(M, 2.25, 5.3, 1.3, 'Heart-rate notifications arrive late and out of order — a stale sensor could repaint a new card '
           'with a wrong number.', size=17.5, color=TEXT, lh=1.35)
    steps = [('Parse the standard', 'service 0x180D · flags byte → 8/16-bit BPM'),
             ('Label at the source', 'each sample is born LIVE or SIMULATED'),
             ('Drop stale sessions', 'a generation counter ignores old pairings')]
    for i, (t, b) in enumerate(steps):
        y = 3.75 + i * 0.95
        s.text(M, y + 0.03, 0.6, 0.4, f'0{i + 1}', size=13, color=ACCENT, weight=700, mono=True)
        s.text(M + 0.6, y - 0.02, 4.8, 0.45, t, size=19, color=WHITE, weight=700)
        s.text(M + 0.6, y + 0.4, 4.8, 0.45, b, size=14.5, color=MUTED)
    cx, cy, cw, ch = M + 6.2, 2.2, W - M - (M + 6.2), 3.5
    card(s, cx, cy, cw, ch, alpha=0.7)
    s.text(cx + 0.4, cy + 0.28, cw - 0.8, 0.3, 'src/lib/bluetooth.js  ~~·  src/App.jsx~~', size=11, color=ACCENT, mono=True)
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
    s.text(cx + 0.4, cy + 0.68, cw - 0.8, 2.75, code, size=10.5, color=TEXT, mono=True, lh=1.36, fit=False)
    s.image('crop-hr', W - M - 3.0, cy + ch - 0.4, w=3.0)

    # 12 ------------------------------------------------------------ Where it stands
    s = d.slide()
    header(s, 'Where it stands', '==Six weeks== from first commit to v2.2.')
    ax0, ax1, ay = M + 0.3, W - M - 0.3, 3.55
    span = ax1 - ax0
    past = 0.66                              # Sep 2 → Oct 14 occupies two thirds of the axis; the rest is the plan
    def X(day):                              # day 0 = Sep 2 2026
        return ax0 + span * past * day / 42
    s.line(ax0, ay, X(42), ay, color=ACCENT, lw=2)
    s.line(X(42), ay, ax1, ay, color=WHITE, lw=1.25, dash=True, alpha=0.35)
    for wk in range(7):
        x = X(wk * 7)
        s.line(x, ay + 0.1, x, ay + 0.2, color=WHITE, lw=0.75, alpha=0.3)
    for day, txt in [(0, 'Sep 2'), (14, 'Sep 16'), (28, 'Sep 30'), (42, 'Oct 14')]:
        s.text(X(day) - 0.6, ay + 0.26, 1.2, 0.3, txt, size=10.5, color=DIM, align='c')
    events = [(0, 'First commit', 'repo created', 'up'), (6, 'v1.0 + v2.0', 'first public releases', 'down'),
              (26, 'v2.1', 'release · Sep 28', 'up'), (42, 'v2.2', 'iOS + web, building in CI', 'down')]
    for day, t, sub, side in events:
        x = X(day)
        s.oval(x - 0.11, ay - 0.11, 0.22, 0.22, fill=ACCENT)
        if day == 0:                                                  # first label hugs the margin
            s.text(x - 0.11, ay - 1.15, 2.0, 0.4, t, size=16, color=WHITE, weight=700)
            s.text(x - 0.11, ay - 0.78, 2.0, 0.35, sub, size=12.5, color=MUTED)
        elif side == 'up':
            s.text(x - 1.0, ay - 1.15, 2.0, 0.4, t, size=16, color=WHITE, weight=700, align='c')
            s.text(x - 1.0, ay - 0.78, 2.0, 0.35, sub, size=12.5, color=MUTED, align='c')
        else:
            s.text(x - 1.0, ay + 0.62, 2.0, 0.4, t, size=16, color=WHITE, weight=700, align='c')
            s.text(x - 1.0, ay + 0.98, 2.0, 0.35, sub, size=12.5, color=MUTED, align='c')
    s.oval(ax1 - 0.1, ay - 0.1, 0.2, 0.2, fill=INK, line=ACCENT, lw=1.25)
    s.text(ax1 - 1.4, ay - 1.15, 1.7, 0.4, 'Next', size=16, color=ACCENT, weight=700, align='r')
    s.text(ax1 - 1.7, ay - 0.78, 2.0, 0.35, 'co-design → TestFlight', size=12.5, color=MUTED, align='r')
    gap = 0.3
    cw = (CW - 2 * gap) / 3
    plan = [('Next · v2.0 of this entry', 'Co-design sessions with autistic people, people living with dementia and caregivers; TestFlight beta.'),
            ('Then', 'Apple Health and Bluetooth history in the visit brief, with true source labels · non-diagnostic trends only from real readings.'),
            ('Deliberately not', 'Cloud sync, a clinician portal or a drug-interaction checker — not without clinical review.')]
    for i, (t, body) in enumerate(plan):
        x = M + i * (cw + gap)
        card(s, x, 5.15, cw, 1.55, accent=(i == 0))
        s.text(x + 0.3, 5.35, cw - 0.6, 0.35, t.upper(), size=10.5, color=ACCENT if i == 0 else DIM, weight=700, tracking=1.4)
        s.text(x + 0.3, 5.68, cw - 0.6, 0.95, body, size=13, color=TEXT, lh=1.3)

    # 13 ------------------------------------------------------------------- Close
    s = d.slide(footer=False, chrome=False, transition='fade-black')
    s.image('bg-mesh', 0, 0, w=W, h=H)
    s.image('glow', W / 2 - 4.75, -3.6, 9.5, 9.5)
    s.image('icon', W / 2 - 0.45, 1.25, 0.9, 0.9, r=0.22)
    s.text(M, 2.45, CW, 1.1, 'Care that stays yours.', size=56, color=WHITE, weight=800, align='c', anchor='t', lh=1.05, fit=False)
    s.text(M + 1.5, 3.6, CW - 3, 0.8, 'Connected, calm and private — with no account, no server and no fabricated number.',
           size=20, color=TEXT, align='c', lh=1.35)
    chips = ['Try the web app', 'Read the code', 'Watch the demo']
    widths = [tag_width(c.upper(), 11, 700, 0.46) + len(c) / 72 for c in chips]
    x = W / 2 - (sum(widths) + 0.2 * 2) / 2
    for c, w in zip(chips, widths):
        s.chip(x, 4.6, c, size=11)
        x += w + 0.2
    s.text(M, 5.3, CW, 0.45, 'github.com/engineer2025-sudo/Care', size=21, color=WHITE, weight=700, align='c')
    s.text(M, 5.85, CW, 0.4, 'Arnav Kochar  ·  kochar4646@gmail.com  ·  [School], [City], California', size=14.5, color=MUTED, align='c')
    s.text(M, 6.3, CW, 0.35, 'Demo video: [YouTube link]', size=12.5, color=DIM, align='c')
    qx, qy = W - M - 1.45, 0.75
    card(s, qx, qy, 1.45, 1.8, alpha=0.5)
    s.image('qr', qx + 0.17, qy + 0.17, w=1.11, r=0.08)
    s.text(qx, qy + 1.36, 1.45, 0.35, 'scan for source', size=9.5, color=DIM, align='c', weight=700, tracking=0.8)

    for sl, note in zip(d.slides, NOTES):
        sl.notes = note
    if AUTO_ADVANCE:
        for sl, secs in zip(d.slides, TIMES):
            tr = dict(d._transition_for(sl) or {'kind': 'fade', 'dur': 600})
            tr['adv_tm'] = secs * 1000
            sl.transition = tr
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
