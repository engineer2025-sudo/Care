#!/usr/bin/env python3
"""Exercise the actual debug APK in a CI emulator; never pair or call services."""
import subprocess
import sys
import traceback
import time
import re
import xml.etree.ElementTree as ET
from pathlib import Path

package = 'org.caresphere.android'

def adb(*args):
    return subprocess.check_output(['adb', *args], text=True, stderr=subprocess.STDOUT)

def screen():
    adb('shell', 'uiautomator', 'dump', '/sdcard/window.xml')
    return ET.fromstring(adb('shell', 'cat', '/sdcard/window.xml'))

def find(label, timeout=35):
    end = time.monotonic() + timeout
    attempts = 0
    while time.monotonic() < end:
        tree = screen()
        for node in tree.iter('node'):
            if node.attrib.get('text', '').casefold() == label.casefold():
                return node
        attempts += 1
        if any(n.attrib.get('resource-id') == 'android:id/parentPanel' for n in tree.iter('node')):
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
    try: detail += '\nCRASH LOG: ' + adb('logcat','-d','-s','AndroidRuntime:E')[-8000:]
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

adb('install', '-r', 'android/app/build/outputs/apk/debug/app-debug.apk')
adb('shell', 'pm', 'clear', package)
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
adb('shell', 'am', 'start', '-W', f'{package}/.MainActivity')
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
tap('Today')
adb('shell','am','force-stop',package)
# Leave the emulator with an empty installation, not a saved test routine.
adb('shell','pm','clear',package)
print('PASS: installed APK, empty state, user routine persistence, activity choice, real-only empty vitals, empty notes and navigation.')
