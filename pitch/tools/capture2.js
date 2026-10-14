// Second pass: feature-level crops + reminder toast + scrolled phone views.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const mod = require('@sparticuz/chromium');
const chromium = mod.default || mod;

const BASE = 'http://localhost:4173';
const OUT = path.join(__dirname, 'out');
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

async function main() {
  const exe = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-gpu', '--font-render-hinting=none', '--hide-scrollbars'],
    executablePath: exe, headless: true,
    env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023-lib/lib:/tmp', FONTCONFIG_PATH: '/tmp/fonts' },
  });
  const desktop = { width: 1440, height: 900, deviceScaleFactor: 2 };
  const phone = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

  // ---- Desktop feature crops ----
  let page = await newPage(browser, desktop, seed(true));
  await sleep(1200); // reminder engine fires on mount
  await page.screenshot({ path: path.join(OUT, 'desktop-overview-toast.png') });
  // crop the toast
  const toast = await page.$('[role="status"]');
  if (toast) { await toast.screenshot({ path: path.join(OUT, 'crop-toast.png') }); }
  await shotCard(page, 'Daily mood check-in', 'crop-mood.png');
  await shotCard(page, 'Predictable daily routine', 'crop-routine.png');
  await shotCard(page, "Today's medications", 'crop-meds.png');
  await shotCard(page, 'ROUTINE TODAY', 'crop-metric-routine.png');

  await clickTab(page, 'Activities');
  await clickText(page, 'Start pattern');
  await sleep(1700); // first pad lit at ~500ms+; capture during highlight window
  await shotCard(page, 'Pattern Recall', 'crop-pattern.png');
  await clickText(page, 'Begin session');
  await sleep(2200);
  await shotCard(page, 'Guided breathing', 'crop-breathing.png');
  await shotCard(page, 'Sensory Soundscapes', 'crop-soundscapes.png');
  await clickText(page, 'Rain');
  await sleep(300);
  await shotCard(page, 'Sensory Soundscapes', 'crop-soundscapes-playing.png');
  await shotCard(page, 'Feelings explorer', 'crop-feelings.png');
  await shotCard(page, 'Picture pairs', 'crop-pairs.png');
  await shotCard(page, 'Picture story', 'crop-story.png');

  await clickTab(page, 'Coffee Circles');
  await shotCard(page, 'Morning Sunshine Tea', 'crop-circle-card.png');
  await shotCard(page, 'How the video works', 'crop-video-how.png');

  await clickTab(page, 'Care Circle');
  await shotCard(page, 'Care notes · local only', 'crop-notes.png');
  await shotCard(page, 'Local check-in summary', 'crop-summary.png');
  await clickText(page, 'Prepare visit brief');
  await sleep(500);
  await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    for (const want of ['Medication reminders', 'Mood check-ins', 'Care notes']) {
      const l = labels.find(x => x.textContent.includes(want)); const input = l && l.querySelector('input[type="checkbox"]');
      if (input && !input.checked) input.click();
    }
    const ta = document.querySelector('textarea');
    if (ta) { const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; setter.call(ta, 'Dizziness after lunch on Tuesday — should I adjust when I take Metformin?'); ta.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await sleep(500);
  const dlg = await page.$('section[role="dialog"]');
  if (dlg) { await dlg.screenshot({ path: path.join(OUT, 'crop-visitbrief.png') }); }
  await shotCard(page, 'Exact file preview', 'crop-visitbrief-preview.png', { ancestorSel: 'div.rounded-2xl' });
  await page.keyboard.press('Escape');

  await clickTab(page, 'Vitals & Telehealth');
  await clickText(page, 'Start labeled demo');
  await sleep(12000);
  await clickText(page, 'Generate example (simulated)');
  await sleep(4600);
  await shotCard(page, 'Heart rate', 'crop-hr.png');
  await shotCard(page, 'Blood oxygen', 'crop-spo2.png');
  await shotCard(page, 'How vitals really reach this screen', 'crop-vitals-how.png');
  await shotCard(page, 'Reference check uses live', 'crop-range.png');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(OUT, 'desktop-vitals2.png') });

  await page.evaluate(() => document.querySelector('button[aria-label="Settings and accessibility"]').click());
  await sleep(500);
  const sdlg = await page.$('[role="dialog"][aria-labelledby="settings-title"]');
  if (sdlg) {
    await sdlg.screenshot({ path: path.join(OUT, 'crop-settings.png') });
    await sdlg.evaluate(e => { e.scrollTop = e.scrollHeight; });
    await sleep(300);
    await sdlg.screenshot({ path: path.join(OUT, 'crop-settings-privacy.png') });
  }
  await page.keyboard.press('Escape');
  await clickText(page, 'SOS');
  await sleep(500);
  const sos = await page.$('[role="dialog"][aria-labelledby="sos-title"]');
  if (sos) { await sos.screenshot({ path: path.join(OUT, 'crop-sos.png') }); }
  await page.close();

  // ---- Phone scrolled views ----
  page = await newPage(browser, phone, seed(false));
  await page.evaluate(() => { const el = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('Daily mood')); el && el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -(document.querySelector('header').offsetHeight + 12)); });
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, 'phone-overview-mood.png') });
  await page.evaluate(() => { const el = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes("Today's medications")); el && el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -(document.querySelector('header').offsetHeight + 12)); });
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, 'phone-overview-meds.png') });
  await page.evaluate(() => { const el = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('Predictable daily routine')); el && el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -(document.querySelector('header').offsetHeight + 12)); });
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, 'phone-overview-routine.png') });

  await clickTab(page, 'Vitals & Telehealth');
  await clickText(page, 'Start labeled demo');
  await sleep(12000);
  await clickText(page, 'Generate example (simulated)');
  await sleep(4600);
  await page.evaluate(() => { const el = Array.from(document.querySelectorAll('span')).find(h => h.textContent.trim() === 'Heart rate'); el && el.closest('div.rounded-3xl').scrollIntoView({ block: 'start' }); window.scrollBy(0, -(document.querySelector('header').offsetHeight + 12)); });
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, 'phone-vitals-hr.png') });

  await clickTab(page, 'Activities');
  await page.evaluate(() => { const el = Array.from(document.querySelectorAll('div')).find(h => h.textContent.trim() === 'Guided breathing'); el && el.closest('div.rounded-3xl').scrollIntoView({ block: 'start' }); window.scrollBy(0, -(document.querySelector('header').offsetHeight + 12)); });
  await clickText(page, 'Begin session');
  await sleep(2200);
  await page.screenshot({ path: path.join(OUT, 'phone-breathing.png') });
  await page.evaluate(() => { const el = Array.from(document.querySelectorAll('div')).find(h => h.textContent.trim() === 'Sensory Soundscapes'); el && el.closest('div.rounded-3xl').scrollIntoView({ block: 'start' }); window.scrollBy(0, -(document.querySelector('header').offsetHeight + 12)); });
  await clickText(page, 'Forest');
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, 'phone-soundscapes.png') });
  await page.evaluate(() => { const el = Array.from(document.querySelectorAll('div')).find(h => h.textContent.trim() === 'Pattern Recall'); el && el.closest('div.rounded-3xl').scrollIntoView({ block: 'start' }); window.scrollBy(0, -(document.querySelector('header').offsetHeight + 12)); });
  await clickText(page, 'Start pattern');
  await sleep(1700);
  await page.screenshot({ path: path.join(OUT, 'phone-pattern.png') });

  await clickTab(page, 'Care Circle');
  await page.evaluate(() => { const el = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('From this browser')); el && el.closest('div.rounded-3xl').scrollIntoView({ block: 'start' }); window.scrollBy(0, -(document.querySelector('header').offsetHeight + 12)); });
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, 'phone-care-summary.png') });

  // Phone toast (reminder due now)
  await page.close();
  page = await newPage(browser, phone, seed(true));
  await sleep(1200);
  await page.screenshot({ path: path.join(OUT, 'phone-overview-toast.png') });
  await page.close();

  await browser.close();
  console.log('done');
}
main().catch(e => { console.error('ERR', e); process.exit(1); });
