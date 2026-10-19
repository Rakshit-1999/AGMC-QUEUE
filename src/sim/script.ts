// Pre-rolled simulation script: arrivals, walk-ins, breaks, roster, same-day bookings, service plans.
import { BREAK_MIN } from '@/domain/constants';
import { compareDesk } from '@/domain/eligibility';
import { expectedDeskMin } from '@/domain/queue/deskTime';
import { atDubai, hhmmToMinutes } from '@/domain/time';
import type {
  AdvisorId,
  AppState,
  BranchId,
  BreakPlan,
  EpochMs,
  RosterPlan,
  SameDayBookingPlan,
  ServicePlan,
  Visit,
  VisitSimPlan,
  WalkInPlan,
} from '@/domain/types';
import { advisorPace } from './history';
import { keyloopRef, type MockBooking } from './keyloopMock';
import { between, intBetween, pickOne, poisson, sub, unit, weighted } from './rng';
import { OFFLINE_ALL_DAY } from './seed/advisors';
import { WALKINS_PER_DAY } from './seed/branches';
import { makeCustomer, PRIOR_NOTES, WALKIN_NOTES } from './seed/people';
import { APPOINTMENT_SERVICE_MIX, BRAND_MIX, WALKIN_SERVICE_MIX } from './seed/services';

const MIN = 60_000;

function hhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

// ---------- roster ----------

export function buildRoster(s: AppState, seed: number): RosterPlan[] {
  const out: RosterPlan[] = [];
  for (const a of Object.values(s.advisors).sort(compareDesk)) {
    const b = s.branches[a.branchId];
    if (!b) continue;
    if (OFFLINE_ALL_DAY.has(a.id)) {
      out.push({ advisorId: a.id, presentFrom: null, presentUntil: null });
      continue;
    }
    const r = sub(seed, 'roster', a.id, s.today);
    const from = atDubai(s.today, b.opensAt) + intBetween(r, -5, 6) * MIN;
    const until = atDubai(s.today, b.closesAt) - intBetween(r, 0, 10) * MIN;
    out.push({ advisorId: a.id, presentFrom: from, presentUntil: until });
  }
  return out;
}

// ---------- appointments ----------

/** Arrival offsets: 55% early −20..−3, 30% −3..+5, 8% +5..+15, 3% +16..+40, 4% never. */
export function planForBooking(seed: number, ref: string, receptionCandidates: AdvisorId[]): VisitSimPlan {
  const r = sub(seed, 'arrival', ref);
  const bucket = weighted(r, [
    ['early', 55],
    ['ontime', 30],
    ['late', 8],
    ['verylate', 3],
    ['never', 4],
  ] as const);
  let arrivalOffsetMin: number | null;
  switch (bucket) {
    case 'early':
      arrivalOffsetMin = intBetween(r, -20, -3);
      break;
    case 'ontime':
      arrivalOffsetMin = intBetween(r, -3, 5);
      break;
    case 'late':
      arrivalOffsetMin = intBetween(r, 5, 15);
      break;
    case 'verylate':
      arrivalOffsetMin = intBetween(r, 16, 40);
      break;
    case 'never':
      arrivalOffsetMin = null;
      break;
  }
  const receptionPick: AdvisorId | 'first_free' | null =
    receptionCandidates.length > 0 && r() < 0.6 ? pickOne(r, receptionCandidates) : 'first_free';
  return { arrivalOffsetMin, receptionPick };
}

/** Advisors a simulated receptionist would pick for an appointment. */
export function receptionCandidates(s: AppState, branchId: BranchId): AdvisorId[] {
  return Object.values(s.advisors)
    .filter((a) => a.branchId === branchId && a.active && !OFFLINE_ALL_DAY.has(a.id) && (a.deskType === 'all' || a.deskType === 'appointments_only'))
    .sort(compareDesk)
    .map((a) => a.id);
}

// ---------- walk-ins ----------

/** Relative walk-in rate per opening hour 07..17 (peaks 08–10 and 16–17). */
const HOURLY_PROFILE: Readonly<Record<number, number>> = {
  7: 0.6, 8: 2.0, 9: 2.2, 10: 1.6, 11: 1.0, 12: 0.8, 13: 0.8, 14: 0.9, 15: 1.1, 16: 1.8, 17: 1.4,
};

export function buildWalkIns(s: AppState, seed: number): WalkInPlan[] {
  const out: WalkInPlan[] = [];
  for (const branchId of s.branchOrder) {
    const b = s.branches[branchId];
    if (!b || !b.active) continue;
    const perDay = WALKINS_PER_DAY[branchId] ?? 15;
    const open = hhmmToMinutes(b.opensAt);
    const close = hhmmToMinutes(b.closesAt) - 20;
    const hours: number[] = [];
    for (let h = Math.floor(open / 60); h * 60 < close; h++) hours.push(h);
    const totalWeight = hours.reduce((n, h) => n + (HOURLY_PROFILE[h] ?? 1), 0);
    const r = sub(seed, 'walkins', branchId, s.today);
    let n = 0;
    for (const h of hours) {
      const from = Math.max(open, h * 60);
      const to = Math.min(close, h * 60 + 60);
      if (to <= from) continue;
      const lambda = (perDay * (HOURLY_PROFILE[h] ?? 1)) / totalWeight * ((to - from) / 60);
      const count = poisson(r, lambda);
      const times: number[] = [];
      for (let i = 0; i < count; i++) times.push(from + r() * (to - from));
      times.sort((a, c) => a - c);
      for (const m of times) {
        const services = WALKIN_SERVICE_MIX.filter(([c]) => s.services[c]?.active);
        const serviceCode = services.length > 0 ? weighted(r, services) : pickOne(r, s.serviceOrder);
        const brands = BRAND_MIX.filter(([x]) => s.brands.includes(x));
        const brand = brands.length > 0 ? weighted(r, brands) : pickOne(r, s.brands);
        n++;
        out.push({
          id: `wp_${branchId}_${String(n).padStart(3, '0')}`,
          branchId,
          at: atDubai(s.today, '00:00') + Math.round(m * 60) * 1000,
          serviceCode,
          brand,
          customer: makeCustomer(r, brand, { anonymousShare: 0.12, noMobileShare: 0.08 }),
          note: pickOne(r, WALKIN_NOTES),
          issuedVisitId: null,
        });
      }
    }
  }
  return out.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

// ---------- breaks ----------

export function buildBreaks(s: AppState, seed: number, roster: RosterPlan[]): BreakPlan[] {
  const out: BreakPlan[] = [];
  const byBranch = new Map<BranchId, number>();
  for (const rp of roster) {
    if (rp.presentFrom === null) continue;
    const a = s.advisors[rp.advisorId];
    if (!a) continue;
    const idx = byBranch.get(a.branchId) ?? 0;
    byBranch.set(a.branchId, idx + 1);
    const r = sub(seed, 'breaks', a.id, s.today);
    const day = (hm: string): EpochMs => atDubai(s.today, hm);
    if (r() < 0.75) {
      out.push(plan(a.id, 'coffee', day(hhmm(9 * 60 + 30 + intBetween(r, 0, 75))), 'Coffee'));
    }
    if (r() < 0.4) {
      out.push(plan(a.id, 'prayer', day(hhmm(12 * 60 + intBetween(r, 0, 20))), 'Prayer'));
    }
    out.push(plan(a.id, 'lunch', day(hhmm(12 * 60 + 30 + ((idx * 20) % 90) + intBetween(r, 0, 5))), 'Lunch'));
  }
  return out.sort((x, y) => x.at - y.at || x.id.localeCompare(y.id));

  function plan(advisorId: AdvisorId, kind: string, at: EpochMs, reason: BreakPlan['reason']): BreakPlan {
    return { id: `bp_${advisorId}_${kind}`, advisorId, at, reason, durationMin: BREAK_MIN[reason], startedAt: null, endedAt: null };
  }
}

// ---------- same-day bookings ----------

export interface SameDayAdd {
  booking: MockBooking;
}
export interface SameDayMove {
  keyloopRef: string;
  slotAt: EpochMs;
}
export interface SameDayCancel {
  keyloopRef: string;
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}
export function asSameDayAdd(p: unknown): SameDayAdd | null {
  return isObj(p) && isObj(p.booking) && typeof p.booking.keyloopRef === 'string' ? (p as unknown as SameDayAdd) : null;
}
export function asSameDayMove(p: unknown): SameDayMove | null {
  return isObj(p) && typeof p.keyloopRef === 'string' && typeof p.slotAt === 'number' ? (p as unknown as SameDayMove) : null;
}
export function asSameDayCancel(p: unknown): SameDayCancel | null {
  return isObj(p) && typeof p.keyloopRef === 'string' ? (p as unknown as SameDayCancel) : null;
}

/** About 4 adds, 2 moves, 1 cancel per branch. `existing` = today's loaded bookings per branch. */
export function buildSameDay(s: AppState, seed: number, existing: Record<BranchId, MockBooking[]>): SameDayBookingPlan[] {
  const out: SameDayBookingPlan[] = [];
  for (const branchId of s.branchOrder) {
    const b = s.branches[branchId];
    const list = existing[branchId] ?? [];
    if (!b || !b.active || list.length === 0) continue;
    const r = sub(seed, 'sameday', branchId, s.today);
    const open = hhmmToMinutes(b.opensAt);
    const lastSlot = hhmmToMinutes(b.closesAt) - 60;
    const bookedAtMin = (): number => open + intBetween(r, 10, 7 * 60);
    let seq = list.length;
    for (let i = 0; i < 4; i++) {
      const at = bookedAtMin();
      const slotMin = Math.ceil((at + intBetween(r, 45, 150)) / 15) * 15;
      if (slotMin > lastSlot) continue;
      const services = APPOINTMENT_SERVICE_MIX.filter(([c]) => s.services[c]?.active);
      const serviceCode = services.length > 0 ? weighted(r, services) : pickOne(r, s.serviceOrder);
      const brands = BRAND_MIX.filter(([x]) => s.brands.includes(x));
      const brand = brands.length > 0 ? weighted(r, brands) : pickOne(r, s.brands);
      seq++;
      const booking: MockBooking = {
        keyloopRef: keyloopRef(b.code, s.today, seq),
        slotAt: atDubai(s.today, hhmm(slotMin)),
        serviceCode,
        brand,
        customer: makeCustomer(r, brand),
        keyloopAdvisorId: null,
        priorNotes: r() < 0.3 ? [pickOne(r, PRIOR_NOTES)] : [],
      };
      out.push({ id: `sd_${branchId}_add_${i + 1}`, branchId, bookedAt: atDubai(s.today, hhmm(at)), kind: 'add', payload: { booking } satisfies SameDayAdd });
    }
    const usedRefs = new Set<string>();
    const pickExisting = (after: EpochMs): MockBooking | null => {
      const options = list.filter((x) => x.slotAt > after && !usedRefs.has(x.keyloopRef));
      if (options.length === 0) return null;
      const x = pickOne(r, options);
      usedRefs.add(x.keyloopRef);
      return x;
    };
    for (let i = 0; i < 2; i++) {
      const at = atDubai(s.today, hhmm(bookedAtMin()));
      const x = pickExisting(at + 60 * MIN);
      if (!x) continue;
      const slotAt = Math.min(x.slotAt + intBetween(r, 2, 8) * 15 * MIN, atDubai(s.today, hhmm(lastSlot)));
      out.push({ id: `sd_${branchId}_move_${i + 1}`, branchId, bookedAt: at, kind: 'move', payload: { keyloopRef: x.keyloopRef, slotAt } satisfies SameDayMove });
    }
    {
      const at = atDubai(s.today, hhmm(bookedAtMin()));
      const x = pickExisting(at + 30 * MIN);
      if (x) out.push({ id: `sd_${branchId}_cancel_1`, branchId, bookedAt: at, kind: 'cancel', payload: { keyloopRef: x.keyloopRef } satisfies SameDayCancel });
    }
  }
  return out.sort((a, b) => a.bookedAt - b.bookedAt || a.id.localeCompare(b.id));
}

// ---------- per-visit service plan ----------

/**
 * Desk minutes = learned base × advisor pace × noise 0.7–1.5; walk 20–75 s; 3% missed calls; 2% transfers.
 * Deterministic per (seed, visit, advisor).
 */
export function servicePlanFor(s: AppState, seed: number, v: Visit, advisorId: AdvisorId): ServicePlan {
  const r = sub(seed, 'service', v.id);
  const base = expectedDeskMin(s, v.branchId, v.serviceCode, v.brand, null);
  const deskMin = Math.max(2, base * advisorPace(seed, advisorId) * between(r, 0.7, 1.5));
  const walkSec = intBetween(r, 20, 75);
  const missesCall = r() < 0.03;
  const transferAtFrac = r() < 0.02 ? between(r, 0.3, 0.6) : null;
  return { deskMin: Math.round(deskMin * 10) / 10, walkSec, missesCall, transferAtFrac };
}

/** Idle "think time" before a simulated advisor calls the next customer: 10–40 s. */
export function thinkSec(seed: number, advisorId: AdvisorId, idleSince: EpochMs): number {
  return 10 + Math.floor(unit(seed, 'think', advisorId, Math.floor(idleSince / MIN)) * 31);
}
