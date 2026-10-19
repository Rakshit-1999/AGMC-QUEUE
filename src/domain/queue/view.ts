// QueueView: the snapshot the engine works on (pickNext, projection, quotes).
import { BREAK_MIN, CALL_TO_START_MIN } from '../constants';
import { branchAdvisors, queuesAsWalkIn } from '../eligibility';
import type {
  Advisor,
  AdvisorId,
  AdvisorLiveState,
  AppState,
  Branch,
  BranchId,
  BrandCode,
  EpochMs,
  QueueRules,
  ServiceCode,
  ServiceType,
  Visit,
} from '../types';
import { expectedDeskMin } from './deskTime';

const MIN = 60_000;

export interface QueueView {
  branch: Branch;
  services: Record<ServiceCode, ServiceType>;
  advisors: Advisor[]; // active advisors of the branch
  waiting: Visit[]; // status 'waiting' (+ virtual items in projection)
  upcomingAppts: Visit[]; // booked/waiting appts, not yet called, slot today
  busyUntil: Record<AdvisorId, EpochMs>; // estimateFreeAt per advisor (Infinity = offline)
  liveState: Record<AdvisorId, AdvisorLiveState>;
  deskMin: (serviceCode: ServiceCode, brand: BrandCode, advisorId: AdvisorId | null) => number;
}

/** Walk-in-like: arrivedAt; appointment: max(slotAt, arrivedAt). */
export function waitStartAt(v: Visit): EpochMs {
  const arrived = v.arrivedAt ?? 0;
  if (queuesAsWalkIn(v) || !v.booking) return arrived;
  return Math.max(v.booking.slotAt, arrived);
}

/** Whole minutes waited (floored, >= 0). Walk-ins: since arrival. */
export function waitedMin(v: Visit, now: EpochMs): number {
  if (v.arrivedAt === null) return 0;
  return Math.max(0, Math.floor((now - waitStartAt(v)) / MIN));
}

/** Appointment is due once now >= slot - earlyWindow. */
export function isDue(v: Visit, rules: QueueRules, now: EpochMs): boolean {
  if (!v.booking) return false;
  return now >= v.booking.slotAt - rules.earlyWindowMin * MIN;
}

/** Visit currently called by or served by this advisor. */
export function currentVisitOf(s: AppState, advisorId: AdvisorId): Visit | null {
  for (const v of Object.values(s.visits)) {
    if (v.status === 'called' && v.calledBy === advisorId) return v;
    if (v.status === 'serving' && v.servedBy === advisorId) return v;
  }
  return null;
}

function liveFrom(a: Advisor, current: Visit | null): AdvisorLiveState {
  if (!a.active) return 'offline';
  if (current?.status === 'serving') return 'serving';
  if (current?.status === 'called') return 'calling';
  return a.presence;
}

/** called visit with calledBy=me -> 'calling'; serving with servedBy=me -> 'serving'; else presence. */
export function advisorLiveState(s: AppState, advisorId: AdvisorId): AdvisorLiveState {
  const a = s.advisors[advisorId];
  if (!a) return 'offline';
  return liveFrom(a, currentVisitOf(s, advisorId));
}

function freeAtFor(s: AppState, a: Advisor, current: Visit | null, now: EpochMs): EpochMs {
  if (!a.active || a.presence === 'offline') return current ? busyWith(s, a, current, now) : Infinity;
  if (current) return busyWith(s, a, current, now);
  if (a.presence === 'break') {
    const len = a.breakReason ? BREAK_MIN[a.breakReason] : 15;
    return Math.max(now + MIN, a.presenceSince + len * MIN);
  }
  return now;
}

function busyWith(s: AppState, a: Advisor, v: Visit, now: EpochMs): EpochMs {
  const desk = expectedDeskMin(s, v.branchId, v.serviceCode, v.brand, a.id);
  if (v.status === 'serving') return Math.max(now + MIN, (v.startedAt ?? now) + desk * MIN);
  return now + (CALL_TO_START_MIN + desk) * MIN;
}

/**
 * available+idle: now; serving: max(now + 1min, startedAt + deskMin); calling: now + walk(1 min) + deskMin;
 * break: max(now + 1min, presenceSince + BREAK_MIN[reason]); offline/inactive: Infinity.
 */
export function estimateFreeAt(s: AppState, advisorId: AdvisorId, now: EpochMs): EpochMs {
  const a = s.advisors[advisorId];
  if (!a) return Infinity;
  return freeAtFor(s, a, currentVisitOf(s, advisorId), now);
}

/** Visits of a branch for the state's current day. */
export function branchDayVisits(s: AppState, branchId: BranchId, date: string = s.today): Visit[] {
  const out: Visit[] = [];
  for (const v of Object.values(s.visits)) if (v.branchId === branchId && v.date === date) out.push(v);
  return out;
}

export function buildQueueView(s: AppState, branchId: BranchId, now: EpochMs): QueueView {
  const branch = s.branches[branchId];
  if (!branch) throw new Error(`Unknown branch ${branchId}`);
  const advisors = branchAdvisors(s, branchId);
  const visits = branchDayVisits(s, branchId);
  const current = new Map<AdvisorId, Visit>();
  const waiting: Visit[] = [];
  const upcomingAppts: Visit[] = [];
  for (const v of visits) {
    if (v.status === 'called' && v.calledBy) current.set(v.calledBy, v);
    else if (v.status === 'serving' && v.servedBy) current.set(v.servedBy, v);
    if (v.status === 'waiting') waiting.push(v);
    if (v.kind === 'appointment' && !v.lateAsWalkIn && v.booking && (v.status === 'booked' || v.status === 'waiting')) {
      upcomingAppts.push(v);
    }
  }
  upcomingAppts.sort((a, b) => (a.booking?.slotAt ?? 0) - (b.booking?.slotAt ?? 0));
  const busyUntil: Record<AdvisorId, EpochMs> = {};
  const liveState: Record<AdvisorId, AdvisorLiveState> = {};
  for (const a of advisors) {
    const cur = current.get(a.id) ?? null;
    liveState[a.id] = liveFrom(a, cur);
    busyUntil[a.id] = freeAtFor(s, a, cur, now);
  }
  const cache = new Map<string, number>();
  const deskMin = (serviceCode: ServiceCode, brand: BrandCode, advisorId: AdvisorId | null): number => {
    const key = `${serviceCode}|${brand}|${advisorId ?? ''}`;
    let m = cache.get(key);
    if (m === undefined) {
      m = expectedDeskMin(s, branchId, serviceCode, brand, advisorId);
      cache.set(key, m);
    }
    return m;
  };
  return { branch, services: s.services, advisors, waiting, upcomingAppts, busyUntil, liveState, deskMin };
}

/**
 * Earliest upcoming appointment (booked or waiting, not lateAsWalkIn) with advisorId === me
 * and slot >= t - grace.
 */
export function nextAppointmentFor(view: QueueView, advisorId: AdvisorId, t: EpochMs): Visit | null {
  const from = t - view.branch.rules.graceMin * MIN;
  let best: Visit | null = null;
  for (const v of view.upcomingAppts) {
    if (v.advisorId !== advisorId || v.lateAsWalkIn || !v.booking) continue;
    if (v.status !== 'booked' && v.status !== 'waiting') continue;
    if (v.booking.slotAt < from) continue;
    if (!best || v.booking.slotAt < (best.booking?.slotAt ?? Infinity)) best = v;
  }
  return best;
}

/** next = nextAppointmentFor(...); !next || t + 1 + deskMin(v, me) + safetyBufferMin <= next.slotAt (minutes). */
export function fitsBefore(view: QueueView, advisorId: AdvisorId, v: Visit, t: EpochMs): boolean {
  const next = nextAppointmentFor(view, advisorId, t);
  if (!next?.booking) return true;
  const need = CALL_TO_START_MIN + view.deskMin(v.serviceCode, v.brand, advisorId) + view.branch.rules.safetyBufferMin;
  return t + need * MIN <= next.booking.slotAt;
}
