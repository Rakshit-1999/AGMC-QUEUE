// Simulated customers and advisors (only when simulator.enabled). Calls the same ops as the UI,
// with who = 'simulator'. Level-triggered: every decision depends only on state and t.
import { BREAK_MIN } from '@/domain/constants';
import { canServe, compareDesk } from '@/domain/eligibility';
import { walkInOptions } from '@/domain/queue/quote';
import { currentVisitOf } from '@/domain/queue/view';
import { atDubai, dubaiMinutesOfDay, hhmmToMinutes } from '@/domain/time';
import type { Advisor, AdvisorId, AppState, EpochMs, ServicePlan, Visit } from '@/domain/types';
import {
  opCallAgain,
  opCallNext,
  opComplete,
  opNotHere,
  opSetPresence,
  opStartService,
  opTransfer,
} from '@/store/ops/advisor';
import { makeCtx, type OpCtx } from '@/store/ops/audit';
import { opCheckInAppointment, opIssueWalkIn } from '@/store/ops/reception';
import { servicePlanFor, thinkSec } from './script';

const MIN = 60_000;
/** Customers whose planned arrival is older than this (simulator was off) are not replayed. */
const STALE_ARRIVAL_MS = 20 * MIN;
const BREAK_START_WINDOW_MS = 60 * MIN;
const MISSED_CALL_AGAIN_MS = 60_000;
const MISSED_NOT_HERE_MS = 90_000;
export const SKIPPED = 'skipped';

function idleKey(id: AdvisorId): string {
  return `simIdle:${id}`;
}

function ensureServicePlan(s: AppState, v: Visit, advisorId: AdvisorId): ServicePlan {
  const existing = s.script.service[v.id];
  if (existing) return existing;
  const plan = servicePlanFor(s, s.simulator.seed, v, advisorId);
  s.script.service[v.id] = plan;
  return plan;
}

function inShift(s: AppState, a: Advisor, t: EpochMs): boolean {
  const rp = s.script.roster.find((r) => r.advisorId === a.id);
  if (rp) return rp.presentFrom !== null && t >= rp.presentFrom && (rp.presentUntil === null || t < rp.presentUntil);
  const b = s.branches[a.branchId];
  if (!b) return false;
  const m = dubaiMinutesOfDay(t);
  return m >= hhmmToMinutes(b.opensAt) && m < hhmmToMinutes(b.closesAt);
}

function simReceptionPick(s: AppState, v: Visit): AdvisorId | 'first_free' | undefined {
  if (v.advisorId !== null) return undefined;
  const plan = s.script.appointments[v.id];
  const pick = plan?.receptionPick;
  if (!pick || pick === 'first_free') return 'first_free';
  const a = s.advisors[pick];
  const svc = s.services[v.serviceCode];
  if (!a || !svc || !a.active || a.presence === 'offline' || !canServe(a, v, svc, 'own')) return 'first_free';
  return pick;
}

function runArrivals(s: AppState, ctx: OpCtx, t: EpochMs): boolean {
  let changed = false;
  for (const v of Object.values(s.visits)) {
    if (v.date !== s.today || v.kind !== 'appointment' || !v.booking) continue;
    const missed = v.status === 'no_show' && v.arrivedAt === null;
    if (v.status !== 'booked' && !missed) continue;
    const plan = s.script.appointments[v.id];
    if (!plan || plan.arrivalOffsetMin === null) continue;
    const b = s.branches[v.branchId];
    if (!b?.active) continue;
    const arriveAt = Math.max(v.booking.slotAt + plan.arrivalOffsetMin * MIN, atDubai(s.today, b.opensAt));
    if (arriveAt > t || arriveAt < t - STALE_ARRIVAL_MS) continue;
    if (opCheckInAppointment(s, ctx, v.id, simReceptionPick(s, v)).ok) changed = true;
  }
  return changed;
}

function runWalkIns(s: AppState, ctx: OpCtx, t: EpochMs): boolean {
  let changed = false;
  for (const w of s.script.walkIns) {
    if (w.issuedVisitId !== null || w.at > t) continue;
    changed = true;
    const b = s.branches[w.branchId];
    if (!b?.active || w.at < t - STALE_ARRIVAL_MS) {
      w.issuedVisitId = SKIPPED;
      continue;
    }
    const opts = walkInOptions(s, w.branchId, w.serviceCode, w.brand, t);
    if (opts.noneCanTake) {
      w.issuedVisitId = SKIPPED;
      continue;
    }
    const r = opIssueWalkIn(s, ctx, {
      branchId: w.branchId,
      serviceCode: w.serviceCode,
      brand: w.brand,
      advisorId: opts.defaultAdvisorId,
      customer: w.customer,
      note: w.note,
    });
    w.issuedVisitId = r.ok ? r.data.visitId : SKIPPED;
  }
  return changed;
}

/** Breaks: returns true when the advisor is (or just went) on break and nothing else should happen. */
function runBreaks(s: AppState, ctx: OpCtx, a: Advisor, t: EpochMs): { changed: boolean; onBreak: boolean } {
  let changed = false;
  const plans = s.script.breaks.filter((p) => p.advisorId === a.id);
  const active = plans.find((p) => p.startedAt !== null && p.endedAt === null);
  if (active && active.startedAt !== null) {
    if (t >= active.startedAt + active.durationMin * MIN) {
      opSetPresence(s, ctx, a.id, 'available');
      active.endedAt = t;
      s.counters[idleKey(a.id)] = t;
      return { changed: true, onBreak: false };
    }
    if (a.presence !== 'break') {
      // A person ended the break early; close the plan.
      active.endedAt = t;
      changed = true;
    } else {
      return { changed, onBreak: true };
    }
  }
  if (a.presence === 'break') {
    // Break not from the script (e.g. a person handed back to the simulator mid-break).
    const len = a.breakReason ? BREAK_MIN[a.breakReason] : 15;
    if (t - a.presenceSince >= len * MIN) {
      opSetPresence(s, ctx, a.id, 'available');
      s.counters[idleKey(a.id)] = t;
      return { changed: true, onBreak: false };
    }
    return { changed, onBreak: true };
  }
  const due = plans.find((p) => p.startedAt === null && p.endedAt === null && p.at <= t);
  if (due && a.presence === 'available') {
    if (due.at < t - BREAK_START_WINDOW_MS) {
      due.endedAt = t; // too late to take it
      return { changed: true, onBreak: false };
    }
    if (opSetPresence(s, ctx, a.id, 'break', due.reason).ok) {
      due.startedAt = t;
      return { changed: true, onBreak: true };
    }
  }
  return { changed, onBreak: false };
}

function runAdvisor(s: AppState, ctx: OpCtx, a: Advisor, t: EpochMs, waitingByBranch: Map<string, number>): boolean {
  let changed = false;
  const cur = currentVisitOf(s, a.id);

  // Roster
  if (!inShift(s, a, t)) {
    if (!cur && a.presence !== 'offline') {
      if (opSetPresence(s, ctx, a.id, 'offline').ok) changed = true;
    }
    if (!cur) return changed;
  } else if (!cur && a.presence === 'offline') {
    if (opSetPresence(s, ctx, a.id, 'available').ok) {
      s.counters[idleKey(a.id)] = t;
      changed = true;
    }
  }

  if (cur?.status === 'called') {
    const plan = ensureServicePlan(s, cur, a.id);
    const firstCall = cur.calls[0]?.at ?? t;
    const lastCall = cur.calls[cur.calls.length - 1]?.at ?? t;
    const missKey = `nothere:${cur.id}`;
    if (plan.missesCall && !s.counters[missKey]) {
      if (cur.calls.length === 1 && t - firstCall >= MISSED_CALL_AGAIN_MS) {
        if (opCallAgain(s, ctx, a.id).ok) changed = true;
      } else if (cur.calls.length >= 2 && t - firstCall >= MISSED_NOT_HERE_MS) {
        if (opNotHere(s, ctx, a.id).ok) {
          s.counters[missKey] = 1;
          s.counters[idleKey(a.id)] = t;
          changed = true;
        }
      }
    } else if (t - lastCall >= plan.walkSec * 1000) {
      if (opStartService(s, ctx, a.id).ok) changed = true;
    }
    return changed;
  }

  if (cur?.status === 'serving') {
    const plan = ensureServicePlan(s, cur, a.id);
    const elapsedMin = (t - (cur.startedAt ?? t)) / MIN;
    const tKey = `transferred:${cur.id}`;
    if (plan.transferAtFrac !== null && !s.counters[tKey] && elapsedMin >= plan.transferAtFrac * plan.deskMin) {
      if (opTransfer(s, ctx, a.id, null, 'Specialist needed').ok) {
        s.counters[tKey] = 1;
        s.counters[idleKey(a.id)] = t;
        changed = true;
      }
    } else if (elapsedMin >= plan.deskMin) {
      if (opComplete(s, ctx, a.id, '').ok) {
        s.counters[idleKey(a.id)] = t;
        changed = true;
      }
    }
    return changed;
  }

  // Idle: breaks first, then call the next customer after a short think time.
  const br = runBreaks(s, ctx, a, t);
  changed ||= br.changed;
  if (br.onBreak || a.presence !== 'available') return changed;
  if ((waitingByBranch.get(a.branchId) ?? 0) === 0) return changed;
  const idleSince = Math.max(a.presenceSince, s.counters[idleKey(a.id)] ?? 0);
  if (t - idleSince < thinkSec(s.simulator.seed, a.id, idleSince) * 1000) return changed;
  const r = opCallNext(s, ctx, a.id);
  if (r.ok) {
    waitingByBranch.set(a.branchId, (waitingByBranch.get(a.branchId) ?? 1) - 1);
    changed = true;
  }
  return changed;
}

/** Returns true when anything changed. */
export function runSimulator(s: AppState, t: EpochMs): boolean {
  if (!s.simulator.enabled) return false;
  const ctx = makeCtx(s, t, 'simulator');
  let changed = runArrivals(s, ctx, t);
  changed = runWalkIns(s, ctx, t) || changed;

  const waitingByBranch = new Map<string, number>();
  for (const v of Object.values(s.visits)) {
    if (v.status === 'waiting' && v.date === s.today) waitingByBranch.set(v.branchId, (waitingByBranch.get(v.branchId) ?? 0) + 1);
  }
  const advisors = Object.values(s.advisors)
    .filter((a) => a.active && (s.simulator.drivers[a.id] ?? 'sim') === 'sim' && s.branches[a.branchId]?.active)
    .sort((x, y) => x.branchId.localeCompare(y.branchId) || compareDesk(x, y));
  for (const a of advisors) changed = runAdvisor(s, ctx, a, t, waitingByBranch) || changed;
  return changed;
}
