"""Shared slide engine for the CareSphere pitch decks.

A slide is a list of primitives (rect / oval / line / text / image, all in inches).
Each deck is rendered twice from the same description:
  * editable PowerPoint via python-pptx (Arial / Courier New), and
  * PNG/JPG previews via Pillow using Arimo / Cousine (metric-compatible fonts),
    so layouts can be checked visually without PowerPoint.
"""
from __future__ import annotations

import math
import os
import re
from pathlib import Path

from lxml import etree
from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.dml import MSO_LINE_DASH_STYLE
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / 'assets'
FONT_DIR = Path(os.environ.get('PITCH_FONT_DIR', ROOT / 'fonts'))  # Arimo + Cousine (OFL) ship in pitch/fonts
FONT_REG = str(FONT_DIR / 'Arimo[wght].ttf')
FONT_ITA = str(FONT_DIR / 'Arimo-Italic[wght].ttf')
FONT_MONO = str(FONT_DIR / 'Cousine-Regular.ttf')

# ---------------------------------------------------------------- geometry
W, H = 13.333, 7.5          # 16:9 slide, inches
PX = 144                    # preview pixels per inch (1920 x 1080)
M = 0.7                     # outer margin
CW = W - 2 * M              # content width

# ---------------------------------------------------------------- blue theme
BG = '0C2D63'        # deep blue background
PANEL = '15407F'     # cards
PANEL2 = '1B4A90'    # lighter cards / hover
BORDER = '2E5CA6'
BORDER2 = '3F70C0'
WHITE = 'FFFFFF'
TEXT = 'EAF0FB'
TEXT2 = 'C7D7F2'
MUTED = 'A6BBE0'
DIM = '7F98C6'
ACCENT = '4ADE80'    # CareSphere green (the icon's heart) on blue
ACCENT_D = '22C55E'
WARM = 'FFC94D'
ROSE = 'FF7B7B'
SKY = '7CC4FF'
VIOLET = 'B8A6FF'
NAVY = '0D1424'

FOOTER_TEXT = ''     # minimalist: slide number only


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
            'lh': p.get('lh', lh), 'align': p.get('align'), 'bullet_color': p.get('bullet_color', ACCENT),
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

    def text(self, x, y, w, h, paras, size=18, color=TEXT2, bold=False, italic=False, align='l', anchor='t',
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
        if not r and name.startswith(('crop-', 'strip-')):
            r = 0.04 * dw      # the app's own card radius, so page-colour corners never show on the slide
        self.items.append(('image', dict(path=path, x=x, y=y, w=dw, h=dh, r=r)))
        return x, y, dw, dh

    # composites --------------------------------------------------------
    def header(self, label, title, subtitle=None, title_size=36, title_w=None):
        if label:
            self.text(M, 0.45, CW, 0.3, label.upper(), size=12, color=ACCENT, bold=True)
        th = self.text(M, 0.72, title_w or CW, 1.2, title, size=title_size, color=WHITE, bold=True, anchor='t', lh=1.12)
        if subtitle:
            self.text(M, 0.72 + th + 0.12, title_w or CW, 0.5, subtitle, size=18, color=TEXT2)
        return 0.72 + th

    def card(self, x, y, w, h, fill=PANEL, line=None, r=0.2, lw=1.0):
        self.rect(x, y, w, h, fill=fill, line=line, lw=lw, r=r)

    def bullets(self, x, y, w, h, items, size=18, color=TEXT2, gap=8, strong=WHITE, lh=1.22):
        paras = [{'text': t, 'bullet': True, 'space_after': gap} for t in items]
        return self.text(x, y, w, h, paras, size=size, color=color, strong=strong, lh=lh)

    def numbered(self, x, y, w, h, items, size=16, color=TEXT2, gap=8, num_color=ACCENT, lh=1.22):
        paras = [{'text': t, 'bullet': True, 'bullet_char': str(i + 1), 'bullet_color': num_color,
                  'indent': 0.32, 'space_after': gap} for i, t in enumerate(items)]
        return self.text(x, y, w, h, paras, size=size, color=color, lh=lh)

    def accent_top(self, x, y, w, color):
        """Thin accent 'tab' along the top edge of a card (inset so it clears the rounded corners)."""
        self.rect(x + 0.22, y - 0.01, w - 0.44, 0.07, fill=color, r=0.035)

    def chip(self, x, y, text, color=ACCENT, fill=None, size=11, w=None, h=0.34):
        f = pil_font(size, True)
        tw = f.getlength(text.upper()) / PX + 0.4
        w = w or tw
        self.rect(x, y, w, h, fill=fill or PANEL2, line=None, r=h / 2)
        self.text(x, y, w, h, text.upper(), size=size, color=color, bold=True, align='c', anchor='m', fit=False)
        return w

    def placeholder(self, x, y, w, h, label):
        self.rect(x, y, w, h, fill=PANEL, line=ACCENT, lw=1.5, r=0.2, dash=True)
        self.text(x + 0.3, y, w - 0.6, h, label, size=14, color=ACCENT, align='c', anchor='m', italic=True)


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

    def _footer_items(self, idx, n):
        items = []
        if FOOTER_TEXT:
            items.append(dict(x=M, y=H - 0.45, w=8, h=0.25, paras=norm_paras([FOOTER_TEXT], 10, DIM, False, False, WHITE, 1.2, 0),
                              scale=1, align='l', anchor='m', lines=None))
        items.append(dict(x=W - M - 1.5, y=H - 0.45, w=1.5, h=0.25, paras=norm_paras([f'{idx} / {n}'], 10, DIM, False, False, WHITE, 1.2, 0),
                          scale=1, align='r', anchor='m', lines=None))
        return items

    def _pptx_footer(self, sl, idx, n):
        for it in self._footer_items(idx, n):
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
                for it in self._footer_items(idx, n):
                    self._pil_text(im, it)
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


