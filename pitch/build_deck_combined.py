#!/usr/bin/env python3
"""All unique slides from the screenshot-led and CAC feature-led decks.

Uses the earlier deck as the backbone. Removes only identical shared slides;
retains the two different everyday-support and demo treatments.
"""
from pathlib import Path
from copy import deepcopy
import build_deck_updated
import build_deck_cac
from deck_engine import Deck, M, CW, WHITE, TEXT, ACCENT
from build_deck_updated import header, card
ROOT=Path(__file__).resolve().parent
# Source slide numbers are one-based, matching the two delivered presentations.
ORDER=[
 ('updated',1,'Title'),
 ('updated',2,'Design challenge'),
 ('updated',3,'Problem'),
 ('cac',2,'Feature overview'),
 ('updated',8,'Audience'),
 ('updated',5,'Five-tab app tour'),
 ('cac',3,'Four games'),
 ('cac',4,'Sensory tools and accessibility'),
 ('cac',5,'Research-informed design'),
 ('updated',4,'Everyday support screenshots'),
 ('cac',6,'Remember, connect and prepare'),
 ('cue',0,'Switch to the running app'),
 ('updated',6,'Full-app demo overview'),
 ('cac',7,'Feature-focused interaction demo'),
 ('updated',7,'Four rules in the code'),
 ('updated',9,'Privacy and external connections'),
 ('updated',10,'Tools and languages'),
 ('updated',11,'Bluetooth coding challenge'),
 ('updated',12,'Progress and next steps'),
 ('cac',12,'Learning'),
 ('updated',13,'Close'),
]
def build():
 sources={'updated':build_deck_updated.build(),'cac':build_deck_cac.build()}
 d=Deck(backdrop='bg-mesh',numeral=True,footer_page=False,transition='fade')
 for source,number,title in ORDER:
  if source=='cue':
   sl=d.slide(transition='push')
   header(sl,'Live app demonstration','Let me show you ==CareSphere in action.==',size=40)
   sl.text(M,2.65,CW,1.0,'Play. Pause. Check in. Prepare.',size=34,color=WHITE,weight=700)
   for i,(title,body) in enumerate([('PLAY','Repeat a pattern and reveal a pair.'),('CHOOSE','Start and stop a soundscape.'),('CHECK IN','Record a mood and complete a routine.'),('PREPARE','Choose fields and preview a visit brief.')]):
    x=M+i*3.0
    card(sl,x,4.15,2.75,1.65)
    sl.text(x+.2,4.4,2.35,.4,title,size=16,color=ACCENT,weight=700)
    sl.text(x+.2,4.95,2.35,.65,body,size=17,color=TEXT)
   sl.text(M,6.35,CW,.4,'Real app interaction · sample data · user-controlled actions',size=17,color=ACCENT)
   sl.notes='SAY: “Now let me show you CareSphere in action, starting with the games.”\nACTION: Switch from the slideshow to the running app (or cut to your actual screen recording). Show this cue for only 2–3 seconds. Do not narrate the next two demo overview slides in the short video; they are rehearsal/reference slides.\nDEMO: Pattern Recall → Picture Pairs → Rain then Stop → mood and routine → visit brief. Allow about 80 seconds.\nRETURN: Resume at combined slide 17 (Tools and languages), followed by 18 (coding challenge), 19 (next steps), and 21 (close). Full timed plan: LIVE_DEMO_PLAN.md. No test result, efficacy or live sensor connection should be invented.'
   continue
  sl=deepcopy(sources[source].slides[number-1])
  sl.deck=d
  sl.notes+='\n\nCOMBINED DECK: '+title+'. Source: '+source+' deck, slide '+str(number)+'. This is a full presentation/reference deck, not a timed three-minute video. Use VIDEO_SCRIPT_CAC.md for the short submission edit.'
  d.slides.append(sl)
 return d
if __name__=='__main__':
 d=build()
 d.write_pptx(ROOT/'CareSphere_Combined_Deck.pptx')
 d.write_previews(ROOT/'preview-combined')
 for warning in d.warnings:print('WARNING:',warning)
 print('Built',len(d.slides),'slides')
