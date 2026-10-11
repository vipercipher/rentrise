/**
 * RentRise anonymous counter (Cloudflare Worker + D1).
 *
 * POST /api/e      Count one event. Accepts only known states, events and categories.
 * GET  /api/stats  Totals by state, event and category (aggregated numbers only).
 *
 * Stores daily counts only. No IP addresses, dates entered, rent amounts,
 * cookies or identifiers are stored.
 *
 * Bindings: D1 database bound as DB. See README.md in this folder.
 */
const STATES = new Set(['qld', 'nsw', 'vic']);
const EVENTS = new Set(['result', 'message_copied', 'calendar', 'share_link', 'share_whatsapp', 'share_native', 'print']);
const RESULTS = new Set(['ok', 'bad', 'warn']);
const REASONS = new Set(['too_early', 'short_notice', 'not_written', 'no_form', 'missing_details', 'no_lease_term']);
const ORIGINS = new Set(['https://rentrise.au', 'https://www.rentrise.au', 'https://rentrise.pages.dev']);

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra },
  });

async function bump(env, day, s, e, v) {
  await env.DB.prepare(
    'INSERT INTO counts (day, state, event, value, n) VALUES (?1, ?2, ?3, ?4, 1) ' +
    'ON CONFLICT(day, state, event, value) DO UPDATE SET n = n + 1'
  ).bind(day, s, e, v).run();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/e' && request.method === 'POST') {
      // Only accept counts sent from the RentRise site itself.
      const origin = request.headers.get('Origin') || '';
      if (origin && !ORIGINS.has(origin)) return new Response(null, { status: 403 });

      const text = await request.text();
      if (text.length > 500) return new Response(null, { status: 413 });
      let p;
      try { p = JSON.parse(text); } catch { return new Response(null, { status: 400 }); }
      if (!p || !STATES.has(p.s) || !EVENTS.has(p.e)) return new Response(null, { status: 400 });

      const day = new Date().toISOString().slice(0, 10);
      if (p.e === 'result') {
        if (!RESULTS.has(p.v)) return new Response(null, { status: 400 });
        await bump(env, day, p.s, 'result', p.v);
        const reasons = Array.isArray(p.r) ? [...new Set(p.r)].filter(r => REASONS.has(r)).slice(0, 6) : [];
        for (const r of reasons) await bump(env, day, p.s, 'reason', r);
      } else {
        await bump(env, day, p.s, p.e, '');
      }
      return new Response(null, { status: 204 });
    }

    if (url.pathname === '/api/stats' && request.method === 'GET') {
      const since = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('since') || '') ? url.searchParams.get('since') : '2000-01-01';
      const { results } = await env.DB.prepare(
        'SELECT state, event, value, SUM(n) AS n FROM counts WHERE day >= ?1 GROUP BY state, event, value ORDER BY state, event, n DESC'
      ).bind(since).all();
      const out = {};
      for (const row of results) {
        out[row.state] ??= {};
        out[row.state][row.event] ??= {};
        out[row.state][row.event][row.value || 'count'] = row.n;
      }
      for (const s of Object.keys(out)) {
        const r = out[s].result || {};
        const total = (r.ok || 0) + (r.bad || 0) + (r.warn || 0);
        out[s].checks_completed = total;
        if (total && out[s].reason) {
          out[s].reason_share = Object.fromEntries(Object.entries(out[s].reason).map(([k, v]) => [k, Math.round((v / total) * 1000) / 10 + '%']));
        }
      }
      return json({ since, generated: new Date().toISOString(), states: out });
    }

    return new Response('Not found', { status: 404 });
  },
};
