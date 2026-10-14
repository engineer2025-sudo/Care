// Captures real screenshots of the CareSphere web PWA (served from dist/) for the pitch deck.
// Seeds realistic demo data through the app's own plaintext->encrypted migration path.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const mod = require('@sparticuz/chromium');
const chromium = mod.default || mod;

const BASE = 'http://localhost:4173';
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function seed() {
  const now = new Date();
  const today = dayKey(now);
  const moods = [];
  const scores = [3, 4, 4, 3, 5, 4, 2, 3, 4, 4, 5, 4, 3, 4];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    moods.push({ date: d.toDateString(), score: scores[13 - i], ts: d.getTime() });
  }
  const t = (h, m) => { const d = new Date(now); d.setHours(h, m, 0, 0); return d.toISOString(); };
  const y = (h, m) => { const d = new Date(now); d.setDate(now.getDate() - 1); d.setHours(h, m, 0, 0); return d.toISOString(); };
  return {
    settings: { name: 'Rose', textScale: 'md', theme: 'dark', highContrast: false, lowSensory: true, voice: true },
    routines: [
      { id: 1, text: 'Morning hydration 💧', completedOn: today },
      { id: 2, text: '10-minute brain game 🧩', completedOn: today },
      { id: 3, text: 'Join a coffee circle ☕', completedOn: null },
      { id: 4, text: 'Evening stretch & wind-down 🌿', completedOn: null },
      { id: 'walk', text: 'Short walk around the block 🚶', completedOn: today },
    ],
    meds: [
      { id: 'm1', name: 'Lisinopril (10 mg)', time: '8:00 AM', takenOn: today },
      { id: 'm2', name: 'Metformin (500 mg)', time: '12:30 PM', takenOn: null },
      { id: 'm3', name: 'Vitamin D (1000 IU)', time: '6:00 PM', takenOn: null },
    ],
    medsConfirmed: true,
    notes: [
      { id: 1, date: t(9, 12), author: 'You (Rose)', note: 'Slept well. Walked to the mailbox and back without my cane today.' },
      { id: 2, date: y(18, 40), author: 'You (Rose)', note: 'Felt a little dizzy after lunch — want to mention it at Thursday’s visit.' },
      { id: 3, date: y(10, 5), author: 'You (Rose)', note: 'Movie trivia circle was fun. Talked with Elena about gardening.' },
    ],
    moods,
    emotionScore: 0,
    bestPattern: 0,
  };
}

async function main() {
  const exe = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-gpu', '--font-render-hinting=none', '--hide-scrollbars'],
    executablePath: exe, headless: true,
    env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023-lib/lib:/tmp', FONTCONFIG_PATH: '/tmp/fonts' },
  });

  const viewports = {
    desktop: { width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false },
    phone: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  };

  for (const [vpName, vp] of Object.entries(viewports)) {
    const page = await browser.newPage();
    await page.setViewport(vp);
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    // Seed before any script runs (plaintext v1 -> migrated to AES-GCM by the app).
    const data = JSON.stringify(seed());
    await page.evaluateOnNewDocument((raw) => {
      try { localStorage.setItem('caresphere.v1', raw); } catch {}
    }, data);
    await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
    await page.waitForSelector('main');
    await new Promise(r => setTimeout(r, 600));

    const tabs = [
      { id: 'home', label: 'Overview', file: 'overview' },
      { id: 'games', label: 'Activities', file: 'activities' },
      { id: 'buddies', label: 'Coffee Circles', file: 'circles' },
      { id: 'care', label: 'Care Circle', file: 'care' },
      { id: 'telehealth', label: 'Vitals & Telehealth', file: 'vitals' },
    ];

    const clickTab = async (label) => {
      await page.evaluate((label) => {
        const navs = Array.from(document.querySelectorAll('nav[aria-label="Main navigation"] button'));
        const visible = navs.filter(b => b.offsetParent !== null && b.textContent.trim() === label);
        (visible[0] || navs.find(b => b.textContent.trim() === label)).click();
      }, label);
      await new Promise(r => setTimeout(r, 500));
      await page.evaluate(() => window.scrollTo(0, 0));
    };

    for (const tab of tabs) {
      await clickTab(tab.label);
      if (tab.id === 'telehealth') {
        // Start the explicitly labeled demo stream so the sparkline has data.
        await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Start labeled demo'));
          b && b.click();
        });
        await new Promise(r => setTimeout(r, 9000));
        await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Generate example (simulated)'));
          b && b.click();
        });
        await new Promise(r => setTimeout(r, 4600));
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      if (tab.id === 'games' && vpName === 'desktop') {
        await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Begin session'));
          b && b.click();
        });
        await new Promise(r => setTimeout(r, 1500));
      }
      await page.screenshot({ path: path.join(OUT, `${vpName}-${tab.file}.png`), fullPage: false });
      await page.screenshot({ path: path.join(OUT, `${vpName}-${tab.file}-full.png`), fullPage: true });
      console.log('captured', vpName, tab.file);
    }

    // Overlays: settings, SOS, visit brief
    await clickTab('Overview');
    await page.evaluate(() => document.querySelector('button[aria-label="Settings and accessibility"]').click());
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(OUT, `${vpName}-settings.png`) });
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));

    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim().endsWith('SOS'));
      b && b.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(OUT, `${vpName}-sos.png`) });
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));

    await clickTab('Care Circle');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Prepare visit brief'));
      b && b.click();
    });
    await new Promise(r => setTimeout(r, 500));
    await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      for (const want of ['Medication reminders', 'Mood check-ins', 'Care notes']) {
        const l = labels.find(x => x.textContent.includes(want));
        const input = l && l.querySelector('input[type="checkbox"]');
        if (input && !input.checked) input.click();
      }
      const ta = document.querySelector('textarea');
      if (ta) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        setter.call(ta, 'Dizziness after lunch on Tuesday — should I adjust when I take Metformin?');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(OUT, `${vpName}-visitbrief.png`) });
    await page.keyboard.press('Escape');
    console.log('captured', vpName, 'overlays');

    // Light theme + larger text variant of Overview (accessibility slide)
    if (vpName === 'desktop') {
      await clickTab('Overview');
      await page.evaluate(() => {
        document.documentElement.dataset.theme = 'light';
        document.documentElement.dataset.textscale = 'lg';
      });
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: path.join(OUT, `${vpName}-overview-light.png`) });
      await page.evaluate(() => {
        document.documentElement.dataset.theme = 'dark';
        document.documentElement.dataset.textscale = 'md';
        document.documentElement.dataset.contrast = 'high';
      });
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: path.join(OUT, `${vpName}-overview-highcontrast.png`) });
      console.log('captured', vpName, 'theme variants');
    }
    if (vpName === 'phone') {
      await clickTab('Overview');
      await page.evaluate(() => {
        document.documentElement.dataset.theme = 'light';
      });
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: path.join(OUT, `${vpName}-overview-light.png`) });
      await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    }
    await page.close();
  }
  await browser.close();
  console.log('done');
}

main().catch(e => { console.error('ERR', e); process.exit(1); });
