// Synthesizes 28 days of learning aggregates per branch (small samples, like the SPEC examples).
import { canServeIgnoringPresence } from '@/domain/eligibility';
import { roundQuote } from '@/domain/queue/quote';
import { addDays } from '@/domain/time';
import type { AppState, BranchId, DailyAgg, LearningHistory, Visit } from '@/domain/types';
import { between, intBetween, pickOne, poisson, sub, unit, weighted } from './rng';
import { BRAND_MIX } from './seed/services';

export const HISTORY_DAYS = 28;

/** Branch-level desk-time factor per service: configured × 1.1–1.35. */
export function serviceFactor(seed: number, branchId: BranchId, serviceCode: string): number {
  return 1.1 + 0.25 * unit(seed, 'svcFactor', branchId, serviceCode);
}

/** Per-advisor pace: 0.85–1.25 (1 = team average). */
export function advisorPace(seed: number, advisorId: string): number {
  return 0.85 + 0.4 * unit(seed, 'pace', advisorId);
}

const DAILY_VISITS: Readonly<Record<string, number>> = { SVC: 0.62, STD: 0.45, COL: 0.55 };
const WALKIN_OUTCOMES_PER_DAY = 0.72;

function probeVisit(branchId: BranchId, serviceCode: string, brand: string, walkIn: boolean): Visit {
  return {
    id: 'probe',
    branchId,
    date: '',
    kind: walkIn ? 'walk_in' : 'appointment',
    status: 'waiting',
    ticketNo: null,
    customer: { name: null, mobile: '', plate: '', vehicle: '' },
    brand,
    serviceCode,
    booking: null,
    advisorId: null,
    advisorSource: null,
    lateAsWalkIn: false,
    arrivedAt: null,
    quote: null,
    receptionNote: '',
    priorNotes: [],
    visitNote: '',
    bump: null,
    handover: null,
    calls: [],
    firstCalledAt: null,
    calledBy: null,
    startedAt: null,
    servedBy: null,
    endedAt: null,
    endReason: '',
  };
}

export function synthesizeHistory(s: AppState, branchId: BranchId, seed: number): LearningHistory {
  const advisors = Object.values(s.advisors).filter((a) => a.branchId === branchId && a.active);
  const days: DailyAgg[] = [];
  for (let d = HISTORY_DAYS; d >= 1; d--) {
    const date = addDays(s.today, -d);
    const r = sub(seed, 'history', branchId, date);
    const day: DailyAgg = { date, perService: {}, perAdvisor: {}, walkIns: [] };
    for (const code of s.serviceOrder) {
      const svc = s.services[code];
      if (!svc) continue;
      const n = poisson(r, DAILY_VISITS[code] ?? 0.4);
      for (let i = 0; i < n; i++) {
        const mix = BRAND_MIX.filter(([b]) => s.brands.includes(b));
        const brand = mix.length > 0 ? weighted(r, mix) : pickOne(r, s.brands);
        const walkIn = r() < 0.45;
        const probe = probeVisit(branchId, code, brand, walkIn);
        const able = advisors.filter((a) => canServeIgnoringPresence(a, probe, svc, 'own'));
        if (able.length === 0) continue;
        const adv = pickOne(r, able);
        const minutes = svc.expectedMin * serviceFactor(seed, branchId, code) * advisorPace(seed, adv.id) * between(r, 0.85, 1.15);
        const agg = (day.perService[code] ??= { visits: 0, totalMin: 0, byBrand: {} });
        agg.visits++;
        agg.totalMin += minutes;
        const b = (agg.byBrand[brand] ??= { visits: 0, totalMin: 0 });
        b.visits++;
        b.totalMin += minutes;
        const pa = (day.perAdvisor[adv.id] ??= {});
        const pac = (pa[code] ??= { visits: 0, totalMin: 0 });
        pac.visits++;
        pac.totalMin += minutes;
      }
    }
    const outcomes = poisson(r, WALKIN_OUTCOMES_PER_DAY);
    for (let i = 0; i < outcomes; i++) {
      const forecastMin = intBetween(r, 3, 35);
      const ratio = 0.6 + 0.85 * r();
      day.walkIns.push({ forecastMin, quotedMin: roundQuote(forecastMin * 1.2), waitMin: Math.round(forecastMin * ratio) });
    }
    days.push(day);
  }
  return { branchId, days };
}
