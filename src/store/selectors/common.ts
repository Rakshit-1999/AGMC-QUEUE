// Shared selectors and chip/label helpers (ARCHITECTURE 3.8).
import { compareDesk, queuesAsWalkIn } from '@/domain/eligibility';
import { ADVISOR_STATE_TEXT, customerName, DESK_TYPE_TEXT, LABEL, STATUS_TEXT } from '@/domain/messages';
import { projectQueue, type Projection } from '@/domain/queue/project';
import { branchDayVisits } from '@/domain/queue/view';
import { fmtClock } from '@/domain/time';
import type {
  Advisor,
  AdvisorId,
  AdvisorLiveState,
  AppState,
  Branch,
  BranchId,
  DeskType,
  EpochMs,
  QueueRules,
  Visit,
  VisitStatus,
} from '@/domain/types';

const MIN = 60_000;

export type Tone = 'grey' | 'green' | 'darkGreen' | 'amber' | 'clay' | 'blue' | 'outline';
export interface ChipSpec {
  text: string;
  tone: Tone;
}

/** One KPI tile. `value` null renders "—". */
export interface Kpi {
  label: string;
  value: string | null;
  unit?: string;
  hint?: string;
  alert: boolean;
}

// ---------- basic selectors ----------

export function selectBranch(s: AppState, id: BranchId): Branch | undefined {
  return s.branches[id];
}

export function selectBranchByCode(s: AppState, code: string): Branch | undefined {
  const c = code.trim().toUpperCase();
  return Object.values(s.branches).find((b) => b.code.toUpperCase() === c);
}

export function selectActiveBranches(s: AppState): Branch[] {
  return s.branchOrder.map((id) => s.branches[id]).filter((b): b is Branch => !!b && b.active);
}

/** All branches in branchOrder (incl. inactive). */
export function selectAllBranches(s: AppState): Branch[] {
  return s.branchOrder.map((id) => s.branches[id]).filter((b): b is Branch => !!b);
}

export function selectAdvisorsOfBranch(s: AppState, branchId: BranchId, opts?: { includeInactive?: boolean }): Advisor[] {
  return Object.values(s.advisors)
    .filter((a) => a.branchId === branchId && (opts?.includeInactive || a.active))
    .sort(compareDesk);
}

export function selectProjection(s: AppState, branchId: BranchId, now: EpochMs): Projection {
  return projectQueue(s, branchId, now);
}

/** Active service types in order. */
export function selectServiceTypes(s: AppState, opts?: { includeInactive?: boolean }): AppState['services'][string][] {
  return s.serviceOrder.map((c) => s.services[c]).filter((x): x is NonNullable<typeof x> => !!x && (opts?.includeInactive || x.active));
}

export function selectBrands(s: AppState): string[] {
  return s.brands;
}

// ---------- internal helpers used by page selectors ----------

export function dayVisits(s: AppState, branchId: BranchId): Visit[] {
  return branchDayVisits(s, branchId, s.today);
}

export function advisorName(s: AppState, id: AdvisorId | null): string | null {
  return id ? s.advisors[id]?.name ?? null : null;
}

export function serviceName(s: AppState, code: string): string {
  return s.services[code]?.name ?? code;
}

export function displayName(v: Visit): string {
  return customerName(v.customer.name);
}

export function firstName(v: Visit): string {
  const n = v.customer.name?.trim();
  return n ? n.split(/\s+/)[0] ?? n : 'The customer';
}

export function slotOf(v: Visit): EpochMs | null {
  return v.booking?.slotAt ?? null;
}

// ---------- chips and labels ----------

const STATUS_TONE: Readonly<Record<VisitStatus, Tone>> = {
  booked: 'grey',
  waiting: 'blue',
  called: 'amber',
  serving: 'darkGreen',
  done: 'green',
  no_show: 'clay',
  cancelled: 'grey',
};

export function statusChip(status: VisitStatus): ChipSpec {
  return { text: STATUS_TEXT[status], tone: STATUS_TONE[status] };
}

/** "Appointment 12:30" green / "Walk-in" outline / "Late appt 11:00 · walk-in" amber. */
export function typeChip(v: Visit): ChipSpec {
  if (v.kind === 'walk_in') return { text: 'Walk-in', tone: 'outline' };
  const slot = v.booking ? fmtClock(v.booking.slotAt) : '';
  if (v.lateAsWalkIn) return { text: `Late appt ${slot} · walk-in`, tone: 'amber' };
  return { text: `Appointment ${slot}`, tone: 'green' };
}

/**
 * "in 28 min" grey (> earlyWindow before) / "Due now" green (slot - early .. slot) / "4 min late" amber (<= grace)
 * / "18 min late · walk-in" clay (> grace) / "Missed · joins as walk-in" clay (no_show, never arrived).
 */
export function appointmentArrivalChip(v: Visit, rules: QueueRules, now: EpochMs): ChipSpec {
  if (v.status === 'no_show' && v.arrivedAt === null) return { text: 'Missed · joins as walk-in', tone: 'clay' };
  const slot = v.booking?.slotAt ?? now;
  if (now < slot - rules.earlyWindowMin * MIN) return { text: `in ${Math.ceil((slot - now) / MIN)} min`, tone: 'grey' };
  const late = Math.floor((now - slot) / MIN);
  if (late < 1) return { text: 'Due now', tone: 'green' };
  if (late <= rules.graceMin) return { text: `${late} min late`, tone: 'amber' };
  return { text: `${late} min late · walk-in`, tone: 'clay' };
}

/** "in 15′" grey / "4′ late" amber / "missed" clay. */
export function notArrivedChip(v: Visit, rules: QueueRules, now: EpochMs): ChipSpec {
  if (v.status === 'no_show') return { text: 'missed', tone: 'clay' };
  const slot = v.booking?.slotAt ?? now;
  if (now < slot) return { text: `in ${Math.ceil((slot - now) / MIN)}′`, tone: 'grey' };
  const late = Math.floor((now - slot) / MIN);
  if (late > rules.graceMin) return { text: 'missed', tone: 'clay' };
  return { text: `${late}′ late`, tone: 'amber' };
}

const ADVISOR_TONE: Readonly<Record<AdvisorLiveState, Tone>> = {
  serving: 'darkGreen',
  calling: 'amber',
  available: 'green',
  break: 'amber',
  offline: 'grey',
};

export function advisorStateChip(state: AdvisorLiveState): ChipSpec {
  return { text: ADVISOR_STATE_TEXT[state], tone: ADVISOR_TONE[state] };
}

/** "(booked in Keyloop)" / "(allocated)" / "(picked at reception)" / "no advisor yet". */
export function advisorSourceLabel(v: Visit): string {
  if (!v.advisorId) return LABEL.noAdvisorYet;
  switch (v.advisorSource) {
    case 'keyloop':
      return '(booked in Keyloop)';
    case 'allocated':
      return '(allocated)';
    case 'reception':
      return '(picked at reception)';
    default:
      return '';
  }
}

export function deskTypeLabel(t: DeskType): string {
  return DESK_TYPE_TEXT[t];
}

/** "Desk 6 · Walk-in desk" / "Desk 7 · MINI" / "Desk 8 · Express desk" / "Desk 1". */
export function advisorSubtitle(a: Advisor): string {
  if (a.deskType === 'walkin_desk') return `${a.desk} · Walk-in desk`;
  if (a.deskType === 'express_desk') return `${a.desk} · Express desk`;
  if (a.deskType === 'appointments_only') return `${a.desk} · Appointments only`;
  if (a.brands.length > 0) return `${a.desk} · ${a.brands.join(', ')}`;
  return a.desk;
}

/** Whether a visit queues as a walk-in (re-exported for pages via selectors). */
export function isWalkInLike(v: Visit): boolean {
  return queuesAsWalkIn(v);
}
