#!/usr/bin/env python3
"""Package verified native sources and fetch the matching CI-built Android APK.
Usage: python3 scripts/package_mobile.py --ios-run RUN --android-run RUN
Requires gh + git authentication, never Apple/Android signing credentials.
"""
import argparse
import base64
import hashlib
import json
import re
import subprocess
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = 'engineer2025-sudo/Care'

def command(*args):
    return subprocess.check_output(args, cwd=ROOT, text=True)

def api(path):
    return json.loads(command('gh', 'api', path))

def verified_run(run_id, directory):
    run = json.loads(command('gh', 'run', 'view', run_id, '--json', 'status,conclusion,headSha,url,jobs'))
    if run['status'] != 'completed' or run['conclusion'] != 'success':
        raise SystemExit(f'{directory} CI must finish successfully before packaging: {run["url"]}')
    if command('git', 'diff', run['headSha'], 'HEAD', '--', directory).strip():
        raise SystemExit(f'{directory} source differs from the successful CI source.')
    if command('git', 'status', '--porcelain', '--', directory).strip():
        raise SystemExit(f'{directory} has unverified working-tree changes.')
    return run

parser = argparse.ArgumentParser()
parser.add_argument('--ios-run', required=True)
parser.add_argument('--android-run', required=True)
args = parser.parse_args()
ios = verified_run(args.ios_run, 'ios')
android = verified_run(args.android_run, 'android')

# Retrieve the run's unreferenced artifact mirror. Never create a branch/tag.
notices = []
for job in android['jobs']:
    notices.extend(api(f'repos/{REPO}/check-runs/{job["databaseId"]}/annotations?per_page=100'))
pattern = r'git_blob=([0-9a-f]{40}); sha256=([0-9a-f]{64}); bytes=(\d+)'
match = next((re.search(pattern, n['message']) for n in notices if re.search(pattern, n['message'])), None)
if not match:
    raise SystemExit('The successful run has no APK mirror notice. Download the official Actions artifact instead.')
blob_sha, digest, size = match.groups()
blob = api(f'repos/{REPO}/git/blobs/{blob_sha}')
assert blob['encoding'] == 'base64'
apk = base64.b64decode(blob['content'])
assert len(apk) == int(size) and hashlib.sha256(apk).hexdigest() == digest
assert hashlib.sha1(b'blob ' + str(len(apk)).encode() + b'\0' + apk).hexdigest() == blob_sha
out = ROOT / 'deliverables'
out.mkdir(exist_ok=True)
apk_path = out / 'CareSphere-Android.apk'
apk_path.write_bytes(apk)
with zipfile.ZipFile(apk_path) as z:
    assert z.testzip() is None
    assert 'AndroidManifest.xml' in z.namelist() and 'classes.dex' in z.namelist()

paths = [ROOT / p for p in command('git', 'ls-files', 'ios', 'android').splitlines()]
paths += [ROOT / p for p in ['DOWNLOAD.md', 'docs/signing-troubleshooting.md',
    'docs/ios-device-test-plan.md', 'docs/activities-and-accessibility.md', 'scripts/android_smoke.py']]
manifest = {
    'source_commit': command('git','rev-parse','HEAD').strip(),
    'ios': {'version':'3.0.0 (7)', 'ci':ios['url'], 'tested_commit':ios['headSha'],
        'unsigned_device_build': True, 'healthkit_build': True, 'simulator_launch': True,
        'tests':20, 'physical_device_tested':False, 'apple_intelligence_on_hardware_tested':False},
    'android': {'version':'1.0.0 (1)', 'ci':android['url'], 'tested_commit':android['headSha'],
        'tests':8, 'lint':'passed', 'apk_signing_verified_in_ci':True,
        'emulator_smoke':'passed', 'debuggable':True, 'physical_ble_tested':False,
        'apk_sha256':digest, 'apk_bytes':len(apk)},
    'files': {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},
}
start = '''CARESPHERE — ANDROID + IPHONE

ANDROID (Android 8 or newer)
Open CareSphere-Android.apk on your Android phone and review the installation prompt.
If required, temporarily allow installs from that specific Files/browser app; keep
Play Protect enabled. This is a debug-signed development build, not a Play Store
release. Do not store sensitive production data in this debuggable build.

IPHONE
A source ZIP cannot install directly on an iPhone.
On a Mac, open ios/CareSphere.xcodeproj. Select CareSphere + iPhone Simulator first.
For a physical iPhone choose your own signing team and the phone, then Run.
Use Xcode 26+ for Apple Intelligence; baseline app supports iOS 16+.
CareSphere-HealthKit is an optional scheme requiring an eligible HealthKit profile.
No remote Swift packages or XcodeGen are needed.
Repeated codesign password prompt? Cancel it and read docs/signing-troubleshooting.md.
Never share passwords or reset/delete your keychain indiscriminately.

WHAT'S REAL
Routines, notes, and mood choices are entered by you. No prefilled people or vital signs.
Heart rate appears only from a real monitor (or optional Apple Health history on iOS).
Apple Intelligence uses Apple's on-device framework only on supported iPhones with
it enabled and ready. Android has no Apple Intelligence and no fake substitute.
Eleven optional activities on each platform. Android is a first native release,
not full iOS feature parity. See android/README.md and ios/README.md for exact scope.

VALIDATION
See BUILD_VERIFICATION.json for successful CI runs and file hashes.
iOS: 20 logic/packet tests; standard device, HealthKit and Simulator builds; launch.
Android: 8 tests, lint, APK signature check, emulator install/basic interaction checks.
Real-device BLE, actual Apple Intelligence responses, accessibility with users, and
Mac signing remain manual acceptance work. No clinical effectiveness is claimed.

START_HERE.txt and DOWNLOAD.md explain installation. No slide deck is included.
'''
archive = out / 'CareSphere-Mobile.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for p in paths:
        z.write(p, 'CareSphere-Mobile/' + str(p.relative_to(ROOT)))
    z.write(apk_path, 'CareSphere-Mobile/' + apk_path.name)
    z.writestr('CareSphere-Mobile/START_HERE.txt', start)
    z.writestr('CareSphere-Mobile/BUILD_VERIFICATION.json', json.dumps(manifest,indent=2)+'\n')
with tempfile.TemporaryDirectory() as tmp, zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    z.extractall(tmp)
    unpacked = Path(tmp) / 'CareSphere-Mobile'
    for path, sha in manifest['files'].items():
        assert hashlib.sha256((unpacked/path).read_bytes()).hexdigest() == sha
    assert hashlib.sha256((unpacked/apk_path.name).read_bytes()).hexdigest() == digest
    subprocess.run(['python3',str(unpacked/'ios/scripts/check_project.py')],check=True)
    for executable in ['ios/scripts/preflight.sh','android/gradlew']:
        assert (z.getinfo('CareSphere-Mobile/'+executable).external_attr >> 16) & 0o100
for p in [apk_path,archive]:
    sha = hashlib.sha256(p.read_bytes()).hexdigest()
    p.with_name(p.name+'.sha256').write_text(f'{sha}  {p.name}\n')
    print(f'Verified: {p} ({p.stat().st_size:,} bytes) SHA256 {sha}')
