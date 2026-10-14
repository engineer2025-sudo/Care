"""Prepare pitch-deck image assets from REAL CareSphere screenshots.

All visuals are either (a) screenshots of the running CareSphere web app captured with headless Chromium,
(b) the app's own icon, or (c) programmatically drawn frames / glow / QR code.  No AI-generated imagery is used.

Two modes:
  * raw captures present in tools/out (or $CARESPHERE_SHOTS) → frame/crop everything from scratch;
  * otherwise → re-frame the screenshots already in assets/ and assets/extra (the drawn bezels are peeled off
    and redrawn), so the look of the frames can evolve without re-capturing.
"""
import os
import re
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
SHOTS = Path(os.environ.get('CARESPHERE_SHOTS', ROOT / 'tools' / 'out'))  # raw captures from tools/capture*.js
OUT = ROOT / 'assets'
EXTRA = OUT / 'extra'
FONT = str(Path(os.environ.get('PITCH_FONT_DIR', ROOT / 'fonts')) / 'PlusJakartaSans-Medium.ttf')

APP_BG = (0x13, 0x1B, 0x16)        # the app's own page background (Calm charcoal theme)
INK = (10, 19, 36)                 # icon navy — device bodies
EDGE = (52, 70, 108)               # bezel edge
ACCENT = (6, 226, 136)             # icon heart

PHONE_W = 720                      # screen width in px for phone assets
PHONE_BEZEL_OLD = round(PHONE_W * 0.045)
BROWSER_W = 1600
BROWSER_BAR_OLD = round(BROWSER_W * 0.034)


# --------------------------------------------------------------------------- helpers
def rounded_mask(size, radius):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m


def with_shadow(body, pad=120, offset=(0, 34), blur=48, alpha=165):
    """Place an RGBA image on a transparent canvas with a soft drop shadow (drawn, not AI)."""
    canvas = Image.new('RGBA', (body.width + 2 * pad, body.height + 2 * pad), (0, 0, 0, 0))
    shadow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    sh = Image.new('RGBA', body.size, (0, 0, 0, 0))
    sh.paste((0, 0, 0, alpha), (0, 0), body.getchannel('A'))
    shadow.alpha_composite(sh, (pad + offset[0], pad + offset[1]))
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(body, (pad, pad))
    return canvas


# --------------------------------------------------------------------------- phone
def phone_screen_from_raw(src):
    """390x844@3x screenshot → screen image with a synthetic status bar and home indicator."""
    shot = Image.open(src).convert('RGBA')
    scale = PHONE_W / shot.width
    shot = shot.resize((PHONE_W, round(shot.height * scale)), Image.LANCZOS)
    w = shot.width
    status_h = round(w * 0.13)
    home_h = round(w * 0.07)
    bar_color = shot.getpixel((4, 4))[:3] + (255,)
    screen = Image.new('RGBA', (w, shot.height + status_h + home_h), bar_color)
    screen.alpha_composite(shot, (0, status_h))
    sd = ImageDraw.Draw(screen)
    sd.rectangle([0, status_h + shot.height, w, screen.height], fill=APP_BG + (255,))
    sd.rounded_rectangle([w * 0.33, screen.height - home_h * 0.55, w * 0.67, screen.height - home_h * 0.35], radius=6, fill=(200, 210, 200, 255))
    f = ImageFont.truetype(FONT, round(w * 0.045))
    sd.text((w * 0.09, status_h * 0.5), '9:41', font=f, fill=(244, 246, 242, 255), anchor='lm')
    bx = w * 0.84
    by = status_h * 0.5
    sd.rounded_rectangle([bx, by - w * 0.016, bx + w * 0.065, by + w * 0.016], radius=4, outline=(244, 246, 242, 255), width=2)
    sd.rounded_rectangle([bx + 3, by - w * 0.016 + 3, bx + w * 0.065 - 3, by + w * 0.016 - 3], radius=2, fill=(244, 246, 242, 255))
    sd.rectangle([bx + w * 0.065 + 2, by - w * 0.006, bx + w * 0.065 + 4, by + w * 0.006], fill=(244, 246, 242, 255))
    for i in range(4):
        hgt = w * (0.012 + i * 0.006)
        sd.rectangle([bx - w * 0.07 + i * w * 0.013, by + w * 0.016 - hgt, bx - w * 0.07 + i * w * 0.013 + w * 0.009, by + w * 0.016], fill=(244, 246, 242, 255))
    return screen


def phone_screen_from_framed(src):
    """Peel the old drawn bezel off a previously framed phone asset."""
    im = Image.open(src).convert('RGBA')
    b = PHONE_BEZEL_OLD
    if im.width == PHONE_W + 2 * b:
        return im.crop((b, b, im.width - b, im.height - b))
    raise ValueError(f'{src}: unexpected size {im.size}')


def phone_frame(screen, dst):
    w, h = screen.size
    radius = round(w * 0.135)
    bezel = round(w * 0.04)
    screen = screen.copy()
    screen.putalpha(rounded_mask((w, h), radius))
    body = Image.new('RGBA', (w + 2 * bezel, h + 2 * bezel), (0, 0, 0, 0))
    d = ImageDraw.Draw(body)
    d.rounded_rectangle([0, 0, body.width - 1, body.height - 1], radius=radius + bezel, fill=INK + (255,), outline=EDGE + (255,), width=3)
    d.rounded_rectangle([3, 3, body.width - 4, body.height - 4], radius=radius + bezel - 3, outline=(255, 255, 255, 28), width=1)
    body.alpha_composite(screen, (bezel, bezel))
    # dynamic island
    pw, ph = round(w * 0.30), round(w * 0.075)
    status_h = round(w * 0.13)
    px, py = (body.width - pw) // 2, bezel + round(status_h * 0.5 - ph * 0.5)
    ImageDraw.Draw(body).rounded_rectangle([px, py, px + pw, py + ph], radius=ph // 2, fill=(6, 9, 16, 255))
    out = with_shadow(body)
    out.save(dst, optimize=True)
    return out.size


# --------------------------------------------------------------------------- browser
def browser_shot_from_raw(src):
    im = Image.open(src).convert('RGBA')
    scale = BROWSER_W / im.width
    return im.resize((BROWSER_W, round(im.height * scale)), Image.LANCZOS)


def browser_shot_from_framed(src):
    im = Image.open(src).convert('RGBA')
    bar = BROWSER_BAR_OLD
    if im.width == BROWSER_W + 4:
        return im.crop((2, bar + 2, im.width - 2, im.height - 2))
    raise ValueError(f'{src}: unexpected size {im.size}')


def browser_frame(shot, dst, title='caresphere · installable web app'):
    w, h = shot.size
    bar = round(w * 0.036)
    radius = round(w * 0.016)
    body = Image.new('RGBA', (w + 4, h + bar + 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(body)
    d.rounded_rectangle([0, 0, body.width - 1, body.height - 1], radius=radius, fill=INK + (255,), outline=EDGE + (255,), width=2)
    r = round(bar * 0.2)
    for i, col in enumerate([(120, 132, 160), (120, 132, 160), (120, 132, 160)]):   # monochrome window dots
        cx = round(bar * 0.6) + i * round(bar * 0.6)
        d.ellipse([cx - r, bar // 2 - r + 2, cx + r, bar // 2 + r + 2], fill=col)
    font = ImageFont.truetype(FONT, round(bar * 0.4))
    tw = font.getlength(title)
    pw = round(tw + bar * 1.0)
    px = (body.width - pw) // 2
    d.rounded_rectangle([px, round(bar * 0.17) + 2, px + pw, round(bar * 0.83) + 2], radius=bar // 3, fill=(22, 36, 66, 255))
    d.text((px + bar * 0.5, bar * 0.5 + 2), title, font=font, fill=(150, 168, 205), anchor='lm')
    mask = Image.new('L', (w, h), 255)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, -radius * 2, w - 1, h - 1], radius=radius, fill=255)
    md.rectangle([0, 0, w - 1, radius], fill=255)
    shot = shot.copy()
    shot.putalpha(mask)
    body.alpha_composite(shot, (2, bar + 2))
    out = with_shadow(body, pad=140, offset=(0, 40), blur=56, alpha=150)
    out.save(dst, optimize=True)
    return out.size


# --------------------------------------------------------------------------- plain crops, icon, glow, qr
def plain(src, dst, target_w=None, trim=None):
    im = Image.open(src).convert('RGBA')
    if trim:
        l, t, r, b = trim
        im = im.crop((round(im.width * l), round(im.height * t), round(im.width * (1 - r)), round(im.height * (1 - b))))
    if target_w and im.width > target_w:
        im = im.resize((target_w, round(im.height * target_w / im.width)), Image.LANCZOS)
    im.save(dst, optimize=True)
    return im.size


def glow(dst, size=(1600, 1600), color=ACCENT, strength=70):
    im = Image.new('RGBA', size, (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy = size[0] // 2, size[1] // 2
    r = size[0] // 3
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (strength,))
    im = im.filter(ImageFilter.GaussianBlur(size[0] // 6))
    im.save(dst, optimize=True)


def qr(dst, data='https://github.com/engineer2025-sudo/Care'):
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=2)
    q.add_data(data)
    q.make(fit=True)
    img = q.make_image(fill_color='#0A1324', back_color='#FFFFFF').convert('RGBA')
    img.save(dst)
    return img.size


def drawn(sizes):
    OUT.mkdir(exist_ok=True)
    sizes['icon'] = plain(ROOT.parent / 'ios/CareSphere/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon1024.png', OUT / 'icon.png', 512)
    glow(OUT / 'glow.png')
    sizes['qr'] = qr(OUT / 'qr.png')


# --------------------------------------------------------------------------- pipelines
PHONES = {
    'phone-overview': 'phone-overview.png', 'phone-activities': 'phone-activities.png', 'phone-circles': 'phone-circles.png',
    'phone-care': 'phone-care.png', 'phone-vitals': 'phone-vitals-hr.png', 'phone-visitbrief': 'phone-visitbrief.png',
    'phone-sos': 'phone-sos.png', 'phone-settings': 'phone-settings.png', 'phone-toast': 'phone-overview-toast.png',
    'phone-light': 'phone-overview-light.png',
}
BROWSERS = {
    'web-overview': 'desktop-overview.png', 'web-circles': 'desktop-circles.png', 'web-vitals': 'desktop-vitals2.png',
    'web-light': 'desktop-overview-light.png', 'web-highcontrast': 'desktop-overview-highcontrast.png',
}
CROPS = {
    'crop-toast': ('crop-toast.png', None, None), 'crop-mood': ('crop-mood.png', 1600, None), 'crop-meds': ('crop-meds.png', 1000, None),
    'crop-routine': ('crop-routine.png', 1000, None), 'crop-pattern': ('crop-pattern.png', 1000, None),
    'crop-breathing': ('crop-breathing.png', 1000, None), 'crop-soundscapes': ('crop-soundscapes-playing.png', 1000, None),
    'crop-feelings': ('crop-feelings.png', 1000, None), 'crop-pairs': ('crop-pairs.png', 1000, None), 'crop-story': ('crop-story.png', 1000, None),
    'crop-hr': ('crop-hr.png', None, None), 'crop-spo2': ('crop-spo2.png', None, None), 'crop-range': ('crop-range.png', 1400, None),
    'crop-vitals-how': ('crop-vitals-how.png', 1400, None), 'crop-visitbrief': ('crop-visitbrief.png', 1100, (0, 0, 0.025, 0.035)),
    'crop-notes': ('crop-notes.png', 1100, (0, 0.03, 0, 0.42)), 'crop-summary': ('crop-summary.png', None, None),
    'crop-sos': ('crop-sos.png', None, None), 'crop-settings-privacy': ('crop-settings-privacy.png', None, (0, 0.02, 0, 0)),
    'crop-circle-card': ('crop-circle-card.png', None, None),
}


def from_raw(sizes):
    for name, f in PHONES.items():
        if (SHOTS / f).exists():
            sizes[name] = phone_frame(phone_screen_from_raw(SHOTS / f), OUT / f'{name}.png')
    for name, f in BROWSERS.items():
        if (SHOTS / f).exists():
            sizes[name] = browser_frame(browser_shot_from_raw(SHOTS / f), OUT / f'{name}.png')
    for name, (f, tw, trim) in CROPS.items():
        if (SHOTS / f).exists():
            sizes[name] = plain(SHOTS / f, OUT / f'{name}.png', tw, trim)


def reframe_existing(sizes):
    """Redraw bezels around the screenshots we already have (assets/ and assets/extra)."""
    for folder in (OUT, EXTRA):
        for f in sorted(folder.glob('*.png')):
            try:
                if f.stem.startswith('phone-'):
                    sizes[f.stem] = phone_frame(phone_screen_from_framed(f), f)
                elif f.stem.startswith('web-'):
                    sizes[f.stem] = browser_frame(browser_shot_from_framed(f), f)
            except ValueError as e:      # already re-framed (new size) — leave as is
                print('skip', e)


def prune():
    """Only images referenced by build_deck.py stay in assets/; everything else is parked in assets/extra
    (real screenshots are never deleted — handy for swapping into slides or as video B-roll)."""
    deck_src = (ROOT / 'build_deck.py').read_text()
    used = set(re.findall(r"'((?:phone|web|crop|strip)-[\w-]+)'", deck_src)) | {'glow', 'icon', 'qr'}
    EXTRA.mkdir(exist_ok=True)
    for f in sorted(OUT.glob('*.png')):
        if f.stem not in used:
            f.replace(EXTRA / f.name)
    for f in sorted(EXTRA.glob('*.png')):
        if f.stem in used and not (OUT / f.name).exists():
            f.replace(OUT / f.name)


def main():
    sizes = {}
    OUT.mkdir(exist_ok=True)
    if SHOTS.exists():
        from_raw(sizes)
    else:
        print(f'raw screenshots not found at {SHOTS} — re-framing the existing screenshots instead.')
        reframe_existing(sizes)
    drawn(sizes)
    prune()
    for k, v in sorted(sizes.items()):
        print(f'{k:28s} {v}')


if __name__ == '__main__':
    main()
