#!/usr/bin/env python3
"""CAC-first story: understandable features, activities, evidence and real demo."""
from pathlib import Path
import build_deck_updated as previous
from build_deck_updated import header, card, label
from deck_engine import Deck, M, CW, W, WHITE, TEXT, MUTED, ACCENT
ROOT=Path(__file__).resolve().parent

def build():
    old=previous.build().slides
    d=Deck(backdrop='bg-mesh', numeral=True, footer_page=False, transition='fade')
    d.slides.append(old[0])
    # Purpose and feature map, before any technical detail.
    s=d.slide();header(s,'What the app does','Daily support. ==Play, connect, prepare.==')
    features=[('01','Activities & sensory tools','Four self-paced games, breathing and optional soundscapes.'),
              ('02','Everyday routines','Mood check-ins, daily tasks and medication self-check-ins.'),
              ('03','Human connection','Coffee Circles open Jitsi video rooms; care notes stay local.'),
              ('04','Visit preparation','Choose notes and readings for a previewable visit brief.')]
    for i,(n,t,b) in enumerate(features):
        x=M+(i%2)*6.0;y=2.35+(i//2)*2.0
        card(s,x,y,5.65,1.72)
        s.text(x+.25,y+.2,.5,.4,n,size=14,color=ACCENT,weight=700)
        s.text(x+.85,y+.18,4.5,.45,t,size=23,color=WHITE,weight=700)
        s.text(x+.85,y+.75,4.45,.75,b,size=18,color=TEXT,lh=1.25)
    s.text(M,6.5,CW,.35,'For older adults, autistic people and the families who support them.',size=18,color=ACCENT)
    # Four games: tell judges what the person actually does.
    s=d.slide();header(s,'Core feature · games','Four ways to play. ==At your own pace.==')
    games=[('extra/crop-feelings','Feelings Explorer','Choose how you feel.','No right or wrong answer.'),
           ('extra/crop-pattern','Pattern Recall','Watch, then repeat.','Replay or stop anytime.'),
           ('extra/crop-pairs','Picture Pairs','Reveal matching cards.','No countdown or score.'),
           ('extra/crop-story','Picture Story','Explore a picture sequence.','Advance when ready.')]
    cw=(CW-.66)/4
    for i,(img,title,action,detail) in enumerate(games):
        x=M+i*(cw+.22);card(s,x,2.3,cw,4.35)
        s.text(x+.2,2.55,cw-.4,.65,title,size=20,color=WHITE,weight=700)
        s.image(img,x+.18,3.35,w=cw-.36,h=1.8)
        s.text(x+.2,5.4,cw-.4,.5,action,size=17,color=ACCENT,weight=700)
        s.text(x+.2,5.98,cw-.4,.5,detail,size=15,color=TEXT)
    # Sensory feature shows actual controls, not a list of technical APIs.
    s=d.slide();header(s,'Core feature · sensory choice','A quieter experience. ==On your terms.==')
    s.image('extra/crop-breathing',M,2.35,w=3.7)
    s.image('crop-soundscapes',M+4.0,2.35,w=3.7)
    x=M+8.1
    for i,(t,b) in enumerate([('Breathing','4 seconds in · 4 hold · 6 out. Start and pause yourself.'),('Soundscapes','Rain, ocean, forest and hearth. Sound starts only on request.'),('Accessibility','Text sizes, palette choices, high contrast and reduced motion.')]):
        y=2.4+i*1.4
        s.text(x,y,3.6,.45,t,size=23,color=WHITE,weight=700)
        s.text(x,y+.5,3.6,.85,b,size=17,color=TEXT,lh=1.25)
    # Research claims separated from product evidence.
    s=d.slide();header(s,'Research → design decisions','Research-informed. ==Not clinically validated.==',size=35)
    rows=[('AASPIRE · 2019','Predictability and sensory choice','Consistent navigation, palette options, reduced motion.'),
          ('Game research · 2023 / 2025','Promising findings; varied studies','Optional practice and enjoyment, not treatment.'),
          ('Evidence boundary','No CareSphere efficacy study','Next: co-design and usability evaluation with intended users.')]
    for i,(source,t,b) in enumerate(rows):
        y=2.35+i*1.35;card(s,M,y,CW,1.14)
        s.text(M+.25,y+.18,2.8,.7,source,size=17,color=ACCENT,weight=700)
        s.text(M+3.25,y+.13,8,.4,t,size=23,color=WHITE,weight=700)
        s.text(M+3.25,y+.62,8,.4,b,size=17,color=TEXT)
    s.text(M,6.52,CW,.35,'Sources: Raymaker et al., 2019 · Alahmari et al., 2023 · Liu et al., 2025. Full links in notes.',size=12,color=MUTED)
    # Remaining features with screenshots, explicitly supporting the core activities.
    s=d.slide();header(s,'Beyond activities','Remember. ==Reach someone.== Prepare.')
    for i,(img,t,b) in enumerate([('crop-meds','Remember','Confirm a schedule; mark a reminder taken yourself.'),('extra/crop-circle-card','Reach someone','Join a Coffee Circle in a real Jitsi video room.'),('extra/crop-visitbrief','Prepare','Select what goes into a visit brief and preview the exact text.')]):
        cw=(CW-.6)/3;x=M+i*(cw+.3);card(s,x,2.3,cw,4.35)
        s.text(x+.25,2.52,cw-.5,.45,t,size=25,color=WHITE,weight=700)
        s.text(x+.25,3.08,cw-.5,.9,b,size=17,color=TEXT,lh=1.25)
        s.image(img,x+.25,4.2,w=cw-.5,h=2.15)
    s=d.slide(transition='push');header(s,'Live demonstration','Show the experience. ==Not just the screens.==',size=35)
    s.image('web-overview',M-.2,2.2,w=7.5)
    for i,(t,b) in enumerate([('01 · Play','Repeat a pattern; reveal a picture pair.'),('02 · Choose','Start and stop rain; pause breathing.'),('03 · Check in','Record a mood and complete a routine.'),('04 · Prepare','Select fields; preview the visit brief.')]):
        y=2.35+i*1.05;s.text(8.55,y,4,.4,t,size=21,color=ACCENT,weight=700);s.text(8.55,y+.45,4,.55,b,size=17,color=TEXT)
    # Reuse the existing visual system, local-data architecture and code evidence.
    d.slides.extend([old[8],old[9],old[10],old[11]])
    s=d.slide();header(s,'What this project taught me','Trust is ==a design requirement.==')
    for i,(t,b) in enumerate([('Choice over pressure','Games are untimed and unscored; sound and progression are user-led.'),('Truth over a polished demo','Sensor values stay labeled LIVE_BLE or SIMULATED, including exports.'),('Evidence over promises','Research informs design. Usability and health outcomes still need evaluation.')]):
        y=2.4+i*1.32;card(s,M,y,CW,1.1);s.text(M+.3,y+.18,4.1,.7,t,size=24,color=WHITE,weight=700);s.text(M+4.65,y+.2,6.6,.7,b,size=19,color=TEXT,lh=1.25)
    d.slides.append(old[12])
    # Narration is kept in a matching, independently timed script.
    import re
    script=(ROOT/'VIDEO_SCRIPT_CAC.md').read_text()
    narrations=re.findall(r'<!-- NARRATION -->\n(.*?)\n<!-- /NARRATION -->',script,re.S)
    assert len(narrations)==len(d.slides)==13
    for i,(sl,note) in enumerate(zip(d.slides,narrations)):
        sl.notes=note+'\n\nReal web app screenshots; seeded sample data. No AI-generated imagery. Native iOS features are identified separately. Research does not establish effectiveness of these activities.'
        if i==4:
            sl.notes+='\n\nResearch sources:\nhttps://pmc.ncbi.nlm.nih.gov/articles/PMC6485264/\nhttps://pmc.ncbi.nlm.nih.gov/articles/PMC9809031/\nhttps://pmc.ncbi.nlm.nih.gov/articles/PMC12781649/\nDesign rationale: docs/activities-and-accessibility.md. Games: src/App.jsx. No clinical or cognitive benefits established for CareSphere.'
    return d
if __name__=='__main__':
    d=build();d.write_pptx(ROOT/'CareSphere_CAC_Features_Deck.pptx');d.write_previews(ROOT/'preview-cac')
    for w in d.warnings:print('WARNING:',w)
    print('Built 13-slide CAC feature deck')
