// Who can serve what. Pure.
import type { Advisor, AppState, BranchId, ServiceType, Visit } from './types';

/** Walk-ins and late appointments queue as walk-ins. */
export function queuesAsWalkIn(v: Visit): boolean {
  return v.kind === 'walk_in' || v.lateAsWalkIn;
}

/**
 * Can advisor `a` take visit `v`?
 * mode 'own'  : the visit is (or would be) in a's own line, or unassigned
 * mode 'cover': a takes a colleague's customer
 */
export function canServe(a: Advisor, v: Visit, svc: ServiceType, mode: 'own' | 'cover'): boolean {
  if (!a.active || a.branchId !== v.branchId || a.presence === 'offline') return false;
  if (a.brands.length > 0 && !a.brands.includes(v.brand)) return false;
  if (a.services.length > 0 && !a.services.includes(v.serviceCode)) return false;
  const walkLike = queuesAsWalkIn(v);
  switch (a.deskType) {
    case 'all':
      return true;
    case 'appointments_only':
      return !walkLike;
    case 'walkin_desk':
      return walkLike || mode === 'cover';
    case 'express_desk':
      return svc.expressLane;
  }
}

/** Same skill check, ignoring presence (used for planning, e.g. allocation the night before). */
export function canServeIgnoringPresence(a: Advisor, v: Visit, svc: ServiceType, mode: 'own' | 'cover'): boolean {
  return canServe({ ...a, presence: 'available' }, v, svc, mode);
}

function deskNumber(desk: string): number {
  const m = /\d+/.exec(desk);
  return m ? Number(m[0]) : Number.MAX_SAFE_INTEGER;
}

/** Stable desk order: by desk number, then desk text, then name. */
export function compareDesk(a: Advisor, b: Advisor): number {
  return deskNumber(a.desk) - deskNumber(b.desk) || a.desk.localeCompare(b.desk) || a.name.localeCompare(b.name);
}

/** Active advisors of a branch in desk order (all presences). */
export function branchAdvisors(s: AppState, branchId: BranchId): Advisor[] {
  return Object.values(s.advisors)
    .filter((a) => a.branchId === branchId && a.active)
    .sort(compareDesk);
}

/** active && presence !== 'offline', desk order. */
export function presentAdvisors(s: AppState, branchId: BranchId): Advisor[] {
  return branchAdvisors(s, branchId).filter((a) => a.presence !== 'offline');
}
