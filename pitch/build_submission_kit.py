#!/usr/bin/env python3
"""Build the recommended 10-slide CAC deck and matching recording-script PDF."""
from pathlib import Path
from copy import deepcopy
import json
from deck_engine import Deck, M, CW, W, WHITE, TEXT, MUTED, ACCENT
from build_deck_updated import header, card, eyebrow
import build_deck_cac
ROOT=Path(__file__).resolve().parent
PPTX=ROOT/'CareSphere_CAC_Final_10_Slides.pptx'
PDF=ROOT/'CareSphere_CAC_Script_and_Recording_Guide.pdf'
SLOTS=[
 ('1','0:00–0:10','Title and purpose',"I'm Arnav Kochar. CareSphere AI combines routines, self-paced activities, human connection and visit preparation for older adults, autistic people and their families."),
 ('2','0:10–0:20','The design problem',"Daily support should not feel like another task. CareSphere brings reminders, low-pressure activities and ways to connect into one predictable place, with the person in control."),
 ('3','0:20–0:32','What the app does',"There are four areas: activities and sensory tools; mood, routines and medication self-check-ins; Coffee Circles for video conversations; and a visit brief made from information you choose."),
 ('4','0:32–0:46','Four self-paced games',"Feelings Explorer has no correct answer. Pattern Recall lets you repeat a sequence. Picture Pairs reveals matching cards, and Picture Story explores a sequence at your pace. All are untimed and unscored."),
 ('5','0:46–0:58','Sensory choice and research',"Breathing and optional soundscapes are user-controlled. Accessibility research informed predictable navigation and sensory choices. Game research is promising but varied; these activities are not validated therapy."),
 ('6','0:58–1:01','Switch to the running app',"Let’s see CareSphere in action."),
 ('APP','1:01–2:21','Real app demonstration',"Here I watch a pattern and repeat it. I can replay or stop. In Picture Pairs, I reveal and compare cards without a countdown. I choose when rain starts and stops. Back on Overview, I record a mood and finish a routine. Coffee Circles provides real Jitsi room links. Before a visit, I select fields for a brief and inspect the exact text. It's user-prepared information, not a verified medical record."),
 ('7','2:21–2:33','Tools, languages and privacy',"The web app uses JavaScript, React and Web Audio. The native iPhone app uses Swift and SwiftUI. Care data is encrypted locally; Jitsi calls and online references use external services."),
 ('8','2:33–2:45','A specific coding challenge',"Old Bluetooth callbacks could update a new session. A generation counter rejects stale callbacks. Each accepted sample stays labeled live or simulated, including when exported."),
 ('9','2:45–2:52','Next step and learning',"Next: co-design and usability testing. A working feature isn't proof of real-world benefit."),
 ('10','2:52–2:56','Close',"CareSphere AI. Everyday support, on your terms. Thank you."),
]
DEMO=[
 ('1:01–1:21','Activities → Pattern Recall','Start pattern, watch the actual pads, repeat the sequence. Continue or replay if needed. Show one genuine interaction loop; do not fake a correct answer.'),
 ('1:21–1:33','Activities → Picture Pairs','Reveal two cards. A mismatch is fine: show the low-pressure interaction rather than pretending it is a match.'),
 ('1:33–1:42','Activities → Soundscapes','Tap Rain, let it play briefly, then Stop. Keep volume comfortable. A pause in narration lets judges hear the effect.'),
 ('1:42–1:55','Overview','Choose a mood and complete a routine. If a medication status is visible, describe it only as a self-report, not a verified dose.'),
 ('1:55–2:01','Coffee Circles','Show a real room and its Join control. Do not imply a call occurred just by showing the link. No need to enter or wait in an empty meeting.'),
 ('2:01–2:21','Care Circle → Prepare visit brief','Select fields; show the exact preview. Download .txt if there is time. Use fictional data; do not export or expose private patient information.'),
]

def build():
    source=build_deck_cac.build().slides
    d=Deck(backdrop='bg-mesh',numeral=True,footer_page=False,transition='fade')
    def copy_slide(sl):
        new=deepcopy(sl);new.deck=d;d.slides.append(new);return new
    # 1 — preserve the original visual identity, put purpose in the narration.
    copy_slide(source[0])
    # 2 — a focused human problem, without conflating autism prevalence with need.
    s=d.slide();header(s,'The design problem','Everyday support. ==Less friction.==',size=40)
    s.text(M,2.25,6.2,1.0,'Care should not feel like another task.',size=31,color=WHITE,weight=700)
    needs=[('A predictable day','Mood check-ins, routines and medication self-check-ins.'),('A low-pressure activity','Self-paced games and sensory choices.'),('A way to connect','Video rooms and a brief you prepare before a visit.')]
    for i,(title,body) in enumerate(needs):
        y=3.65+i*.92
        s.text(M,y,4.9,.38,title,size=22,color=ACCENT,weight=700)
        s.text(M,y+.42,6.2,.42,body,size=17,color=TEXT)
    s.image('phone-overview',8.0,2.15,h=4.65)
    # 3/4 — best existing feature and game slides.
    copy_slide(source[1]);copy_slide(source[2])
    # 5 — merge sensory tools with concise research rationale, not a literature tour.
    s=d.slide();header(s,'Sensory tools · research-informed design','A calmer experience. ==You choose.==',size=38)
    s.image('extra/crop-breathing',M,2.35,w=3.5,h=2.6)
    s.image('crop-soundscapes',M+3.8,2.35,w=3.5,h=2.6)
    s.text(M,5.25,7.3,.5,'Start. Pause. Stop. At your pace.',size=25,color=WHITE,weight=700)
    s.text(M,5.9,7.3,.7,'4–4–6 breathing · four optional soundscapes\nText size, contrast, palette and motion choices.',size=18,color=TEXT,lh=1.3)
    x=8.65;card(s,x,2.35,3.85,4.25)
    s.text(x+.25,2.65,3.35,.65,'Research → design',size=24,color=WHITE,weight=700)
    s.text(x+.25,3.5,3.35,1.3,'AASPIRE: predictable navigation and sensory choice.',size=20,color=ACCENT,weight=700,lh=1.3)
    s.text(x+.25,4.85,3.35,1.2,'Game studies vary. Optional practice and enjoyment — not validated therapy.',size=18,color=TEXT,lh=1.3)
    s.text(M,6.72,CW,.25,'Raymaker et al., 2019 · Alahmari et al., 2023 · Liu et al., 2025. Full references in notes and guide.',size=10.5,color=MUTED)
    # 6 — the only demo handoff.
    s=d.slide(transition='push')
    eyebrow(s,'Live app demonstration',y=1.3)
    s.text(M,2.0,10.7,1.6,'Let me show you\n==CareSphere in action.==',size=50,color=WHITE,weight=800,lh=1.1)
    s.text(M,4.25,CW,.7,'Play → choose → check in → prepare',size=29,color=TEXT,weight=500)
    s.chip(M,5.65,'Real app · sample data',size=13)
    # 7 — required stack information plus an honest boundary around external services.
    s=d.slide();header(s,'Tools, languages and privacy','Two clients. ==Local-first care.==')
    for i,(title,lang,detail) in enumerate([('Web app','JavaScript','React · Vite · Web Audio\nWeb Bluetooth · Web Crypto'),('Native iPhone app','Swift','SwiftUI · HealthKit · CoreBluetooth\nCryptoKit · optional local Health Guide')]):
        x=M+i*6.0;card(s,x,2.4,5.65,2.65)
        s.text(x+.3,2.7,5.05,.45,title,size=25,color=WHITE,weight=700)
        s.text(x+.3,3.3,5.05,.5,lang,size=28,color=ACCENT,weight=700)
        s.text(x+.3,4.02,5.05,.75,detail,size=18,color=TEXT,lh=1.25)
    s.text(M,5.5,CW,.5,'Encrypted local care data. Sharing is deliberate.',size=25,color=WHITE,weight=700)
    s.text(M,6.15,CW,.45,'Jitsi calls and online references use external services. The screenshots shown are the web app.',size=17,color=MUTED)
    # 8 — readable coding proof rather than tiny code or line-count claims.
    s=d.slide();header(s,'Programming challenge','Old connection. ==Wrong reading? Not here.==',size=36)
    s.text(M,2.3,5.5,1.0,'A late Bluetooth callback could update a newer session.',size=26,color=WHITE,weight=700)
    for i,(title,body) in enumerate([('Reject stale sessions','A generation counter checks which connection owns the callback.'),('Keep the source honest','Every accepted sample is labeled LIVE_BLE or SIMULATED.')]):
        y=3.8+i*1.35
        s.text(M,y,5.5,.45,title,size=23,color=ACCENT,weight=700)
        s.text(M,y+.55,5.5,.65,body,size=18,color=TEXT,lh=1.25)
    card(s,7.0,2.45,5.5,3.7)
    s.text(7.35,2.8,4.8,.35,'src/App.jsx · excerpt',size=13,color=ACCENT,mono=True)
    s.text(7.35,3.55,4.8,1.2,['if (generation !==','    hrConnectionGenerationRef.current)', '  return'],size=15,color=TEXT,mono=True,lh=1.6)
    s.text(7.35,5.2,4.8,.6,'Current session only.\nSource labels remain in exports.',size=18,color=WHITE,weight=700)
    # 9 — one clear next step, no release timeline or unsupported outcomes.
    s=d.slide();header(s,'What comes next','Build with people. ==Then evaluate.==')
    for i,(title,body) in enumerate([('Co-design','Invite intended users and caregivers to review the experience.'),('Usability testing','Observe whether tasks are understandable and comfortable.'),('iPhone beta','Prepare a TestFlight beta after iteration and device testing.')]):
        y=2.4+i*1.25;card(s,M,y,CW,1.05)
        s.text(M+.3,y+.22,3.4,.5,title,size=26,color=WHITE,weight=700)
        s.text(M+4.0,y+.22,7.3,.6,body,size=20,color=TEXT)
    s.text(M,6.4,CW,.5,'Lesson: a working feature is not proof of real-world benefit.',size=21,color=ACCENT,weight=700)
    copy_slide(source[12])
    assert len(d.slides)==10
    numbered=[x for x in SLOTS if x[0]!='APP']
    for sl,entry in zip(d.slides,numbered):
        n,time,title,narration=entry
        sl.notes=f'SLIDE {n} · {time} · {title}\n\nSAY: {narration}\n\nVisuals are real CareSphere web screenshots with fictional sample data, not native iOS screenshots. No AI-generated imagery. No CareSphere clinical efficacy is established.'
        if n=='6':sl.notes+='\nACTION: After this cue, immediately switch to the running app or genuine recorded app interaction for 80 seconds. Return at slide 7. Do not advance through static screenshots instead. See the PDF guide.'
        if n=='5':sl.notes+='\nReferences: https://pmc.ncbi.nlm.nih.gov/articles/PMC6485264/ ; https://pmc.ncbi.nlm.nih.gov/articles/PMC9809031/ ; https://pmc.ncbi.nlm.nih.gov/articles/PMC12781649/ . These studies do not validate these CareSphere activities.'
    return d

def make_pdf():
    from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak,Table,TableStyle,KeepTogether
    from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
    from reportlab.lib.colors import HexColor,white
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib.enums import TA_LEFT
    from xml.sax.saxutils import escape
    for name,file in [('Jakarta','PlusJakartaSans-Regular.ttf'),('JakartaBold','PlusJakartaSans-Bold.ttf')]:
        pdfmetrics.registerFont(TTFont(name,str(ROOT/'fonts'/file)))
    styles=getSampleStyleSheet()
    styles.add(ParagraphStyle(name='TitleCS',fontName='JakartaBold',fontSize=25,leading=32,textColor=HexColor('#0B1733'),spaceAfter=15))
    styles.add(ParagraphStyle(name='HeadCS',fontName='JakartaBold',fontSize=14,leading=19,textColor=HexColor('#0B1733'),spaceBefore=13,spaceAfter=7))
    styles.add(ParagraphStyle(name='BodyCS',fontName='Jakarta',fontSize=10,leading=15,textColor=HexColor('#24344D'),spaceAfter=9))
    styles.add(ParagraphStyle(name='SmallCS',fontName='Jakarta',fontSize=8.2,leading=12,textColor=HexColor('#52617B'),spaceAfter=7,wordWrap='CJK'))
    story=[]
    def p(t,style='BodyCS'):return Paragraph(escape(t).replace('\n','<br/>'),styles[style])
    def add(t,style='BodyCS'):story.append(p(t,style))
    def heading(t):add(t,'HeadCS')
    def page(title):
        if story:story.append(PageBreak())
        add(title,'TitleCS')
    def block(e):
        n,time,title,text=e
        story.append(KeepTogether([p(f'Slide {n} | {time} | {title}','HeadCS'),p(text)]))
    page('CareSphere AI\n10-slide submission kit')
    add('NARRATION SCRIPT + RECORDING GUIDE','HeadCS')
    add('Arnav Kochar · Congressional App Challenge 2026 · CA-10')
    add('Target final video: 2:56. Ten slides plus an 80-second real app demonstration. The four-second margin is intentional; rehearse and check the duration of the exported file, including pauses and transitions.')
    heading('How the video works')
    for line in ['0:00–0:58: Slides 1–5 establish purpose, audience, features, games and design rationale.','0:58–1:01: Slide 6 gives the one clear handoff.','1:01–2:21: Show the running app, not a slideshow. Use the shot plan on page 3.','2:21–2:56: Return to slide 7, then finish slides 8–10.']:
        add(line)
    heading('Files and use')
    add('CareSphere_CAC_Final_10_Slides.pptx is the recommended short deck. Its speaker notes match this script. The 21-slide master remains a backup, not part of this recording. Use Slide Show mode; transitions are click-driven, not automatic.')
    heading('Before saying “I built” or “I learned”')
    add('Use your own voice. Change any phrasing that does not match your actual contribution, understanding or experience. Disclose AI development assistance accurately in the application. Do not invent an origin story, testers, testimonials or clinical outcomes.')
    page('Script | before the app')
    for e in SLOTS[:6]:block(e)
    add('At the end of slide 6: cut or switch immediately to the already-open app. Do not display additional demo-introduction slides.','HeadCS')
    page('Live demonstration | 80 seconds')
    add('Prepare the app in advance. These are editing targets, not rigid waits. Narrate the actual action and result. The app can be recorded separately and edited into the video; do not misrepresent prerecorded footage as a real-time event for judges.')
    for time,where,action in DEMO:
        story.append(KeepTogether([p(time+' | '+where,'HeadCS'),p(action)]))
    heading('Suggested continuous narration')
    add(SLOTS[6][3])
    add('Allow quiet pauses for watching the pattern, seeing feedback and hearing rain. If scrolling takes too long, cut dead time rather than making every action too fast to follow. If the game differs from the narration, describe what really happened.')
    page('Script | after the app')
    for e in SLOTS[7:]:block(e)
    heading('Return cue')
    add('After showing the brief preview, return to slide 7, “Two clients. Local-first care.” Continue to 8, 9 and 10. Do not reopen the longer master deck.')
    heading('What is deliberately omitted')
    add('Repeated tab tours and demo agendas, a full release timeline, long architecture diagrams, population-statistic slides and a separate learning slide. The remaining content answers what the app does and shows it working. Full research references stay in notes and this guide.')
    page('Setup and final checks')
    for title,body in [
      ('1. Prepare the screen','Open the real web app in Chrome or Edge. Use a readable window and font size; hide unrelated tabs and personal notifications. Use fictional sample data, with an editor-added “sample data” caption when appropriate.'),
      ('2. Prepare the interactions','Locate Pattern Recall, Picture Pairs and Soundscapes. Know how to stop audio. Have a routine and fictional care data ready. Open Coffee Circles only to show the real Join control; do not join strangers or imply a call occurred.'),
      ('3. Capture app footage','Record the viewport and cursor with OBS, QuickTime or another local recorder. Use deliberate movements. Do not substitute a slide, fake UI animation or AI-generated imagery for genuine app behavior.'),
      ('4. Protect privacy and safety','Do not call SOS, reveal patient information or show real medication details. Medication status is self-report. Simulated vitals must remain labeled. Native iPhone capabilities require native footage if demonstrated; the deck images are web UI.'),
      ('5. Assemble and rehearse','Record the voice in your own words. Edit the actual actions into the 80-second slot. If anything runs long, trim wording or a secondary action, never claim a result not shown. Check the final export is no more than 3:00.'),
      ('6. Submit','Upload to YouTube or Vimeo as public. Open the link signed out to verify access. Confirm it starts with https. Include the correct public link in the application; the slides alone are not the demonstration submission.')]:
        story.append(KeepTogether([p(title,'HeadCS'),p(body)]))
    page('Sources and honest boundaries')
    add('Official video requirements','HeadCS')
    add('The 2026 rules call for a public 1–3 minute video naming participants and app, giving a clear purpose, identifying the audience and tools/languages, and demonstrating functionality. This is not a video-production competition.')
    add('https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf','SmallCS')
    heading('Research informing the design')
    for title,url,limit in [
      ('Raymaker et al. (2019), AASPIRE web accessibility guidelines.','https://pmc.ncbi.nlm.nih.gov/articles/PMC6485264/','Supports the accessibility design rationale, not clinical efficacy.'),
      ('Alahmari et al. (2023), computer-based games and autism, systematic review.','https://pmc.ncbi.nlm.nih.gov/articles/PMC9809031/','Interventions and study designs vary; findings do not establish benefits of these CareSphere games.'),
      ('Liu et al. (2025), gamified digital health and autism, systematic review/meta-analysis.','https://pmc.ncbi.nlm.nih.gov/articles/PMC12781649/','Trial limitations and differences prevent a claim that CareSphere treats autism or improves cognition.')]:
        add(title);add(url,'SmallCS');add(limit,'SmallCS')
    add('CareSphere activities are optional practice and enjoyment, not validated therapy, screening or cognitive assessment. Game-review interpretation follows docs/activities-and-accessibility.md; this kit is not an independent clinical evidence appraisal.')
    heading('Example-video review')
    add('The structure uses the explicit handoff from CivicBridge and task/action/result patterns found in transcripts of WaterWise, Care Path and Knowledge Knockout. These are district winners/placers, not a national best-video ranking. Full video files or frames were not captured; no third-party footage is included. Detailed analysis: analysis/SLIDE_AND_WINNER_ANALYSIS.md.')
    add('CivicBridge: https://www.youtube.com/watch?v=tKDqnfJMP08\nWaterWise: https://www.youtube.com/watch?v=pPRUIzA1NOU\nCare Path: https://www.youtube.com/watch?v=AUX9_xyljwM\nKnowledge Knockout: https://www.youtube.com/watch?v=87OMof2xB8I','SmallCS')
    def furniture(c,doc):
        c.setFillColor(HexColor('#0B1733'));c.rect(0,0,612,23,fill=1,stroke=0)
        c.setFont('Jakarta',8);c.setFillColor(white);c.drawString(42,9,'CareSphere AI | CAC script + recording guide');c.drawRightString(570,9,str(doc.page))
        c.setFillColor(HexColor('#06E288'));c.rect(42,755,40,4,fill=1,stroke=0)
    doc=SimpleDocTemplate(str(PDF),pagesize=(612,792),rightMargin=42,leftMargin=42,topMargin=48,bottomMargin=42,title='CareSphere AI — Script and Recording Guide',author='CareSphere submission kit')
    doc.build(story,onFirstPage=furniture,onLaterPages=furniture)

def make_markdown():
    s='# CareSphere — final 10-slide narration\n\nTarget: 2:56. App footage replaces the slideshow between slides 6 and 7.\n\n'
    for n,time,title,text in SLOTS:s+=f'## {n} · {time} · {title}\n\n{text}\n\n'
    s+='## Real demonstration action plan\n\n'
    for time,where,action in DEMO:s+=f'- **{time} · {where}:** {action}\n'
    s+='\nSee CareSphere_CAC_Script_and_Recording_Guide.pdf for setup, safety, sources and the complete workflow. Change any personal-contribution or learning statement to match your actual experience.\n'
    (ROOT/'FINAL_10_SLIDE_SCRIPT.md').write_text(s)

if __name__=='__main__':
    d=build();d.write_pptx(PPTX);d.write_previews(ROOT/'preview-final-10')
    make_pdf();make_markdown()
    for w in d.warnings:print('WARNING:',w)
    print('Created 10-slide deck, previews, PDF guide and editable script.')
