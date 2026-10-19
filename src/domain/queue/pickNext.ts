// "Who is next for advisor X". Tiers follow SPEC "Why this customer is next" in order.
import { canServe, queuesAsWalkIn } from '../eligibility';
import type { Advisor, AdvisorId, EpochMs, NextReasonCode, Visit, VisitId } from '../types';
import { fitsBefore, isDue, waitedMin, type QueueView } from './view';

const MIN = 60_000;

export interface NextPick {
  visitId: VisitId;
  reason: NextReasonCode;
  covering: boolean;
}

type Cmp = (a: Visit, b: Visit) => number;

const ticketCmp: Cmp = (a, b) => (a.ticketNo ?? '').localeCompare(b.ticketNo ?? '') || a.id.localeCompare(b.id);
const slotOf = (v: Visit): number => v.booking?.slotAt ?? 0;
const arrivalOf = (v: Visit): number => v.arrivedAt ?? 0;
const by =
  (...keys: ((v: Visit) => number)[]): Cmp =>
  (a, b) => {
    for (const k of keys) {
      const d = k(a) - k(b);
      if (d !== 0) return d;
    }
    return ticketCmp(a, b);
  };

function first(list: Visit[], cmp: Cmp): Visit | null {
  let best: Visit | null = null;
  for (const v of list) if (!best || cmp(v, best) < 0) best = v;
  return best;
}

/** The mode in which `me` would take `v`: own when the visit is mine or unassigned. */
function modeFor(v: Visit, me: AdvisorId): 'own' | 'cover' {
  return v.advisorId === null || v.advisorId === me ? 'own' : 'cover';
}

/**
 * Called for an advisor who is available and idle. Candidates are view.waiting minus `exclude`,
 * filtered by canServe. The first tier with a candidate wins.
 */
export function pickNext(
  view: QueueView,
  advisorId: AdvisorId,
  t: EpochMs,
  exclude?: ReadonlySet<VisitId>,
): NextPick | null {
  const me: Advisor | undefined = view.advisors.find((a) => a.id === advisorId);
  if (!me) return null;
  const rules = view.branch.rules;
  const pool: Visit[] = [];
  for (const v of view.waiting) {
    if (v.status !== 'waiting' || exclude?.has(v.id)) continue;
    const svc = view.services[v.serviceCode];
    if (!svc) continue;
    if (!canServe(me, v, svc, modeFor(v, advisorId))) continue;
    pool.push(v);
  }
  if (pool.length === 0) return null;

  const pick = (v: Visit | null, reason: NextReasonCode, covering: boolean): NextPick | null =>
    v ? { visitId: v.id, reason, covering } : null;
  const isOther = (v: Visit): boolean => v.advisorId !== null && v.advisorId !== advisorId;
  const mineOrOpen = (v: Visit): boolean => v.advisorId === null || v.advisorId === advisorId;

  // 1. Handed over to you by a colleague (to me, or to "next free" and not from me)
  {
    const c = pool.filter(
      (v) =>
        v.handover !== null &&
        (v.handover.toAdvisorId === advisorId ||
          (v.handover.toAdvisorId === null && v.handover.fromAdvisorId !== advisorId)),
    );
    const v = first(c, by((x) => x.handover?.at ?? 0));
    if (v) return pick(v, 'handover', false);
  }

  // 2. Walk-in at the hard ceiling
  if (rules.hardCeilingMin > 0) {
    const c = pool.filter((v) => queuesAsWalkIn(v) && waitedMin(v, t) >= rules.hardCeilingMin);
    const v = first(c, by((x) => -waitedMinExact(x, t)));
    if (v) return pick(v, 'ceiling', isOther(v));
  }

  // 3. Your appointment is due (mine or unassigned)
  {
    const c = pool.filter(
      (v) => !queuesAsWalkIn(v) && v.kind === 'appointment' && v.arrivedAt !== null && isDue(v, rules, t) && mineOrOpen(v),
    );
    const v = first(c, by(slotOf, arrivalOf));
    if (v) return pick(v, 'own_appt_due', false);
  }

  // 4. Another advisor's appointment is waiting
  {
    const c = pool.filter((v) => {
      if (queuesAsWalkIn(v) || v.kind !== 'appointment' || v.arrivedAt === null || !v.booking || !isOther(v)) return false;
      if (t < v.booking.slotAt) return false;
      const y = view.liveState[v.advisorId as AdvisorId] ?? 'offline';
      if (y === 'break' || y === 'offline') return true;
      if (y === 'calling' || y === 'serving') return t >= v.booking.slotAt + rules.helpAfterMin * MIN;
      return false;
    });
    const v = first(c, by(slotOf));
    if (v) return pick(v, 'cover_appt', true);
  }

  // 5. Moved to the front by reception
  {
    const c = pool.filter((v) => queuesAsWalkIn(v) && v.bump !== null);
    const v = first(c, by((x) => x.bump?.at ?? 0));
    if (v) return pick(v, 'bumped', isOther(v));
  }

  // 6. Walk-in over the wait cap (mine or unassigned)
  {
    const c = pool.filter((v) => queuesAsWalkIn(v) && mineOrOpen(v) && waitedMin(v, t) >= rules.walkInCapMin);
    const v = first(c, by(arrivalOf));
    if (v) return pick(v, 'over_cap', false);
  }

  // 7. Covering a colleague's walk-in so we keep the time we told them
  {
    const c = pool.filter((v) => {
      if (!queuesAsWalkIn(v) || !isOther(v)) return false;
      const pastTold = v.quote !== null && t >= v.quote.toldBy;
      const yBusy = view.busyUntil[v.advisorId as AdvisorId] ?? Infinity;
      const farOff = rules.swapAdvisorMin > 0 && yBusy - t >= rules.swapAdvisorMin * MIN;
      return (pastTold || farOff) && fitsBefore(view, advisorId, v, t);
    });
    const v = first(c, by(arrivalOf));
    if (v) return pick(v, 'cover_walkin', true);
  }

  // 8. Walk-in that fits before your next appointment
  {
    const c = pool.filter((v) => queuesAsWalkIn(v) && mineOrOpen(v) && fitsBefore(view, advisorId, v, t));
    const v = first(c, by(arrivalOf));
    if (v) return pick(v, 'fits', false);
  }

  // 9. Appointment arrived early (nothing else for me)
  {
    const c = pool.filter(
      (v) => !queuesAsWalkIn(v) && v.kind === 'appointment' && v.arrivedAt !== null && mineOrOpen(v) && !isDue(v, rules, t),
    );
    const v = first(c, by(slotOf));
    if (v) return pick(v, 'early_appt', false);
  }

  return null;
}

function waitedMinExact(v: Visit, t: EpochMs): number {
  return v.arrivedAt === null ? 0 : t - v.arrivedAt;
}
