#!/usr/bin/env python3
"""Portable source/resource preflight. This is not a replacement for xcodebuild."""
from pathlib import Path
import json
import plistlib
import re
import sys
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
project = root / 'CareSphere.xcodeproj'
text = (project / 'project.pbxproj').read_text()
errors = []
for source in (root / 'CareSphere').rglob('*.swift'):
    if f'path = "{source.name}";' not in text and f'path = {source.name};' not in text:
        errors.append(f'Source missing from Xcode project: {source.relative_to(root)}')
references = re.findall(r'^\s*([A-F0-9]{24}) = \{\s*isa\s*=', text, re.M)
if len(references) != len(set(references)):
    errors.append('Duplicate Xcode object IDs')
for file in ['CareSphere-iOS-Info.plist', 'CareSphere.entitlements']:
    with (root / file).open('rb') as stream:
        plistlib.load(stream)
info = plistlib.loads((root / 'CareSphere-iOS-Info.plist').read_bytes())
for key in ['NSCameraUsageDescription', 'NSMicrophoneUsageDescription', 'NSHealthShareUsageDescription',
            'NSBluetoothAlwaysUsageDescription', 'NSMotionUsageDescription', 'NSFaceIDUsageDescription']:
    if not info.get(key): errors.append(f'Missing usage description: {key}')
for manifest in (root / 'CareSphere/Resources').rglob('Contents.json'):
    data = json.loads(manifest.read_text())
    for image in data.get('images', []):
        if image.get('filename') and not (manifest.parent / image['filename']).is_file():
            errors.append(f'Missing asset: {image["filename"]}')
ET.parse(project / 'xcshareddata/xcschemes/CareSphere.xcscheme')
ET.parse(project / 'project.xcworkspace/contents.xcworkspacedata')
if 'CareActivityKit' not in text or not (root / 'ActivityKit/Package.swift').is_file():
    errors.append('Missing local activity package')
if errors:
    print('\n'.join(errors), file=sys.stderr)
    sys.exit(1)
print('PASS: source references, resources, plists, shared scheme, and local activity package.')
