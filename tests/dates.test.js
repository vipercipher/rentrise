// Unit tests for the shared date helpers. Run: npm test
// No dependencies: uses Node's built-in test runner (Node 18+).
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../assets/rr-dates.js');

const iso = d => D.iso(d);
const p = s => D.parse(s);

test('parse accepts real dates and rejects impossible ones', () => {
  assert.equal(iso(p('2026-10-11')), '2026-10-11');
  assert.equal(iso(p('2024-02-29')), '2024-02-29');      // leap year
  assert.equal(p('2025-02-29'), null);                   // not a leap year
  assert.equal(p('2026-02-31'), null);
  assert.equal(p('2026-13-01'), null);
  assert.equal(p(''), null);
  assert.equal(p('11/10/2026'), null);
});

test('"2 months" from the 31st lands on the last day of a shorter month', () => {
  assert.equal(iso(D.addMonths(p('2025-12-31'), 2)), '2026-02-28');
  assert.equal(iso(D.addMonths(p('2023-12-31'), 2)), '2024-02-29'); // leap year
  assert.equal(iso(D.addMonths(p('2026-01-31'), 1)), '2026-02-28');
  assert.equal(iso(D.addMonths(p('2026-08-31'), 1)), '2026-09-30');
  assert.equal(iso(D.addMonths(p('2026-03-31'), 2)), '2026-05-31');
});

test('12 months across leap days', () => {
  assert.equal(iso(D.addMonths(p('2024-02-29'), 12)), '2025-02-28');
  assert.equal(iso(D.addMonths(p('2027-02-28'), 12)), '2028-02-28');
  assert.equal(iso(D.addMonths(p('2025-11-15'), 12)), '2026-11-15');
});

test('6 months (older Victorian periodic agreements)', () => {
  assert.equal(iso(D.addMonths(p('2026-08-31'), 6)), '2027-02-28');
  assert.equal(iso(D.addMonths(p('2026-01-01'), 6)), '2026-07-01');
});

test('day counting, including 60 and 90 day notice periods', () => {
  assert.equal(D.days(p('2026-10-11'), p('2026-10-11')), 0);  // same day
  assert.equal(D.days(p('2026-01-10'), p('2026-03-01')), 50);
  assert.equal(iso(D.addDays(p('2026-01-10'), 60)), '2026-03-11');
  assert.equal(iso(D.addDays(p('2026-08-01'), 90)), '2026-10-30');
  assert.equal(iso(D.addDays(p('2025-12-31'), 60)), '2026-03-01');
  assert.equal(iso(D.addDays(p('2023-12-31'), 60)), '2024-02-29'); // leap year
});

test('daylight saving changes never shift a day', () => {
  // AEDT starts 4 Oct 2026 and ends 5 Apr 2026 in NSW/VIC
  assert.equal(iso(D.addDays(p('2026-10-03'), 1)), '2026-10-04');
  assert.equal(iso(D.addDays(p('2026-10-04'), 1)), '2026-10-05');
  assert.equal(iso(D.addDays(p('2026-04-04'), 1)), '2026-04-05');
  assert.equal(D.days(p('2026-04-01'), p('2026-04-10')), 9);
  assert.equal(D.days(p('2026-10-01'), p('2026-10-10')), 9);
});

test('today() uses the visitor\'s local calendar date', () => {
  // 11:30pm on 11 Oct local time must still be 11 Oct, whatever the timezone
  const late = new Date(2026, 9, 11, 23, 30);
  const early = new Date(2026, 9, 11, 0, 15);
  assert.equal(iso(D.today(late)), '2026-10-11');
  assert.equal(iso(D.today(early)), '2026-10-11');
});

test('display formatting does not shift with timezone', () => {
  assert.match(D.format(p('2026-03-01')), /1 Mar 2026/);
  assert.match(D.format(p('2026-12-31')), /31 Dec 2026/);
});

test('notice wording uses the possessive apostrophe', () => {
  assert.equal(D.noticeOf(1), '1 day’s notice');
  assert.equal(D.noticeOf(51), '51 days’ notice');
  assert.equal(D.noticeOf(0), '0 days’ notice');
});
