// Full-queue projection: call order and estimated call times (bounded discrete-event simulation).
import {
  CALL_TO_START_MIN,
  PROJECTION_CACHE_MS,
  PROJECTION_HORIZON_AFTER_CLOSE_MIN,
  PROJECTION_IDLE_STEP_MIN,
  PROJECTION_MAX_ITER,
} from '../constants';
import { canServe, queuesAsWalkIn } from '../eligibility';
import { atDubai, dubaiDate } from '../time';
import type { AdvisorId, AdvisorLiveState, AppState, BranchId, EpochMs, NextReasonCode, Visit, VisitId } from '../types';
import { pickNext } from './pickNext';
import { buildQueueView, type QueueView } from './view';

const MIN = 60_000;

export interface ProjectedCall {
  visitId: VisitId;
  position: number; // 1-based, in call order
  advisorId: AdvisorId | null; // projected caller; null = "No advisor available" before horizon
  estCallAt: EpochMs | null;
  reason: NextReasonCode | null;
  covering: boolean; // projected caller !== visit.advisorId (and visit.advisorId !== null)
}
export interface Projection {
  branchId: BranchId;
  at: EpochMs;
  order: ProjectedCall[]; // all waiting visits; unplaceable ones last, by arrival
  byVisit: Record<VisitId, ProjectedCall>;
  advisorFreeAt: Record<AdvisorId, EpochMs>;
}

const cache = new WeakMap<AppState, Map<string, Projection>>();

/** Memoized per (state object, branch, 5 s bucket). Committed states are immutable. */
export function projectQueue(s: AppState, branchId: BranchId, now: EpochMs): Projection {
  const key = `${s.rev}|${branchId}|${Math.floor(now / PROJECTION_CACHE_MS)}`;
  let perState = cache.get(s);
  if (!perState) {
    perState = new Map();
    cache.set(s, perState);
  }
  const hit = perState.get(key);
  if (hit) return hit;
  const p = projectQueueView(buildQueueView(s, branchId, now), now);
  for (const k of perState.keys()) if (k.split('|')[1] === branchId) perState.delete(k);
  perState.set(key, p);
  return p;
}

/**
 * Projection over a view. `extra` are hypothetical visits (status 'waiting', arrivedAt set),
 * placed like real waiting visits; used for quotes.
 */
export function projectQueueView(view: QueueView, now: EpochMs, extra: Visit[] = []): Projection {
  const rules = view.branch.rules;
  const grace = rules.graceMin * MIN;
  const extraIds = new Set(extra.map((v) => v.id));
  const real: Visit[] = [...view.waiting.filter((v) => !extraIds.has(v.id)), ...extra];
  const realIds = new Set(real.map((v) => v.id));

  // Virtual arrivals: booked appointments assumed to arrive at their slot.
  const virtual: Visit[] = [];
  for (const v of view.upcomingAppts) {
    if (v.status !== 'booked' || !v.booking || extraIds.has(v.id)) continue;
    if (v.booking.slotAt < now - grace) continue;
    virtual.push({ ...v, status: 'waiting', arrivedAt: Math.max(v.booking.slotAt, now) });
  }

  const order = view.advisors.map((a) => a.id);
  const freeAt: Record<AdvisorId, EpochMs> = {};
  for (const a of view.advisors) {
    const st = view.liveState[a.id];
    const f = view.busyUntil[a.id] ?? Infinity;
    freeAt[a.id] = st === 'offline' && f === Infinity ? Infinity : f;
  }
  const advisorFreeAt: Record<AdvisorId, EpochMs> = { ...freeAt };

  // Visits nobody present can ever serve are unplaceable up front.
  const servable = (v: Visit): boolean => {
    const svc = view.services[v.serviceCode];
    if (!svc) return false;
    return view.advisors.some(
      (a) =>
        Number.isFinite(freeAt[a.id] ?? Infinity) &&
        canServe(a, v, svc, v.advisorId === null || v.advisorId === a.id ? 'own' : 'cover'),
    );
  };
  const need = new Set(real.filter(servable).map((v) => v.id));

  const placed = new Set<VisitId>();
  const calls: { visit: Visit; advisorId: AdvisorId; at: EpochMs; reason: NextReasonCode }[] = [];
  const closeLimit = atDubai(dubaiDate(now), view.branch.closesAt) + PROJECTION_HORIZON_AFTER_CLOSE_MIN * MIN;
  const allVisits = [...real, ...virtual];

  let iter = 0;
  let remaining = need.size;
  while (remaining > 0 && iter < PROJECTION_MAX_ITER) {
    iter++;
    // Advisor with the smallest freeAt (ties: desk order).
    let a: AdvisorId | null = null;
    let t = Infinity;
    for (const id of order) {
      const f = freeAt[id] ?? Infinity;
      if (f < t) {
        t = f;
        a = id;
      }
    }
    if (a === null || !Number.isFinite(t) || t > closeLimit) break;
    const at = Math.max(t, now);
    const v = viewAt(view, at, real, virtual, placed, freeAt);
    const p = pickNext(v, a, at, placed);
    if (p) {
      const visit = allVisits.find((x) => x.id === p.visitId);
      placed.add(p.visitId);
      if (visit) {
        if (realIds.has(visit.id)) {
          calls.push({ visit, advisorId: a, at, reason: p.reason });
          if (need.has(visit.id)) remaining--;
        }
        freeAt[a] = at + (CALL_TO_START_MIN + view.deskMin(visit.serviceCode, visit.brand, a)) * MIN;
      }
    } else {
      freeAt[a] = nextInterestingTime(view, at, a, real, virtual, placed, freeAt);
    }
  }

  const out: ProjectedCall[] = [];
  const byVisit: Record<VisitId, ProjectedCall> = {};
  calls.sort((x, y) => x.at - y.at);
  for (const c of calls) {
    const pc: ProjectedCall = {
      visitId: c.visit.id,
      position: out.length + 1,
      advisorId: c.advisorId,
      estCallAt: c.at,
      reason: c.reason,
      covering: c.visit.advisorId !== null && c.visit.advisorId !== c.advisorId,
    };
    out.push(pc);
    byVisit[pc.visitId] = pc;
  }
  const unplaced = real.filter((v) => !byVisit[v.id]).sort((x, y) => (x.arrivedAt ?? 0) - (y.arrivedAt ?? 0));
  for (const v of unplaced) {
    const pc: ProjectedCall = {
      visitId: v.id,
      position: out.length + 1,
      advisorId: null,
      estCallAt: null,
      reason: null,
      covering: false,
    };
    out.push(pc);
    byVisit[pc.visitId] = pc;
  }
  return { branchId: view.branch.id, at: now, order: out, byVisit, advisorFreeAt };
}

/** The view as it would look at virtual time t. */
function viewAt(
  base: QueueView,
  t: EpochMs,
  real: Visit[],
  virtual: Visit[],
  placed: ReadonlySet<VisitId>,
  freeAt: Record<AdvisorId, EpochMs>,
): QueueView {
  const waiting: Visit[] = [];
  for (const v of real) if (!placed.has(v.id) && (v.arrivedAt ?? 0) <= t) waiting.push(v);
  for (const v of virtual) if (!placed.has(v.id) && (v.arrivedAt ?? 0) <= t) waiting.push(v);
  const upcomingAppts = base.upcomingAppts.filter((v) => !placed.has(v.id));
  const liveState: Record<AdvisorId, AdvisorLiveState> = {};
  for (const a of base.advisors) {
    const orig = base.liveState[a.id] ?? 'offline';
    const f = freeAt[a.id] ?? Infinity;
    if (orig === 'offline' && f === Infinity) liveState[a.id] = 'offline';
    else if (f > t) liveState[a.id] = orig === 'break' ? 'break' : 'serving';
    else liveState[a.id] = 'available';
  }
  return { ...base, waiting, upcomingAppts, busyUntil: { ...freeAt }, liveState };
}

/** The next time something could change for advisor `a` (arrival, due window, cap crossings, colleagues freeing up). */
function nextInterestingTime(
  view: QueueView,
  t: EpochMs,
  a: AdvisorId,
  real: Visit[],
  virtual: Visit[],
  placed: ReadonlySet<VisitId>,
  freeAt: Record<AdvisorId, EpochMs>,
): EpochMs {
  const r = view.branch.rules;
  let best = t + PROJECTION_IDLE_STEP_MIN * MIN;
  const consider = (x: number): void => {
    if (x > t && x < best) best = x;
  };
  for (const v of virtual) if (!placed.has(v.id)) consider(v.arrivedAt ?? 0);
  for (const v of view.upcomingAppts) {
    if (placed.has(v.id) || !v.booking) continue;
    const slot = v.booking.slotAt;
    consider(slot - r.earlyWindowMin * MIN);
    consider(slot);
    consider(slot + r.helpAfterMin * MIN);
    consider(slot + r.graceMin * MIN + 1);
  }
  for (const v of real) {
    if (placed.has(v.id) || !queuesAsWalkIn(v) || v.arrivedAt === null) continue;
    consider(v.arrivedAt + r.walkInCapMin * MIN);
    if (r.hardCeilingMin > 0) consider(v.arrivedAt + r.hardCeilingMin * MIN);
    if (v.quote) consider(v.quote.toldBy);
  }
  for (const [id, f] of Object.entries(freeAt)) {
    if (id !== a && Number.isFinite(f)) {
      consider(f);
      if (r.swapAdvisorMin > 0) consider(f - r.swapAdvisorMin * MIN);
    }
  }
  return best;
}
