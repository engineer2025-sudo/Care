#!/usr/bin/env python3
"""All unique slides from the screenshot-led and CAC feature-led decks.

Uses the earlier deck as the backbone. Removes only identical shared slides;
retains the two different everyday-support and demo treatments.
"""
from pathlib import Path
from copy import deepcopy
import build_deck_updated
import build_deck_cac
from deck_engine import Deck
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
