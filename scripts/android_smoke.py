#!/usr/bin/env python3
"""Exercise the actual debug APK in a CI emulator; never pair or call services."""
import subprocess
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

def find(label, timeout=15):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        tree = screen()
        for node in tree.iter('node'):
            if node.attrib.get('text') == label:
                return node
        time.sleep(.5)
    raise AssertionError(f'UI text not found: {label}')

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
adb('shell','input','text','Take%sa%squiet%sbreak')
tap('Save')
find('Take a quiet break')
adb('shell', 'am', 'force-stop', package)
adb('shell', 'am', 'start', '-W', f'{package}/.MainActivity')
find('Take a quiet break')
tap('Activities')
tap('Sort together')
tap('Apple')
# Feedback may be below the fold on a small emulator; scroll within the content.
adb('shell','input','swipe','400','1600','400','700','300')
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
