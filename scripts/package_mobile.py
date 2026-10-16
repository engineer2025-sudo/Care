#!/usr/bin/env python3
"""Package verified native/web sources and fetch the matching CI-built Android APK.
Usage: python3 scripts/package_mobile.py --ios-run RUN --android-run RUN --web-run RUN
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

LOCALIZATION_PATHS = ['localization', 'scripts/generate_localizations.py', 'src/locales/interface.json',
    'ios/ActivityKit/Sources/CareActivityKit/Resources/InterfaceTranslations.json', 'android/app/src/main/assets/interface.json']

WEB_PATHS = ['src', 'public', 'test', 'e2e', 'e2e-offline', 'package.json', 'package-lock.json',
    'index.html', 'vite.config.js', 'postcss.config.js', 'tailwind.config.js',
    'playwright.config.js', 'playwright.offline.config.js', '.github/workflows/web.yml', *LOCALIZATION_PATHS]

def verified_run(run_id, *directories):
    directory = ', '.join(directories)
    # Native README updates do not change the compiled app. Their exact bytes
    # are still recorded in the release manifest. Never exclude native source.
    checked_paths = [*directories, ':(exclude)ios/README.md', ':(exclude)android/README.md']
    run = json.loads(command('gh', 'run', 'view', run_id, '--json', 'status,conclusion,headSha,url,jobs'))
    if run['status'] != 'completed' or run['conclusion'] != 'success':
        raise SystemExit(f'{directory} CI must finish successfully before packaging: {run["url"]}')
    if command('git', 'diff', run['headSha'], 'HEAD', '--', *checked_paths).strip():
        raise SystemExit(f'{directory} source differs from the successful CI source.')
    if command('git', 'status', '--porcelain', '--', *checked_paths).strip():
        raise SystemExit(f'{directory} has unverified working-tree changes.')
    return run

parser = argparse.ArgumentParser()
parser.add_argument('--ios-run', required=True)
parser.add_argument('--android-run', required=True)
parser.add_argument('--web-run', required=True)
args = parser.parse_args()
ios = verified_run(args.ios_run, 'ios', '.github/workflows/ios.yml', *LOCALIZATION_PATHS)
android = verified_run(args.android_run, 'android', 'scripts/android_smoke.py', '.github/workflows/android.yml', *LOCALIZATION_PATHS)
web = verified_run(args.web_run, *WEB_PATHS)
release_commit = command('git', 'rev-parse', 'HEAD').strip()
subprocess.run(['python3','scripts/generate_localizations.py','--check'],cwd=ROOT,check=True)
subprocess.run(['npm', 'ci'], cwd=ROOT, check=True)
subprocess.run(['npm', 'run', 'build'], cwd=ROOT, check=True)

# Retrieve the run's unreferenced artifact mirror. Never create a branch/tag.
notices = []
for job in android['jobs']:
    notices.extend(api(f'repos/{REPO}/check-runs/{job["databaseId"]}/annotations?per_page=100'))
pattern = r'git_blob=([0-9a-f]{40}); sha256=([0-9a-f]{64}); bytes=(\d+)'
match = next((re.search(pattern, n['message']) for n in notices if n.get('title') == 'Verified Android APK' and re.search(pattern, n['message'])), None)
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
    assert z.read('assets/interface.json') == (ROOT/'android/app/src/main/assets/interface.json').read_bytes()

paths = [ROOT / p for p in command('git', 'ls-files', 'ios', 'android', *LOCALIZATION_PATHS).splitlines()]
paths += [ROOT / p for p in ['DOWNLOAD.md', 'docs/signing-troubleshooting.md',
    'docs/local-data-encryption.md', 'docs/feature-checklist.md', 'docs/samsung-install.md', 'docs/android-release-signing.md', 'docs/release-parity-2026-10-14.md', 'docs/release-lock-2026-10-14.md', 'docs/release-receipts-2026-10-15.md', 'docs/release-manual-vitals-2026-10-16.md', 'docs/release-android-parity-2026-10-16.md', 'docs/ios-device-test-plan.md', 'docs/activities-and-accessibility.md', 'docs/release-2026-10-14.md',
    'docs/web-deployment.md', 'docs/device-sharing.md', 'docs/personal-tools.md', 'docs/languages.md', 'scripts/android_smoke.py']]
project = (ROOT/'ios/CareSphere.xcodeproj/project.pbxproj').read_text()
assert set(re.findall(r'MARKETING_VERSION = "([^"]+)"', project)) == {'3.7.0'}
assert set(re.findall(r'CURRENT_PROJECT_VERSION = "([^"]+)"', project)) == {'16'}
gradle = (ROOT/'android/app/build.gradle.kts').read_text()
assert re.search(r'versionName\s*=\s*\"1\.8\.0\"', gradle)
assert re.search(r'versionCode\s*=\s*10\b', gradle)
assert json.loads((ROOT/'package.json').read_text())['version'] == '1.5.0'
assert len(json.loads((ROOT/'src/locales/interface.json').read_text())) == 738
language_manifest = {'languages':['en','es','zh-Hans','fil','vi'], 'messages':738,
    'offline_catalog':True, 'persistent_selector':True, 'automatic_patient_text_translation':False,
    'english_fallback_for_untranslated_content':True, 'complete_interface_translation':False,
    'professional_linguistic_review':False, 'physical_multilingual_speech_tested':False}
manifest = {
    'source_commit': command('git','rev-parse','HEAD').strip(),
    'ios': {'version':'3.7.0 (16)', 'ci':ios['url'], 'tested_commit':ios['headSha'],
        'unsigned_device_build': True, 'healthkit_build': True, 'simulator_launch': True,
        'tests':54, 'physical_device_tested':False, 'apple_intelligence_on_hardware_tested':False},
    'android': {'version':'1.8.0 (10)', 'ci':android['url'], 'tested_commit':android['headSha'],
        'tests':60, 'lint':'passed', 'apk_signing_verified_in_ci':True,
        'emulator_smoke':'passed', 'five_language_ui_smoke':'passed', 'debuggable':True, 'physical_ble_tested':False,
        'medication_reminders':'inexact local alarms; physical Samsung timing unverified', 'health_connect':'read-only foreground; real-device data grants unverified', 'owner_release_signed':False, 'app_lock':'Android 11+ system strong biometric/device credential; screen gate, not biometric-bound key', 'snooze':'same-day ten-minute review reminder; inexact delivery', 'apk_sha256':digest, 'apk_bytes':len(apk)},
    'device_sharing': {'app_backend_required':False, 'mode':'native direct LAN plus encrypted-file snapshots',
        'web_to_android_emulator_import':'passed', 'physical_nearby_delivery_tested':False,
        'bluetooth_phone_pairing':False, 'hosted_backend_required':False, 'temporary_phone_listener':True, 'native_manual_lan_connection':True,
        'opt_in_local_discovery':True, 'discovery_protocol':'DNS-SD _care-xfer._tcp.',
        'android_nsd_instrumentation':'passed', 'physical_cross_device_discovery_tested':False, 'android_emulator_lan_receive_import':'passed', 'automatic_sync':False, 'remote_revocation':False},
    'new_native_qr':'display and decode selected photo; no live camera scanner',
    'authenticated_import_receipts':False,
    'interface_localization':language_manifest,
    'compiled_source_comparison_excludes': ['ios/README.md', 'android/README.md'],
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

LANGUAGES
Settings > App language: English, Spanish, Simplified Chinese, Filipino/Tagalog
and Vietnamese. Offline core-interface translations; advanced content can remain
English. Your own care records are not translated. See docs/languages.md.
Translations require fluent-speaker and safety review before production use.

WHAT'S REAL
Routines, notes, and mood choices are entered by you. No prefilled people or vital signs.
Heart rate appears only from a real monitor (or optional Apple Health history on iOS).
Apple Intelligence uses Apple's on-device framework only on supported iPhones with
it enabled and ready. Android has no Apple Intelligence: Visit summary uses a clearly labeled non-AI template.
Android adds confirmed inexact medication reminders and read-only Health Connect
history, plus manually entered BP/oxygen with source labels. Android 11+ supports
optional app lock with system authentication and screenshot protection. Medication
reminders have same-day ten-minute snooze/cancel. See docs/samsung-install.md.
Eleven optional activities with search/favorites on each platform. Search and edit
care notes with confirmed deletion. Android is a native development release,
not full iOS feature parity. See android/README.md and ios/README.md for exact scope.

VALIDATION
See BUILD_VERIFICATION.json for successful CI runs and file hashes.
iOS 3.7.0 (16): 54 logic/preference/packet/transfer/LAN/discovery/language/vitals tests; standard device, HealthKit and Simulator builds; launch.
Android 1.8.0 (10): 60 tests, lint, APK signature check, emulator checks for favorites, editing, persistence, dark/large text, and browser-to-Android encrypted file import.
Real-device BLE, actual Apple Intelligence responses, accessibility with users, and
Mac signing remain manual acceptance work. No clinical effectiveness is claimed.

PERSONAL SUPPORT + DEVICE SHARING
Simple Mode, visual routines, communication cards, personal photo activities,
contacts, appointment questions, comfort preferences, recovery/backup and interest
prompts are in My support tools. Optional AI drafting is native iPhone-only.
No hosted backend is needed: select notes/routines and prepare an encrypted copy.
Native phones: join the same private Wi-Fi/hotspot, choose Offer to a nearby device,
then enter its address and eight-digit code inside the receiving app. Keep both
apps open. Choose Find nearby devices to select the sender label instead of typing
its address. The encryption passphrase is separate. Discovery is opt-in; labels
are not verified identities and no records are automatically imported.
Alternatively use AirDrop/Quick Share/the system share sheet or save the file. Receive through the
file picker, unlock, preview, then choose copies to import. Tell the recipient the
passphrase separately. No built-in Bluetooth pairing, live sync or remote revocation.
Read docs/device-sharing.md and docs/personal-tools.md before using these features.
The full implemented/limited/missing list is docs/feature-checklist.md. Native QR
setup reads chosen photos, not a live camera. There are no authenticated import receipts.
The separate CareSphere-Web.zip contains web 1.5.0 source and a built website.
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
web_paths = [ROOT / p for p in command('git', 'ls-files', *WEB_PATHS).splitlines()]
web_paths += [ROOT/'docs/feature-checklist.md', ROOT/'docs/release-parity-2026-10-14.md', ROOT/'docs/release-lock-2026-10-14.md', ROOT/'docs/release-receipts-2026-10-15.md', ROOT/'docs/release-manual-vitals-2026-10-16.md', ROOT/'docs/release-android-parity-2026-10-16.md', ROOT/'docs/web-deployment.md', ROOT/'docs/release-2026-10-14.md', ROOT/'docs/device-sharing.md', ROOT/'docs/personal-tools.md', ROOT/'docs/languages.md']
web_files = {str(p.relative_to(ROOT)):p for p in web_paths}
web_files.update({'production/'+str(p.relative_to(ROOT/'dist')):p for p in (ROOT/'dist').rglob('*') if p.is_file()})
web_manifest = {
    'interface_localization':language_manifest,
    'version':'1.5.0', 'source_commit':command('git','rev-parse','HEAD').strip(),
    'ci':web['url'], 'tested_commit':web['headSha'],
    'unit_tests':45, 'browser_tests':31, 'offline_production_tests':1,
    'audit_known_vulnerabilities':0, 'audit_date':'2026-10-14',
    'production_build':'rebuilt locally from verified source with the locked dependencies',
    'node':command('node','--version').strip(),
    'physical_ble_tested':False, 'physical_nearby_delivery_tested':False, 'app_backend_required':False,
    'files':{name:hashlib.sha256(p.read_bytes()).hexdigest() for name,p in web_files.items()},
}
web_archive = out/'CareSphere-Web.zip'
with zipfile.ZipFile(web_archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for name, path in web_files.items(): z.write(path, 'CareSphere-Web/'+name)
    z.writestr('CareSphere-Web/START_HERE.txt', """CARESPHERE WEB 1.5.0

App language: English, Spanish, Simplified Chinese, Filipino/Tagalog, Vietnamese.
Offline core-interface translations, with English fallback. Personal records
are not translated. Read docs/languages.md for coverage and review limitations.

DEVELOP: Node.js 20.19+ or 22.12+, then npm ci and npm run dev.
HOST: Upload the CONTENTS of production/ to a static HTTPS site's root.
Do not double-click index.html or use file://. See docs/web-deployment.md.

Eleven optional activities, private favorites, searchable/editable notes, routines,
mood check-ins, user-confirmed medication schedules, and real BLE where supported.
No health readings or pretend contacts are generated. Not a medical device.
Offline features require a completed first online installation. Video and links
need internet. Installation and Bluetooth support depend on the browser/OS.
My support tools includes personal routines/photos/communication, questions,
recovery/backup and backend-free device sharing. Select notes/routines, protect
an encrypted file with a passphrase, then use the share sheet or save/send it.
Receive through the file picker, unlock and preview before importing. Copies
cannot be remotely revoked. Read docs/device-sharing.md and docs/personal-tools.md.
Native iPhone/Android projects are in the separate CareSphere-Mobile.zip.

BUILD_VERIFICATION.json lists successful CI and hashes of source/production files.
No accounts, personal records, keys, node_modules or native installers are included.
""")
    z.writestr('CareSphere-Web/BUILD_VERIFICATION.json',json.dumps(web_manifest,indent=2)+'\n')
with zipfile.ZipFile(web_archive) as z:
    assert z.testzip() is None
    for path,sha in web_manifest['files'].items():
        assert hashlib.sha256(z.read('CareSphere-Web/'+path)).hexdigest() == sha
assert command('git','rev-parse','HEAD').strip() == release_commit, 'Source commit changed during packaging; run again.'
checked = ['ios', 'android', 'scripts/android_smoke.py', '.github/workflows/ios.yml', '.github/workflows/android.yml', *WEB_PATHS,
    ':(exclude)ios/README.md', ':(exclude)android/README.md']
assert not command('git','status','--porcelain','--',*checked).strip(), 'Source changed during packaging; run again.'
for p in [apk_path,archive,web_archive]:
    sha = hashlib.sha256(p.read_bytes()).hexdigest()
    p.with_name(p.name+'.sha256').write_text(f'{sha}  {p.name}\n')
    print(f'Verified: {p} ({p.stat().st_size:,} bytes) SHA256 {sha}')
