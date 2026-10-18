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
if 'XCRemoteSwiftPackageReference' in text:
    errors.append('Remote packages are forbidden in the portable native build')
if plistlib.loads((root / 'CareSphere.entitlements').read_bytes()):
    errors.append('Standard build must not require optional HealthKit provisioning')
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
project_yml = (root / 'project.yml').read_text()
project_versions = set(re.findall(r'MARKETING_VERSION = "([^"]+)";', text))
project_builds = set(re.findall(r'CURRENT_PROJECT_VERSION = "([^"]+)";', text))
yml_version = re.search(r'MARKETING_VERSION: "([^"]+)"', project_yml)
yml_build = re.search(r'CURRENT_PROJECT_VERSION: "([^"]+)"', project_yml)
if len(project_versions) != 1 or not yml_version or project_versions != {yml_version.group(1)}:
    errors.append('XcodeGen and Xcode project marketing versions do not match')
if len(project_builds) != 1 or not yml_build or project_builds != {yml_build.group(1)}:
    errors.append('XcodeGen and Xcode project build numbers do not match')
android_build = (root.parent / 'android/app/build.gradle.kts').read_text()
if not re.search(r'versionCode = 11\b', android_build) or not re.search(r'versionName = \"1\.9\.0\"', android_build):
    errors.append('Android source version should be 1.9.0 (11)')
if not (root.parent / 'android/app/src/main/res/drawable-nodpi/caresphere_visit_prep_seal.jpg').is_file():
    errors.append('Missing Android visit-preparation seal artwork')
for key in ['NSCameraUsageDescription', 'NSMicrophoneUsageDescription', 'NSHealthShareUsageDescription',
            'NSBluetoothAlwaysUsageDescription', 'NSMotionUsageDescription', 'NSFaceIDUsageDescription']:
    if not info.get(key): errors.append(f'Missing usage description: {key}')
url_schemes = {scheme for item in info.get('CFBundleURLTypes', []) for scheme in item.get('CFBundleURLSchemes', [])}
if 'caresphere' not in url_schemes:
    errors.append('Missing CareSphere Siri/App Shortcuts URL route')
intent_source = (root / 'CareSphere/Services/CareSphereIntents.swift').read_text()
for route in ['today', 'activities', 'breathing', 'mood', 'visit-prep']:
    if f'CareSphereShortcutRoute.store("{route}")' not in intent_source:
        errors.append(f'Missing Siri/App Shortcut route: {route}')
if 'AppShortcutsProvider' not in intent_source:
    errors.append('Missing CareSphere App Shortcuts registration')
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
