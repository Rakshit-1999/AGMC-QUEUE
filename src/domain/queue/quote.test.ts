import { describe, expect, it } from 'vitest';
import { addAdvisor, at, baseState, MIN } from '@/test/fixtures';
import { DEFAULT_RULES } from '../constants';
import type { LearningSnapshot } from '../types';
import { learnedMarginPct } from './learning';
import { marginFor, quotedMinutes, quoteWalkIn, roundQuote, walkInOptions } from './quote';
import { shrinkToward } from './deskTime';

function snapWith(sampleSize: number, marginPct: number): LearningSnapshot {
  return {
    branchId: 'b1',
    computedAt: 0,
    windowDays: 28,
    services: {},
    advisors: {},
    quote: { sampleSize, marginPct, keptPct: null, driftTypicalMin: 0, driftP80Min: 0, histogram: [0, 0, 0, 0, 0, 0], brokenAvgOverMin: null },
  };
}

describe('quote formula', () => {
  it('reproduces the SPEC examples', () => {
    expect(quotedMinutes(11, 32)).toBe(15); // "Forecast 11 min + 32% margin" -> "About 15 min"
    expect(quotedMinutes(5, 4)).toBe(10); // "forecast 5′ → told 10′"
    expect(quotedMinutes(15, 4)).toBe(20);
    expect(quotedMinutes(30, 4)).toBe(35);
    expect(quotedMinutes(60, 4)).toBe(65);
  });

  it('rounds up to 5 with a 5-minute minimum', () => {
    expect(roundQuote(0)).toBe(5);
    expect(roundQuote(5)).toBe(5);
    expect(roundQuote(5.01)).toBe(10);
    expect(roundQuote(15)).toBe(15);
    expect(roundQuote(14.52)).toBe(15);
  });

  it('uses a fixed 20% margin when learning is off or under 5 samples', () => {
    expect(marginFor(snapWith(20, 32), { ...DEFAULT_RULES, learnDays: 0 })).toEqual({ marginPct: 20, sampleSize: 0, learningOff: true });
    expect(marginFor(snapWith(4, 32), DEFAULT_RULES)).toEqual({ marginPct: 20, sampleSize: 4, learningOff: false });
    expect(marginFor(snapWith(20, 32), DEFAULT_RULES)).toEqual({ marginPct: 32, sampleSize: 20, learningOff: false });
  });

  it('learns the margin as the target quantile of wait / forecast', () => {
    const outcomes = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3].map((r) => ({ forecastMin: 10, quotedMin: 15, waitMin: 10 * r }));
    // 80th percentile of ratios 0.8..1.3 = 1.2 -> 20%
    expect(learnedMarginPct(outcomes, 80)).toBe(20);
    expect(learnedMarginPct([{ forecastMin: 10, quotedMin: 10, waitMin: 2 }], 80)).toBe(0); // clamped at 0
  });

  it('shrinks measured desk time toward configured (SPEC: 25 configured, 33 measured over 17 -> 31)', () => {
    expect(Math.round(shrinkToward(25, 33, 17))).toBe(31);
  });
});

describe('quoteWalkIn / walkInOptions', () => {
  it('quotes about 5 min when an advisor is free now', () => {
    const s = baseState();
    addAdvisor(s, 'a1', 1);
    const q = quoteWalkIn(s, { branchId: 'b1', serviceCode: 'SVC', brand: 'BMW', advisorId: null }, at('09:00'));
    expect(q).not.toBeNull();
    expect(q?.forecastMin).toBe(0);
    expect(q?.quotedMin).toBe(5);
    expect(q?.calledBy).toBe(at('09:05'));
    expect(q?.learningOff).toBe(true);
  });

  it('returns null and noneCanTake when nobody handles the brand/service', () => {
    const s = baseState();
    addAdvisor(s, 'mini', 1, { brands: ['MINI'] });
    expect(quoteWalkIn(s, { branchId: 'b1', serviceCode: 'SVC', brand: 'BMW', advisorId: null }, at('09:00'))).toBeNull();
    const opts = walkInOptions(s, 'b1', 'SVC', 'BMW', at('09:00'));
    expect(opts.noneCanTake).toBe(true);
    expect(opts.presentCount).toBe(1);
  });

  it('lists eligible advisors soonest first, then "Whoever is free first"', () => {
    // Swap off: a walk-in chosen for a1 waits for a1 (with swap on, a2 would cover at once and both tie).
    const s = baseState({ swapAdvisorMin: 0 });
    addAdvisor(s, 'a1', 1, { presence: 'break', breakReason: 'Lunch', presenceSince: at('09:00') });
    addAdvisor(s, 'a2', 2);
    const opts = walkInOptions(s, 'b1', 'STD', 'BMW', at('09:10'));
    expect(opts.rows.map((r) => r.advisorId)).toEqual(['a2', 'a1', null]);
    expect(opts.rows[0]?.soonest).toBe(true);
    expect(opts.defaultAdvisorId).toBe('a2');
    // a1 is on lunch until 09:45, but at 25 min the walk-in reaches the hard ceiling and a2 takes it:
    // forecast 25 -> 25 × 1.2 = 30
    expect(opts.rows[1]?.quote.forecastMin).toBe(25);
    expect(opts.rows[1]?.quote.quotedMin).toBe(30);
    expect(opts.rows[1]?.quote.longWait).toBe(true);
    expect(opts.rows[2]?.quote.quotedMin).toBe(5);
  });

  it('flags long waits (>= 30) and after-closing finishes', () => {
    const s = baseState({ swapAdvisorMin: 0 });
    addAdvisor(s, 'a1', 1, { presence: 'break', breakReason: 'Lunch', presenceSince: at('17:20') });
    const q = quoteWalkIn(s, { branchId: 'b1', serviceCode: 'SVC', brand: 'BMW', advisorId: 'a1' }, at('17:20'));
    expect(q?.longWait).toBe(true);
    expect(q?.afterClosing).toBe(true);
    expect((q?.calledBy ?? 0) - at('17:20')).toBe((q?.quotedMin ?? 0) * MIN);
  });
});
