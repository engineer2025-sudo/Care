"""Frame genuine mobile web captures; no synthetic app UI or generated imagery."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import zipfile, hashlib, json
ROOT=Path(__file__).resolve().parent
SRC=ROOT/'tools/out-gallery'
DEST=ROOT.parent/'deliverables/CareSphere_iPhone_Screenshots'
DEST.mkdir(parents=True,exist_ok=True)
FONT=ROOT/'fonts/PlusJakartaSans-Bold.ttf'
files=sorted(SRC.glob('[0-9][0-9]-*.png'))
assert len(files)==36
manifest=[]
for f in files:
    raw=Image.open(f).convert('RGBA')
    assert raw.size==(1170,2532)
    W,H=1370,2880
    im=Image.new('RGBA',(W,H))
    shadow=Image.new('RGBA',(W,H)); d=ImageDraw.Draw(shadow)
    d.rounded_rectangle((58,32,1312,2840),radius=180,fill=(0,0,0,100))
    im.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))
    d=ImageDraw.Draw(im)
    # Neutral titanium rim, black bezel and drawn side buttons.
    for box in [(42,510,60,670),(42,710,60,870),(1310,630,1328,900)]:
        d.rounded_rectangle(box,7,fill='#626976')
    d.rounded_rectangle((52,22,1318,2838),175,fill='#717985')
    d.rounded_rectangle((58,28,1312,2832),170,fill='#252932',outline='#A2A8B0',width=2)
    d.rounded_rectangle((70,40,1300,2820),160,fill='#030507')
    # Screenshot is unaltered; device status area is outside the capture.
    screen=Image.new('RGBA',(1170,2730),'#080e18')
    screen.alpha_composite(raw,(0,112))
    dr=ImageDraw.Draw(screen)
    font=ImageFont.truetype(str(FONT),38)
    dr.text((72,32),'9:41',font=font,fill='white')
    dr.rounded_rectangle((410,20,760,94),37,fill='#000000')
    dr.ellipse((710,45,734,69),fill='#111B29')
    for i in range(4):dr.rounded_rectangle((902+i*13,61-i*8,910+i*13,76),3,fill='white')
    dr.arc((966,43,1009,81),208,332,fill='white',width=5)
    dr.ellipse((984,72,990,78),fill='white')
    dr.rounded_rectangle((1030,44,1097,76),8,outline='white',width=3)
    dr.rounded_rectangle((1036,50,1088,70),3,fill='white')
    dr.rectangle((1099,54,1104,66),fill='white')
    dr.rounded_rectangle((410,2694,760,2707),7,fill='white')
    mask=Image.new('L',screen.size);ImageDraw.Draw(mask).rounded_rectangle((0,0,1169,2729),125,fill=255)
    im.paste(screen,(100,80),mask)
    im.save(DEST/f.name,optimize=True)
    manifest.append({'file':f.name,'source_sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'source':'Real CareSphere mobile web UI; seeded sample data','size':[W,H]})
# Printable/browsable index, not counted among the 36 screenshots.
thumbW,thumbH=228,480
sheet=Image.new('RGB',(6*270,6*550+90),'#0B1733');d=ImageDraw.Draw(sheet)
d.text((30,22),'CareSphere | 36 real app captures',font=ImageFont.truetype(str(FONT),30),fill='white')
for i,f in enumerate(files):
    im=Image.open(DEST/f.name);im.thumbnail((thumbW,thumbH))
    x=(i%6)*270+21;y=(i//6)*550+85
    sheet.paste(im,(x,y),im)
    label=f.stem.replace('-',' ')
    # Two short lines preserve readability.
    words=label.split();lines=['']
    for word in words:
        if len(lines[-1])+len(word)>24:lines.append('')
        lines[-1]+=(' ' if lines[-1] else '')+word
    d.multiline_text((x,y+483),'\n'.join(lines),font=ImageFont.truetype(str(FONT),14),fill='#D7E0F2',spacing=3)
sheet.save(DEST/'00-Visual-Index.jpg',quality=90)
(DEST/'README.txt').write_text('''CareSphere — iPhone-framed screenshot collection

36 numbered PNGs, 1370 x 2880 pixels, transparent backgrounds.
00-Visual-Index.jpg lets you browse the whole collection.

These are genuine screenshots of the running CareSphere React web app
at a 390 x 844 mobile viewport, captured at 3x resolution. They are NOT
native SwiftUI/iOS screenshots. The iPhone-style device frame, status
bar and home indicator were drawn in Python, outside the app capture.
No AI-generated imagery or fabricated app screens were used.

Names, medications, notes and mood history are fictional sample data.
Vital readings in screenshots 26–27 are explicitly simulated, not sensor
measurements. SOS is shown without placing calls. No video meeting was
joined. No real patient information is included.

Coverage: overview, mood, routines, medications, activities, breathing,
soundscapes, feelings, pattern recall, pairs, story, Coffee Circles,
care notes, local summary, visit brief, vitals, settings, SOS, light
appearance and high contrast.

Manifest.json records source-capture SHA-256 hashes for provenance.
Project: https://github.com/engineer2025-sudo/Care
''')
(DEST/'Manifest.json').write_text(json.dumps(manifest,indent=2))
zpath=DEST.parent/'CareSphere_iPhone_Screenshots_36.zip'
with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for f in sorted(DEST.iterdir()):z.write(f,arcname=DEST.name+'/'+f.name)
with zipfile.ZipFile(zpath) as z:
    assert z.testzip() is None
    assert len([n for n in z.namelist() if n.endswith('.png')])==36
print(zpath,round(zpath.stat().st_size/1024/1024,1),'MiB; 36 PNGs validated')
