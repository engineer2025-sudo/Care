"""Prepare pitch-deck image assets from REAL CareSphere screenshots.

All visuals are either (a) screenshots of the running CareSphere web app captured
with headless Chromium, (b) the app's own icon, or (c) programmatically drawn
frames/QR codes. No AI-generated imagery is used anywhere in the deck.
"""
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import qrcode

ROOT = Path(__file__).resolve().parent
SHOTS = Path(os.environ.get('CARESPHERE_SHOTS', ROOT / 'tools' / 'out'))  # raw captures from tools/capture*.js
OUT = ROOT / 'assets'
OUT.mkdir(exist_ok=True)
FONT = str(Path(os.environ.get('PITCH_FONT_DIR', ROOT / 'fonts')) / 'Arimo[wght].ttf')

BG = (0x13, 0x1B, 0x16)          # the app's own page background (Calm charcoal theme)
FRAME = (10, 16, 30)              # drawn device frames, tinted for the blue deck
FRAME_EDGE = (70, 95, 140)
FRAME_INNER = (24, 38, 66)


def rounded_mask(size, radius):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m


def phone_frame(src, dst, target_w=720):
    """Wrap a 390x844@3x screenshot in a simple dark phone bezel (drawn, not AI)."""
    shot = Image.open(src).convert('RGBA')
    scale = target_w / shot.width
    shot = shot.resize((target_w, round(shot.height * scale)), Image.LANCZOS)
    w = shot.width
    status_h = round(w * 0.13)   # synthetic status-bar strip so the island never covers app UI
    home_h = round(w * 0.07)
    bar_color = shot.getpixel((4, 4))[:3] + (255,)
    screen = Image.new('RGBA', (w, shot.height + status_h + home_h), bar_color)
    screen.alpha_composite(shot, (0, status_h))
    # bottom strip in the page background colour + home indicator
    ImageDraw.Draw(screen).rectangle([0, status_h + shot.height, w, screen.height], fill=BG + (255,))
    sd = ImageDraw.Draw(screen)
    sd.rounded_rectangle([w * 0.33, screen.height - home_h * 0.55, w * 0.67, screen.height - home_h * 0.35], radius=6, fill=(200, 210, 200, 255))
    # status text
    f = ImageFont.truetype(FONT, round(w * 0.045)); f.set_variation_by_name('SemiBold')
    sd.text((w * 0.09, status_h * 0.5), '9:41', font=f, fill=(244, 246, 242, 255), anchor='lm')
    # battery + signal glyphs (simple shapes)
    bx = w * 0.84; by = status_h * 0.5
    sd.rounded_rectangle([bx, by - w * 0.016, bx + w * 0.065, by + w * 0.016], radius=4, outline=(244, 246, 242, 255), width=2)
    sd.rounded_rectangle([bx + 3, by - w * 0.016 + 3, bx + w * 0.065 - 3, by + w * 0.016 - 3], radius=2, fill=(244, 246, 242, 255))
    sd.rectangle([bx + w * 0.065 + 2, by - w * 0.006, bx + w * 0.065 + 4, by + w * 0.006], fill=(244, 246, 242, 255))
    for i in range(4):
        hgt = w * (0.012 + i * 0.006)
        sd.rectangle([bx - w * 0.07 + i * w * 0.013, by + w * 0.016 - hgt, bx - w * 0.07 + i * w * 0.013 + w * 0.009, by + w * 0.016], fill=(244, 246, 242, 255))
    h = screen.height
    radius = round(w * 0.135)
    bezel = round(w * 0.045)
    screen.putalpha(rounded_mask((w, h), radius))
    canvas = Image.new('RGBA', (w + 2 * bezel, h + 2 * bezel), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle([0, 0, canvas.width - 1, canvas.height - 1], radius=radius + bezel, fill=FRAME + (255,), outline=FRAME_EDGE + (255,), width=3)
    d.rounded_rectangle([3, 3, canvas.width - 4, canvas.height - 4], radius=radius + bezel - 3, outline=FRAME_INNER + (255,), width=2)
    canvas.alpha_composite(screen, (bezel, bezel))
    pw, ph = round(w * 0.30), round(w * 0.075)
    px, py = (canvas.width - pw) // 2, bezel + round(status_h * 0.5 - ph * 0.5)
    ImageDraw.Draw(canvas).rounded_rectangle([px, py, px + pw, py + ph], radius=ph // 2, fill=(8, 10, 9, 255))
    canvas.save(dst, optimize=True)
    return canvas.size


def browser_frame(src, dst, target_w=1600, title='CareSphere · installable web app (PWA)'):
    im = Image.open(src).convert('RGBA')
    scale = target_w / im.width
    im = im.resize((target_w, round(im.height * scale)), Image.LANCZOS)
    w, h = im.size
    bar = round(w * 0.034)
    radius = round(w * 0.018)
    canvas = Image.new('RGBA', (w + 4, h + bar + 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle([0, 0, canvas.width - 1, canvas.height - 1], radius=radius, fill=(18, 40, 84, 255), outline=FRAME_EDGE + (255,), width=2)
    # traffic lights
    r = round(bar * 0.22)
    for i, col in enumerate([(226, 109, 109), (240, 178, 58), (91, 142, 107)]):
        cx = round(bar * 0.6) + i * round(bar * 0.62)
        d.ellipse([cx - r, bar // 2 - r + 2, cx + r, bar // 2 + r + 2], fill=col)
    # URL pill
    font = ImageFont.truetype(FONT, round(bar * 0.42))
    tw = font.getlength(title)
    pw = round(tw + bar * 0.9)
    px = (canvas.width - pw) // 2
    d.rounded_rectangle([px, round(bar * 0.18) + 2, px + pw, round(bar * 0.82) + 2], radius=bar // 3, fill=(12, 30, 64, 255))
    d.text((px + bar * 0.45, bar * 0.5 + 2), title, font=font, fill=(170, 190, 225), anchor='lm')
    # screenshot with rounded bottom corners
    mask = Image.new('L', (w, h), 255)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, -radius * 2, w - 1, h - 1], radius=radius, fill=255)
    # square off top edge
    md.rectangle([0, 0, w - 1, radius], fill=255)
    im.putalpha(mask)
    canvas.alpha_composite(im, (2, bar + 2))
    canvas.save(dst, optimize=True)
    return canvas.size


def plain(src, dst, target_w=None, trim=None):
    """Copy a screenshot crop, optionally trimming (left, top, right, bottom) fractions."""
    im = Image.open(src).convert('RGBA')
    if trim:
        l, t, r, b = trim
        im = im.crop((round(im.width * l), round(im.height * t), round(im.width * (1 - r)), round(im.height * (1 - b))))
    if target_w and im.width > target_w:
        im = im.resize((target_w, round(im.height * target_w / im.width)), Image.LANCZOS)
    im.save(dst, optimize=True)
    return im.size


def glow(dst, size=(1400, 1400), color=(80, 140, 255), strength=95):
    im = Image.new('RGBA', size, (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy = size[0] // 2, size[1] // 2
    r = size[0] // 3
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (strength,))
    im = im.filter(ImageFilter.GaussianBlur(size[0] // 7))
    im.save(dst, optimize=True)


def qr(dst, data='https://github.com/engineer2025-sudo/Care'):
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=2)
    q.add_data(data)
    q.make(fit=True)
    img = q.make_image(fill_color='#0C2D63', back_color='#FFFFFF').convert('RGBA')   # dark-on-white scans best
    img.save(dst)
    return img.size


def main():
    sizes = {}
    if not SHOTS.exists():
        print(f'raw screenshots not found at {SHOTS} — run tools/capture*.js first (see README). Regenerating drawn assets only.')
        drawn(sizes)
        prune()
        return
    phones = {
        'phone-overview': 'phone-overview.png',
        'phone-activities': 'phone-activities.png',
        'phone-circles': 'phone-circles.png',
        'phone-care': 'phone-care.png',
        'phone-vitals': 'phone-vitals-hr.png',
        'phone-visitbrief': 'phone-visitbrief.png',
        'phone-sos': 'phone-sos.png',
        'phone-settings': 'phone-settings.png',
        'phone-toast': 'phone-overview-toast.png',
        'phone-meds': 'phone-overview-meds.png',
        'phone-mood': 'phone-overview-mood.png',
        'phone-breathing': 'phone-breathing.png',
        'phone-soundscapes': 'phone-soundscapes.png',
        'phone-pattern': 'phone-pattern.png',
        'phone-light': 'phone-overview-light.png',
        'phone-care-summary': 'phone-care-summary.png',
    }
    for name, f in phones.items():
        sizes[name] = phone_frame(SHOTS / f, OUT / f'{name}.png')
    browsers = {
        'web-overview': 'desktop-overview.png',
        'web-circles': 'desktop-circles.png',
        'web-vitals': 'desktop-vitals2.png',
        'web-activities': 'desktop-activities.png',
        'web-care': 'desktop-care.png',
        'web-light': 'desktop-overview-light.png',
        'web-highcontrast': 'desktop-overview-highcontrast.png',
        'web-toast': 'desktop-overview-toast.png',
    }
    for name, f in browsers.items():
        sizes[name] = browser_frame(SHOTS / f, OUT / f'{name}.png')
    crops = {
        'crop-toast': ('crop-toast.png', None, None),
        'crop-mood': ('crop-mood.png', 1600, None),
        'crop-meds': ('crop-meds.png', 1000, None),
        'crop-routine': ('crop-routine.png', 1000, None),
        'crop-pattern': ('crop-pattern.png', 1000, None),
        'crop-breathing': ('crop-breathing.png', 1000, None),
        'crop-soundscapes': ('crop-soundscapes-playing.png', 1000, None),
        'crop-feelings': ('crop-feelings.png', 1000, None),
        'crop-pairs': ('crop-pairs.png', 1000, None),
        'crop-story': ('crop-story.png', 1000, None),
        'crop-hr': ('crop-hr.png', None, None),
        'crop-spo2': ('crop-spo2.png', None, None),
        'crop-range': ('crop-range.png', 1400, None),
        'crop-vitals-how': ('crop-vitals-how.png', 1400, None),
        'crop-visitbrief': ('crop-visitbrief.png', 1100, (0, 0, 0.025, 0.035)),
        'crop-visitbrief-preview': ('crop-visitbrief-preview.png', 1200, None),
        'crop-notes': ('crop-notes.png', 1100, (0, 0.03, 0, 0.42)),
        'crop-summary': ('crop-summary.png', None, None),
        'crop-sos': ('crop-sos.png', None, None),
        'crop-settings': ('crop-settings.png', None, None),
        'crop-settings-privacy': ('crop-settings-privacy.png', None, (0, 0.02, 0, 0)),
        'crop-circle-card': ('crop-circle-card.png', None, None),
        'crop-video-how': ('crop-video-how.png', 1400, None),
        # wide "strips" (top portion of a card) for compact persona cards
        'strip-routine': ('crop-routine.png', 1000, (0, 0, 0, 0.38)),
        'strip-soundscapes': ('crop-soundscapes-playing.png', 1000, (0, 0, 0, 0.42)),
        'strip-summary': ('crop-summary.png', None, (0, 0, 0, 0.38)),
    }
    for name, (f, tw, trim) in crops.items():
        sizes[name] = plain(SHOTS / f, OUT / f'{name}.png', tw, trim)
    drawn(sizes)
    prune()
    for k, v in sizes.items():
        print(f'{k:28s} {v}')


def drawn(sizes):
    """Assets that are drawn rather than captured: app icon, background glow, QR code."""
    OUT.mkdir(exist_ok=True)
    sizes['icon'] = plain(ROOT.parent / 'ios/CareSphere/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon1024.png', OUT / 'icon.png', 512)
    glow(OUT / 'glow.png')
    sizes['qr'] = qr(OUT / 'qr.png')


def prune():
    """Keep assets/ lean: only images referenced by build_deck.py stay there; everything else is parked in
    assets/extra (real screenshots are never deleted — they are handy for swapping into slides or as video B-roll)."""
    import re
    deck_src = (ROOT / 'build_deck.py').read_text()
    used = set(re.findall(r"'((?:phone|web|crop|strip)-[\w-]+)'", deck_src)) | {'glow', 'icon', 'qr'}
    extra_dir = OUT / 'extra'
    extra_dir.mkdir(exist_ok=True)
    for f in sorted(OUT.glob('*.png')):
        if f.stem not in used:
            f.replace(extra_dir / f.name)
    for f in sorted(extra_dir.glob('*.png')):
        if f.stem in used and not (OUT / f.name).exists():
            f.replace(OUT / f.name)


if __name__ == '__main__':
    main()
