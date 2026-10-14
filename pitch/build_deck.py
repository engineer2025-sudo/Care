#!/usr/bin/env python3
"""Build the CareSphere AI Congressional App Challenge pitch deck.

One slide description (rectangles, text, images, arrows — all in inches) is
rendered twice:
  * to an editable PowerPoint file (python-pptx), and
  * to PNG previews (Pillow + Arimo, an Arial-metric-compatible font) so the
    layout can be checked visually without PowerPoint.

Every picture in the deck is a real screenshot of the running CareSphere web
app, the app's own icon, or a shape drawn by this script (frames, QR code).
No AI-generated imagery is used.

Usage:  python3 build_deck.py            # writes the .pptx + preview/*.png
"""
from __future__ import annotations

import re
from pathlib import Path

from lxml import etree
from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.dml import MSO_LINE_DASH_STYLE
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / 'assets'
PREVIEW = ROOT / 'preview'
OUT_PPTX = ROOT / 'CareSphere_Congressional_App_Challenge_Deck.pptx'
# Preview fonts (metric-compatible with the Arial / Courier New used inside the .pptx):
#   Arimo + Cousine from Google Fonts (OFL). Set PITCH_FONT_DIR to point at them.
import os
FONT_DIR = Path(os.environ.get('PITCH_FONT_DIR', Path.home() / 'fonts'))
FONT_REG = str(FONT_DIR / 'Arimo[wght].ttf')
FONT_ITA = str(FONT_DIR / 'Arimo-Italic[wght].ttf')
FONT_MONO = str(FONT_DIR / 'Cousine-Regular.ttf')

# ---------------------------------------------------------------- design tokens
W, H = 13.333, 7.5          # 16:9 slide, inches
PX = 144                    # preview pixels per inch (1920 x 1080)
M = 0.6                     # outer margin
CW = W - 2 * M              # content width

BG = '131B16'       # slate-950 (matches the app, so screenshot corners blend in)
CARD = '202B24'     # slate-900
CARD2 = '28352C'
BORDER = '2E3B32'   # slate-800
BORDER2 = '3C4B41'
WHITE = 'F4F6F2'
TEXT = 'E6EBE6'
TEXT2 = 'C3CEC4'
MUTED = 'A2B0A3'
DIM = '77857A'
SAGE = '5B8E6B'
SAGE_L = '9FC1AA'
SAGE_B = '7DA88A'
GREEN = '22C55E'
AMBER = 'F0B23A'
ROSE = 'E26D6D'
SKY = '5EB3E6'
VIOLET = 'A08AE0'
NAVY = '0D1424'

FOOTER = 'CareSphere AI  ·  Congressional App Challenge 2026'


def rgb(hexstr):
    return tuple(int(hexstr[i:i + 2], 16) for i in (0, 2, 4))


# ------------------------------------------------------------------ text model
_font_cache: dict = {}


def pil_font(size_pt: float, bold=False, italic=False, mono=False):
    px = max(1.0, round(size_pt * PX / 72, 1))
    key = (px, bold, italic, mono)
    if key not in _font_cache:
        if mono:
            f = ImageFont.truetype(FONT_MONO, px)
        else:
            f = ImageFont.truetype(FONT_ITA if italic else FONT_REG, px)
            f.set_variation_by_axes([700 if bold else 400])
        _font_cache[key] = f
    return _font_cache[key]


def parse_markup(text: str, base: dict) -> list[tuple[str, dict]]:
    """**bold** → bold run (uses base['strong'] colour), ~~muted~~ → dim run."""
    runs = []
    pattern = re.compile(r'(\*\*.+?\*\*|~~.+?~~)')
    for part in pattern.split(text):
        if not part:
            continue
        style = dict(base)
        if part.startswith('**'):
            part = part[2:-2]
            style['bold'] = True
            style['color'] = base.get('strong', base['color'])
        elif part.startswith('~~'):
            part = part[2:-2]
            style['color'] = base.get('dim', MUTED)
        runs.append((part, style))
    return runs


def norm_paras(paras, size, color, bold, italic, strong, lh, space_after, mono=False):
    out = []
    for p in paras:
        if isinstance(p, str):
            p = {'text': p}
        base = {
            'size': p.get('size', size), 'color': p.get('color', color),
            'bold': p.get('bold', bold), 'italic': p.get('italic', italic),
            'strong': p.get('strong', strong), 'mono': p.get('mono', mono),
        }
        runs = p['runs'] if 'runs' in p else parse_markup(p['text'], base)
        runs = [(t, {**base, **st}) for t, st in runs]
        out.append({
            'runs': runs, 'bullet': p.get('bullet', False), 'size': base['size'],
            'space_before': p.get('space_before', 0), 'space_after': p.get('space_after', space_after),
            'lh': p.get('lh', lh), 'align': p.get('align'), 'bullet_color': p.get('bullet_color', SAGE_L),
            'indent': p.get('indent', 0.24), 'bullet_char': p.get('bullet_char', '•'),
        })
    return out


def layout_paras(paras, w_in, scale=1.0):
    """Greedy word wrap using Arimo metrics. Returns (lines, total_height_in)."""
    lines = []
    total = 0.0
    for pi, p in enumerate(paras):
        size = p['size'] * scale
        indent = p['indent'] if p['bullet'] else 0
        max_px = (w_in - indent) * PX * 0.965
        tokens = []
        for text, st in p['runs']:
            for tok in re.findall(r'\S+\s*|\s+', text):
                tokens.append((tok, st))
        cur, cur_w = [], 0.0
        for tok, st in tokens:
            f = pil_font(st['size'] * scale, st['bold'], st['italic'], st.get('mono'))
            tw = f.getlength(tok)
            tw_fit = f.getlength(tok.rstrip())
            if cur and cur_w + tw_fit > max_px:
                lines.append((pi, cur, cur_w))
                cur, cur_w = [], 0.0
                if not tok.strip():
                    continue
            cur.append((tok, st))
            cur_w += tw
        if cur or not tokens:
            lines.append((pi, cur, cur_w))
        n = sum(1 for l in lines if l[0] == pi)
        total += (p['space_before'] + p['space_after']) / 72 * scale + n * size * p['lh'] / 72
    return lines, total


# --------------------------------------------------------------- slide model
class Slide:
    def __init__(self, deck, footer=True, bg=BG):
        self.deck = deck
        self.items = []
        self.notes = ''
        self.footer = footer
        self.bg = bg

    # primitives --------------------------------------------------------
    def rect(self, x, y, w, h, fill=None, line=None, lw=1.0, r=0.0, alpha=None, dash=False):
        self.items.append(('rect', dict(x=x, y=y, w=w, h=h, fill=fill, line=line, lw=lw, r=r, alpha=alpha, dash=dash)))

    def oval(self, x, y, w, h, fill=None, line=None, lw=1.0, alpha=None):
        self.items.append(('oval', dict(x=x, y=y, w=w, h=h, fill=fill, line=line, lw=lw, alpha=alpha)))

    def line(self, x1, y1, x2, y2, color=BORDER2, lw=1.0, arrow=False, dash=False):
        self.items.append(('line', dict(x1=x1, y1=y1, x2=x2, y2=y2, color=color, lw=lw, arrow=arrow, dash=dash)))

    def text(self, x, y, w, h, paras, size=14, color=TEXT2, bold=False, italic=False, align='l', anchor='t',
             lh=1.2, space_after=0, fit=True, strong=WHITE, min_size=8, mono=False):
        if isinstance(paras, (str, dict)):
            paras = [paras]
        paras = norm_paras(paras, size, color, bold, italic, strong, lh, space_after, mono)
        scale = 1.0
        lines, total = layout_paras(paras, w)
        while fit and total > h + 0.01 and paras[0]['size'] * scale > min_size:
            scale -= 0.04
            lines, total = layout_paras(paras, w, scale)
        if total > h + 0.02:
            self.deck.warnings.append(f'slide {len(self.deck.slides) + 1}: text overflow {total:.2f}in > {h:.2f}in: '
                                      f'{paras[0]["runs"][0][0][:50]!r}')
        self.items.append(('text', dict(x=x, y=y, w=w, h=h, paras=paras, scale=scale, align=align, anchor=anchor,
                                        lines=lines, total=total)))
        return total

    def image(self, name, x, y, w=None, h=None, align='c', valign='m', r=0.0):
        path = ASSETS / f'{name}.png'
        iw, ih = self.deck.img_size(path)
        if w and h:
            s = min(w / iw, h / ih)
        elif w:
            s = w / iw
        else:
            s = h / ih
        dw, dh = iw * s, ih * s
        if w and align == 'c':
            x += (w - dw) / 2
        elif w and align == 'r':
            x += w - dw
        if h and valign == 'm':
            y += (h - dh) / 2
        elif h and valign == 'b':
            y += h - dh
        self.items.append(('image', dict(path=path, x=x, y=y, w=dw, h=dh, r=r)))
        return x, y, dw, dh

    # composites --------------------------------------------------------
    def header(self, label, title, subtitle=None, title_size=30):
        self.text(M, 0.36, CW, 0.3, label.upper(), size=11, color=SAGE_L, bold=True)
        self.text(M, 0.6, CW, 0.75, title, size=title_size, color=WHITE, bold=True, anchor='t')
        if subtitle:
            self.text(M, 1.3, CW, 0.5, subtitle, size=15, color=MUTED)

    def card(self, x, y, w, h, fill=CARD, line=BORDER, r=0.16, lw=1.0):
        self.rect(x, y, w, h, fill=fill, line=line, lw=lw, r=r)

    def bullets(self, x, y, w, h, items, size=14, color=TEXT2, gap=5, strong=WHITE, lh=1.22):
        paras = [{'text': t, 'bullet': True, 'space_after': gap} for t in items]
        return self.text(x, y, w, h, paras, size=size, color=color, strong=strong, lh=lh)

    def numbered(self, x, y, w, h, items, size=13, color=TEXT2, gap=6, num_color=SAGE_L, lh=1.22):
        paras = [{'text': t, 'bullet': True, 'bullet_char': str(i + 1), 'bullet_color': num_color,
                  'indent': 0.32, 'space_after': gap} for i, t in enumerate(items)]
        return self.text(x, y, w, h, paras, size=size, color=color, lh=lh)

    def accent_top(self, x, y, w, color):
        """Thin accent 'tab' along the top edge of a card (inset so it clears the rounded corners)."""
        self.rect(x + 0.22, y - 0.01, w - 0.44, 0.07, fill=color, r=0.035)

    def chip(self, x, y, text, color=SAGE_L, fill=None, size=10, w=None):
        f = pil_font(size, True)
        tw = f.getlength(text.upper()) / PX + 0.3
        w = w or tw
        self.rect(x, y, w, 0.28, fill=fill or CARD2, line=color, lw=0.75, r=0.14)
        self.text(x, y, w, 0.28, text.upper(), size=size, color=color, bold=True, align='c', anchor='m', fit=False)
        return w

    def placeholder(self, x, y, w, h, label):
        self.rect(x, y, w, h, fill=CARD, line=SAGE, lw=1.5, r=0.16, dash=True)
        self.text(x + 0.3, y, w - 0.6, h, label, size=13, color=SAGE_L, align='c', anchor='m', italic=True)


class Deck:
    def __init__(self):
        self.slides: list[Slide] = []
        self.warnings: list[str] = []
        self._sizes = {}

    def img_size(self, path):
        if path not in self._sizes:
            with Image.open(path) as im:
                self._sizes[path] = im.size
        return self._sizes[path]

    def slide(self, footer=True, bg=BG):
        s = Slide(self, footer=footer, bg=bg)
        self.slides.append(s)
        return s

    # ------------------------------------------------------------ PPTX out
    def write_pptx(self, path):
        prs = Presentation()
        prs.slide_width, prs.slide_height = Inches(W), Inches(H)
        blank = prs.slide_layouts[6]
        n = len(self.slides)
        for idx, s in enumerate(self.slides, start=1):
            sl = prs.slides.add_slide(blank)
            fill = sl.background.fill
            fill.solid()
            fill.fore_color.rgb = RGBColor(*rgb(s.bg))
            for kind, it in s.items:
                getattr(self, f'_pptx_{kind}')(sl, it)
            if s.footer:
                self._pptx_footer(sl, idx, n)
            sl.notes_slide.notes_text_frame.text = s.notes or ''
        prs.save(path)

    @staticmethod
    def _no_shadow(shape):
        shape.shadow.inherit = False

    @staticmethod
    def _set_alpha(shape, alpha):
        sf = shape._element.spPr.find(qn('a:solidFill'))
        if sf is not None:
            clr = sf.find(qn('a:srgbClr'))
            a = etree.SubElement(clr, qn('a:alpha'))
            a.set('val', str(int(alpha * 100000)))

    def _pptx_shape(self, sl, kind, it):
        shp = sl.shapes.add_shape(kind, Inches(it['x']), Inches(it['y']), Inches(it['w']), Inches(it['h']))
        self._no_shadow(shp)
        if kind == MSO_SHAPE.ROUNDED_RECTANGLE:
            shp.adjustments[0] = min(0.5, it['r'] / max(0.01, min(it['w'], it['h'])))
        if it['fill']:
            shp.fill.solid()
            shp.fill.fore_color.rgb = RGBColor(*rgb(it['fill']))
            if it.get('alpha') is not None:
                self._set_alpha(shp, it['alpha'])
        else:
            shp.fill.background()
        if it['line']:
            shp.line.color.rgb = RGBColor(*rgb(it['line']))
            shp.line.width = Pt(it['lw'])
            if it.get('dash'):
                shp.line.dash_style = MSO_LINE_DASH_STYLE.DASH
        else:
            shp.line.fill.background()
        shp.text_frame.text = ''
        return shp

    def _pptx_rect(self, sl, it):
        kind = MSO_SHAPE.ROUNDED_RECTANGLE if it['r'] > 0 else MSO_SHAPE.RECTANGLE
        self._pptx_shape(sl, kind, it)

    def _pptx_oval(self, sl, it):
        self._pptx_shape(sl, MSO_SHAPE.OVAL, it)

    def _pptx_line(self, sl, it):
        c = sl.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(it['x1']), Inches(it['y1']), Inches(it['x2']), Inches(it['y2']))
        c.line.color.rgb = RGBColor(*rgb(it['color']))
        c.line.width = Pt(it['lw'])
        ln = c.line._get_or_add_ln()
        if it.get('dash'):
            d = etree.SubElement(ln, qn('a:prstDash'))
            d.set('val', 'dash')
        if it['arrow']:
            tail = etree.SubElement(ln, qn('a:tailEnd'))
            tail.set('type', 'triangle')
            tail.set('w', 'med')
            tail.set('len', 'med')

    def _pptx_image(self, sl, it):
        pic = sl.shapes.add_picture(str(it['path']), Inches(it['x']), Inches(it['y']), Inches(it['w']), Inches(it['h']))
        if it.get('r'):
            pic.auto_shape_type = MSO_SHAPE.ROUNDED_RECTANGLE
            prst = pic._pic.spPr.prstGeom
            av = prst.find(qn('a:avLst'))
            if av is None:
                av = etree.SubElement(prst, qn('a:avLst'))
            for gd in list(av):
                av.remove(gd)
            gd = etree.SubElement(av, qn('a:gd'))
            gd.set('name', 'adj')
            gd.set('fmla', f"val {int(min(0.5, it['r'] / max(0.01, min(it['w'], it['h']))) * 100000)}")

    def _pptx_text(self, sl, it):
        tb = sl.shapes.add_textbox(Inches(it['x']), Inches(it['y']), Inches(it['w']), Inches(it['h']))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.auto_size = MSO_AUTO_SIZE.NONE
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        tf.vertical_anchor = {'t': MSO_ANCHOR.TOP, 'm': MSO_ANCHOR.MIDDLE, 'b': MSO_ANCHOR.BOTTOM}[it['anchor']]
        scale = it['scale']
        for i, p in enumerate(it['paras']):
            para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            align = p['align'] or it['align']
            para.alignment = {'l': PP_ALIGN.LEFT, 'c': PP_ALIGN.CENTER, 'r': PP_ALIGN.RIGHT}[align]
            para.line_spacing = Pt(p['size'] * scale * p['lh'])
            para.space_before = Pt(p['space_before'] * scale)
            para.space_after = Pt(p['space_after'] * scale)
            pPr = para._p.get_or_add_pPr()
            if p['bullet']:
                ind = Emu(Inches(p['indent']))
                pPr.set('marL', str(int(ind)))
                pPr.set('indent', str(-int(ind)))
                buClr = etree.SubElement(pPr, qn('a:buClr'))
                etree.SubElement(buClr, qn('a:srgbClr')).set('val', p['bullet_color'])
                etree.SubElement(pPr, qn('a:buFont')).set('typeface', 'Arial')
                etree.SubElement(pPr, qn('a:buChar')).set('char', p['bullet_char'])
            else:
                etree.SubElement(pPr, qn('a:buNone'))
            for text, st in p['runs']:
                r = para.add_run()
                r.text = text
                r.font.name = 'Courier New' if st.get('mono') else 'Arial'
                r.font.size = Pt(round(st['size'] * scale * 2) / 2)
                r.font.bold = bool(st['bold'])
                r.font.italic = bool(st['italic'])
                r.font.color.rgb = RGBColor(*rgb(st['color']))

    def _pptx_footer(self, sl, idx, n):
        it = dict(x=M, y=H - 0.42, w=8, h=0.25, paras=norm_paras([FOOTER], 9.5, DIM, False, False, WHITE, 1.2, 0),
                  scale=1, align='l', anchor='m')
        self._pptx_text(sl, it)
        it = dict(x=W - M - 1.5, y=H - 0.42, w=1.5, h=0.25, paras=norm_paras([f'{idx} / {n}'], 9.5, DIM, False, False, WHITE, 1.2, 0),
                  scale=1, align='r', anchor='m')
        self._pptx_text(sl, it)

    # --------------------------------------------------------- preview out
    def write_previews(self, folder: Path):
        folder.mkdir(exist_ok=True)
        n = len(self.slides)
        thumbs = []
        for idx, s in enumerate(self.slides, start=1):
            im = Image.new('RGBA', (int(W * PX), int(H * PX)), rgb(s.bg) + (255,))
            for kind, it in s.items:
                getattr(self, f'_pil_{kind}')(im, it)
            if s.footer:
                self._pil_text(im, dict(x=M, y=H - 0.42, w=8, h=0.25, paras=norm_paras([FOOTER], 9.5, DIM, False, False, WHITE, 1.2, 0),
                                        scale=1, align='l', anchor='m', lines=None))
                self._pil_text(im, dict(x=W - M - 1.5, y=H - 0.42, w=1.5, h=0.25, paras=norm_paras([f'{idx} / {n}'], 9.5, DIM, False, False, WHITE, 1.2, 0),
                                        scale=1, align='r', anchor='m', lines=None))
            out = folder / f'slide-{idx:02d}.jpg'
            im.convert('RGB').save(out, quality=88, optimize=True)
            thumbs.append(im.convert('RGB').resize((480, 270), Image.LANCZOS))
        cols = 4
        rows = (n + cols - 1) // cols
        sheet = Image.new('RGB', (cols * 500 + 20, rows * 290 + 20), (40, 40, 40))
        for i, t in enumerate(thumbs):
            sheet.paste(t, (20 + (i % cols) * 500, 20 + (i // cols) * 290))
        sheet.save(folder / 'contact-sheet.jpg', quality=88, optimize=True)

    @staticmethod
    def _px(v):
        return int(round(v * PX))

    def _pil_rect(self, im, it):
        layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        box = [self._px(it['x']), self._px(it['y']), self._px(it['x'] + it['w']), self._px(it['y'] + it['h'])]
        fill = rgb(it['fill']) + (int(255 * (it['alpha'] if it.get('alpha') is not None else 1)),) if it['fill'] else None
        outline = rgb(it['line']) + (255,) if it['line'] else None
        lw = max(1, int(round(it['lw'] * PX / 72)))
        if it.get('dash') and outline:
            d.rounded_rectangle(box, radius=self._px(it['r']), fill=fill)
            # approximate dashes: draw outline then punch gaps
            d.rounded_rectangle(box, radius=self._px(it['r']), outline=outline, width=lw)
            gap = Image.new('RGBA', im.size, (0, 0, 0, 0))
            gd = ImageDraw.Draw(gap)
            step = 18
            for xx in range(box[0], box[2], step):
                gd.rectangle([xx + 9, box[1] - lw, xx + step, box[1] + lw], fill=(0, 0, 0, 255))
                gd.rectangle([xx + 9, box[3] - lw, xx + step, box[3] + lw], fill=(0, 0, 0, 255))
            for yy in range(box[1], box[3], step):
                gd.rectangle([box[0] - lw, yy + 9, box[0] + lw, yy + step], fill=(0, 0, 0, 255))
                gd.rectangle([box[2] - lw, yy + 9, box[2] + lw, yy + step], fill=(0, 0, 0, 255))
            inner = Image.new('L', im.size, 0)
            ImageDraw.Draw(inner).rounded_rectangle([box[0] + lw, box[1] + lw, box[2] - lw, box[3] - lw], radius=self._px(it['r']), fill=255)
            gap_mask = Image.composite(Image.new('L', im.size, 0), gap.split()[3], inner)
            layer.paste((0, 0, 0, 0), mask=gap_mask)
            if fill:
                fl = Image.new('RGBA', im.size, (0, 0, 0, 0))
                ImageDraw.Draw(fl).rounded_rectangle([box[0] + lw, box[1] + lw, box[2] - lw, box[3] - lw], radius=self._px(it['r']), fill=fill)
                layer.alpha_composite(fl)
        else:
            d.rounded_rectangle(box, radius=self._px(it['r']), fill=fill, outline=outline, width=lw if outline else 0)
        im.alpha_composite(layer)

    def _pil_oval(self, im, it):
        layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        box = [self._px(it['x']), self._px(it['y']), self._px(it['x'] + it['w']), self._px(it['y'] + it['h'])]
        fill = rgb(it['fill']) + (int(255 * (it['alpha'] if it.get('alpha') is not None else 1)),) if it['fill'] else None
        outline = rgb(it['line']) + (255,) if it['line'] else None
        d.ellipse(box, fill=fill, outline=outline, width=max(1, int(round(it['lw'] * PX / 72))) if outline else 0)
        im.alpha_composite(layer)

    def _pil_line(self, im, it):
        d = ImageDraw.Draw(im)
        p1 = (self._px(it['x1']), self._px(it['y1']))
        p2 = (self._px(it['x2']), self._px(it['y2']))
        lw = max(1, int(round(it['lw'] * PX / 72)))
        col = rgb(it['color']) + (255,)
        if it.get('dash'):
            import math
            L = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
            if L == 0:
                return
            ux, uy = (p2[0] - p1[0]) / L, (p2[1] - p1[1]) / L
            t = 0
            while t < L:
                a = (p1[0] + ux * t, p1[1] + uy * t)
                b = (p1[0] + ux * min(L, t + 10), p1[1] + uy * min(L, t + 10))
                d.line([a, b], fill=col, width=lw)
                t += 18
        else:
            d.line([p1, p2], fill=col, width=lw)
        if it['arrow']:
            import math
            ang = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
            size = 6 + lw * 3
            pts = [p2,
                   (p2[0] - size * math.cos(ang - 0.45), p2[1] - size * math.sin(ang - 0.45)),
                   (p2[0] - size * math.cos(ang + 0.45), p2[1] - size * math.sin(ang + 0.45))]
            d.polygon(pts, fill=col)

    def _pil_image(self, im, it):
        src = Image.open(it['path']).convert('RGBA')
        tw, th = max(1, self._px(it['w'])), max(1, self._px(it['h']))
        src = src.resize((tw, th), Image.LANCZOS)
        if it.get('r'):
            mask = Image.new('L', src.size, 0)
            ImageDraw.Draw(mask).rounded_rectangle([0, 0, tw - 1, th - 1], radius=self._px(it['r']), fill=255)
            a = src.split()[3]
            src.putalpha(Image.composite(a, Image.new('L', src.size, 0), mask))
        im.alpha_composite(src, (self._px(it['x']), self._px(it['y'])))

    def _pil_text(self, im, it):
        d = ImageDraw.Draw(im)
        paras, scale = it['paras'], it['scale']
        lines, total = layout_paras(paras, it['w'], scale)
        x0 = it['x'] * PX
        if it['anchor'] == 't':
            y = it['y'] * PX
        elif it['anchor'] == 'm':
            y = (it['y'] + (it['h'] - total) / 2) * PX
        else:
            y = (it['y'] + it['h'] - total) * PX
        cur_p = -1
        for pi, toks, lw_px in lines:
            p = paras[pi]
            size_px = p['size'] * scale * PX / 72
            lh_px = size_px * p['lh']
            first_line = pi != cur_p
            if first_line:
                if cur_p >= 0:
                    y += paras[cur_p]['space_after'] * scale * PX / 72
                y += p['space_before'] * scale * PX / 72
                cur_p = pi
            indent = p['indent'] * PX if p['bullet'] else 0
            align = p['align'] or it['align']
            avail = it['w'] * PX - indent
            if align == 'c':
                x = x0 + indent + (avail - lw_px) / 2
            elif align == 'r':
                x = x0 + indent + avail - lw_px
            else:
                x = x0 + indent
            baseline = y + (lh_px - 1.117 * size_px) / 2 + 0.905 * size_px
            if p['bullet'] and first_line:
                bf = pil_font(p['size'] * scale, True)
                d.text((x0, baseline), p['bullet_char'], font=bf, fill=rgb(p['bullet_color']), anchor='ls')
            for tok, st in toks:
                f = pil_font(st['size'] * scale, st['bold'], st['italic'], st.get('mono'))
                d.text((x, baseline), tok, font=f, fill=rgb(st['color']), anchor='ls')
                x += f.getlength(tok)
            y += lh_px


# ===================================================================== content
def stat_tile(s, x, y, w, h, number, label, source, accent):
    s.card(x, y, w, h)
    s.rect(x, y + 0.2, 0.06, h - 0.4, fill=accent, r=0.03)
    s.text(x + 0.28, y + 0.22, w - 0.45, 0.8, number, size=40, color=accent, bold=True, anchor='t')
    s.text(x + 0.28, y + 1.08, w - 0.45, h - 1.65, label, size=13.5, color=TEXT, lh=1.22)
    s.text(x + 0.28, y + h - 0.5, w - 0.45, 0.35, source, size=9.5, color=DIM, anchor='b')


def feature_card(s, x, y, w, h, title, body, accent=SAGE_L, title_size=15, body_size=12.5, kicker=None):
    s.card(x, y, w, h)
    s.accent_top(x, y, w, accent)
    ty = y + 0.25
    if kicker:
        s.text(x + 0.25, ty, w - 0.5, 0.25, kicker.upper(), size=9.5, color=accent, bold=True)
        ty += 0.27
    th = s.text(x + 0.25, ty, w - 0.5, 0.8, title, size=title_size, color=WHITE, bold=True, lh=1.15)
    ty += max(0.42, th + 0.14)
    s.text(x + 0.25, ty, w - 0.5, y + h - ty - 0.2, body, size=body_size, color=TEXT2, lh=1.25)


def flow_box(s, x, y, w, h, title, body, accent=SAGE_L, fill=CARD):
    s.rect(x, y, w, h, fill=fill, line=accent, lw=1.0, r=0.12)
    s.text(x + 0.12, y + 0.1, w - 0.24, 0.3, title, size=11.5, color=accent, bold=True)
    s.text(x + 0.12, y + 0.4, w - 0.24, h - 0.5, body, size=10.5, color=TEXT2, lh=1.2)


def build() -> Deck:
    d = Deck()

    # 1 ------------------------------------------------------------- Title
    s = d.slide(footer=False)
    s.image('glow', 7.2, -2.2, 9, 9)
    s.rect(M, 0.55, 0.08, 1.1, fill=SAGE, r=0.04)
    s.text(M + 0.3, 0.55, 7.5, 0.3, 'CONGRESSIONAL APP CHALLENGE 2026  ·  [CA-XX]', size=11.5, color=SAGE_L, bold=True)
    s.image('icon', M + 0.25, 0.95, 0.85, 0.85, r=0.19)
    s.text(M + 1.3, 0.95, 7.5, 0.9, 'CareSphere AI', size=50, color=WHITE, bold=True, anchor='m', fit=False)
    s.text(M, 2.15, 7.4, 0.5, 'Connected care for independent living', size=22, color=SAGE_L)
    s.text(M, 2.85, 6.9, 1.6,
           'A **privacy-first companion** for older adults, autistic people and the families who care for them — '
           'real video coffee circles, honest wearable vitals, calm sensory tools and an AI health guide that never '
           'leaves the phone.', size=16, color=TEXT2, lh=1.3)
    s.line(M, 4.75, M + 6.9, 4.75, color=BORDER2, lw=1)
    s.text(M, 4.95, 6.9, 0.35, '[Student Name]  ·  [Grade]  ·  [School], [City], CA', size=14, color=WHITE, bold=True)
    s.text(M, 5.32, 6.9, 0.35, 'Native iOS app (SwiftUI)  +  installable web app (React PWA)', size=12.5, color=MUTED)
    cx = M
    for label, col in [('Isolation prevention', SAGE_L), ('Autism support', VIOLET), ('Senior care', AMBER), ('No cloud · no account', SKY)]:
        cx += s.chip(cx, 5.85, label, color=col) + 0.15
    s.image('phone-overview', 8.55, 0.42, h=6.95)
    s.text(M, H - 0.45, 6.9, 0.3, 'github.com/engineer2025-sudo/Care', size=10.5, color=DIM)
    s.notes = ('[0:00–0:15] Hi, I\'m [NAME], a [GRADE] at [SCHOOL] in [CITY], California. This is CareSphere AI — a privacy-first care '
               'companion for older adults, autistic people and the families who look after them, built as a native iPhone app '
               'and an installable web app.')

    # 2 ----------------------------------------------------------- Problem
    s = d.slide()
    s.header('The problem', 'Care is getting harder to give — and harder to accept')
    tiles = [
        ('1 in 4', 'adults aged 65+ in the U.S. are socially isolated — a health risk comparable to smoking or obesity.', 'National Academies (NASEM), 2020', SAGE_L),
        ('29%', 'higher risk of premature death associated with social isolation.', 'U.S. Surgeon General Advisory, 2023', ROSE),
        ('1 in 31', '8-year-olds identified with autism — children who grow into autistic adults needing lifelong, respectful support.', 'CDC ADDM Network, 2025', VIOLET),
        ('~50%', 'of long-term medications are not taken as prescribed.', 'World Health Organization', AMBER),
    ]
    tw, gap = (CW - 3 * 0.25) / 4, 0.25
    for i, (num, lab, src, col) in enumerate(tiles):
        stat_tile(s, M + i * (tw + gap), 1.5, tw, 3.0, num, lab, src, col)
    s.card(M, 4.8, CW, 1.9, fill=CARD2, line=BORDER2)
    s.text(M + 0.35, 5.0, 3.3, 1.5, ['**63 million** Americans now care for a family member — nearly 1 in 4 adults.',
                                      {'text': 'AARP & National Alliance for Caregiving, 2025', 'color': MUTED, 'size': 10.5}],
           size=14, color=TEXT, lh=1.25, space_after=4)
    s.rect(M + 3.9, 5.05, 0.02, 1.4, fill=BORDER2)
    s.text(M + 4.2, 5.0, CW - 4.5, 1.6,
           ['**Most "care tech" answers with accounts, cloud dashboards and data collection** — exactly what makes many seniors and families hesitate.',
            'Tools designed for autistic users are rare, and almost none combine social connection, routines, real vitals and safety in one calm place that keeps data on the device.'],
           size=13.5, color=TEXT2, lh=1.25, space_after=6)
    s.notes = ('[0:15–0:33] One in four older adults is socially isolated — a 29 percent higher risk of early death. One in 31 children is autistic. '
               'Half of long-term medications aren\'t taken as prescribed. And 63 million family caregivers are coping with apps that '
               'demand an account and send everything to the cloud.')

    # 3 ------------------------------------------------------- Inspiration
    s = d.slide()
    s.header('Why I built it', 'Inspiration — and the four rules I wrote into the code')
    s.card(M, 1.5, 5.6, 5.2)
    s.rect(M, 1.72, 0.07, 4.76, fill=AMBER, r=0.035)
    s.text(M + 0.35, 1.72, 5.0, 0.3, 'MY STORY', size=10.5, color=AMBER, bold=True)
    s.text(M + 0.35, 2.05, 5.0, 4.5, [
        {'text': '[Personal hook — e.g. "My grandmother lives alone, far from us. After her fall, every phone call started with the same anxious questions: Did you take your pills? Did you talk to anyone today?"]', 'italic': True, 'color': TEXT, 'space_after': 10},
        {'text': 'I kept seeing the same three gaps:', 'space_after': 6},
        {'text': '**Isolation.** Video calls are the best medicine, but they are buried behind accounts and installs.', 'bullet': True, 'space_after': 5},
        {'text': '**Forgotten medication and vitals nobody trusts.** Apps that "guess" numbers or show demo data as if it were real.', 'bullet': True, 'space_after': 5},
        {'text': '**Nothing built for autistic people.** Timers, scores and flashing screens — the opposite of calm.', 'bullet': True, 'space_after': 10},
        {'text': 'So I built the app I wished my family had — and wrote its ethics into the code.', 'color': WHITE, 'bold': True},
    ], size=13.5, color=TEXT2, lh=1.25)
    rules = [
        ('Never fabricate', 'Every reading is tagged LIVE BLE or SIMULATED at the source. Cancel a pairing and the card stays blank — no invented numbers, ever.', SAGE_L),
        ('Nothing is sent automatically', 'Visit briefs, caregiver texts and SOS messages always end with a human tap. No push backend, no silent sharing.', SKY),
        ('Calm by default', 'No timers, no scores, no auto-advance. Reduce-motion, high-contrast and A/A+/A++ text sizes are first-class settings.', VIOLET),
        ('Private by architecture', 'No account, no server, AES-256-GCM at rest, and an AI guide that runs entirely on the phone.', AMBER),
    ]
    rx, ry, rw, rh = M + 5.9, 1.5, (CW - 5.9 - 0.25) / 2, 2.475
    for i, (t, b, c) in enumerate(rules):
        feature_card(s, rx + (i % 2) * (rw + 0.25), ry + (i // 2) * (rh + 0.25), rw, rh, t, b, accent=c, kicker=f'Rule {i + 1}', title_size=16, body_size=13)
    s.notes = ('[0:33–0:50] [Your story in one sentence.] I wrote four rules into the code: never fabricate a reading, never send anything '
               'automatically, stay calm by default, and keep everything private by architecture.')

    # 4 ------------------------------------------------------ Meet the app
    s = d.slide()
    s.header('Meet CareSphere', 'One calm app, five tabs, two platforms')
    s.chip(W - M - 4.3, 0.37, 'Native iOS 16+ (SwiftUI)  +  React PWA', color=SAGE_L, w=4.3, size=10)
    phones = [('phone-overview', 'Overview', 'routines, mood & medication check-ins'),
              ('phone-activities', 'Activities', 'sensory & memory tools, breathing'),
              ('phone-circles', 'Coffee Circles', 'live Jitsi video rooms'),
              ('phone-care', 'Care Circle', 'care notes & visit brief'),
              ('phone-vitals', 'Vitals & Telehealth', 'Bluetooth HR, SpO₂, CSV export')]
    pw = 2.0
    gap = (CW - 5 * pw) / 4
    for i, (img, t, sub) in enumerate(phones):
        x = M + i * (pw + gap)
        s.image(img, x, 1.45, w=pw, h=4.35, valign='t')
        s.text(x, 5.95, pw, 0.3, t, size=13, color=WHITE, bold=True, align='c')
        s.text(x, 6.22, pw, 0.5, sub, size=10.5, color=MUTED, align='c', lh=1.2)
    s.text(M, 6.68, CW, 0.3, 'iPhone adds a sixth tab — Health Guide — plus Face ID lock, HealthKit and system notifications.', size=11, color=DIM, align='c')
    s.notes = ('[0:50–1:02, with slide 5] Five calm tabs — Overview, Activities, Coffee Circles, Care Circle and Vitals — plus an offline Health Guide '
               'on iPhone, designed for older adults, autistic teens and adults, and their caregivers.')

    # 5 ------------------------------------------------------- Who it's for
    s = d.slide()
    s.header('Intended audience', 'Built for three groups who are usually served separately')
    personas = [
        ('Older adults living independently', SAGE_L, 'strip-routine',
         ['Large-text routines (up to 24 items) that reset at local midnight',
          'Daily mood check-in with a 14-day history they choose to share',
          'Medication reminders they configure and confirm themselves',
          'Coffee Circles — scheduled video rooms with real people',
          'Wearable heart-rate on screen, labeled honestly']),
        ('Autistic teens and adults', VIOLET, 'strip-soundscapes',
         ['Predictable layout: one task per screen, no surprises',
          'Untimed, unscored activities: Feelings Explorer, Pattern Recall, Picture Pairs, Picture Story',
          'Four synthesized soundscapes and 4-4-6 guided breathing',
          '"I\'m stressed" path that calms first and never auto-alerts anyone',
          'Reduce-motion, high-contrast and theme choices (AASPIRE-informed)']),
        ('Family caregivers and care teams', AMBER, 'strip-summary',
         ['Shared care notes kept on the device, exportable any time',
          'Visit brief with an exact preview before anything is saved',
          'Opt-in support check-in that offers a text, a video room or 911',
          'Source-labeled HR/SpO₂ history and CSV export for appointments',
          'Honest limits: no delivery promises, no diagnosis, no cloud']),
    ]
    cw3 = (CW - 2 * 0.3) / 3
    for i, (title, col, strip, items) in enumerate(personas):
        x = M + i * (cw3 + 0.3)
        s.card(x, 1.5, cw3, 5.05)
        s.accent_top(x, 1.5, cw3, col)
        s.text(x + 0.3, 1.75, cw3 - 0.6, 0.6, title, size=16, color=WHITE, bold=True, lh=1.15)
        s.bullets(x + 0.3, 2.4, cw3 - 0.6, 2.45, items, size=11.5, gap=4)
        s.image(strip, x + 0.3, 4.85, w=cw3 - 0.6, h=1.5, valign='b', r=0.12)
    s.text(M, 6.68, CW, 0.3, 'Design references: AASPIRE Web Accessibility Guidelines for Autistic Web Users (Nicolaidis et al., 2019) · Apple Human Interface Guidelines — Accessibility',
           size=10, color=DIM, align='c')
    s.notes = ('[0:50–1:02, continued from slide 4] …designed for older adults living independently, autistic teens and adults, and the family '
               'caregivers who support them — all in one place, without an account.')

    # 6 -------------------------------------------------------------- Demo
    s = d.slide()
    s.header('Live demo', 'Let\'s see it in action')
    s.image('web-overview', M, 1.45, w=7.3)
    s.chip(M, 6.45, 'Recorded on the real app — nothing staged', color=AMBER, size=9.5)
    s.card(M + 7.6, 1.45, CW - 7.6, 5.25)
    s.text(M + 7.85, 1.65, CW - 8.1, 0.3, 'WHAT YOU\'LL SEE IN THE VIDEO', size=10.5, color=SAGE_L, bold=True)
    steps = ['Overview — mood check-in, tick a routine item',
             'Add a medication → confirm the schedule → spoken reminder toast',
             'Vitals — pair a Bluetooth monitor (or the labeled demo), live sparkline, CSV export',
             'Activities — Pattern Recall, Rain soundscape, 4-4-6 breathing',
             'Coffee Circles — join a real Jitsi room',
             'Care Circle — build a visit brief, preview it, download it',
             'Settings — A++ text, warm-light theme, encryption status',
             'iPhone — ask the offline Health Guide a question']
    s.numbered(M + 7.85, 2.0, CW - 8.1, 4.55, steps, size=12.5, gap=7)
    s.notes = ('[1:02–1:05] Let me show you. (Switch to the screen recording — 1:05–2:05. Follow the eight-step shot list in VIDEO_SCRIPT.md; '
               'call out the LIVE BLE / SIMULATED labels and the "nothing is uploaded" moment in the visit brief.)')

    # 7 ------------------------------------------------------ Daily living
    s = d.slide()
    s.header('Feature · Overview', 'Routines, mood and medication — self-reported, local, honest')
    s.image('crop-routine', M, 1.45, w=3.75)
    s.image('crop-meds', M + 3.95, 1.45, w=3.75)
    s.image('crop-mood', M, 4.35, w=7.7)
    s.image('crop-toast', M, 5.62, w=2.6, r=0.14)
    s.text(M + 2.8, 5.66, 4.9, 1.05, ['**Reminder toast:** "Taken" saves a self-report, "Snooze" waits 10 minutes.',
                                      'Paired with an optional browser notification and a spoken prompt.'], size=11, color=MUTED, lh=1.22, space_after=4)
    s.bullets(M + 8.0, 1.5, CW - 8.0, 5.2, [
        '**Up to 24 routine items** with a daily progress count; check-ins are keyed to the local calendar day and **reset at local midnight** — not UTC.',
        '**Daily mood 1–5** with a 14-day dot history. Stored only on the device; shared only inside a visit brief you build.',
        '**Medication reminders start only after you confirm the schedule.** CareSphere never prefills medicines or doses.',
        'The web app checks the schedule **every 15 seconds** and shows a toast, an optional browser notification and a spoken prompt (Web Speech). iPhone uses UserNotifications so reminders fire even when the app is closed.',
        '"Taken" is recorded as a **self-report** — the app never claims a dose was verified.',
        'iPhone also shows today\'s step count from HealthKit (read-only).',
    ], size=12.5, gap=7)
    s.notes = ('Routines and mood are keyed to the local day. Medication reminders only begin after the user explicitly confirms a schedule; '
               'the reminder loop checks every 15 seconds and offers Taken (a self-report) or a 10-minute snooze.')

    # 8 ---------------------------------------------------- Coffee Circles
    s = d.slide()
    s.header('Feature · Coffee Circles', 'Fighting isolation with real video rooms — no account, nothing to install')
    s.image('web-circles', M, 1.45, w=7.5)
    s.bullets(M + 7.8, 1.5, CW - 7.8, 2.85, [
        '**Three scheduled circles** — Morning Sunshine Tea & Chat, Classic Movie Trivia & Memories, Gentle Stretching & Breathing — plus an open ad-hoc room.',
        'Each circle is a **real meet.jit.si room** opened through the Jitsi External API on the web and **JitsiMeetSDK 13.1** on iPhone — embedded in the app or in a new tab.',
        'Share the link with family; **one-tap telehealth room** in the Vitals tab for clinician visits.',
        'Honest limit: CareSphere runs no server, so there is **no moderator or host** — you choose whom to invite.',
    ], size=12.5, gap=7)
    s.image('crop-circle-card', M + 7.8, 4.45, w=CW - 7.8, h=2.25, valign='b')
    s.notes = ('Coffee Circles are real Jitsi Meet rooms — three scheduled themes plus an ad-hoc room — embedded with the Jitsi External API on the web and '
               'the native JitsiMeetSDK on iPhone. No account is needed, and the app is honest that it has no moderator because it has no server.')

    # 9 -------------------------------------------------------------- Vitals
    s = d.slide()
    s.header('Feature · Vitals & Telehealth', 'Real Bluetooth, honest labels')
    s.image('crop-hr', M, 1.45, w=3.7)
    s.image('crop-spo2', M + 3.9, 1.45, w=3.7)
    s.image('crop-range', M, 3.85, w=7.6)
    s.image('crop-vitals-how', M, 4.62, w=7.6)
    s.card(M, 5.7, 7.6, 1.0, fill=CARD2, line=BORDER2)
    s.text(M + 0.25, 5.76, 7.1, 0.22, 'src/lib/bluetooth.js — Bluetooth SIG Heart Rate Measurement (0x2A37)', size=9, color=DIM)
    code = ['const flags = dv.getUint8(0)              // bit 0 → 16-bit BPM',
            'const bpm = flags & 0x1 ? dv.getUint16(1, true) : dv.getUint8(1)']
    s.text(M + 0.25, 6.0, 7.1, 0.65, code, size=10, color=SAGE_L, lh=1.3, fit=False, mono=True)
    s.bullets(M + 8.0, 1.5, CW - 8.0, 5.2, [
        '**Web Bluetooth** subscribes to the standard **Heart Rate service 0x180D / characteristic 0x2A37** and parses the flags byte for 8- or 16-bit BPM.',
        'Live sparkline, SpO₂ and blood-pressure cards. **Every value carries a LIVE BLE or SIMULATED chip** — and the same label travels into the CSV export.',
        '**Cancel the pairing dialog and the card stays blank.** Simulated data appears only after you tap "Start labeled demo".',
        'A **generation counter** discards late notifications from an old connection, so a stale sensor can never paint a new card.',
        '**iPhone:** CoreBluetooth (including Garmin broadcast HR) plus read-only HealthKit heart rate, SpO₂, blood pressure and workouts, with a Swift Charts trend.',
        'Range check (50–110 bpm) runs on live data only and is informational — not triage.',
    ], size=12, gap=6)
    s.notes = ('This is real Web Bluetooth: the app subscribes to the standard heart-rate characteristic and parses the flags byte. Every card is labeled '
               'LIVE BLE or SIMULATED, and if you cancel pairing nothing is invented. On iPhone, CoreBluetooth and HealthKit feed the same honest pipeline.')

    # 10 --------------------------------------------------------- Activities
    s = d.slide()
    s.header('Feature · Activities (Therapy & Sensory)', 'Sensory and memory tools designed for autistic and older users')
    gh = 2.3
    x = M
    for name in ['crop-feelings', 'crop-pattern', 'crop-soundscapes', 'crop-breathing']:
        _, _, dw, _ = s.image(name, x, 1.45, h=gh)
        x += dw + 0.2
    s.bullets(M, 3.98, 7.3, 2.75, [
        '**Feelings Explorer, Pattern Recall, Picture Pairs, Picture Story** — untimed, unscored, no auto-advance, gentle confirmations only.',
        '**Four soundscapes — rain, waves, forest, hearth — synthesized live with the Web Audio API:** filtered noise beds, slow LFO swells and randomly scheduled birdsong or crackle. Zero audio files; works offline.',
        '**Guided 4-4-6 breathing** with a soft expanding ring; "reduce visual movement" slows every highlight and animation.',
        'Grounded in **AASPIRE** guidance: consistent navigation, plain language, multiple palette and contrast choices.',
        'Non-clinical by design — presented as calming and engagement tools, never as therapy outcomes or cognitive measures. On iPhone the same scenes are rendered live by an AVAudioEngine source node.',
    ], size=12, gap=5)
    tx = M + 7.75
    for name, cap in [('crop-pairs', 'Picture Pairs'), ('crop-story', 'Picture Story')]:
        _, _, dw, _ = s.image(name, tx, 3.98, h=2.05)
        s.text(tx, 6.1, dw, 0.3, cap, size=11, color=MUTED, align='c')
        tx += dw + 0.25
    s.notes = ('Activities are untimed and unscored. The four soundscapes are generated live with the Web Audio API — filtered noise, slow swells, procedural '
               'birdsong and crackle — so there are no audio files and everything works offline. The breathing tool uses a 4-4-6 rhythm.')

    # 11 -------------------------------------------------- Care Circle / Brief
    s = d.slide()
    s.header('Feature · Care Circle & visit prep', 'A visit brief the user controls — field by field')
    s.image('crop-visitbrief', M, 1.45, h=5.25, w=5.0, valign='t', r=0.14)
    nx = M + 5.2
    _, _, _, nh = s.image('crop-notes', nx, 1.45, w=2.9, r=0.12)
    _, _, _, sh = s.image('crop-summary', nx, 1.45 + nh + 0.2, w=2.9, r=0.12)
    s.text(nx, 1.45 + nh + 0.2 + sh + 0.12, 2.9, 0.9, 'Care notes and the local check-in summary are computed from this device\'s entries only — nothing is synced.', size=10, color=MUTED, lh=1.22)
    s.bullets(M + 8.3, 1.5, CW - 8.3, 5.2, [
        '**Care notes** for family and helpers stay on the device — encrypted, exportable, erasable.',
        '**Visit brief:** tick exactly which fields to include (routines, mood, medication self-reports, notes, vitals) and **see the exact text before you save it.**',
        '**Simulated data is excluded unless you opt in** — and then it is clearly labeled as simulated.',
        'Saved as a **.txt download** on the web; on iPhone it goes through the **system share sheet** with 7/30/90-day filters.',
        '**Nothing is emailed or uploaded.** You hand the brief to the clinician yourself.',
        'Not a medical record: the brief says so in its own header.',
    ], size=12.5, gap=7)
    s.notes = ('The visit brief lets the user choose every field, preview the exact text, and save or share it themselves. Simulated data is excluded unless '
               'they opt in, and even then it is labeled. Nothing is uploaded anywhere.')

    # 12 ------------------------------------------------------------- Safety
    s = d.slide()
    s.header('Feature · Safety', 'SOS and a support check-in that calms first and never panics')
    s.image('crop-sos', M, 1.45, w=3.9, r=0.14)
    s.text(M, 5.55, 3.9, 1.2, [
        '**SOS:** one-tap tel:911 link, optional GPS coordinates, and a share-sheet message to contacts you pick.',
        'CareSphere never claims a message was delivered — there is no push backend.'], size=11, color=TEXT2, lh=1.22, space_after=4)
    fx = M + 4.2
    s.text(fx, 1.5, CW - 4.2, 0.3, 'SUPPORT CHECK-IN (iPHONE, OPT-IN) — DETERMINISTIC RULES, NO AI DECIDES', size=10.5, color=SAGE_L, bold=True)
    fw = (CW - 4.2 - 2 * 0.3) / 3
    bh = 1.45
    flow_box(s, fx, 1.9, fw, bh, '1 · Trigger', 'Live BLE heart rate above 110 bpm for 90 s (15 s gap resets) — or "I\'m stressed" — or a flagged Health Guide question.', AMBER)
    flow_box(s, fx + fw + 0.3, 1.9, fw, bh, '2 · Are you moving?', 'Exercise or stairs? Then it\'s expected — the flow ends with a friendly note.', SAGE_L)
    flow_box(s, fx + 2 * (fw + 0.3), 1.9, fw, bh, '3 · How do you feel?', 'Plain-language options, big buttons, no timer.', SAGE_L)
    y2 = 1.9 + bh + 0.3
    flow_box(s, fx, y2, fw, bh, '4 · Breathe together', 'Three cycles of 4-4-6 paced breathing with a calm ring.', VIOLET)
    flow_box(s, fx + fw + 0.3, y2, fw, bh, '5 · Check again', 'Better? Done. Still struggling? Offer help — never assume.', VIOLET)
    flow_box(s, fx + 2 * (fw + 0.3), y2, fw, bh, '6 · You choose', 'Text a caregiver (opens Messages — **you tap Send**), open a private video room, or call 911.', ROSE)
    for i in range(2):
        s.line(fx + (i + 1) * fw + i * 0.3 + 0.02, 1.9 + bh / 2, fx + (i + 1) * (fw + 0.3) - 0.02, 1.9 + bh / 2, color=BORDER2, lw=1.5, arrow=True)
        s.line(fx + (i + 1) * fw + i * 0.3 + 0.02, y2 + bh / 2, fx + (i + 1) * (fw + 0.3) - 0.02, y2 + bh / 2, color=BORDER2, lw=1.5, arrow=True)
    mid = 1.9 + bh + 0.15
    s.line(fx + 2 * (fw + 0.3) + fw / 2, 1.9 + bh + 0.02, fx + 2 * (fw + 0.3) + fw / 2, mid, color=BORDER2, lw=1.5)
    s.line(fx + 2 * (fw + 0.3) + fw / 2, mid, fx + fw / 2, mid, color=BORDER2, lw=1.5)
    s.line(fx + fw / 2, mid, fx + fw / 2, y2 - 0.02, color=BORDER2, lw=1.5, arrow=True)
    cy = y2 + bh + 0.3
    s.card(fx, cy, CW - 4.2, 6.7 - cy, fill=CARD2, line=BORDER2)
    s.text(fx + 0.25, cy + 0.12, CW - 4.7, 6.7 - cy - 0.2, [
        '**Why rules instead of AI?** Safety decisions must be explainable and testable. The thresholds, the 30-minute cooldown and the opt-in switch live in plain Swift (CareSupportCoordinator), and the heart-rate trigger only uses live sensor data — never simulated values.'],
        size=12, color=TEXT2, lh=1.25, anchor='m')
    s.notes = ('Safety is deliberately boring: a deterministic flow. If a live heart-rate stays above 110 for 90 seconds, or the user taps "I\'m stressed", '
               'the app asks whether they are moving, how they feel, breathes with them, checks again, and only then offers a text, a video room or 911. '
               'The user always taps Send.')

    # 13 ------------------------------------------------------- Health Guide
    s = d.slide()
    s.header('Feature · Health Guide (iPhone)', 'An AI health guide that never phones home')
    stages = [('Your question', 'Typed or dictated. Stays on the phone.', SAGE_L),
              ('Safety gate', 'Deterministic phrase check for self-harm or poisoning → crisis resources first, no search, no inference.', ROSE),
              ('Local sources', 'MedlinePlus Health Topics XML (NLM) downloaded on request · optional Wikipedia ZIM via a Kiwix server on your private Wi-Fi.', SKY),
              ('On-device model', 'Qwen2.5-1.5B-Instruct, Q4_K_M GGUF (~1.1 GB) run by llama.cpp through LlamaSwift — optional download.', VIOLET),
              ('Answer + sources', 'Plain-language answer with source links. Labeled educational — not diagnosis. Read aloud by Kokoro TTS if enabled.', AMBER)]
    bw = (CW - 4 * 0.3) / 5
    for i, (t, b, c) in enumerate(stages):
        x = M + i * (bw + 0.3)
        flow_box(s, x, 1.5, bw, 1.75, t, b, c)
        if i < 4:
            s.line(x + bw + 0.03, 2.375, x + bw + 0.27, 2.375, color=BORDER2, lw=1.5, arrow=True)
    if (ASSETS / 'iphone-health-guide.png').exists():   # drop a real device/Simulator screenshot here and rebuild
        s.image('iphone-health-guide', M, 3.5, w=4.0, h=3.2, r=0.25)
    else:
        s.placeholder(M, 3.5, 4.0, 3.2, '[Drop your iPhone screenshot of the Health Guide tab here — Simulator or device]')
    s.bullets(M + 4.3, 3.5, CW - 4.3, 2.2, [
        '**Zero cloud calls.** There is no API key anywhere in the project; inference is isolated in one Swift actor and the model is freed after each answer to give memory back to the phone.',
        '**Everything is optional and checked.** The app works without the model, the MedlinePlus library or Kokoro; downloads show their size, GGUF headers are validated and the voice pack is CRC-checked before use.',
        '**Reference-first.** Matching MedlinePlus topics appear even when no model is installed, so the guide is useful on day one.',
    ], size=12, gap=6)
    s.card(M + 4.3, 5.6, CW - 4.3, 1.1, fill=CARD2, line=BORDER2)
    s.text(M + 4.55, 5.66, CW - 4.8, 0.22, 'ios/CareSphere/Services/LocalAssistantService.swift', size=9, color=DIM)
    s.text(M + 4.55, 5.9, CW - 4.8, 0.75, ['contextParameters.n_ctx = 2048   // bounded prompt + answer window',
                                            'prompt = "<|im_start|>system…<|im_start|>user…<|im_start|>assistant\\n"  // ChatML'],
           size=10, color=SAGE_L, lh=1.3, fit=False, mono=True)
    s.notes = ('The Health Guide answers health questions without the internet. A deterministic safety gate runs first; then MedlinePlus topics and an optional '
               'local Wikipedia are searched; then a 1.5-billion-parameter Qwen model runs on the phone itself through llama.cpp. There is no API key in the project.')

    # 14 ------------------------------------------- Privacy & Accessibility
    s = d.slide()
    s.header('Privacy & accessibility', 'Private by architecture, accessible by default')
    s.image('crop-settings-privacy', M, 1.45, h=5.25, r=0.14)
    px_ = M + 3.85
    colw = (CW - 3.85 - 0.3) / 2
    s.card(px_, 1.45, colw, 5.25)
    s.accent_top(px_, 1.45, colw, SAGE_L)
    s.text(px_ + 0.25, 1.7, colw - 0.5, 0.35, 'Privacy', size=17, color=WHITE, bold=True)
    s.bullets(px_ + 0.25, 2.15, colw - 0.5, 4.4, [
        '**No account. No sync server. No analytics SDK.** Nothing to breach.',
        '**AES-256-GCM encryption at rest.** Web: a non-extractable Web Crypto key stored in IndexedDB. iPhone: a CryptoKit key in the Keychain (this-device-only), Complete File Protection, excluded from backups.',
        'Legacy plaintext data is **migrated into the encrypted store automatically**, then removed.',
        '**Face ID / Touch ID lock** with an opaque privacy screen in the app switcher.',
        '**Export everything as JSON or erase it** — one tap each, in Settings.',
    ], size=12, gap=7)
    qx = px_ + colw + 0.3
    s.card(qx, 1.45, colw, 5.25)
    s.accent_top(qx, 1.45, colw, VIOLET)
    s.text(qx + 0.25, 1.7, colw - 0.5, 0.35, 'Accessibility', size=17, color=WHITE, bold=True)
    s.bullets(qx + 0.25, 2.15, colw - 0.5, 2.3, [
        '**Text size A / A+ / A++** on the web; Dynamic Type on iPhone.',
        '**Themes:** calm charcoal, warm light, or follow the device — plus a high-contrast mode.',
        '**Reduce visual movement**, spoken reminders, big tap targets.',
        'ARIA roles, focus management and Escape-to-close on the web; VoiceOver labels on iPhone.',
    ], size=12, gap=6)
    s.image('web-light', qx + 0.25, 4.5, w=colw - 0.5, h=2.05, valign='b')
    s.notes = ('Everything is encrypted at rest with AES-256-GCM — a non-extractable Web Crypto key on the web and a device-only Keychain key on iPhone. '
               'There is no account and no server. Accessibility is built in: three text sizes, warm-light and high-contrast themes, reduced motion and spoken reminders.')

    # 15 ------------------------------------------------------- Architecture
    s = d.slide()
    s.header('How it\'s built', 'Two native-feeling clients, zero servers')
    cols = [
        ('Web app (PWA)', SAGE_L, ['React 18 · Vite 8 · Tailwind CSS 3', 'Web Bluetooth (GATT Heart Rate)', 'Web Audio soundscapes', 'Web Crypto AES-256-GCM + IndexedDB', 'Notifications · Speech Synthesis · Geolocation', 'Jitsi External API (WebRTC)', 'Service worker — installable, offline']),
        ('iPhone app (Swift)', VIOLET, ['SwiftUI · iOS 16+ · XcodeGen', 'HealthKit · CoreBluetooth · Swift Charts', 'CryptoKit · Keychain · LocalAuthentication', 'UserNotifications · AVFoundation · MapKit', 'JitsiMeetSDK 13.1 · ZIPFoundation', 'llama.cpp (LlamaSwift) — Qwen2.5 1.5B', 'Sherpa-ONNX — Kokoro TTS']),
        ('Engineering practice', AMBER, ['17 automated tests (node:test): storage, CSV escaping, encryption, visit brief', 'GitHub Actions CI for web and iOS builds', 'Release gate: manual dispatch + version-matching tag', 'Docs: encryption, safety flow, accessibility, roadmap', 'Honest-labeling rules enforced in code, not copy']),
    ]
    cw3 = (CW - 2 * 0.3) / 3
    for i, (title, col, items) in enumerate(cols):
        x = M + i * (cw3 + 0.3)
        s.card(x, 1.5, cw3, 3.45)
        s.accent_top(x, 1.5, cw3, col)
        s.text(x + 0.3, 1.75, cw3 - 0.6, 0.35, title, size=16, color=WHITE, bold=True)
        s.bullets(x + 0.3, 2.2, cw3 - 0.6, 2.7, items, size=11.5, gap=4)
    nums = [('11,400+', 'lines of source'), ('7,741', 'Swift · 32 files'), ('3,420', 'JS / JSX / CSS'), ('17 / 17', 'tests passing'), ('2', 'CI workflows'), ('0', 'servers · accounts · trackers')]
    nw = (CW - 5 * 0.2) / 6
    for i, (n_, l_) in enumerate(nums):
        x = M + i * (nw + 0.2)
        s.card(x, 5.2, nw, 1.5, fill=CARD2, line=BORDER2)
        s.text(x, 5.32, nw, 0.65, n_, size=26, color=SAGE_L if i < 5 else AMBER, bold=True, align='c', anchor='m')
        s.text(x + 0.1, 6.0, nw - 0.2, 0.6, l_, size=10.5, color=MUTED, align='c', anchor='t', lh=1.15)
    s.notes = ('[2:05–2:17] The web app is React and JavaScript with Web Bluetooth, Web Audio and Web Crypto; the iPhone app is Swift and SwiftUI with '
               'HealthKit, CoreBluetooth, CryptoKit and llama.cpp — eleven thousand lines of code, seventeen automated tests, zero servers.')

    # 16 -------------------------------------------------- Challenges
    s = d.slide()
    s.header('Technical challenges', 'Four problems that took the longest — and how I solved them')
    ch = [
        ('Making Bluetooth honest', SAGE_L,
         'Web Bluetooth delivers GATT notifications asynchronously, so a cancelled pairing or a late callback from an old sensor could leave misleading numbers on screen. '
         'I parse the Heart Rate flags byte (8- vs 16-bit BPM), tag each sample LIVE BLE or SIMULATED at the source, and keep a connection **generation counter** so stale notifications are dropped. Cancelling the chooser never starts a demo stream.'),
        ('Encrypting data inside a browser', SKY,
         'localStorage is plaintext. I rebuilt storage on **AES-256-GCM via Web Crypto with a non-extractable key** kept in IndexedDB and authenticated data bound to the store name, then wrote a migration that decrypts legacy JSON, re-encrypts it and deletes the plaintext. node:test covers round-trips, tampered ciphertext and weak-key rejection.'),
        ('Running a language model on an iPhone', VIOLET,
         'No cloud allowed. I integrated **llama.cpp through LlamaSwift**, picked Qwen2.5-1.5B Q4_K_M for memory headroom, built the exact ChatML prompt (a missing assistant-prefix newline produced empty answers), grew the token buffer safely, unload the Kokoro voice before loading the model, isolated inference in one actor and **release the model after every answer**.'),
        ('Soundscapes without audio files', AMBER,
         'Bundled MP3s bloat a PWA and break offline use. Each scene is **synthesized in Web Audio**: noise buffers through high/low-pass filters, LFO-modulated gain for swells, and randomly scheduled oscillator chirps or band-passed bursts for birdsong and fire crackle — a few kilobytes of code that can play forever.'),
    ]
    cw2 = (CW - 0.3) / 2
    for i, (t, c, b) in enumerate(ch):
        x = M + (i % 2) * (cw2 + 0.3)
        y = 1.5 + (i // 2) * 2.7
        feature_card(s, x, y, cw2, 2.5, t, b, accent=c, title_size=15, body_size=12, kicker=f'Challenge {i + 1}')
    s.notes = ('[2:17–2:25] The hardest problem was keeping Bluetooth honest: a late notification from an old sensor could repaint a new card, so I label '
               'every sample at the source and drop stale connections with a generation counter.')

    # 17 ------------------------------------------------- Differentiation
    s = d.slide()
    s.header('What makes it different', 'Complements the tools families already use — and refuses to pretend')
    rows = [
        ('Medisafe', 'Medication schedules, caregiver alerts and interaction checks — cloud account required.', 'Reminders stay local; no interaction checker, because that needs a licensed drug database and a clinical review.'),
        ('Apple Health', 'Secure on-device record with user-controlled sharing.', 'CareSphere reads HealthKit with permission and labels sources — it never claims to be the clinical record.'),
        ('MyChart', 'Official records and visit summaries from a health system.', 'The visit brief is user-authored prep material and says so in its header.'),
        ('CaringBridge', 'Private family update pages with accounts and hosting.', 'Care Circle has no account or host; family video happens in real Jitsi rooms you invite people to.'),
    ]
    s.text(M + 1.9, 1.45, 4.8, 0.3, 'WHAT IT DOES', size=10, color=MUTED, bold=True)
    s.text(M + 7.0, 1.45, CW - 7.0, 0.3, 'HOW CARESPHERE DIFFERS', size=10, color=SAGE_L, bold=True)
    for i, (name, what, how) in enumerate(rows):
        y = 1.78 + i * 0.86
        s.card(M, y, CW, 0.76, fill=CARD if i % 2 == 0 else CARD2, line=BORDER)
        s.text(M + 0.25, y, 1.6, 0.76, name, size=13.5, color=WHITE, bold=True, anchor='m')
        s.text(M + 1.9, y, 4.8, 0.76, what, size=11.5, color=TEXT2, anchor='m', lh=1.2)
        s.text(M + 7.0, y, CW - 7.25, 0.76, how, size=11.5, color=TEXT, anchor='m', lh=1.2)
    s.card(M, 5.4, CW, 1.3, fill=CARD2, line=SAGE)
    s.image('icon', M + 0.3, 5.65, 0.8, 0.8, r=0.18)
    s.text(M + 1.35, 5.5, CW - 1.65, 1.1, [
        '**The combination is the product:** social connection + routines + honest wearable vitals + autism-friendly sensory tools + offline AI guidance + safety — in one calm app with **no account, no server and no fabricated data.**',
        {'text': 'What it is not: a medical device, a diagnosis tool, an emergency service or a replacement for a clinician — and it says so on every relevant screen.', 'color': MUTED}],
        size=12.5, color=TEXT, lh=1.25, space_after=5, anchor='m')
    s.notes = ('Existing products each solve one slice — and almost all need an account and a cloud. CareSphere is the combination: connection, routines, '
               'honest vitals, autism-friendly tools, offline AI and safety, with no server at all. And it is honest about what it is not.')

    # 18 ------------------------------------------------- Learned / v2.0
    s = d.slide()
    s.header('Reflection', 'What I learned — and what Version 2.0 will add')
    cw2 = (CW - 0.3) / 2
    s.card(M, 1.5, cw2, 5.2)
    s.accent_top(M, 1.5, cw2, SAGE_L)
    s.text(M + 0.3, 1.75, cw2 - 0.6, 0.4, 'What I learned', size=17, color=WHITE, bold=True)
    s.bullets(M + 0.3, 2.25, cw2 - 0.6, 4.3, [
        '**Honest engineering beats impressive demos.** Labeling simulated data and refusing to invent readings shaped the whole architecture.',
        '**Accessibility is a design input, not a checkbox** — reading the AASPIRE guidelines changed layouts, motion and colour choices early.',
        '**Privacy constraints breed creativity.** "No cloud" forced me to learn Web Crypto, CryptoKit, llama.cpp and procedural audio.',
        '**Two platforms, one promise.** Keeping React and SwiftUI behaviour identical (local-midnight resets, labels, exports) taught me to write the rules down first and test them.',
        '**Safety logic should be boring.** Deterministic, documented flows are easier to review than clever ones.',
    ], size=13, gap=8)
    x2 = M + cw2 + 0.3
    s.card(x2, 1.5, cw2, 5.2)
    s.accent_top(x2, 1.5, cw2, AMBER)
    s.text(x2 + 0.3, 1.75, cw2 - 0.6, 0.4, 'Version 2.0', size=17, color=WHITE, bold=True)
    s.bullets(x2 + 0.3, 2.25, cw2 - 0.6, 4.3, [
        '**Co-design sessions** with autistic people, people living with dementia, caregivers and accessibility specialists — then iterate.',
        '**Real HealthKit and Bluetooth observations inside the visit brief**, with 7/30/90-day filters on both platforms.',
        '**Non-diagnostic trends** (sleep, activity, heart-rate ranges) computed only from real, source-labeled data.',
        '**Encrypted backup and restore** across devices without a server — a passphrase-protected export file.',
        '**On-device VoiceOver and Dynamic Type testing**, Spanish localization, and a TestFlight beta.',
        'Deliberately **not** on the list: cloud sync, a clinician portal or a drug-interaction checker — not without clinical review and a licensed knowledge base.',
    ], size=13, gap=8)
    s.notes = ('[2:25–2:43] I learned that honest engineering beats impressive demos, and that accessibility is a design input, not a checkbox. '
               'Version 2.0 starts with co-design sessions with autistic people, people living with dementia and caregivers, adds real sensor '
               'data to the visit brief, and encrypted backup that still needs no server.')

    # 19 ---------------------------------------------------------- Closing
    s = d.slide(footer=False)
    s.image('glow', -2.5, -2.5, 9, 9)
    s.image('icon', M, 0.9, 1.2, 1.2, r=0.27)
    s.text(M, 2.35, 7.6, 0.9, 'Care that stays yours.', size=42, color=WHITE, bold=True)
    s.text(M, 3.3, 7.4, 1.2, 'CareSphere AI keeps older adults connected, autistic users calm and caregivers informed — '
                              'without an account, a server or a single fabricated number.', size=16, color=TEXT2, lh=1.3)
    s.text(M, 4.75, 7.4, 0.35, '[Student Name]  ·  [School]  ·  [email@example.com]', size=14, color=WHITE, bold=True)
    s.text(M, 5.15, 7.4, 0.35, 'Thank you — and thank you to the judges and the Congressional App Challenge.', size=12.5, color=MUTED)
    cx = M
    for label, col in [('Source on GitHub', SAGE_L), ('Built with SwiftUI + React', VIOLET), ('Made in [City], California', AMBER)]:
        cx += s.chip(cx, 5.75, label, color=col) + 0.15
    s.card(W - M - 3.6, 1.4, 3.6, 4.7, fill=CARD, line=BORDER2)
    s.image('qr', W - M - 3.6 + 0.45, 1.65, w=2.7, r=0.12)
    s.text(W - M - 3.6, 4.45, 3.6, 0.3, 'Source code & docs', size=12, color=WHITE, bold=True, align='c')
    s.text(W - M - 3.6, 4.75, 3.6, 0.3, 'github.com/engineer2025-sudo/Care', size=11.5, color=SAGE_L, align='c')
    s.text(W - M - 3.6 + 0.2, 5.15, 3.2, 0.8, ['Demo video: [YouTube link]', 'Install guide: DOWNLOAD.md in the repo'], size=10.5, color=MUTED, align='c', lh=1.3)
    s.text(M, H - 0.45, 6.9, 0.3, 'Congressional App Challenge 2026', size=10.5, color=DIM)
    s.notes = ('[2:43–2:52] CareSphere AI — care that stays yours. The code and install guide are on GitHub. Thank you.')

    return d


if __name__ == '__main__':
    deck = build()
    deck.write_pptx(OUT_PPTX)
    deck.write_previews(PREVIEW)
    print(f'wrote {OUT_PPTX.name} ({OUT_PPTX.stat().st_size / 1e6:.1f} MB), {len(deck.slides)} slides')
    for w in deck.warnings:
        print('WARNING:', w)
