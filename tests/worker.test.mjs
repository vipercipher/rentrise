// Tests the counter Worker with an in-memory stand-in for D1. Run: npm run test:worker
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/rentrise-counter/worker.js';

function fakeDB() {
  const rows = new Map();
  return {
    rows,
    prepare(sql) {
      return {
        bind(...a) {
          return {
            async run() {
              const k = a.slice(0, 4).join('|');
              rows.set(k, (rows.get(k) || 0) + 1);
            },
            async all() {
              const agg = new Map();
              for (const [k, n] of rows) {
                const [day, state, event, value] = k.split('|');
                if (day < a[0]) continue;
                const kk = [state, event, value].join('|');
                agg.set(kk, (agg.get(kk) || 0) + n);
              }
              return { results: [...agg].map(([k, n]) => { const [state, event, value] = k.split('|'); return { state, event, value, n }; }) };
            },
          };
        },
      };
    },
  };
}
const env = { DB: fakeDB() };
const post = (body, origin = 'https://rentrise.au') =>
  worker.fetch(new Request('https://rentrise.au/api/e', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) }), env);

test('counts a valid result with reasons', async () => {
  assert.equal((await post({ s: 'vic', e: 'result', v: 'bad', r: ['short_notice', 'short_notice', 'no_form'] })).status, 204);
  assert.equal((await post({ s: 'vic', e: 'result', v: 'ok', r: [] })).status, 204);
  assert.equal((await post({ s: 'vic', e: 'message_copied' })).status, 204);
});

test('rejects unknown states, events, values and other websites', async () => {
  assert.equal((await post({ s: 'wa', e: 'result', v: 'bad' })).status, 400);
  assert.equal((await post({ s: 'vic', e: 'hack', v: 'x' })).status, 400);
  assert.equal((await post({ s: 'vic', e: 'result', v: 'maybe' })).status, 400);
  assert.equal((await post('not json')).status, 400);
  assert.equal((await post({ s: 'vic', e: 'result', v: 'ok' }, 'https://evil.example')).status, 403);
  assert.equal((await post('x'.repeat(600))).status, 413);
});

test('ignores unknown reason codes and never stores anything else', async () => {
  await post({ s: 'nsw', e: 'result', v: 'bad', r: ['too_early', '<script>', '2026-01-01'] });
  const keys = [...env.DB.rows.keys()].join(' ');
  assert.ok(keys.includes('nsw|reason|too_early'));
  assert.ok(!keys.includes('<script>') && !keys.includes('2026-01-01|'.slice(0, 0) + '|2026-01-01'));
});

test('stats returns totals and reason shares', async () => {
  const res = await worker.fetch(new Request('https://rentrise.au/api/stats'), env);
  const data = await res.json();
  assert.equal(data.states.vic.checks_completed, 2);
  assert.equal(data.states.vic.reason.short_notice, 1);   // de-duplicated
  assert.equal(data.states.vic.reason_share.short_notice, '50%');
  assert.equal(data.states.vic.message_copied.count, 1);
});
