#!/usr/bin/env python3
"""Exercise the debug APK only in an emulator, using public local test fixtures."""
import subprocess
import http.server
import threading
import sys
import traceback
import time
import re
import xml.etree.ElementTree as ET
from pathlib import Path

package = 'org.caresphere.android'

def adb(*args):
    timeout = 300 if 'instrument' in args else 45
    try:
        return subprocess.check_output(['adb', *args], text=True, stderr=subprocess.STDOUT, timeout=timeout)
    except subprocess.TimeoutExpired as error:
        partial=error.output.decode(errors='replace') if isinstance(error.output,bytes) else str(error.output or '')
        raise RuntimeError(f'ADB {args!r} timed out. Partial instrumentation output: {partial[-6000:]}') from error
    except subprocess.CalledProcessError as error:
        raise RuntimeError(f'ADB {args!r} failed: {error.output[-4000:]}') from error

def screen():
    adb('shell', 'uiautomator', 'dump', '/sdcard/window.xml')
    return ET.fromstring(adb('shell', 'cat', '/sdcard/window.xml'))

def wake():
    """CI emulator only: wake the display and clear a non-secure keyguard.
    A sleeping screen produces empty UI dumps (seen in run 38677847508)."""
    adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
    time.sleep(.3)
    adb('shell', 'wm', 'dismiss-keyguard')
    time.sleep(.3)

def wait_text(label, timeout=8):
    """Like find() but never swipes: safe inside system picker drawers/dialogs."""
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        tree = screen()
        candidates = [n for n in tree.iter('node') if n.attrib.get('text', '').casefold() == label.casefold() or n.attrib.get('content-desc', '').casefold() == label.casefold()]
        if candidates:
            return next((n for n in candidates if n.attrib.get('clickable') == 'true'), candidates[0])
        time.sleep(.4)
    return None

def tap_node(node):
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.attrib['bounds']))
    adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))
    time.sleep(.5)

def pick_download_file(label, rounds=4):
    """ACTION_OPEN_DOCUMENT can land in Recents or Downloads, and the roots drawer
    overlays the list. Navigate deliberately and never swipe while the drawer may
    be open (a swallowed half-navigation failed run 38856641143)."""
    for _ in range(rounds):
        if wait_text(label, 5) is not None:
            tap(label)
            return
        drawer = wait_text('Show roots', 4)
        if drawer is not None:
            tap_node(drawer)
            downloads = wait_text('Downloads', 5)
            if downloads is not None:
                tap_node(downloads)
                time.sleep(1)
                try:
                    tap(label)
                    return
                except AssertionError:
                    continue
    raise AssertionError(f'File picker never showed {label}')

def find(label, timeout=35):
    end = time.monotonic() + timeout
    attempts = 0
    while time.monotonic() < end:
        tree = screen()
        candidates = [n for n in tree.iter('node') if n.attrib.get('text', '').casefold() == label.casefold() or n.attrib.get('content-desc', '').casefold() == label.casefold()]
        if candidates:
            return next((n for n in candidates if n.attrib.get('clickable') == 'true'), candidates[0])
        # File picker return can show an informational success dialog or leave
        # the preview visible directly. Verify persistent UI, not a transient notice.
        messages = {"Unlocked locally. Nothing is saved until you select records and import.",
                    "Imported selected copies. Existing records were not replaced.",
                    "Imported selected copies. An import receipt is ready below."}
        if any(n.attrib.get('text') in messages for n in tree.iter('node')):
            ok = next((n for n in tree.iter('node') if n.attrib.get('text','').casefold() == 'ok'), None)
            if ok is not None:
                x1,y1,x2,y2 = map(int,re.findall(r'\d+',ok.attrib['bounds']))
                adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
                continue
        attempts += 1
        if any(n.attrib.get('resource-id') == 'android:id/parentPanel' for n in tree.iter('node')) and not any(n.attrib.get('class') == 'android.widget.ListView' for n in tree.iter('node')):
            time.sleep(.5)
            continue
        # Find off-screen content using the actual display dimensions, not a
        # hard-coded emulator resolution. Never swipe the persistent nav bar.
        size = re.search(r'(\d+)x(\d+)', adb('shell','wm','size'))
        width,height = map(int, size.groups())
        start,end_y = (int(height*.72), int(height*.3)) if attempts % 6 < 4 else (int(height*.3), int(height*.72))
        adb('shell','input','swipe',str(width//2),str(start),str(width//2),str(end_y),'250')
        time.sleep(.3)
    raise AssertionError(f'UI text not found: {label}')


def failure(kind, value, tb):
    detail = ''.join(traceback.format_exception(kind, value, tb))
    if isinstance(value, subprocess.CalledProcessError): detail += str(value.output)
    try: detail += '\nCURRENT TEXT: ' + repr([(n.attrib.get('text'),n.attrib.get('class')) for n in screen().iter('node') if n.attrib.get('text') and n.attrib.get('package') == package])[-5000:]
    except Exception: pass
    try: detail += '\nALL WINDOWS: ' + repr([(n.attrib.get('text') or n.attrib.get('content-desc') or n.attrib.get('class'), n.attrib.get('package')) for n in screen().iter('node') if n.attrib.get('text') or n.attrib.get('class') == 'android.widget.EditText'])[-5000:]
    except Exception: pass
    try: detail += '\nCRASH LOG: ' + adb('logcat','-d','-s','AndroidRuntime:E')[-8000:]
    except Exception: pass
    try: detail += '\nPOWER: ' + adb('shell','dumpsys power | grep -E "mWakefulness=|mStayOn="')[-500:]
    except Exception: pass
    try: detail += '\nKEYGUARD: ' + adb('shell','dumpsys window | grep -E "isStatusBarKeyguard|KeyguardShowing|mShowingDream"')[-500:]
    except Exception: pass
    print('::error title=Android emulator smoke::' + detail.replace('%','%25').replace('\r','%0D').replace('\n','%0A'))
    traceback.print_exception(kind, value, tb)

sys.excepthook = failure

def tap(label):
    node = find(label)
    coords = list(map(int, re.findall(r'\d+', node.attrib['bounds'])))
    x1,y1,x2,y2 = coords
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
    time.sleep(.4)

if adb('shell','getprop','ro.kernel.qemu').strip() != '1':
    raise SystemExit('Refusing destructive smoke checks: a CI emulator is required, never a physical phone.')

adb('install', '-r', 'android/app/build/outputs/apk/debug/app-debug.apk')
adb('shell', 'pm', 'clear', package)
# Keep the emulator display on for the entire run so later UI dumps are never
# empty because the screen slept (or a keyguard appeared) during long steps.
adb('shell','settings','put','global','stay_on_while_plugged_in','3')
adb('shell','settings','put','system','screen_off_timeout','1800000')
adb('shell','svc','power','stayon','true')
wake()
# Run new security checks first so failures surface before the longer UI suite.
adb('push','android/app/src/test/resources/browser-transfer.caretransfer','/sdcard/Download/CareSphere-test.caretransfer')
# Separate test APK; no test publisher, fixture or debug switch is shipped in the app.
adb('install','-r','android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk')
result = adb('shell','am','instrument','-w','-r',package+'.test/'+package+'.NearbySmokeInstrumentation')
print(result)
assert 'PASS: native DNS-SD publish/discover/resolve' in result and 'INSTRUMENTATION_CODE: -1' in result, result
adb('uninstall',package+'.test')
# Test-only public PIN on an emulator (the destructive physical-device guard is above).
# Never copy these locksettings commands to a user's phone.
def enter_system_test_pin():
        deadline=time.monotonic()+30
        while time.monotonic()<deadline:
            fields=[n for n in screen().iter('node') if n.attrib.get('class')=='android.widget.EditText' and n.attrib.get('package')!=package]
            if fields:
                x1,y1,x2,y2=map(int,re.findall(r'\d+',fields[0].attrib['bounds']))
                adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
                time.sleep(.8)  # let the credential field take focus before typing
                adb('shell','input','text','246810')
                time.sleep(.3)
                adb('shell','input','keyevent','66')
                time.sleep(.8)
                # The system prompt/bouncer dismisses only after accepting the PIN.
                # If it is still up, the input missed: retry instead of failing later.
                if not any(n.attrib.get('class')=='android.widget.EditText' and n.attrib.get('package')!=package for n in screen().iter('node')):
                    return
                continue
            time.sleep(.5)
        raise AssertionError('System device-credential field not found or did not accept the test PIN')
def clear_bouncer_if_any():
    """If a system credential bouncer covers the app (screen slept after the test
    PIN exists), unlock it with the emulator-only test PIN before reading the UI."""
    fields=[n for n in screen().iter('node') if n.attrib.get('class')=='android.widget.EditText' and n.attrib.get('package')!=package]
    if fields:
        enter_system_test_pin()
        time.sleep(.5)
adb('shell','locksettings','set-pin','246810')
try:
    adb('shell','am','force-stop',package)
    wake()
    adb('shell','am','start','-W',f'{package}/.MainActivity')
    clear_bouncer_if_any()
    tap('Settings & privacy')
    tap('Enable app lock')
    enter_system_test_pin()
    find('Disable app lock')
    adb('shell','input','keyevent','3')
    wake()
    adb('shell','am','start','-W',f'{package}/.MainActivity')
    clear_bouncer_if_any()
    find('CareSphere is locked')
    assert not any(n.attrib.get('text') in ['Reminder test only','Settings & privacy','My support tools'] for n in screen().iter('node'))
    tap('Unlock CareSphere')
    adb('shell','input','keyevent','4')
    find('Authentication was cancelled or unavailable. Tap Unlock to try again.')
    find('CareSphere is locked')
    tap('Unlock CareSphere')
    enter_system_test_pin()
    find('Disable app lock')
    # Internal navigation remains usable; an external picker relocks before its result is processed.
    tap('Back to Today')
    tap('My support tools')
    tap('Choose a tool · Start here')
    tap('Device sharing')
    tap('Receive: choose a transfer file')
    tap('Passphrase')
    adb('shell','input','text','cross%sdevice%stest%sphrase')
    tap('Continue')
    pick_download_file('CareSphere-test.caretransfer')
    find('CareSphere is locked')
    assert not any(n.attrib.get('text')=='Preview received copies' for n in screen().iter('node'))
    tap('Unlock CareSphere')
    enter_system_test_pin()
    find('Preview received copies')
    tap('Cancel import')
    tap('Back to CareSphere')
    tap('Settings & privacy')
    find('Disable app lock')
    tap('Disable app lock')
    enter_system_test_pin()
    find('Enable app lock')
finally:
    adb('shell','locksettings','clear','--old','246810')

print('PASS: system credentials, cancel/relock, locked-file return and snooze checks')
adb('shell','am','force-stop',package)
adb('shell','pm','clear',package)
wake()
adb('shell', 'am', 'start', '-W', f'{package}/.MainActivity')
find('Your day, at your pace.')
find('No routines yet. Add something that matters to you.')
tap('Add a routine')
tap('A short reminder')
time.sleep(1)
adb('shell','input','text','Take%sa%squiet%sbreak')
tap('Save')
find('Take a quiet break')
adb('shell', 'am', 'force-stop', package)
wake()
adb('shell', 'am', 'start', '-W', f'{package}/.MainActivity')
find('Take a quiet break')
tap('Settings & privacy')
tap('Remove Take a quiet break')
tap('Continue')
tap('Today')
tap('Undo last routine change')
find('Take a quiet break')
tap('Activities')
tap('Sort together')
tap('Apple')
find("That fits. Continue when you're ready.")
tap('Health')
find('— bpm')
find('No current measurement')
assert not re.search(r'\b\d+ bpm\b', ET.tostring(screen(), encoding='unicode'))
Path('/tmp/android-smoke').mkdir(exist_ok=True)
adb('shell','screencap','-p','/sdcard/health.png')
adb('pull','/sdcard/health.png','/tmp/android-smoke/health.png')
tap('Care')
find('No notes yet')
tap('Activities')
tap('Save Sort together to favorites')
tap('Favorites only')
find('1 activity · available offline')
adb('shell','am','force-stop',package)
wake()
adb('shell','am','start','-W',f'{package}/.MainActivity')
tap('Activities')
tap('Favorites only')
find('1 activity · available offline')
find('Remove Sort together from favorites')
tap('Care')
tap('Write a care note')
tap('What would you like to remember?')
time.sleep(1)
adb('shell','input','text','Remember%sappointment')
tap('Save')
find('Remember appointment')
tap('Edit note')
tap('Remember appointment')
adb('shell','input','keyevent','KEYCODE_MOVE_END')
adb('shell','input','text','%sand%squestions')
tap('Save')
find('Remember appointment and questions')
tap('Delete note')
tap('Cancel')
find('Remember appointment and questions')
# Real UI localization, persistence and unchanged personal records.
tap('Today')
tap('Settings & privacy')
tap('🌐 App language')
tap('Español')
find('Idioma de la aplicación')
tap('Hoy')
tap('Bien')
find('Registro personal de hoy: Bien')
adb('shell','am','force-stop',package)
wake()
adb('shell','am','start','-W',f'{package}/.MainActivity')
find('Registro personal de hoy: Bien')
tap('Cuidado')
find('Remember appointment and questions')
tap('Hoy')
tap('Ajustes y privacidad')
current_label='Idioma de la aplicación'
for choice,label in [('中文（简体）','应用语言'),('Filipino / Tagalog','Wika ng app'),('Tiếng Việt','Ngôn ngữ ứng dụng'),('English','App language')]:
    tap('🌐 '+current_label)
    tap(choice)
    find(label)
    current_label=label
print('PASS: all five interface languages, persisted Spanish choice, unchanged personal care note')
tap('Dark')
find('Dark · selected')
adb('shell','settings','put','system','font_scale','1.6')
time.sleep(2)
adb('shell','am','force-stop',package)
wake()
adb('shell','am','start','-W',f'{package}/.MainActivity')
tap('Health')
find('— bpm')
adb('shell','screencap','-p','/sdcard/health-dark.png')
adb('pull','/sdcard/health-dark.png','/tmp/android-smoke/health-dark.png')
tap('Care')
find('Remember appointment and questions')
adb('shell','settings','put','system','font_scale','1.0')
tap('Today')
tap('My support tools')
tap('Choose a tool · Start here')
tap('Communication')
tap('I need a break')
find('Speak this phrase')
# Do not synthesize audio or contact anyone in unattended CI.
tap('Clear / stop')
tap('Choose a tool · Communication')
tap('Device sharing')
tap('Find nearby devices')
find('Stop searching')
tap('Stop searching')
adb('push','android/app/src/test/resources/browser-transfer.caretransfer','/sdcard/Download/CareSphere-test.caretransfer')
tap('Receive: choose a transfer file')
tap('Passphrase')
time.sleep(1)
adb('shell','input','text','cross%sdevice%stest%sphrase')
tap('Continue')
pick_download_file('CareSphere-test.caretransfer')
find('Preview received copies')
tap('note: Browser transfer test note')
tap('Import selected copies')
tap('Back to CareSphere')
tap('Care')
find('Browser transfer test note')
# Exercise the actual local socket receiver against a bounded, test-only LAN peer.
# 10.0.2.2 is the emulator's private address for the CI host, not a public service.
class LocalPeer(http.server.BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def do_GET(self):
        if self.path != '/care/12345678':
            self.send_error(403)
            return
        body = Path('android/app/src/test/resources/browser-transfer.caretransfer').read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(body)
    def log_message(self, *args):
        pass
peer = http.server.ThreadingHTTPServer(('127.0.0.1', 0), LocalPeer)
threading.Thread(target=peer.serve_forever, daemon=True).start()
try:
    tap('Today')
    tap('My support tools')
    tap('Choose a tool · Start here')
    tap('Device sharing')
    tap('Connect to a nearby device')
    tap('Device address')
    adb('shell','input','text',f'10.0.2.2:{peer.server_port}')
    tap('8-digit connection code')
    adb('shell','input','text','12345678')
    tap('Continue')
    tap('Passphrase')
    adb('shell','input','text','cross%sdevice%stest%sphrase')
    tap('Continue')
    find('Preview received copies')
    tap('routine: Browser transfer test routine')
    tap('Import selected copies')
    tap('Back to CareSphere')
    tap('Today')
    find('Browser transfer test routine')
finally:
    peer.shutdown()
    peer.server_close()
# New screens: empty by default, explicit manual entry, no permission required to review.
tap('Today')
tap('Medication reminders')
find('Reminders paused')
tap('Add medication')
tap('Medication name')
adb('shell','input','text','Reminder%stest%sonly')
tap('Time · HH:mm')
adb('shell','input','text','09:30')
tap('Save')
find('Reminder test only · 09:30')
find('Reminders paused')
tap('Mark taken today')
find('Undo taken check-in')
tap('Back')
tap('Health')
tap('Health history')
tap('Add blood pressure')
tap('Systolic · mmHg')
adb('shell','input','text','120')
tap('Diastolic · mmHg')
adb('shell','input','text','80')
tap('Save')
find('Remove')
assert any('120/80 mmHg' in n.attrib.get('text','') and 'Manually entered' in n.attrib.get('text','') for n in screen().iter('node'))
tap('Back')
adb('shell','am','force-stop',package)

adb('shell','am','force-stop',package)
# Leave the emulator with an empty installation, not a saved test routine.
adb('shell','pm','clear',package)
print('PASS: installed APK, empty state, user routine persistence, activity choice, real-only empty vitals, empty notes, favorites persistence, note editing/delete cancellation, dark appearance, large-text navigation, communication cards, and real web-to-Android encrypted file preview/import, and direct local socket receive/unlock/selective import.')
