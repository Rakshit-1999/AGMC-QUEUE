// Shared KPI math so every page agrees. Inputs are one branch-day's visits (or several branches').
import { queuesAsWalkIn } from './eligibility';
import { waitStartAt, waitedMin } from './queue/view';
import type { EpochMs, QueueRules, Visit } from './types';

const MIN = 60_000;

export interface Ratio {
  num: number;
  den: number;
  ratio: number | null;
}

function ratio(num: number, den: number): Ratio {
  return { num, den, ratio: den > 0 ? num / den : null };
}

function mean(xs: number[]): number | null {
  return xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export const byStatus = (visits: Visit[], status: Visit['status']): Visit[] => visits.filter((v) => v.status === status);

export function waitingNow(visits: Visit[]): number {
  return byStatus(visits, 'waiting').length;
}
export function beingCalled(visits: Visit[]): number {
  return byStatus(visits, 'called').length;
}
export function withAdvisors(visits: Visit[]): number {
  return byStatus(visits, 'serving').length;
}
export function servedCount(visits: Visit[]): number {
  return byStatus(visits, 'done').length;
}
export function noShowCount(visits: Visit[]): number {
  return byStatus(visits, 'no_show').length;
}
export function cancelledCount(visits: Visit[]): number {
  return visits.filter((v) => v.status === 'cancelled' && v.ticketNo !== null).length;
}

/** Longest current wait (minutes) over waiting visits; null when nobody waits. */
export function longestWaitMin(visits: Visit[], now: EpochMs): number | null {
  const w = byStatus(visits, 'waiting');
  if (w.length === 0) return null;
  return Math.max(...w.map((v) => waitedMin(v, now)));
}

/** Longest current walk-in wait (minutes); null when no walk-in waits. */
export function longestWalkInWaitMin(visits: Visit[], now: EpochMs): number | null {
  const w = byStatus(visits, 'waiting').filter(queuesAsWalkIn);
  if (w.length === 0) return null;
  return Math.max(...w.map((v) => waitedMin(v, now)));
}

/** Waiting walk-ins with now > quote.toldBy. */
export function pastToldWalkIns(visits: Visit[], now: EpochMs): Visit[] {
  return visits.filter((v) => v.status === 'waiting' && queuesAsWalkIn(v) && v.quote !== null && now > v.quote.toldBy);
}

/** Waiting walk-ins with waitedMin >= cap. */
export function overCapWalkIns(visits: Visit[], rules: QueueRules, now: EpochMs): Visit[] {
  return visits.filter((v) => v.status === 'waiting' && queuesAsWalkIn(v) && waitedMin(v, now) >= rules.walkInCapMin);
}

/** Walk-ins first called today: share called by the time told. */
export function promisesKept(visits: Visit[]): Ratio {
  const called = visits.filter((v) => queuesAsWalkIn(v) && v.quote !== null && v.firstCalledAt !== null);
  const kept = called.filter((v) => (v.firstCalledAt ?? 0) <= (v.quote?.toldBy ?? 0));
  return ratio(kept.length, called.length);
}

/** Average minutes past the told time over broken promises today. */
export function brokenPromiseAvgOverMin(visits: Visit[]): number | null {
  const over = visits
    .filter((v) => queuesAsWalkIn(v) && v.quote !== null && v.firstCalledAt !== null && v.firstCalledAt > v.quote.toldBy)
    .map((v) => ((v.firstCalledAt ?? 0) - (v.quote?.toldBy ?? 0)) / MIN);
  return mean(over);
}

/** Walk-ins issued today (walk-in tickets plus late appointments that queued as walk-ins). */
export function walkInsIssued(visits: Visit[]): number {
  return visits.filter((v) => queuesAsWalkIn(v) && v.arrivedAt !== null).length;
}

/** Booked or waiting appointments with slot in [now, now + 30 min]. */
export function apptsNext30(visits: Visit[], now: EpochMs): number {
  return visits.filter(
    (v) =>
      v.kind === 'appointment' &&
      !v.lateAsWalkIn &&
      (v.status === 'booked' || v.status === 'waiting') &&
      v.booking !== null &&
      v.booking.slotAt >= now &&
      v.booking.slotAt <= now + 30 * MIN,
  ).length;
}

/** Booked appointments whose slot passed but are still within grace. */
export function apptsRunningLate(visits: Visit[], rules: QueueRules, now: EpochMs): number {
  return visits.filter(
    (v) =>
      v.kind === 'appointment' &&
      v.status === 'booked' &&
      v.booking !== null &&
      now > v.booking.slotAt &&
      now <= v.booking.slotAt + rules.graceMin * MIN,
  ).length;
}

/** Booked appointments still to come today. */
export function apptsStillToCome(visits: Visit[]): number {
  return visits.filter((v) => v.kind === 'appointment' && v.status === 'booked').length;
}

/** Appointments first called: on time when firstCalledAt <= max(slot, arrivedAt) + onTimeTarget. */
export function apptOnTime(visits: Visit[], rules: QueueRules): Ratio & { avgDelayMin: number | null } {
  const called = visits.filter(
    (v) => v.kind === 'appointment' && !v.lateAsWalkIn && v.firstCalledAt !== null && v.arrivedAt !== null,
  );
  const delays = called.map((v) => Math.max(0, ((v.firstCalledAt ?? 0) - waitStartAt(v)) / MIN));
  const onTime = delays.filter((d) => d <= rules.onTimeTargetMin).length;
  return { ...ratio(onTime, called.length), avgDelayMin: mean(delays) };
}

/** Walk-in wait: mean arrival -> first call for walk-ins called today; max includes those waiting now. */
export function walkInWait(visits: Visit[], now: EpochMs): { avgMin: number | null; maxMin: number | null } {
  const called = visits
    .filter((v) => queuesAsWalkIn(v) && v.firstCalledAt !== null && v.arrivedAt !== null)
    .map((v) => ((v.firstCalledAt ?? 0) - (v.arrivedAt ?? 0)) / MIN);
  const waiting = visits.filter((v) => v.status === 'waiting' && queuesAsWalkIn(v)).map((v) => waitedMin(v, now));
  const all = [...called, ...waiting];
  return { avgMin: mean(called), maxMin: all.length > 0 ? Math.max(...all) : null };
}

/** Mean desk minutes (endedAt - startedAt) of done visits. */
export function deskTimeAvg(visits: Visit[]): number | null {
  return mean(
    visits
      .filter((v) => v.status === 'done' && v.startedAt !== null && v.endedAt !== null)
      .map((v) => ((v.endedAt ?? 0) - (v.startedAt ?? 0)) / MIN),
  );
}

/** Visits that arrived today and the share that queued as walk-ins. */
export function arrivals(visits: Visit[]): Ratio {
  const arrived = visits.filter((v) => v.arrivedAt !== null);
  return ratio(arrived.filter(queuesAsWalkIn).length, arrived.length);
}
