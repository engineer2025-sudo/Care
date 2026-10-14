const fs = require('fs'); const path = require('path');
const puppeteer = require('puppeteer-core'); const mod = require('@sparticuz/chromium'); const chromium = mod.default || mod;
const BASE = 'http://localhost:4173'; const OUT = path.join(__dirname, 'out'); const sleep = ms => new Promise(r => setTimeout(r, ms));
function dayKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function seed() {
  const now = new Date(); const today = dayKey(now);
  const moods = []; const scores = [3, 4, 4, 3, 5, 4, 2, 3, 4, 4, 5, 4, 3, 4];
  for (let i = 13; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); moods.push({ date: d.toDateString(), score: scores[13 - i], ts: d.getTime() }); }
  return { settings: { name: 'Rose', textScale: 'md', theme: 'dark', highContrast: false, lowSensory: true, voice: true },
    routines: [ { id: 1, text: 'Morning hydration 💧', completedOn: today }, { id: 2, text: '10-minute brain game 🧩', completedOn: today }, { id: 3, text: 'Join a coffee circle ☕', completedOn: null }, { id: 4, text: 'Evening stretch & wind-down 🌿', completedOn: null }, { id: 'walk', text: 'Short walk around the block 🚶', completedOn: today } ],
    meds: [ { id: 'm1', name: 'Lisinopril (10 mg)', time: '8:00 AM', takenOn: today }, { id: 'm2', name: 'Metformin (500 mg)', time: '12:30 PM', takenOn: null }, { id: 'm3', name: 'Vitamin D (1000 IU)', time: '6:00 PM', takenOn: null } ],
    medsConfirmed: true, notes: [], moods, emotionScore: 0, bestPattern: 0 };
}
async function shotCard(page, text, file) {
  const handle = await page.evaluateHandle((text) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let node; const matches = [];
    while ((node = walker.nextNode())) { if (node.textContent.includes(text)) matches.push(node.parentElement); }
    const el = matches.find(e => e.offsetParent !== null) || matches[0]; return el ? el.closest('div.rounded-3xl, section') : null;
  }, text);
  const el = handle.asElement(); if (!el) { console.log('NOT FOUND', text); return; }
  await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await sleep(250); await el.screenshot({ path: path.join(OUT, file) }); console.log('card', file);
}
async function clickText(page, text) { return page.evaluate((text) => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes(text)); if (b) { b.click(); return true; } return false; }, text); }
(async () => {
  const exe = await chromium.executablePath();
  const browser = await puppeteer.launch({ args: [...chromium.args, '--no-sandbox', '--disable-gpu', '--font-render-hinting=none', '--hide-scrollbars'], executablePath: exe, headless: true, env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023-lib/lib:/tmp', FONTCONFIG_PATH: '/tmp/fonts' } });
  const page = await browser.newPage(); await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.evaluateOnNewDocument((raw) => { try { localStorage.setItem('caresphere.v1', raw); } catch {} }, JSON.stringify(seed()));
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' }); await page.waitForSelector('main'); await sleep(600);
  await shotCard(page, "Today's medications", 'crop-meds.png');
  await shotCard(page, 'Predictable daily routine', 'crop-routine.png');
  await page.evaluate(() => { const navs = Array.from(document.querySelectorAll('nav[aria-label="Main navigation"] button')); navs.filter(b => b.offsetParent !== null && b.textContent.trim() === 'Activities')[0].click(); }); await sleep(500);
  await clickText(page, 'Begin session'); await sleep(2200);
  await shotCard(page, 'Guided breathing', 'crop-breathing.png');
  // Pattern recall: capture while the pad is lit (lowSensory -> lit 500..1600ms)
  const h = await page.evaluateHandle(() => { const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = walker.nextNode())) { if (n.textContent.includes('Pattern Recall')) return n.parentElement.closest('div.rounded-3xl'); } return null; });
  const el = h.asElement(); await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await sleep(200);
  await clickText(page, 'Start pattern'); await sleep(900);
  await el.screenshot({ path: path.join(OUT, 'crop-pattern.png') }); console.log('card crop-pattern.png');
  await browser.close(); console.log('done');
})().catch(e => { console.error('ERR', e); process.exit(1); });
