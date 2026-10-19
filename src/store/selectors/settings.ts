// Settings page selectors (P5).
import { ADVISOR_MODE_TEXT, DESK_TYPE_TEXT, LABEL, ROLE_SCOPE_TEXT } from '@/domain/messages';
import { addDays, fmtAuditTime, fmtHours } from '@/domain/time';
import type { AdvisorId, AppState, BranchId, DateKey, Driver, HHMM, KeyloopSync, ServiceCode, Username } from '@/domain/types';
import { selectAdvisorsOfBranch, selectAllBranches } from './common';

export function selectBranchesTable(s: AppState): {
  id: BranchId;
  code: string;
  name: string;
  hours: string;
  grace: string;
  cap: string;
  ceiling: string;
  early: string;
  learning: string;
  active: boolean;
}[] {
  return selectAllBranches(s).map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    hours: fmtHours(b.opensAt, b.closesAt),
    grace: `${b.rules.graceMin}′`,
    cap: `${b.rules.walkInCapMin}′`,
    ceiling: b.rules.hardCeilingMin > 0 ? `${b.rules.hardCeilingMin}′` : LABEL.off,
    early: `${b.rules.earlyWindowMin}′`,
    learning: b.rules.learnDays > 0 ? `${b.rules.learnDays} days` : LABEL.off,
    active: b.active,
  }));
}

export function selectAdvisorsTable(
  s: AppState,
  branchFilter: BranchId | 'all',
): { id: AdvisorId; name: string; branch: string; desk: string; takes: string; brands: string; services: string; login: string; active: boolean }[] {
  const branches = selectAllBranches(s).filter((b) => branchFilter === 'all' || b.id === branchFilter);
  return branches.flatMap((b) =>
    selectAdvisorsOfBranch(s, b.id, { includeInactive: true }).map((a) => ({
      id: a.id,
      name: a.name,
      branch: b.name,
      desk: a.desk,
      takes: DESK_TYPE_TEXT[a.deskType],
      brands: a.brands.length > 0 ? a.brands.join(', ') : LABEL.all,
      services: a.services.length > 0 ? a.services.map((c) => s.services[c]?.name ?? c).join(', ') : LABEL.all,
      login: a.username ?? LABEL.none,
      active: a.active,
    })),
  );
}

export function selectServiceTypesTable(
  s: AppState,
): { code: ServiceCode; name: string; expectedMin: number; express: boolean; letter: string; active: boolean }[] {
  return s.serviceOrder
    .map((c) => s.services[c])
    .filter((x): x is NonNullable<typeof x> => !!x)
    .map((svc) => ({
      code: svc.code,
      name: svc.name,
      expectedMin: svc.expectedMin,
      express: svc.expressLane,
      letter: svc.ticketLetter ?? 'A / W',
      active: svc.active,
    }));
}

/** "BMW, MINI, BMWi". */
export function selectBrandsText(s: AppState): string {
  return s.brands.join(', ');
}

export function selectUsersTable(s: AppState): { username: Username; name: string; roleLabel: string; branch: string; active: boolean }[] {
  const roleOrder = { manager: 0, reception: 1, advisor: 2 } as const;
  return Object.values(s.users)
    .sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || a.username.localeCompare(b.username))
    .map((u) => ({
      username: u.username,
      name: u.name,
      roleLabel: ROLE_SCOPE_TEXT[u.role],
      branch: u.branchId ? s.branches[u.branchId]?.name ?? u.branchId : LABEL.allBranches,
      active: u.canSignIn,
    }));
}

function advisorsBreakdown(s: AppState, branchId: BranchId, date: DateKey): { count: number; text: string } {
  const list = Object.values(s.visits).filter(
    (v) => v.branchId === branchId && v.date === date && v.kind === 'appointment' && v.booking && !(v.status === 'cancelled' && v.arrivedAt === null),
  );
  const named = list.filter((v) => v.advisorId && v.advisorSource === 'keyloop').length;
  const allocated = list.filter((v) => v.advisorId && v.advisorSource === 'allocated').length;
  const picked = list.filter((v) => v.advisorId && v.advisorSource === 'reception').length;
  const open = list.filter((v) => !v.advisorId).length;
  const parts: string[] = [];
  if (named) parts.push(`${named} named by Keyloop`);
  if (allocated) parts.push(`${allocated} allocated`);
  if (picked) parts.push(`${picked} picked at reception`);
  if (open) parts.push(`${open} open`);
  return { count: list.length, text: parts.length > 0 ? parts.join(' · ') : '0' };
}

export function selectKeyloopView(s: AppState): {
  nightlyLoadAt: HHMM;
  perBranch: { branchId: BranchId; name: string; mode: string; today: number; todayAdvisors: string; tomorrow: string; tomorrowAdvisors: string }[];
  history: KeyloopSync[];
} {
  const tomorrow = addDays(s.today, 1);
  return {
    nightlyLoadAt: s.keyloop.nightlyLoadAt,
    perBranch: selectAllBranches(s).map((b) => {
      const today = advisorsBreakdown(s, b.id, s.today);
      const loadedTomorrow = s.keyloop.days[b.id]?.[tomorrow];
      const tmr = loadedTomorrow ? advisorsBreakdown(s, b.id, tomorrow) : null;
      return {
        branchId: b.id,
        name: b.name,
        mode: ADVISOR_MODE_TEXT[b.appointmentAdvisorMode],
        today: today.count,
        todayAdvisors: today.text,
        tomorrow: tmr ? String(tmr.count) : 'not loaded',
        tomorrowAdvisors: tmr ? tmr.text : `loads at ${s.keyloop.nightlyLoadAt}`,
      };
    }),
    history: s.keyloop.history,
  };
}

/** Sync history rows ready for display. */
export function selectKeyloopHistoryRows(s: AppState): { id: string; time: string; branch: string; source: string; added: number; updated: number; removed: number; note: string }[] {
  return s.keyloop.history.map((h) => ({
    id: h.id,
    time: fmtAuditTime(h.at),
    branch: s.branches[h.branchId]?.code ?? h.branchId,
    source: h.source,
    added: h.added,
    updated: h.updated,
    removed: h.removed,
    note: h.note,
  }));
}

export function selectAuditLog(
  s: AppState,
  branchFilter: BranchId | 'all',
  limit = 400,
): { id: string; time: string; branch: string; who: string; what: string; detail: string }[] {
  const out: { id: string; time: string; branch: string; who: string; what: string; detail: string }[] = [];
  for (const e of s.audit) {
    if (branchFilter !== 'all' && e.branchId !== branchFilter) continue;
    out.push({
      id: e.id,
      time: fmtAuditTime(e.at),
      branch: e.branchId ? s.branches[e.branchId]?.code ?? e.branchId : LABEL.dash,
      who: e.who,
      what: e.what,
      detail: e.detail,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function selectSimulatorView(s: AppState): {
  enabled: boolean;
  rows: { advisorId: AdvisorId; name: string; branch: string; login: string; driver: Driver }[];
} {
  return {
    enabled: s.simulator.enabled,
    rows: selectAllBranches(s).flatMap((b) =>
      selectAdvisorsOfBranch(s, b.id).map((a) => ({
        advisorId: a.id,
        name: a.name,
        branch: b.name,
        login: a.username ?? LABEL.none,
        driver: s.simulator.drivers[a.id] ?? 'sim',
      })),
    ),
  };
}
