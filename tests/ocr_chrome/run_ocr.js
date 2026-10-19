const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  p.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 200)));
  await p.goto('http://localhost:8765/index.html', { waitUntil: 'load' });
  try {
    await p.waitForFunction(() => document.title.indexOf('OCR') === 0, { timeout: 170000 });
    console.log(await p.title());
  } catch (e) { console.log('TEMPO ESGOTADO', String(e).slice(0, 100)); }
  await b.close();
})();
