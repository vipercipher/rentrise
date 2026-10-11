// End-to-end tests: fill each checker in a real browser and check the result.
// Setup once:  npm install --no-save playwright && npx playwright install chromium
// Run:         npm run test:scenarios
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.png':'image/png', '.ico':'image/x-icon' };

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

let browser, server, base;
test.before(async () => {
  const { chromium } = require('playwright');
  server = await serve();
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
});
test.after(async () => { await browser?.close(); server?.close(); });

const RADIOS = ['kind','agr','terms','writing','len','content','pre2019','clause','form'];
async function check(state, answers, tz = 'Australia/Sydney') {
  const ctx = await browser.newContext({ timezoneId: tz });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/${state}/`);
  for (const [k, v] of Object.entries(answers)) {
    if (RADIOS.includes(k)) await page.check(`input[name="${k}"][value="${v}"]`);
    else await page.fill(`#${k}`, v);
  }
  await page.waitForTimeout(100);
  const result = {
    verdict: (await page.getAttribute('#verdict', 'class')).replace('verdict ', ''),
    text: (await page.textContent('#verdict')).replace(/\s+/g, ' '),
    checks: await page.$$eval('#checks li', ls => ls.map(l => l.querySelector('.mark').classList[1] + ':' + l.querySelector('b').textContent)),
  };
  await ctx.close();
  assert.deepEqual(errors, []);
  return result;
}
const has = (r, s) => r.checks.some(c => c.startsWith(s));

// ---------- Queensland (RTA rules) ----------
test('QLD: increase less than 12 months after the current rent started is too early', async () => {
  const r = await check('qld', { agr:'periodic', last:'2025-11-15', notice:'2026-09-01', start:'2026-11-10', writing:'yes' });
  assert.equal(r.verdict, 'bad');
  assert.ok(has(r, 'fail:Too soon'));
  assert.match(r.text, /15 Nov 2026/);
});
test('QLD: exactly 12 months and exactly 2 months notice is allowed', async () => {
  const r = await check('qld', { agr:'periodic', last:'2025-11-15', notice:'2026-09-15', start:'2026-11-15', writing:'yes' });
  assert.equal(r.verdict, 'ok');
});
test('QLD: 2 months from 31 Dec ends on 28 Feb', async () => {
  const ok = await check('qld', { agr:'periodic', last:'2025-01-01', notice:'2025-12-31', start:'2026-02-28', writing:'yes' });
  assert.equal(ok.verdict, 'ok');
  const early = await check('qld', { agr:'periodic', last:'2025-01-01', notice:'2025-12-31', start:'2026-02-27', writing:'yes' });
  assert.equal(early.verdict, 'bad');
});
test('QLD: rooming accommodation needs 4 weeks', async () => {
  const r = await check('qld', { kind:'rooming', agr:'periodic', last:'2025-01-01', notice:'2026-03-01', start:'2026-03-29', writing:'yes' });
  assert.equal(r.verdict, 'ok');
});
test('QLD: verbal notice fails', async () => {
  const r = await check('qld', { agr:'periodic', last:'2025-01-01', notice:'2026-03-01', start:'2026-06-01', writing:'no' });
  assert.ok(has(r, 'fail:Notice wasn'));
});

// ---------- NSW (NSW Fair Trading rules) ----------
test('NSW: 50 days notice is not enough (needs 60)', async () => {
  const r = await check('nsw', { agr:'periodic', start:'2025-03-01', lastinc:'', notice:'2026-01-10', newstart:'2026-03-01', writing:'yes', content:'yes' });
  assert.equal(r.verdict, 'bad');
  assert.match(r.text, /11 Mar 2026/);
  assert.ok(r.checks.some(c => c.includes('Not enough notice')));
});
test('NSW: 12 months runs from the last increase, not the tenancy start', async () => {
  const r = await check('nsw', { agr:'periodic', start:'2025-01-01', lastinc:'2025-12-01', notice:'2026-08-01', newstart:'2026-10-15', writing:'yes', content:'yes' });
  assert.ok(has(r, 'fail:Too soon after your last increase'));
  assert.match(r.text, /1 Dec 2026/);
});
test('NSW: fixed term under 2 years with no increase term fails', async () => {
  const r = await check('nsw', { agr:'fixed', len:'under2', terms:'no', start:'2025-06-01', lastinc:'', notice:'2026-06-01', newstart:'2026-08-15', writing:'yes', content:'yes' });
  assert.ok(has(r, 'fail:Your lease doesn'));
});
test('NSW: older fixed term (before 13 Dec 2024) with an increase term skips the 12-month limit', async () => {
  const r = await check('nsw', { agr:'fixed', len:'under2', terms:'yes', start:'2024-06-01', lastinc:'2026-01-01', notice:'2026-07-01', newstart:'2026-09-01', writing:'yes', content:'yes' });
  assert.equal(r.verdict, 'ok');
  assert.ok(has(r, 'na:12-month limit'));
});

// ---------- Victoria (CAV / Tenants Victoria rules) ----------
test('VIC: 61 days notice given after 25 Nov 2025 is not enough (needs 90)', async () => {
  const r = await check('vic', { agr:'periodic', pre2019:'no', last:'2025-10-01', notice:'2026-08-01', newstart:'2026-10-01', form:'yes', content:'yes' });
  assert.equal(r.verdict, 'bad');
  assert.match(r.text, /30 Oct 2026/);
});
test('VIC: notice given before 25 Nov 2025 only needed 60 days', async () => {
  const r = await check('vic', { agr:'periodic', pre2019:'no', last:'2024-12-01', notice:'2025-10-15', newstart:'2025-12-15', form:'yes', content:'yes' });
  assert.equal(r.verdict, 'ok');
});
test('VIC: notice given on 25 Nov 2025 needs 90 days', async () => {
  const r = await check('vic', { agr:'periodic', pre2019:'no', last:'2024-12-01', notice:'2025-11-25', newstart:'2026-01-24', form:'yes', content:'yes' });
  assert.equal(r.verdict, 'bad');
});
test('VIC: periodic agreement from before 19 June 2019 allows 6 months', async () => {
  const r = await check('vic', { agr:'periodic', pre2019:'yes', last:'2026-01-01', notice:'2026-03-01', newstart:'2026-07-01', form:'yes', content:'yes' });
  assert.equal(r.verdict, 'ok');
});
test('VIC: fixed term with no rent increase clause fails', async () => {
  const r = await check('vic', { agr:'fixed', clause:'no', last:'2025-06-01', notice:'2026-03-01', newstart:'2026-06-15', form:'yes', content:'yes' });
  assert.ok(has(r, 'fail:Your lease has no rent increase clause'));
});

// ---------- Timezones ----------
for (const tz of ['Australia/Perth', 'Australia/Sydney', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
  test(`Results are identical in timezone ${tz}`, async () => {
    const r = await check('nsw', { agr:'periodic', start:'2025-03-01', lastinc:'', notice:'2026-01-10', newstart:'2026-03-01', writing:'yes', content:'yes' }, tz);
    assert.match(r.text, /11 Mar 2026/);
  });
}

// ---------- New features ----------
test('Every result shows the legal note, and notice wording uses an apostrophe', async () => {
  const r = await check('nsw', { agr:'periodic', start:'2025-03-01', lastinc:'', notice:'2026-01-10', newstart:'2026-03-01', writing:'yes', content:'yes' });
  assert.match(r.text, /General information, not legal advice/);
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(`${base}/nsw/`);
  const checks = await page.textContent('#checks');
  assert.match(checks, /50 days’ notice/);
  assert.doesNotMatch(checks, /days notice/);
  await ctx.close();
});

test('A shared link restores the answers, then removes them from the address bar', async () => {
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(`${base}/vic/#agr=fixed&clause=no&last=2025-06-01&notice=2026-03-01&newstart=2026-06-15&form=yes&content=yes&cur=500&nw=550`);
  await page.waitForTimeout(150);
  assert.equal(await page.getAttribute('#verdict', 'class'), 'verdict bad');
  assert.match(await page.textContent('#checks'), /no rent increase clause/);
  assert.equal(new URL(page.url()).hash, '');
  assert.equal(await page.isHidden('#sampleBar'), true);
  // Unknown fields and unsafe values are ignored
  await ctx.close();
  // Unknown fields and unsafe values are ignored (fresh page load)
  const ctx2 = await browser.newContext(); const page2 = await ctx2.newPage();
  await page2.goto(`${base}/vic/#evil=<script>&last=not-a-date`);
  await page2.waitForTimeout(150);
  assert.equal(await page2.inputValue('#last'), '2025-10-01'); // example value untouched
  await ctx2.close();
});

test('Counting sends only state, event and result category (no answers)', async () => {
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  // Record exactly what the page would send
  await page.addInitScript(() => {
    window.__sent = [];
    navigator.sendBeacon = (url, blob) => { blob.text().then(t => window.__sent.push({ url, body: t })); return true; };
  });
  await page.goto(`${base}/qld/`);
  // The pre-filled example must not be counted
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(100);
  assert.equal((await page.evaluate(() => window.__sent)).length, 0, 'example not counted');
  await page.fill('#notice', '2026-09-20');            // a real user edit
  await page.click('#copy');                             // one-off action
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(200);
  const sent = await page.evaluate(() => window.__sent);
  await ctx.close();
  assert.ok(sent.every(x => x.url === '/api/e'));
  const payloads = sent.map(x => JSON.parse(x.body));
  assert.ok(payloads.some(p => p.e === 'message_copied' && p.s === 'qld'));
  const results = payloads.filter(p => p.e === 'result');
  assert.equal(results.length, 1, 'final result counted once');
  assert.equal(results[0].v, 'bad');
  assert.deepEqual(results[0].r.sort(), ['short_notice', 'too_early']);
  const all = sent.map(x => x.body).join(' ');
  assert.doesNotMatch(all, /20\d\d-\d\d-\d\d|550|600/);  // no dates or rent amounts
  for (const p of payloads) assert.deepEqual(Object.keys(p).filter(k => !['s','e','v','r'].includes(k)), []);
});
