#!/usr/bin/env python3
"""Create the static font instances used by the deck from Google Fonts' variable sources.

Plus Jakarta Sans (headlines + body) and JetBrains Mono (the one code line) are both SIL Open Font License,
so the generated TTFs ship in pitch/fonts and are embedded in the .pptx by deck_engine.

Usage:  python3 make_fonts.py path/to/PlusJakartaSans[wght].ttf path/to/JetBrainsMono[wght].ttf
(Sources: github.com/google/fonts → ofl/plusjakartasans and ofl/jetbrainsmono.)
"""
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

OUT = Path(__file__).resolve().parent / 'fonts'

# (source index, weight, output file name)
INSTANCES = [
    (0, 400, 'PlusJakartaSans-Regular.ttf'),
    (0, 500, 'PlusJakartaSans-Medium.ttf'),
    (0, 700, 'PlusJakartaSans-Bold.ttf'),
    (0, 800, 'PlusJakartaSans-ExtraBold.ttf'),
    (1, 400, 'JetBrainsMono-Regular.ttf'),
]


def main(sources):
    OUT.mkdir(exist_ok=True)
    for idx, wght, name in INSTANCES:
        vf = TTFont(sources[idx])
        st = instancer.instantiateVariableFont(vf, {'wght': wght}, inplace=False, updateFontNames=True)
        # Windows-style family naming: Regular/Bold stay in the base family (PowerPoint's bold toggle finds them);
        # other weights become their own family name, e.g. "Plus Jakarta Sans ExtraBold".
        os2 = st['OS/2']
        os2.usWeightClass = wght
        sub = {n.nameID: n.toUnicode() for n in st['name'].names if n.platformID == 3}.get(2, 'Regular')
        is_bold = sub.strip().lower() == 'bold'
        os2.fsSelection = (os2.fsSelection | 0x20) if is_bold else (os2.fsSelection & ~0x20)
        os2.fsSelection = (os2.fsSelection & ~0x40) if is_bold else (os2.fsSelection | 0x40)   # REGULAR bit
        st['head'].macStyle = (st['head'].macStyle | 0x1) if is_bold else (st['head'].macStyle & ~0x1)
        st.save(OUT / name)
        names = {n.nameID: n.toUnicode() for n in st['name'].names if n.platformID == 3}
        print(f'{name:32s} family={names.get(1)!r} style={names.get(2)!r} typo={names.get(16)!r}/{names.get(17)!r} '
              f'weight={os2.usWeightClass} size={(OUT / name).stat().st_size // 1024} KB')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1:])
