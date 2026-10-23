// Second pass: feature-level crops + reminder toast + scrolled phone views.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const mod = require('@sparticuz/chromium');
const chromium = mod.default || mod;

const BASE = 'http://localhost:4173';
const OUT = path.join(__dirname, 'out-gallery');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function dayKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

function seed(withDueMed) {
  const now = new Date();
  const today = dayKey(now);
  const moods = [];
  const scores = [3, 4, 4, 3, 5, 4, 2, 3, 4, 4, 5, 4, 3, 4];
  for (let i = 13; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); moods.push({ date: d.toDateString(), score: scores[13 - i], ts: d.getTime() }); }
  const t = (h, m) => { const d = new Date(now); d.setHours(h, m, 0, 0); return d.toISOString(); };
  const y = (h, m) => { const d = new Date(now); d.setDate(now.getDate() - 1); d.setHours(h, m, 0, 0); return d.toISOString(); };
  const hh = now.getHours(), mm = now.getMinutes();
  const label = `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
  const meds = [
    { id: 'm1', name: 'Lisinopril (10 mg)', time: '8:00 AM', takenOn: today },
    { id: 'm2', name: 'Metformin (500 mg)', time: withDueMed ? label : '12:30 PM', takenOn: null },
    { id: 'm3', name: 'Vitamin D (1000 IU)', time: '6:00 PM', takenOn: null },
  ];
  return {
    settings: { name: 'Rose', textScale: 'md', theme: 'dark', highContrast: false, lowSensory: true, voice: true },
    routines: [
      { id: 1, text: 'Morning hydration 💧', completedOn: today },
      { id: 2, text: '10-minute brain game 🧩', completedOn: today },
      { id: 3, text: 'Join a coffee circle ☕', completedOn: null },
      { id: 4, text: 'Evening stretch & wind-down 🌿', completedOn: null },
      { id: 'walk', text: 'Short walk around the block 🚶', completedOn: today },
    ],
    meds, medsConfirmed: true,
    notes: [
      { id: 1, date: t(9, 12), author: 'You (Rose)', note: 'Slept well. Walked to the mailbox and back without my cane today.' },
      { id: 2, date: y(18, 40), author: 'You (Rose)', note: 'Felt a little dizzy after lunch — want to mention it at Thursday’s visit.' },
      { id: 3, date: y(10, 5), author: 'You (Rose)', note: 'Movie trivia circle was fun. Talked with Elena about gardening.' },
    ],
    moods, emotionScore: 0, bestPattern: 0,
  };
}

async function newPage(browser, vp, data) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.evaluateOnNewDocument((raw) => { try { localStorage.setItem('caresphere.v1', raw); } catch {} }, JSON.stringify(data));
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('main');
  await sleep(600);
  return page;
}
async function clickTab(page, label) {
  await page.evaluate((label) => {
    const navs = Array.from(document.querySelectorAll('nav[aria-label="Main navigation"] button'));
    const visible = navs.filter(b => b.offsetParent !== null && b.textContent.trim() === label);
    (visible[0] || navs.find(b => b.textContent.trim() === label)).click();
  }, label);
  await sleep(500);
  await page.evaluate(() => window.scrollTo(0, 0));
}
async function clickText(page, text, tag = 'button') {
  return page.evaluate((text, tag) => {
    const b = Array.from(document.querySelectorAll(tag)).find(x => x.textContent.includes(text));
    if (b) { b.click(); return true; } return false;
  }, text, tag);
}
// Screenshot the closest card ancestor of an element containing text.
async function shotCard(page, text, file, { ancestorSel = 'div.rounded-3xl, section, div.rounded-2xl', pad = 0 } = {}) {
  const handle = await page.evaluateHandle((text, ancestorSel) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node; const matches = [];
    while ((node = walker.nextNode())) { if (node.textContent.includes(text)) matches.push(node.parentElement); }
    const el = matches.find(e => e.offsetParent !== null) || matches[0];
    if (!el) return null;
    return el.closest(ancestorSel);
  }, text, ancestorSel);
  const el = handle.asElement();
  if (!el) { console.log('NOT FOUND', text); return; }
  await el.evaluate(e => e.scrollIntoView({ block: 'center' }));
  await sleep(350);
  await el.screenshot({ path: path.join(OUT, file) });
  console.log('card', file);
}


fs.mkdirSync(OUT, {recursive:true});
async function main() {
 const browser = await puppeteer.launch({args:[...chromium.args,'--no-sandbox','--hide-scrollbars'], executablePath:await chromium.executablePath(),headless:true,env:{...process.env,LD_LIBRARY_PATH:'/tmp/al2023-lib/lib:/tmp'}});
 const page=await newPage(browser,{width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true},seed(false));
 let n=0; const manifest=[];
 async function shot(name){await sleep(300);const file=String(++n).padStart(2,'0')+'-'+name+'.png';await page.screenshot({path:path.join(OUT,file)});manifest.push(file);console.log(file);}
 async function focus(text){
  const found=await page.evaluate(text=>{const walk=document.createTreeWalker(document.querySelector('main')||document.body,NodeFilter.SHOW_TEXT);let n;while(n=walk.nextNode()){if(n.textContent.includes(text)&&n.parentElement.offsetParent!==null){const e=n.parentElement.closest('div.rounded-3xl,section')||n.parentElement;e.scrollIntoView({block:'start'});window.scrollBy(0,-((document.querySelector('header')?.offsetHeight||0)+12));return true;}}return false;},text);
  if(!found)throw Error('Missing target: '+text);await sleep(200);
 }
 await shot('overview');
 for(const [text,name] of [['Daily mood check-in','mood-check-in'],['Predictable daily routine','daily-routine'],["Today’s medications",'medications']]){
  await focus(text=== "Today’s medications"?"Today's medications":text);await shot(name);
 }
 await clickTab(page,'Activities');await shot('activities');
 for(const [text,name] of [['Guided breathing','breathing-ready'],['Sensory Soundscapes','soundscapes'],['Feelings explorer','feelings'],['Pattern Recall','pattern-ready'],['Picture pairs','picture-pairs'],['Picture story','picture-story']]){await focus(text);await shot(name);}
 await focus('Guided breathing');await clickText(page,'Begin session');await sleep(1200);await shot('breathing-session');
 await focus('Sensory Soundscapes');await clickText(page,'Rain');await shot('rain-soundscape');await clickText(page,'Forest');await shot('forest-soundscape');
 await focus('Pattern Recall');await clickText(page,'Start pattern');await sleep(700);await shot('pattern-session');
 await clickTab(page,'Coffee Circles');await shot('coffee-circles');
 await focus('Morning Sunshine Tea');await shot('morning-circle');
 await focus('How the video works');await shot('video-explainer');
 await clickTab(page,'Care Circle');await shot('care-circle');
 await focus('Care notes');await shot('care-notes');
 await focus('Local check-in summary');await shot('check-in-summary');
 await clickText(page,'Prepare visit brief');await shot('visit-brief-options');
 await page.evaluate(()=>{for(const l of document.querySelectorAll('label')){const c=l.querySelector('input[type="checkbox"]');if(c&&!c.checked&&/Medication reminders|Mood check-ins|Care notes/.test(l.textContent))c.click();}});await shot('visit-brief-selected');
 await page.evaluate(()=>{const e=[...document.querySelectorAll('*')].find(e=>e.textContent.trim()==='Exact file preview');e?.scrollIntoView({block:'center'});});await shot('visit-brief-preview');
 await page.keyboard.press('Escape');
 await clickTab(page,'Vitals & Telehealth');await shot('vitals-unpaired');
 await clickText(page,'Start labeled demo');await sleep(10000);await focus('Heart rate');await shot('heart-rate-simulated');
 await clickText(page,'Generate example (simulated)');await sleep(4600);await focus('Blood oxygen');await shot('oxygen-simulated');
 await focus('How vitals really reach this screen');await shot('vitals-explainer');
 await clickTab(page,'Overview');await page.click('button[aria-label="Settings and accessibility"]');await shot('settings');
 await page.evaluate(()=>{const d=document.querySelector('[aria-labelledby="settings-title"]');d.scrollTop=d.scrollHeight;});await shot('privacy-settings');
 await page.keyboard.press('Escape');await clickText(page,'SOS');await shot('sos-options');await page.keyboard.press('Escape');
 // Actual supported appearance settings, applied via the settings controls.
 await page.click('button[aria-label="Settings and accessibility"]');
 await page.select('select[aria-label="Color appearance"]','light');await page.keyboard.press('Escape');await shot('light-overview');
 await clickTab(page,'Activities');await shot('light-activities');await clickTab(page,'Care Circle');await shot('light-care-circle');
 await clickTab(page,'Overview');await page.click('button[aria-label="Settings and accessibility"]');await page.select('select[aria-label="Color appearance"]','dark');await page.click('button[aria-label="High contrast"]');await page.keyboard.press('Escape');await shot('high-contrast-overview');
 await clickTab(page,'Activities');await shot('high-contrast-activities');
 fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2));await browser.close();
}
main().catch(e=>{console.error(e);process.exit(1)});
