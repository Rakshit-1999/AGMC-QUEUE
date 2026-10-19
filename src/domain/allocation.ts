// Appointment advisor allocation: greedy by slot, balanced by load, respecting skills and roster.
import { canServeIgnoringPresence, compareDesk } from './eligibility';
import { expectedDeskMin } from './queue/deskTime';
import type { Advisor, AdvisorId, AppState, BranchId, DateKey, EpochMs, Visit, VisitId } from './types';

const MIN = 60_000;

/** Is the advisor rostered at `t`? Advisors without a roster entry are present whenever they are active. */
export function rosteredAt(s: AppState, advisorId: AdvisorId, t: EpochMs): boolean {
  const r = s.script.roster.find((x) => x.advisorId === advisorId);
  if (!r) return true;
  if (r.presentFrom === null) return false;
  return t >= r.presentFrom && (r.presentUntil === null || t < r.presentUntil);
}

interface Interval {
  from: EpochMs;
  to: EpochMs;
}

/**
 * Allocates the given appointment visits. Eligible advisors: canServe own (ignoring live presence),
 * deskType 'all' or 'appointments_only', rostered at the slot, no overlapping appointment.
 * Lowest appointment count that day wins, ties by desk order. null = "open".
 */
export function allocateAppointments(
  s: AppState,
  branchId: BranchId,
  date: DateKey,
  visitIds: VisitId[],
): Record<VisitId, AdvisorId | null> {
  const advisors: Advisor[] = Object.values(s.advisors)
    .filter((a) => a.branchId === branchId && a.active && (a.deskType === 'all' || a.deskType === 'appointments_only'))
    .sort(compareDesk);
  const toAllocate = new Set(visitIds);
  const busy = new Map<AdvisorId, Interval[]>();
  const count = new Map<AdvisorId, number>();
  for (const a of advisors) {
    busy.set(a.id, []);
    count.set(a.id, 0);
  }
  const span = (v: Visit, advisorId: AdvisorId | null): Interval => {
    const from = v.booking?.slotAt ?? 0;
    return { from, to: from + expectedDeskMin(s, branchId, v.serviceCode, v.brand, advisorId) * MIN };
  };
  // Existing appointments that keep their advisor.
  for (const v of Object.values(s.visits)) {
    if (v.branchId !== branchId || v.date !== date || v.kind !== 'appointment' || toAllocate.has(v.id)) continue;
    if (v.status === 'cancelled' || !v.advisorId || !busy.has(v.advisorId)) continue;
    busy.get(v.advisorId)?.push(span(v, v.advisorId));
    count.set(v.advisorId, (count.get(v.advisorId) ?? 0) + 1);
  }
  const targets = visitIds
    .map((id) => s.visits[id])
    .filter((v): v is Visit => v !== undefined && v.booking !== null)
    .sort((a, b) => (a.booking?.slotAt ?? 0) - (b.booking?.slotAt ?? 0) || a.id.localeCompare(b.id));

  const result: Record<VisitId, AdvisorId | null> = {};
  for (const v of targets) {
    const svc = s.services[v.serviceCode];
    let best: Advisor | null = null;
    for (const a of advisors) {
      if (!svc || !canServeIgnoringPresence(a, v, svc, 'own')) continue;
      if (!rosteredAt(s, a.id, v.booking?.slotAt ?? 0)) continue;
      const iv = span(v, a.id);
      if ((busy.get(a.id) ?? []).some((b) => iv.from < b.to && b.from < iv.to)) continue;
      if (!best || (count.get(a.id) ?? 0) < (count.get(best.id) ?? 0)) best = a;
    }
    result[v.id] = best?.id ?? null;
    if (best) {
      busy.get(best.id)?.push(span(v, best.id));
      count.set(best.id, (count.get(best.id) ?? 0) + 1);
    }
  }
  return result;
}
