#!/usr/bin/env python3
"""Cover photo for the Congressional App Challenge portal ("Please include a cover photo from your app").

Portal spec: 3:4, ideally 600 x 800 px, JPEG, clear at small sizes — it is displayed in the Capitol for a year if the
app wins.  Rendered at 2x (1200 x 1600) from the same real assets as the deck (app icon, framed screenshot of the
running web app, vector shapes) and downsampled; no AI imagery.

Usage:  python3 make_cover.py   → cover/CareSphere_cover_600x800.jpg (+ a 1200x1600 version)
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from deck_engine import ACCENT, ASSETS, BG, BG2, FACES, FONT_DIR, MUTED, TEXT, WHITE, rgb

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'cover'
W, H = 1200, 1600          # 2x render of the 600 x 800 target


def font(px, weight=400):
    return ImageFont.truetype(str(FONT_DIR / FACES[weight][0]), px)


def gradient(w, h):
    c0, c1 = rgb(BG), rgb(BG2)
    g = Image.new('RGB', (1, h))
    for y in range(h):
        t = y / (h - 1)
        g.putpixel((0, y), tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3)))
    return g.resize((w, h)).convert('RGBA')


def centered(d, y, text, f, fill):
    w = d.textlength(text, font=f)
    d.text(((W - w) / 2, y), text, font=f, fill=fill)


def main():
    OUT.mkdir(exist_ok=True)
    im = gradient(W, H)

    glow = Image.open(ASSETS / 'glow.png').convert('RGBA').resize((1500, 1500), Image.LANCZOS)
    im.alpha_composite(glow, (W // 2 - 750, -820))

    icon = Image.open(ASSETS / 'icon.png').convert('RGBA').resize((190, 190), Image.LANCZOS)
    mask = Image.new('L', icon.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, 189, 189], radius=46, fill=255)
    icon.putalpha(mask)
    im.alpha_composite(icon, ((W - 190) // 2, 118))

    d = ImageDraw.Draw(im)
    centered(d, 338, 'CareSphere AI', font(112, 800), rgb(WHITE))
    centered(d, 486, 'Connected care for independent living', font(42, 500), rgb(ACCENT))
    centered(d, 552, 'for older adults, autistic people and their families', font(29, 400), rgb(MUTED))

    phone = Image.open(ASSETS / 'phone-overview.png').convert('RGBA')
    pw = 880
    phone = phone.resize((pw, int(phone.height * pw / phone.width)), Image.LANCZOS)
    im.alpha_composite(phone.crop((0, 0, pw, H - 625)), ((W - pw) // 2, 625))

    full = im.convert('RGB')
    full.save(OUT / 'CareSphere_cover_1200x1600.jpg', quality=92, optimize=True)
    small = full.resize((600, 800), Image.LANCZOS)
    small.save(OUT / 'CareSphere_cover_600x800.jpg', quality=92, optimize=True)
    for f in sorted(OUT.glob('*.jpg')):
        print(f.relative_to(ROOT), Image.open(f).size, f'{f.stat().st_size / 1024:.0f} KB')


if __name__ == '__main__':
    main()
