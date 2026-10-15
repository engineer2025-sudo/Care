#!/usr/bin/env python3
"""Generate identical offline catalogs. Run --check in CI; no network translation."""
import json, re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
LANGS=['es','zh-Hans','fil','vi']
entries={}
for line in (ROOT/'localization/interface.psv').read_text().splitlines():
    if not line or line.startswith('#'): continue
    row=line.split('|')
    assert len(row)==5, row
    key,*values=row
    assert key not in entries, 'duplicate: '+key
    assert all(v.strip() for v in values), key
    tokens=sorted(re.findall(r'\{\d+\}',key))
    assert all(sorted(re.findall(r'\{\d+\}',v))==tokens for v in values), key
    entries[key]=dict(zip(LANGS,values))
for alias,original in json.loads((ROOT/'localization/aliases.json').read_text()).items():
    assert alias not in entries and original in entries, alias
    entries[alias]=entries[original]
body=json.dumps(entries,ensure_ascii=False,sort_keys=True,indent=2)+'\n'
paths=['src/locales/interface.json','ios/ActivityKit/Sources/CareActivityKit/Resources/InterfaceTranslations.json','android/app/src/main/assets/interface.json']
for relative in paths:
    path=ROOT/relative
    if '--check' in sys.argv:
        assert path.read_text()==body, 'Regenerate '+relative
    else:
        path.parent.mkdir(parents=True,exist_ok=True);path.write_text(body)
print(f'{len(entries)} messages × 4 translations, plus English; catalogs match.')
