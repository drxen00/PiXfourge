// Drives the real index.html in headless Chromium and checks its output against the reference
// command-line builder (scripts/build_3.0.1_0.js), run on the same input.
// Usage:  npm i playwright && npx playwright install chromium
//         node tests/verify-site.cjs                              synthetic stand-in (what CI runs)
//         node tests/verify-site.cjs /path/to/v0.2.9_3.1_cspx4.lcd  the real beta
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const { makeBase } = require('./make-fixture.cjs');
const ROOT = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pixfourge-'));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
// SHA-256 of the real beta, and of the output built from it with the default boot screen
const BETA_SHA = '012e12bc4cc7cd86b4f0226d3a4624b83e01a9770085327af31e2f809f91435a';
const WANT = '9edddccb3a0b775de31e440a51aa5b0674d9ed0941ab5d90c48d6ef38efe3054';

let BETA = process.argv[2];
const synthetic = !BETA;
if (synthetic) { BETA = path.join(TMP, 'synthetic_base.lcd'); fs.writeFileSync(BETA, makeBase()); }
const real = sha(BETA) === BETA_SHA;
console.log(synthetic ? 'Using a synthetic stand-in for the beta' : real ? 'Using the real beta' : 'Using a file that is not the known beta');

// The reference script reads and writes fixed paths next to itself, so run a copy in a scratch tree
function referenceBuild(base) {
  const t = path.join(TMP, 'ref');
  for (const d of ['scripts', 'assets', 'firmware', 'extracted']) fs.mkdirSync(path.join(t, d), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'scripts', 'build_3.0.1_0.js'), path.join(t, 'scripts', 'build_3.0.1_0.js'));
  fs.copyFileSync(path.join(ROOT, 'assets', 'splash_source.png'), path.join(t, 'assets', 'splash_source.png'));
  fs.copyFileSync(base, path.join(t, 'firmware', 'v0.2.9_3.1_cspx4.lcd'));
  execFileSync(process.execPath, [path.join(t, 'scripts', 'build_3.0.1_0.js')], { stdio: 'ignore' });
  return path.join(t, 'firmware', 'v3.0.1_0_cspx4_cfw.lcd');
}

let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const ref = referenceBuild(BETA);
  const b = await chromium.launch(); const page = await (await b.newContext({ acceptDownloads: true })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  const outside = []; page.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) outside.push(r.url()); });
  await page.goto('file://' + path.join(ROOT, 'index.html')); await page.waitForTimeout(500);
  const checks = () => page.$$eval('#checks li', l => l.map(x => x.className + '|' + x.textContent));
  await page.setInputFiles('#basefile', BETA); await page.waitForTimeout(800);
  ok((await checks()).every(x => !x.startsWith('bad')), 'base file accepted');
  ok(await page.isDisabled('#build'), 'build stays disabled until the warning box is ticked');
  await page.check('#ack'); await page.click('#build');
  await page.waitForSelector('#result:not(.hidden)', { timeout: 90000 });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#download')]);
  const out = path.join(TMP, 'pixfourge_test.lcd'); await dl.saveAs(out);
  ok(fs.statSync(out).size === 4161192, 'output is 4,161,192 bytes');
  ok(sha(out) === sha(ref), 'default-splash output is byte-identical to the reference script (' + sha(out).slice(0, 12) + ')');
  if (real) ok(sha(out) === WANT, 'output matches the known reference build ' + WANT.slice(0, 12));
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
  const damaged = path.join(TMP, 'pixfourge_damaged.lcd');
  const buf = fs.readFileSync(out); buf[0x100000] ^= 0xFF; fs.writeFileSync(damaged, buf);
  ok(/Don't flash/.test(await check(damaged)), 'checker: a damaged file is flagged');
  ok(/isn't a firmware file/.test(await check(path.join(ROOT, 'index.html'))), 'checker: a random file is not recognised');
  ok(outside.length === 0, 'the page makes no outside network requests');
  ok(errs.length === 0, 'no page errors');
  await b.close(); fs.rmSync(TMP, { recursive: true, force: true });
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
