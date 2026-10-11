# RentRise anonymous counter

A tiny Cloudflare Worker that counts anonymous checker events in a D1 database.
It is free on Cloudflare's free plan at RentRise's scale.

## What it stores

Daily totals only, for example: `2026-10-11 | vic | reason | short_notice | 14`.
No IP addresses, cookies, dates people entered, rent amounts or identifiers.

## Set up in the Cloudflare dashboard (about 10 minutes)

1. **Create the database:** Storage & databases → D1 → Create → name it `rentrise-stats`.
2. **Create the table:** open the database → Console → paste `schema.sql` → Execute.
3. **Create the Worker:** Workers & Pages → Create → Create Worker → name it `rentrise-counter` → Deploy.
   Then Edit code, replace everything with `worker.js`, and Deploy.
4. **Connect the database:** in the Worker, Settings → Bindings → Add → D1 database.
   Variable name `DB`, database `rentrise-stats` → Save. Deploy again if asked.
5. **Route it under your domain:** Worker → Settings → Domains & Routes → Add → Route:
   - `rentrise.au/api/*` (zone rentrise.au)
   - `www.rentrise.au/api/*` (zone rentrise.au)
6. **Test:** open `https://rentrise.au/api/stats`. You should see `{"states": {}}` at first,
   then counts after people complete checks.

## Reading the numbers

- `https://rentrise.au/api/stats`: all-time totals.
- `https://rentrise.au/api/stats?since=2026-10-01`: totals since a date.
- `reason_share` shows the share of completed checks that failed each rule,
  for example `"short_notice": "38%"`.

Optional: add a Cloudflare rate-limiting rule for `/api/e` to stop anyone
inflating the counts.
