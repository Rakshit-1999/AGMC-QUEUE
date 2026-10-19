// Deterministic ids and ticket numbers. All counters live in AppState.counters.
import type { AppState, BranchId, DateKey, ServiceType, Visit, VisitId } from './types';

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

/** Next value of the global id sequence (`counters.seq`). Mutates the draft. */
export function nextSeq(s: AppState): number {
  const n = (s.counters.seq ?? 0) + 1;
  s.counters.seq = n;
  return n;
}

/** 'v_000123'. */
export function newVisitId(s: AppState): VisitId {
  return `v_${pad(nextSeq(s), 6)}`;
}

/** Generic deterministic id: `${prefix}_000123`. */
export function newId(s: AppState, prefix: string): string {
  return `${prefix}_${pad(nextSeq(s), 6)}`;
}

/** Ticket letter: the service's own letter, else W for walk-in-like visits and A for appointments. */
export function ticketLetter(v: Pick<Visit, 'kind' | 'lateAsWalkIn'>, svc: ServiceType | undefined): string {
  if (svc?.ticketLetter) return svc.ticketLetter.toUpperCase();
  return v.kind === 'walk_in' || v.lateAsWalkIn ? 'W' : 'A';
}

export function ticketCounterKey(branchId: BranchId, date: DateKey, letter: string): string {
  return `${branchId}:${date}:${letter}`;
}

/** 'A' + 14 -> 'A-014'. */
export function formatTicketNo(letter: string, n: number): string {
  return `${letter}-${pad(n, 3)}`;
}

/** Issues the next ticket number for a branch, day and letter. Mutates the draft. */
export function issueTicketNo(s: AppState, branchId: BranchId, date: DateKey, letter: string): string {
  const key = ticketCounterKey(branchId, date, letter);
  const n = (s.counters[key] ?? 0) + 1;
  s.counters[key] = n;
  return formatTicketNo(letter, n);
}
