// Tests for the sidebar/light-box formatters (src/components/workspace/format.ts).
//   node scripts/format.test.mjs
import assert from 'node:assert/strict';

// A zone with a clock change, set before format.ts builds its Intl formatters.
process.env.TZ = 'Europe/London';
const { fileName, shortDate, elapsed } = await import('../src/components/workspace/format.ts');

// fileName never throws: synced names are stored raw.
assert.equal(fileName('/uploads/CT 50%.jpg'), 'CT 50%.jpg');
assert.equal(fileName('/uploads/Scan%20one.jpg'), 'Scan one.jpg');
assert.equal(fileName('C:\\input\\note.png'), 'note.png');
assert.equal(fileName('100%'), '100%');

// "Yesterday" is the previous calendar day, even when that day was 25 hours long (UK clocks went back on 25 Oct 2026).
const afterFallBack = new Date(2026, 9, 26, 9, 0);
assert.equal(shortDate(new Date(2026, 9, 25, 0, 30).toISOString(), afterFallBack), 'Yesterday', 'first hour of a 25-hour day');
assert.equal(shortDate(new Date(2026, 9, 24, 23, 59).toISOString(), afterFallBack), '24 Oct');
// ...and when it was 23 hours long (clocks went forward on 29 Mar 2026).
const afterSpring = new Date(2026, 2, 30, 0, 10);
assert.equal(shortDate(new Date(2026, 2, 29, 0, 5).toISOString(), afterSpring), 'Yesterday');
assert.equal(shortDate(new Date(2026, 2, 28, 23, 30).toISOString(), afterSpring), '28 Mar', 'a 24-hour subtraction would call this Yesterday');
assert.equal(shortDate(new Date(2026, 9, 26, 8, 5).toISOString(), afterFallBack), '08:05');
assert.equal(shortDate(new Date(2025, 0, 2).toISOString(), afterFallBack), '2 Jan 2025');
assert.equal(shortDate('not a date', afterFallBack), '');

assert.equal(elapsed('2026-10-07T10:00:00Z', Date.parse('2026-10-07T10:02:05Z')), '2:05');
assert.equal(elapsed('2026-10-07T10:00:00Z', Date.parse('2026-10-07T12:05:03Z')), '2:05:03');

console.log('format checks passed');
