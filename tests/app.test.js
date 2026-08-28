import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/* ==========================================================================
   Pure Logic & Helper Implementations matching js/app.js
   ========================================================================== */

// Date utilities
function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toKey(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function mondayOf(d) {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1 - day);
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  return m;
}

// Macro & Calorie math
function calcCalories(protein, carbs, fat) {
  const p = Number(protein) || 0;
  const c = Number(carbs) || 0;
  const f = Number(fat) || 0;
  return Math.round(p * 4 + c * 4 + f * 9);
}

function gramsToPct(grams, cal, type = 'protein') {
  const g = Number(grams) || 0;
  const c = Number(cal) || 0;
  if (c <= 0) return 0;
  const factor = (type === 'fat') ? 9 : 4;
  return Math.round((g * factor / c) * 100);
}

function pctToGrams(pct, cal, type = 'protein') {
  const p = Number(pct) || 0;
  const c = Number(cal) || 0;
  if (c <= 0) return 0;
  const factor = (type === 'fat') ? 9 : 4;
  return Math.round((c * (p / 100)) / factor);
}

// Ring math
const CIRC = 2 * Math.PI * 64;

function calcRingOffset(currentVal, targetVal) {
  const current = Math.round(currentVal);
  const target = targetVal || 1;
  if (current <= 0) {
    const absPct = Math.min(1, Math.abs(current) / target);
    const offset = CIRC - absPct * CIRC;
    return {
      offset,
      isNegative: true,
      pct: absPct,
      strokeColor: 'var(--protein)'
    };
  } else {
    const pct = Math.min(1, current / target);
    const offset = CIRC - pct * CIRC;
    const isOver = current > target;
    return {
      offset,
      isNegative: false,
      pct,
      strokeColor: isOver ? 'var(--danger)' : 'var(--carbs)'
    };
  }
}

/* ==========================================================================
   Unit Test Suites
   ========================================================================== */

describe('Calorie & Macro Math', () => {
  test('calculates total calories correctly from protein, carbs, and fat (4/4/9 rule)', () => {
    // 150g protein * 4 = 600, 200g carbs * 4 = 800, 60g fat * 9 = 540 -> 1940 kcal
    assert.equal(calcCalories(150, 200, 60), 1940);
  });

  test('handles zero and missing macro values gracefully', () => {
    assert.equal(calcCalories(0, 0, 0), 0);
    assert.equal(calcCalories(null, undefined, ''), 0);
    assert.equal(calcCalories('50', '100', '20'), 50 * 4 + 100 * 4 + 20 * 9);
  });

  test('handles floating point values with proper rounding', () => {
    // 33.3 * 4 + 44.4 * 4 + 11.1 * 9 = 133.2 + 177.6 + 99.9 = 410.7 -> 411
    assert.equal(calcCalories(33.3, 44.4, 11.1), 411);
  });
});

describe('Grams to Percentage Conversions', () => {
  const targetCalories = 2000;

  test('converts protein grams to percentage correctly (factor 4)', () => {
    // 150g protein in 2000 cal -> (150 * 4 / 2000) * 100 = 30%
    assert.equal(gramsToPct(150, targetCalories, 'protein'), 30);
  });

  test('converts carbs grams to percentage correctly (factor 4)', () => {
    // 250g carbs in 2000 cal -> (250 * 4 / 2000) * 100 = 50%
    assert.equal(gramsToPct(250, targetCalories, 'carbs'), 50);
  });

  test('converts fat grams to percentage correctly (factor 9)', () => {
    // 44.4g fat (~400 cal) in 2000 cal -> (44.4 * 9 / 2000) * 100 = 20%
    assert.equal(gramsToPct(44.44, targetCalories, 'fat'), 20);
  });

  test('returns 0% when target calories is 0 or negative', () => {
    assert.equal(gramsToPct(150, 0, 'protein'), 0);
    assert.equal(gramsToPct(150, -500, 'protein'), 0);
  });

  test('macro percentages sum up to 100% for a balanced 2000 cal target', () => {
    // 150g P (600 cal = 30%), 250g C (1000 cal = 50%), 44.44g F (400 cal = 20%)
    const pPct = gramsToPct(150, targetCalories, 'protein');
    const cPct = gramsToPct(250, targetCalories, 'carbs');
    const fPct = gramsToPct(44.44, targetCalories, 'fat');
    assert.equal(pPct + cPct + fPct, 100);
  });
});

describe('Percentage to Grams Conversions', () => {
  const targetCalories = 2000;

  test('converts protein percentage to grams correctly', () => {
    // 30% of 2000 cal = 600 cal / 4 = 150g
    assert.equal(pctToGrams(30, targetCalories, 'protein'), 150);
  });

  test('converts carbs percentage to grams correctly', () => {
    // 50% of 2000 cal = 1000 cal / 4 = 250g
    assert.equal(pctToGrams(50, targetCalories, 'carbs'), 250);
  });

  test('converts fat percentage to grams correctly', () => {
    // 20% of 2000 cal = 400 cal / 9 = 44.44g -> 44g
    assert.equal(pctToGrams(20, targetCalories, 'fat'), 44);
  });

  test('roundtrips percentage -> grams -> percentage without significant drift', () => {
    const originalPct = { p: 35, c: 45, f: 20 };
    const pGrams = pctToGrams(originalPct.p, targetCalories, 'protein');
    const cGrams = pctToGrams(originalPct.c, targetCalories, 'carbs');
    const fGrams = pctToGrams(originalPct.f, targetCalories, 'fat');

    const recoveredP = gramsToPct(pGrams, targetCalories, 'protein');
    const recoveredC = gramsToPct(cGrams, targetCalories, 'carbs');
    const recoveredF = gramsToPct(fGrams, targetCalories, 'fat');

    assert.equal(recoveredP, originalPct.p);
    assert.equal(recoveredC, originalPct.c);
    assert.equal(recoveredF, originalPct.f);
  });
});

describe('Calorie SVG Ring Math', () => {
  const target = 2000;

  test('calculates correct circumference for radius 64', () => {
    assert.ok(Math.abs(CIRC - 402.1238596594935) < 0.0001);
  });

  test('calculates empty ring offset (100% offset = 0% filled) at 0 calories', () => {
    const res = calcRingOffset(0, target);
    assert.equal(res.offset, CIRC);
    assert.equal(res.pct, 0);
    assert.equal(res.isNegative, true); // 0 treated as non-positive
  });

  test('calculates 50% filled ring offset at half target', () => {
    const res = calcRingOffset(1000, target);
    assert.equal(res.offset, CIRC / 2);
    assert.equal(res.pct, 0.5);
    assert.equal(res.isNegative, false);
    assert.equal(res.strokeColor, 'var(--carbs)');
  });

  test('calculates 100% filled ring offset (0 offset) at full target', () => {
    const res = calcRingOffset(2000, target);
    assert.equal(res.offset, 0);
    assert.equal(res.pct, 1);
    assert.equal(res.isNegative, false);
    assert.equal(res.strokeColor, 'var(--carbs)');
  });

  test('clamps offset to 0 and sets danger color when over target', () => {
    const res = calcRingOffset(2500, target);
    assert.equal(res.offset, 0); // clamped at 100% fill
    assert.equal(res.pct, 1);
    assert.equal(res.isNegative, false);
    assert.equal(res.strokeColor, 'var(--danger)');
  });

  test('handles negative net calories with counter-clockwise protein color', () => {
    // E.g. -500 net calories (more burned than consumed)
    const res = calcRingOffset(-500, target);
    const expectedAbsPct = 500 / 2000; // 0.25
    const expectedOffset = CIRC - 0.25 * CIRC;
    assert.equal(res.offset, expectedOffset);
    assert.equal(res.pct, 0.25);
    assert.equal(res.isNegative, true);
    assert.equal(res.strokeColor, 'var(--protein)');
  });
});

describe('Date Formatting and Manipulation Utilities', () => {
  test('pad formats single and double digits correctly', () => {
    assert.equal(pad(0), '00');
    assert.equal(pad(5), '05');
    assert.equal(pad(9), '09');
    assert.equal(pad(10), '10');
    assert.equal(pad(28), '28');
  });

  test('parseDate parses YYYY-MM-DD into a local Date object', () => {
    const d = parseDate('2026-08-28');
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 7); // 0-indexed: August is 7
    assert.equal(d.getDate(), 28);
  });

  test('toKey formats Date object into YYYY-MM-DD string', () => {
    const d = new Date(2026, 7, 28);
    assert.equal(toKey(d), '2026-08-28');

    const earlyMonthDay = new Date(2026, 0, 5); // Jan 5, 2026
    assert.equal(toKey(earlyMonthDay), '2026-01-05');
  });

  test('mondayOf finds the Monday of the current week for various days', () => {
    // 2026-08-28 is a Friday
    // Monday of this week is 2026-08-24
    const friday = parseDate('2026-08-28');
    assert.equal(toKey(mondayOf(friday)), '2026-08-24');

    // Monday itself should return the same day
    const monday = parseDate('2026-08-24');
    assert.equal(toKey(mondayOf(monday)), '2026-08-24');

    // Wednesday should return Monday of the same week
    const wednesday = parseDate('2026-08-26');
    assert.equal(toKey(mondayOf(wednesday)), '2026-08-24');

    // Sunday (2026-08-30) should return Monday 2026-08-24 (Monday-start week)
    const sunday = parseDate('2026-08-30');
    assert.equal(toKey(mondayOf(sunday)), '2026-08-24');

    // Next Monday (2026-08-31) should return 2026-08-31
    const nextMonday = parseDate('2026-08-31');
    assert.equal(toKey(mondayOf(nextMonday)), '2026-08-31');
  });
});

describe('Asynchronous Stale Guard Logic', () => {
  test('discards outdated responses when newer requests are triggered', async () => {
    let currentLoadId = 0;
    const resolvedResults = [];

    async function simulatedLoadDay(dateStr, simulatedLatencyMs) {
      const loadId = ++currentLoadId;
      await new Promise(resolve => setTimeout(resolve, simulatedLatencyMs));
      // Stale guard check
      if (loadId !== currentLoadId) {
        return; // Discard stale response
      }
      resolvedResults.push({ dateStr, loadId });
    }

    // Fire slow request 1 (2026-08-20, takes 50ms)
    const req1 = simulatedLoadDay('2026-08-20', 50);

    // Immediately fire fast request 2 (2026-08-28, takes 10ms)
    const req2 = simulatedLoadDay('2026-08-28', 10);

    await Promise.all([req1, req2]);

    // Only request 2 should have been applied
    assert.equal(resolvedResults.length, 1);
    assert.equal(resolvedResults[0].dateStr, '2026-08-28');
    assert.equal(resolvedResults[0].loadId, 2);
  });
});
