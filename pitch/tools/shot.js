const puppeteer = require('puppeteer-core');
const mod = require('@sparticuz/chromium');
const chromium = mod.default || mod;
(async () => {
  const exe = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
    executablePath: exe, headless: true,
    env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023-lib/lib:/tmp', FONTCONFIG_PATH: '/tmp/fonts' },
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 400, deviceScaleFactor: 2 });
  await page.setContent('<h1 style="font-family:sans-serif;color:#1a7">hello CareSphere 💚 — 72 bpm</h1>');
  await page.screenshot({ path: 'test.png' });
  console.log('version', await browser.version());
  await browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
