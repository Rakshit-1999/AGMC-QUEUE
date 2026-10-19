// Learning snapshot: desk times and the wait-quote margin from history + today.
import { PRIOR_WEIGHT_VISITS } from '../constants';
import { queuesAsWalkIn } from '../eligibility';
import { addDays, dubaiDate } from '../time';
import type {
  AdvisorId,
  Branch,
  BrandCode,
  EpochMs,
  LearningHistory,
  LearningSnapshot,
  ServiceCode,
  ServiceType,
  Visit,
  WalkInOutcome,
} from '../types';
import { shrinkFactor, shrinkToward } from './deskTime';

const MIN = 60_000;

/** Linear-interpolated quantile of an unsorted list (q in 0..1). */
export function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = Math.min(1, Math.max(0, q)) * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo] ?? 0;
  const b = sorted[hi] ?? a;
  return a + (b - a) * (pos - lo);
}

/** Margin so that `targetPct`% of walk-ins are called by the time told. */
export function learnedMarginPct(outcomes: WalkInOutcome[], targetPct: number): number {
  if (outcomes.length === 0) return 0;
  const ratios = outcomes.map((o) => o.waitMin / Math.max(o.forecastMin, 1));
  const m = Math.round((quantile(ratios, targetPct / 100) - 1) * 100);
  return Math.min(100, Math.max(0, m));
}

/** Histogram bins of (wait - told): 10+ sooner, 5–10 sooner, 0–5 sooner, 1–5 later, 5–10 later, 10+ later. */
export function promiseHistogram(outcomes: WalkInOutcome[]): [number, number, number, number, number, number] {
  const h: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
  for (const o of outcomes) {
    const d = o.waitMin - o.quotedMin; // > 0: later than told
    if (d <= -10) h[0]++;
    else if (d <= -5) h[1]++;
    else if (d <= 0) h[2]++;
    else if (d <= 5) h[3]++;
    else if (d <= 10) h[4]++;
    else h[5]++;
  }
  return h;
}

/** Today's finished visit as a learning sample (desk minutes), or null. */
function deskSample(v: Visit): number | null {
  if (v.status !== 'done' || v.startedAt === null || v.endedAt === null) return null;
  return Math.max(0, (v.endedAt - v.startedAt) / MIN);
}

/** Today's walk-in outcome (quote vs first call), or null. */
export function walkInOutcomeOf(v: Visit): WalkInOutcome | null {
  if (!queuesAsWalkIn(v) || !v.quote || v.firstCalledAt === null || v.arrivedAt === null) return null;
  return {
    forecastMin: v.quote.forecastMin,
    quotedMin: v.quote.quotedMin,
    waitMin: Math.max(0, (v.firstCalledAt - v.arrivedAt) / MIN),
  };
}

/**
 * Window = the last `learnDays` days of history plus today's visits. `todayDone` may contain any of
 * today's visits; only finished ones count for desk times and first-called walk-ins for quotes.
 */
export function computeLearning(
  history: LearningHistory,
  todayDone: Visit[],
  branch: Branch,
  services: Record<ServiceCode, ServiceType>,
  now: EpochMs,
): LearningSnapshot {
  const days = branch.rules.learnDays;
  const snap: LearningSnapshot = {
    branchId: branch.id,
    computedAt: now,
    windowDays: days,
    services: {},
    advisors: {},
    quote: {
      sampleSize: 0,
      marginPct: 0,
      keptPct: null,
      driftTypicalMin: 0,
      driftP80Min: 0,
      histogram: [0, 0, 0, 0, 0, 0],
      brokenAvgOverMin: null,
    },
  };
  for (const svc of Object.values(services)) {
    snap.services[svc.code] = {
      configuredMin: svc.expectedMin,
      measuredMin: null,
      visits: 0,
      nowUsingMin: svc.expectedMin,
      byBrand: {},
    };
  }
  if (days === 0) return snap;

  const end = dubaiDate(now);
  const start = addDays(end, -days);
  const windowDays = history.days.filter((d) => d.date >= start && d.date < end);

  // Aggregate desk times.
  const perSvc: Record<ServiceCode, { visits: number; total: number; byBrand: Record<BrandCode, { visits: number; total: number }> }> = {};
  const perAdv: Record<AdvisorId, Record<ServiceCode, { visits: number; total: number }>> = {};
  const addSvc = (code: ServiceCode, visits: number, total: number): void => {
    const a = (perSvc[code] ??= { visits: 0, total: 0, byBrand: {} });
    a.visits += visits;
    a.total += total;
  };
  const addBrand = (code: ServiceCode, brand: BrandCode, visits: number, total: number): void => {
    const a = (perSvc[code] ??= { visits: 0, total: 0, byBrand: {} });
    const b = (a.byBrand[brand] ??= { visits: 0, total: 0 });
    b.visits += visits;
    b.total += total;
  };
  const addAdv = (adv: AdvisorId, code: ServiceCode, visits: number, total: number): void => {
    const m = (perAdv[adv] ??= {});
    const a = (m[code] ??= { visits: 0, total: 0 });
    a.visits += visits;
    a.total += total;
  };
  const outcomes: WalkInOutcome[] = [];
  for (const d of windowDays) {
    for (const [code, agg] of Object.entries(d.perService)) {
      addSvc(code, agg.visits, agg.totalMin);
      for (const [brand, b] of Object.entries(agg.byBrand)) addBrand(code, brand, b.visits, b.totalMin);
    }
    for (const [adv, m] of Object.entries(d.perAdvisor)) {
      for (const [code, a] of Object.entries(m)) addAdv(adv, code, a.visits, a.totalMin);
    }
    outcomes.push(...d.walkIns);
  }
  for (const v of todayDone) {
    const m = deskSample(v);
    if (m !== null) {
      addSvc(v.serviceCode, 1, m);
      addBrand(v.serviceCode, v.brand, 1, m);
      if (v.servedBy) addAdv(v.servedBy, v.serviceCode, 1, m);
    }
    const o = walkInOutcomeOf(v);
    if (o) outcomes.push(o);
  }

  for (const [code, agg] of Object.entries(perSvc)) {
    const target = snap.services[code];
    if (!target || agg.visits <= 0) continue;
    const measured = agg.total / agg.visits;
    target.measuredMin = measured;
    target.visits = agg.visits;
    target.nowUsingMin = shrinkToward(target.configuredMin, measured, agg.visits, PRIOR_WEIGHT_VISITS);
    for (const [brand, b] of Object.entries(agg.byBrand)) {
      if (brand && b.visits > 0) target.byBrand[brand] = { measuredMin: b.total / b.visits, visits: b.visits };
    }
  }
  for (const [adv, m] of Object.entries(perAdv)) {
    const out: Record<ServiceCode, { visits: number; theirMin: number; teamMin: number; factor: number }> = {};
    for (const [code, a] of Object.entries(m)) {
      const team = snap.services[code]?.measuredMin ?? snap.services[code]?.configuredMin;
      if (!team || a.visits <= 0) continue;
      const theirMin = a.total / a.visits;
      out[code] = { visits: a.visits, theirMin, teamMin: team, factor: shrinkFactor(theirMin / team, a.visits) };
    }
    snap.advisors[adv] = out;
  }

  const n = outcomes.length;
  snap.quote.sampleSize = n;
  if (n > 0) {
    snap.quote.marginPct = learnedMarginPct(outcomes, branch.rules.promiseTargetPct);
    snap.quote.keptPct = outcomes.filter((o) => o.waitMin <= o.quotedMin).length / n;
    snap.quote.driftTypicalMin = quantile(outcomes.map((o) => o.waitMin - o.forecastMin), 0.5);
    snap.quote.driftP80Min = quantile(outcomes.map((o) => Math.abs(o.waitMin - o.forecastMin)), 0.8);
    snap.quote.histogram = promiseHistogram(outcomes);
    const broken = outcomes.filter((o) => o.waitMin > o.quotedMin);
    snap.quote.brokenAvgOverMin =
      broken.length > 0 ? broken.reduce((t, o) => t + (o.waitMin - o.quotedMin), 0) / broken.length : null;
  }
  return snap;
}
