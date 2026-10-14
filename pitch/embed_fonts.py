"""Embed TrueType fonts into a .pptx so the deck renders with the intended typefaces on machines that do not
have them installed (PowerPoint 2016+ on Windows and PowerPoint 365 on Mac honour embedded fonts).

PowerPoint stores embedded fonts as Embedded OpenType (EOT) streams in ppt/fonts/*.fntdata — the same container
the ttf2eot tool writes — referenced from presentation.xml via <p:embeddedFontLst>.  This module wraps each TTF
in an uncompressed, unencrypted EOT header (the simplest valid form) and patches the package parts.

Only fonts whose OS/2 fsType permits embedding should be used (all fonts shipped in pitch/fonts are SIL OFL,
fsType 0 = installable).
"""
from __future__ import annotations

import io
import re
import struct
import zipfile
from pathlib import Path

from fontTools.ttLib import TTFont

REL_FONT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/font'
NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'


def _name(font: TTFont, name_id: int) -> str:
    rec = font['name'].getName(name_id, 3, 1, 0x409) or font['name'].getName(name_id, 1, 0, 0)
    return rec.toUnicode() if rec else ''


def ttf_to_eot(ttf_path: Path) -> bytes:
    data = Path(ttf_path).read_bytes()
    font = TTFont(io.BytesIO(data))
    os2 = font['OS/2']
    head = font['head']
    panose = bytes([os2.panose.bFamilyType, os2.panose.bSerifStyle, os2.panose.bWeight, os2.panose.bProportion,
                    os2.panose.bContrast, os2.panose.bStrokeVariation, os2.panose.bArmStyle, os2.panose.bLetterForm,
                    os2.panose.bMidline, os2.panose.bXHeight])

    def utf16(s: str) -> bytes:
        return s.encode('utf-16-le')

    names = b''
    for nid in (1, 2, 5, 4):                      # family, style, version, full name — in EOT order
        enc = utf16(_name(font, nid))
        names += struct.pack('<H', len(enc)) + enc + struct.pack('<H', 0)   # size, string, padding
    names += struct.pack('<H', 0)                 # RootStringSize = 0 (no URL binding)

    header_wo_size = struct.pack(
        '<III10sBBIHHIIIIIIIIIIIH',
        len(data),                                # FontDataSize
        0x00020001,                               # Version
        0,                                        # Flags: not subsetted, not compressed, not XOR-encrypted
        panose,
        1,                                        # Charset: DEFAULT_CHARSET
        1 if (os2.fsSelection & 0x1) else 0,      # Italic
        os2.usWeightClass,                        # Weight
        os2.fsType,                               # embedding permissions
        0x504C,                                   # MagicNumber
        os2.ulUnicodeRange1, os2.ulUnicodeRange2, os2.ulUnicodeRange3, os2.ulUnicodeRange4,
        os2.ulCodePageRange1, os2.ulCodePageRange2,
        head.checkSumAdjustment & 0xFFFFFFFF,
        0, 0, 0, 0,                               # Reserved1-4
        0,                                        # Padding1
    )
    total = 4 + len(header_wo_size) + len(names) + len(data)
    return struct.pack('<I', total) + header_wo_size + names + data


def _font_meta(ttf_path: Path):
    font = TTFont(str(ttf_path))
    os2 = font['OS/2']
    panose = bytes([os2.panose.bFamilyType, os2.panose.bSerifStyle, os2.panose.bWeight, os2.panose.bProportion,
                    os2.panose.bContrast, os2.panose.bStrokeVariation, os2.panose.bArmStyle, os2.panose.bLetterForm,
                    os2.panose.bMidline, os2.panose.bXHeight]).hex().upper()
    mono = bool(font['post'].isFixedPitch)
    pitch_family = (1 if mono else 2) | (0x30 if mono else 0x20)   # fixed/variable pitch + modern/swiss family
    return panose, pitch_family


def embed(pptx_path: Path, families: list[dict]):
    """families: [{'typeface': 'Plus Jakarta Sans', 'regular': Path, 'bold': Path|None}, ...]"""
    pptx_path = Path(pptx_path)
    src = zipfile.ZipFile(pptx_path)
    parts = {n: src.read(n) for n in src.namelist()}
    src.close()

    # 1. font parts
    font_parts = []           # (part name, bytes)
    rels_xml = parts['ppt/_rels/presentation.xml.rels'].decode('utf8')
    existing_ids = [int(m) for m in re.findall(r'Id="rId(\d+)"', rels_xml)]
    next_id = max(existing_ids, default=0) + 1
    new_rels = ''
    entries = ''
    for fam in families:
        panose, pitch_family = _font_meta(fam['regular'])
        entry = f'<p:embeddedFont><p:font typeface="{fam["typeface"]}" panose="{panose}" pitchFamily="{pitch_family}" charset="0"/>'
        for face in ('regular', 'bold', 'italic', 'boldItalic'):
            p = fam.get(face)
            if not p:
                continue
            n = len(font_parts) + 1
            part_name = f'ppt/fonts/font{n}.fntdata'
            font_parts.append((part_name, ttf_to_eot(p)))
            rid = f'rId{next_id}'
            next_id += 1
            new_rels += f'<Relationship Id="{rid}" Type="{REL_FONT}" Target="fonts/font{n}.fntdata"/>'
            entry += f'<p:{face} r:id="{rid}"/>'
        entry += '</p:embeddedFont>'
        entries += entry
    for name, blob in font_parts:
        parts[name] = blob

    # 2. relationships
    parts['ppt/_rels/presentation.xml.rels'] = rels_xml.replace('</Relationships>', new_rels + '</Relationships>').encode('utf8')

    # 3. content types
    ct = parts['[Content_Types].xml'].decode('utf8')
    if 'Extension="fntdata"' not in ct:
        ct = ct.replace('</Types>', '<Default Extension="fntdata" ContentType="application/x-fontdata"/></Types>')
    parts['[Content_Types].xml'] = ct.encode('utf8')

    # 4. presentation.xml: flag + embeddedFontLst (schema order: after notesSz, before defaultTextStyle)
    pres = parts['ppt/presentation.xml'].decode('utf8')
    pres = re.sub(r'<p:embeddedFontLst>.*?</p:embeddedFontLst>', '', pres, flags=re.S)
    if 'embedTrueTypeFonts=' not in pres:
        pres = pres.replace('<p:presentation ', '<p:presentation embedTrueTypeFonts="1" ', 1)
    lst = f'<p:embeddedFontLst>{entries}</p:embeddedFontLst>'
    m = re.search(r'<p:notesSz[^>]*/>', pres)
    if m:
        pres = pres[:m.end()] + lst + pres[m.end():]
    else:
        pres = pres.replace('<p:defaultTextStyle', lst + '<p:defaultTextStyle', 1)
    parts['ppt/presentation.xml'] = pres.encode('utf8')

    # 5. rewrite the package ([Content_Types].xml first, as Office expects)
    order = ['[Content_Types].xml'] + [n for n in parts if n != '[Content_Types].xml']
    with zipfile.ZipFile(pptx_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for n in order:
            z.writestr(n, parts[n])
    return [n for n, _ in font_parts]
