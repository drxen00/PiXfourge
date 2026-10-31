// Drives the real index.html in headless Chromium and checks its output.
// Usage:  npm i playwright && npx playwright install chromium
//         node tests/verify-site.cjs /path/to/v0.2.9_3.1_cspx4.lcd
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const BETA = process.argv[2];
if (!BETA) { console.error('Pass the path to your v0.2.9_3.1_cspx4.lcd'); process.exit(2); }
const ROOT = path.resolve(__dirname, '..');
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
// SHA-256 of the output built from the known beta with the default boot screen
const WANT = '9edddccb3a0b775de31e440a51aa5b0674d9ed0941ab5d90c48d6ef38efe3054';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const page = await (await b.newContext({ acceptDownloads: true })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  const outside = []; page.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) outside.push(r.url()); });
  await page.goto('file://' + path.join(ROOT, 'index.html')); await page.waitForTimeout(500);
  const checks = () => page.$$eval('#checks li', l => l.map(x => x.className + '|' + x.textContent));
  await page.setInputFiles('#basefile', BETA); await page.waitForTimeout(800);
  ok((await checks()).every(x => !x.startsWith('bad')), 'beta file accepted');
  ok(await page.isDisabled('#build'), 'build stays disabled until the warning box is ticked');
  await page.check('#ack'); await page.click('#build');
  await page.waitForSelector('#result:not(.hidden)', { timeout: 90000 });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#download')]);
  const out = path.join(os.tmpdir(), 'pixfourge_test.lcd'); await dl.saveAs(out);
  ok(fs.statSync(out).size === 4161192, 'output is 4,161,192 bytes');
  ok(sha(out) === WANT, 'default-splash output matches the reference build (' + sha(out).slice(0, 12) + ')');
  await page.setInputFiles('#basefile', out); await page.waitForTimeout(800);
  ok((await checks()).some(x => /already has the 95/.test(x)), 'an already-patched file is rejected');
  await page.setInputFiles('#basefile', path.join(ROOT, 'index.html')); await page.waitForTimeout(500);
  ok((await checks()).some(x => x.startsWith('bad')), 'a wrong file is rejected');
  await page.check('input[value=custom]');
  await page.setInputFiles('#imgfile', path.join(ROOT, 'assets', 'splash_source.png')); await page.selectOption('#fit', 'asis'); await page.waitForTimeout(500);
  ok(await page.isDisabled('#build'), 'a wrong-size image with "as-is" blocks the build');
  // --- the "check any firmware file" box
  const check = async (file) => {
    await page.setInputFiles('#checkfile', file);
    await page.waitForFunction(() => { const t = document.querySelector('#verdictTitle').textContent; return t && t !== 'Checking…'; }, null, { timeout: 60000 });
    return page.textContent('#verdictTitle');
  };
  ok(/unmodified/.test(await check(BETA)), 'checker: stock beta is recognised and its checksums are intact');
  ok(/Patched firmware 3\.0\.1_0/.test(await check(out)), 'checker: our build is recognised as patched');
  const damaged = path.join(os.tmpdir(), 'pixfourge_damaged.lcd');
  const buf = fs.readFileSync(out); buf[0x100000] ^= 0xFF; fs.writeFileSync(damaged, buf);
  ok(/Don't flash/.test(await check(damaged)), 'checker: a damaged file is flagged');
  ok(/isn't a firmware file/.test(await check(path.join(ROOT, 'index.html'))), 'checker: a random file is not recognised');
  ok(outside.length === 0, 'the page makes no outside network requests');
  ok(errs.length === 0, 'no page errors');
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
