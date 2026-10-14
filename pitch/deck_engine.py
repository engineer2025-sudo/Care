"""Slide engine for the CareSphere pitch deck.

A slide is a list of primitives (rect / oval / line / text / image, all in inches).  Each deck is rendered twice
from the same description:
  * an editable PowerPoint via python-pptx, with the typefaces embedded (see embed_fonts.py), and
  * JPG previews via Pillow using the very same TTF files, so what you see here is what PowerPoint shows.

Design system (one family, one accent — everything matches the CareSphere app icon):
  type    Plus Jakarta Sans (ExtraBold display, Bold headlines, Regular body) + JetBrains Mono for code
  colour  icon navy gradient background, translucent white panels, the icon's mint-green as the only accent
"""
from __future__ import annotations

import math
import os
import re
from pathlib import Path

from lxml import etree
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.dml import MSO_LINE_DASH_STYLE
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt

import embed_fonts

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / 'assets'
FONT_DIR = Path(os.environ.get('PITCH_FONT_DIR', ROOT / 'fonts'))

# weight → (TTF file, PowerPoint typeface name, PowerPoint bold flag)
FACES = {
    400: ('PlusJakartaSans-Regular.ttf', 'Plus Jakarta Sans', False),
    500: ('PlusJakartaSans-Medium.ttf', 'Plus Jakarta Sans Medium', False),
    700: ('PlusJakartaSans-Bold.ttf', 'Plus Jakarta Sans', True),
    800: ('PlusJakartaSans-ExtraBold.ttf', 'Plus Jakarta Sans ExtraBold', False),
    'mono': ('JetBrainsMono-Regular.ttf', 'JetBrains Mono', False),
}
EMBED = [
    {'typeface': 'Plus Jakarta Sans', 'regular': FONT_DIR / FACES[400][0], 'bold': FONT_DIR / FACES[700][0]},
    {'typeface': 'Plus Jakarta Sans Medium', 'regular': FONT_DIR / FACES[500][0]},
    {'typeface': 'Plus Jakarta Sans ExtraBold', 'regular': FONT_DIR / FACES[800][0]},
    {'typeface': 'JetBrains Mono', 'regular': FONT_DIR / FACES['mono'][0]},
]
ASCENT, DESCENT = 1.038, 0.222       # Plus Jakarta Sans hhea metrics (em), used to place baselines in previews
MONO_ASCENT, MONO_DESCENT = 1.02, 0.30

# ---------------------------------------------------------------- geometry
W, H = 13.333, 7.5          # 16:9 slide, inches
PX = 144                    # preview pixels per inch (1920 x 1080)
M = 0.8                     # outer margin
CW = W - 2 * M              # content width

# ---------------------------------------------------------------- palette (from the app icon: #0A1324 navy, #06E288 heart)
BG = '0B1733'               # gradient top
BG2 = '0F2659'              # gradient bottom
INK = '0A1324'              # icon navy — text on accent surfaces
WHITE = 'FFFFFF'
TEXT = 'D7E0F2'             # body
MUTED = '93A4C7'            # secondary
DIM = '5F7299'              # footers, sources
ACCENT = '06E288'           # the icon's heart — the only accent colour
LINE = 'FFFFFF'             # used with alpha for panel borders
PANEL_ALPHA = 0.06
PANEL_LINE_ALPHA = 0.10
# compatibility names for older slide code
PANEL = '15284F'
PANEL2 = '1A3160'
BORDER = '2B3F6B'
BORDER2 = '3A5287'
TEXT2 = TEXT
ACCENT_D = ACCENT
WARM = ACCENT
ROSE = MUTED
SKY = ACCENT
VIOLET = ACCENT
NAVY = INK

FOOTER_BRAND = 'CareSphere AI'


def rgb(hexstr):
    return tuple(int(hexstr[i:i + 2], 16) for i in (0, 2, 4))


# ------------------------------------------------------------------ text model
_font_cache: dict = {}


def pil_font(size_pt: float, weight=400, mono=False):
    px = max(1.0, round(size_pt * PX / 72, 1))
    key = (px, 'mono' if mono else weight)
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(str(FONT_DIR / FACES['mono' if mono else weight][0]), px)
    return _font_cache[key]


def _weight(st):
    return 700 if st.get('bold') and st.get('weight', 400) < 700 else st.get('weight', 400)


def parse_markup(text: str, base: dict) -> list[tuple[str, dict]]:
    """**strong** → bold run in base['strong'] colour, ~~muted~~ → dim run, ==accent== → accent-coloured run."""
    runs = []
    pattern = re.compile(r'(\*\*.+?\*\*|~~.+?~~|==.+?==)')
    for part in pattern.split(text):
        if not part:
            continue
        style = dict(base)
        if part.startswith('**'):
            part = part[2:-2]
            style['weight'] = max(700, base.get('weight', 400))
            style['color'] = base.get('strong', base['color'])
        elif part.startswith('~~'):
            part = part[2:-2]
            style['color'] = MUTED
        elif part.startswith('=='):
            part = part[2:-2]
            style['color'] = ACCENT
        runs.append((part, style))
    return runs


def norm_paras(paras, size, color, weight, strong, lh, space_after, mono=False, tracking=0.0):
    out = []
    for p in paras:
        if isinstance(p, str):
            p = {'text': p}
        base = {
            'size': p.get('size', size), 'color': p.get('color', color), 'weight': p.get('weight', weight),
            'strong': p.get('strong', strong), 'mono': p.get('mono', mono), 'tracking': p.get('tracking', tracking),
        }
        runs = p['runs'] if 'runs' in p else parse_markup(p['text'], base)
        runs = [(t, {**base, **st}) for t, st in runs]
        out.append({
            'runs': runs, 'bullet': p.get('bullet', False), 'size': base['size'],
            'space_before': p.get('space_before', 0), 'space_after': p.get('space_after', space_after),
            'lh': p.get('lh', lh), 'align': p.get('align'), 'bullet_color': p.get('bullet_color', ACCENT),
            'indent': p.get('indent', 0.26), 'bullet_char': p.get('bullet_char', '•'),
        })
    return out


def run_width(f, tok, st, scale):
    w = f.getlength(tok)
    if st.get('tracking'):
        w += len(tok) * st['tracking'] * scale * PX / 72
    return w


def layout_paras(paras, w_in, scale=1.0):
    """Greedy word wrap with the real font metrics. Returns (lines, total_height_in)."""
    lines = []
    total = 0.0
    for pi, p in enumerate(paras):
        size = p['size'] * scale
        indent = p['indent'] if p['bullet'] else 0
        max_px = (w_in - indent) * PX * 0.975
        tokens = []
        for text, st in p['runs']:
            for tok in re.findall(r'\S+\s*|\s+', text):
                tokens.append((tok, st))
        cur, cur_w = [], 0.0
        for tok, st in tokens:
            f = pil_font(st['size'] * scale, _weight(st), st.get('mono'))
            tw = run_width(f, tok, st, scale)
            tw_fit = run_width(f, tok.rstrip(), st, scale)
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
    def __init__(self, deck, footer=True):
        self.deck = deck
        self.items = []
        self.notes = ''
        self.footer = footer

    # primitives --------------------------------------------------------
    def rect(self, x, y, w, h, fill=None, line=None, lw=1.0, r=0.0, alpha=None, line_alpha=None, dash=False):
        self.items.append(('rect', dict(x=x, y=y, w=w, h=h, fill=fill, line=line, lw=lw, r=r, alpha=alpha,
                                        line_alpha=line_alpha, dash=dash)))

    def oval(self, x, y, w, h, fill=None, line=None, lw=1.0, alpha=None):
        self.items.append(('oval', dict(x=x, y=y, w=w, h=h, fill=fill, line=line, lw=lw, alpha=alpha)))

    def line(self, x1, y1, x2, y2, color=BORDER2, lw=1.0, arrow=False, dash=False, alpha=None):
        self.items.append(('line', dict(x1=x1, y1=y1, x2=x2, y2=y2, color=color, lw=lw, arrow=arrow, dash=dash, alpha=alpha)))

    def text(self, x, y, w, h, paras, size=20, color=TEXT, weight=400, bold=False, align='l', anchor='t',
             lh=1.25, space_after=0, fit=True, strong=WHITE, min_size=8, mono=False, tracking=0.0):
        if isinstance(paras, (str, dict)):
            paras = [paras]
        if bold:
            weight = max(weight, 700)
        paras = norm_paras(paras, size, color, weight, strong, lh, space_after, mono, tracking)
        scale = 1.0
        lines, total = layout_paras(paras, w)
        while fit and total > h + 0.01 and paras[0]['size'] * scale > min_size:
            scale -= 0.04
            lines, total = layout_paras(paras, w, scale)
        if total > h + 0.02:
            self.deck.warnings.append(f'slide {len(self.deck.slides)}: text overflow {total:.2f}in > {h:.2f}in: '
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
    def eyebrow(self, label, x=M, y=0.62, color=ACCENT):
        self.rect(x, y + 0.085, 0.28, 0.035, fill=color, r=0.0175)
        self.text(x + 0.4, y - 0.04, 6, 0.3, label.upper(), size=11.5, color=color, weight=700, tracking=1.6)

    def header(self, label, title, subtitle=None, title_size=40, title_w=None, y=1.0):
        if label:
            self.eyebrow(label)
        th = self.text(M, y, title_w or CW, 1.4, title, size=title_size, color=WHITE, weight=700, anchor='t', lh=1.12)
        if subtitle:
            self.text(M, y + th + 0.15, title_w or CW, 0.6, subtitle, size=20, color=MUTED)
        return y + th

    def card(self, x, y, w, h, fill=WHITE, alpha=PANEL_ALPHA, line=LINE, line_alpha=PANEL_LINE_ALPHA, r=0.2, lw=0.75):
        self.rect(x, y, w, h, fill=fill, line=line, lw=lw, r=r, alpha=alpha, line_alpha=line_alpha)

    def bullets(self, x, y, w, h, items, size=19, color=TEXT, gap=8, strong=WHITE, lh=1.25):
        paras = [{'text': t, 'bullet': True, 'space_after': gap} for t in items]
        return self.text(x, y, w, h, paras, size=size, color=color, strong=strong, lh=lh)

    def chip(self, x, y, text, color=ACCENT, fill=None, alpha=0.12, size=11, w=None, h=0.36, text_color=None):
        f = pil_font(size, 700)
        tw = f.getlength(text.upper()) / PX + len(text) * 1.0 / 72 + 0.46
        w = w or tw
        self.rect(x, y, w, h, fill=fill or color, alpha=alpha if fill is None else None, r=h / 2)
        self.text(x, y, w, h, text.upper(), size=size, color=text_color or color, weight=700, align='c', anchor='m',
                  fit=False, tracking=1.0)
        return w

    def stat(self, x, y, w, number, label, size=88, color=WHITE, label_color=ACCENT, align='l'):
        self.text(x, y, w, size / 72 * 1.15, number, size=size, color=color, weight=800, align=align, anchor='t', lh=1.05, fit=False)
        self.text(x, y + size / 72 * 1.2, w, 0.9, label, size=20, color=label_color, weight=500, align=align, lh=1.25)


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

    def slide(self, footer=True):
        s = Slide(self, footer=footer)
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
            fill.gradient()
            fill.gradient_angle = 90          # top → bottom
            stops = fill.gradient_stops
            stops[0].position = 0.0
            stops[0].color.rgb = RGBColor(*rgb(BG))
            stops[1].position = 1.0
            stops[1].color.rgb = RGBColor(*rgb(BG2))
            for kind, it in s.items:
                getattr(self, f'_pptx_{kind}')(sl, it)
            if s.footer:
                for kind, it in self._footer_items(idx, n):
                    getattr(self, f'_pptx_{kind}')(sl, it)
            sl.notes_slide.notes_text_frame.text = s.notes or ''
        prs.save(path)
        embed_fonts.embed(path, EMBED)

    @staticmethod
    def _no_shadow(shape):
        shape.shadow.inherit = False

    @staticmethod
    def _set_alpha(shape, alpha, where='a:solidFill'):
        spPr = shape._element.spPr
        node = spPr.find(qn(where)) if where == 'a:solidFill' else spPr.find(qn('a:ln')).find(qn('a:solidFill'))
        if node is not None:
            clr = node.find(qn('a:srgbClr'))
            a = etree.SubElement(clr, qn('a:alpha'))
            a.set('val', str(int(alpha * 100000)))

    def _pptx_shape(self, sl, kind, it):
        shp = sl.shapes.add_shape(kind, Inches(it['x']), Inches(it['y']), Inches(it['w']), Inches(it['h']))
        self._no_shadow(shp)
        if kind == MSO_SHAPE.ROUNDED_RECTANGLE:
            shp.adjustments[0] = min(0.5, it['r'] / min(it['w'], it['h']))
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
            if it.get('line_alpha') is not None:
                self._set_alpha(shp, it['line_alpha'], where='a:ln')
        else:
            shp.line.fill.background()
        shp.text_frame.text = ''
        return shp

    def _pptx_rect(self, sl, it):
        kind = MSO_SHAPE.ROUNDED_RECTANGLE if it['r'] else MSO_SHAPE.RECTANGLE
        self._pptx_shape(sl, kind, it)

    def _pptx_oval(self, sl, it):
        self._pptx_shape(sl, MSO_SHAPE.OVAL, it)

    def _pptx_line(self, sl, it):
        c = sl.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(it['x1']), Inches(it['y1']), Inches(it['x2']), Inches(it['y2']))
        c.line.color.rgb = RGBColor(*rgb(it['color']))
        c.line.width = Pt(it['lw'])
        if it.get('dash'):
            c.line.dash_style = MSO_LINE_DASH_STYLE.DASH
        ln = c.line._get_or_add_ln()
        if it.get('alpha') is not None:
            clr = ln.find(qn('a:solidFill')).find(qn('a:srgbClr'))
            etree.SubElement(clr, qn('a:alpha')).set('val', str(int(it['alpha'] * 100000)))
        if it['arrow']:
            tail = etree.SubElement(ln, qn('a:tailEnd'))
            tail.set('type', 'triangle')
            tail.set('w', 'med')
            tail.set('len', 'med')

    def _pptx_image(self, sl, it):
        pic = sl.shapes.add_picture(str(it['path']), Inches(it['x']), Inches(it['y']), Inches(it['w']), Inches(it['h']))
        if it.get('r'):
            prst = pic._element.spPr.find(qn('a:prstGeom'))
            prst.set('prst', 'roundRect')
            av = prst.find(qn('a:avLst'))
            for child in list(av):
                av.remove(child)
            gd = etree.SubElement(av, qn('a:gd'))
            gd.set('name', 'adj')
            gd.set('fmla', f'val {int(min(0.5, it["r"] / min(it["w"], it["h"])) * 100000)}')

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
                etree.SubElement(pPr, qn('a:buFont')).set('typeface', FACES[700][1])
                etree.SubElement(pPr, qn('a:buChar')).set('char', p['bullet_char'])
            else:
                etree.SubElement(pPr, qn('a:buNone'))
            for text, st in p['runs']:
                r = para.add_run()
                r.text = text
                face = FACES['mono' if st.get('mono') else _weight(st)]
                r.font.name = face[1]
                r.font.size = Pt(round(st['size'] * scale * 2) / 2)
                r.font.bold = face[2]
                r.font.color.rgb = RGBColor(*rgb(st['color']))
                if st.get('tracking'):
                    r.font._rPr.set('spc', str(int(st['tracking'] * scale * 100)))

    def _footer_items(self, idx, n):
        items = []
        y = H - 0.5
        items.append(('image', dict(path=ASSETS / 'icon.png', x=M, y=y - 0.02, w=0.26, h=0.26, r=0.07)))
        items.append(('text', dict(x=M + 0.36, y=y, w=4, h=0.22,
                                   paras=norm_paras([FOOTER_BRAND], 10.5, DIM, 700, WHITE, 1.2, 0, tracking=0.6),
                                   scale=1, align='l', anchor='m', lines=None)))
        items.append(('text', dict(x=W - M - 1.5, y=y, w=1.5, h=0.22,
                                   paras=norm_paras([f'{idx:02d}  /  {n:02d}'], 10.5, DIM, 500, WHITE, 1.2, 0, tracking=0.6),
                                   scale=1, align='r', anchor='m', lines=None)))
        return items

    # --------------------------------------------------------- preview out
    def _background(self):
        w, h = int(W * PX), int(H * PX)
        c0, c1 = rgb(BG), rgb(BG2)
        grad = Image.new('RGB', (1, h))
        for yy in range(h):
            t = yy / (h - 1)
            grad.putpixel((0, yy), tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3)))
        return grad.resize((w, h)).convert('RGBA')

    def write_previews(self, folder: Path):
        folder.mkdir(exist_ok=True)
        n = len(self.slides)
        thumbs = []
        bg = self._background()
        for idx, s in enumerate(self.slides, start=1):
            im = bg.copy()
            for kind, it in s.items:
                getattr(self, f'_pil_{kind}')(im, it)
            if s.footer:
                for kind, it in self._footer_items(idx, n):
                    getattr(self, f'_pil_{kind}')(im, it)
            out = folder / f'slide-{idx:02d}.jpg'
            im.convert('RGB').save(out, quality=90, optimize=True)
            thumbs.append(im.convert('RGB').resize((480, 270), Image.LANCZOS))
        cols = 4
        rows = (n + cols - 1) // cols
        sheet = Image.new('RGB', (cols * 500 + 20, rows * 290 + 20), (24, 24, 28))
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
        outline = rgb(it['line']) + (int(255 * (it['line_alpha'] if it.get('line_alpha') is not None else 1)),) if it['line'] else None
        lw = max(1, int(round(it['lw'] * PX / 72))) if outline else 0
        r = self._px(it['r'])
        if it.get('dash') and outline:
            if fill:
                d.rounded_rectangle(box, radius=r, fill=fill)
            # dashed outline: draw segments along the perimeter
            peri = [(box[0], box[1]), (box[2], box[1]), (box[2], box[3]), (box[0], box[3]), (box[0], box[1])]
            for (ax, ay), (bx, by) in zip(peri, peri[1:]):
                L = math.hypot(bx - ax, by - ay)
                ux, uy = (bx - ax) / L, (by - ay) / L
                t = r
                while t < L - r:
                    seg = min(12, L - r - t)
                    d.line([(ax + ux * t, ay + uy * t), (ax + ux * (t + seg), ay + uy * (t + seg))], fill=outline, width=lw)
                    t += 20
        else:
            d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=lw)
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
        layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        p1 = (self._px(it['x1']), self._px(it['y1']))
        p2 = (self._px(it['x2']), self._px(it['y2']))
        lw = max(1, int(round(it['lw'] * PX / 72)))
        col = rgb(it['color']) + (int(255 * (it['alpha'] if it.get('alpha') is not None else 1)),)
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
        im.alpha_composite(layer)

    def _pil_image(self, im, it):
        src = Image.open(it['path']).convert('RGBA')
        tw, th = max(1, self._px(it['w'])), max(1, self._px(it['h']))
        src = src.resize((tw, th), Image.LANCZOS)
        if it.get('r'):
            mask = Image.new('L', src.size, 0)
            ImageDraw.Draw(mask).rounded_rectangle([0, 0, tw - 1, th - 1], radius=self._px(it['r']), fill=255)
            alpha = src.getchannel('A')
            src.putalpha(Image.composite(alpha, Image.new('L', src.size, 0), mask))
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
            mono = bool(p['runs'] and p['runs'][0][1].get('mono'))
            asc, desc = (MONO_ASCENT, MONO_DESCENT) if mono else (ASCENT, DESCENT)
            baseline = y + (lh_px - (asc + desc) * size_px) / 2 + asc * size_px
            if p['bullet'] and first_line:
                bf = pil_font(p['size'] * scale, 700)
                d.text((x0, baseline), p['bullet_char'], font=bf, fill=rgb(p['bullet_color']), anchor='ls')
            for tok, st in toks:
                f = pil_font(st['size'] * scale, _weight(st), st.get('mono'))
                if st.get('tracking'):
                    extra = st['tracking'] * scale * PX / 72
                    for ch in tok:
                        d.text((x, baseline), ch, font=f, fill=rgb(st['color']), anchor='ls')
                        x += f.getlength(ch) + extra
                else:
                    d.text((x, baseline), tok, font=f, fill=rgb(st['color']), anchor='ls')
                    x += f.getlength(tok)
            y += lh_px
