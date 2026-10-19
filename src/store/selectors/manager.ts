// Manager overview selectors (P4).
import { BREAK_MIN, SERVING_ATTENTION_FACTOR } from '@/domain/constants';
import { queuesAsWalkIn } from '@/domain/eligibility';
import {
  apptOnTime,
  apptsStillToCome,
  deskTimeAvg,
  longestWalkInWaitMin,
  noShowCount,
  overCapWalkIns,
  pastToldWalkIns,
  promisesKept,
  servedCount,
  waitingNow,
  walkInWait,
  withAdvisors,
} from '@/domain/kpi';
import { expectedDeskMin } from '@/domain/queue/deskTime';
import { buildQueueView, waitStartAt, waitedMin } from '@/domain/queue/view';
import { fmtClock, fmtHours, fmtMinTight, fmtPct } from '@/domain/time';
import type { AppState, BranchId, EpochMs, Visit } from '@/domain/types';
import { dayVisits, selectActiveBranches, selectAllBranches, type Kpi } from './common';

const MIN = 60_000;

function pctValue(r: number | null): string | null {
  return r === null ? null : String(Math.round(r * 100));
}

/** 7 tiles across all active branches. */
export function selectGroupTotals(s: AppState, now: EpochMs): Kpi[] {
  const branches = selectActiveBranches(s);
  const all: Visit[] = branches.flatMap((b) => dayVisits(s, b.id));
  const kept = promisesKept(all);
  const pastTold = pastToldWalkIns(all, now).length;
  return [
    { label: 'Waiting now', value: String(waitingNow(all)), alert: false },
    { label: 'With advisors', value: String(withAdvisors(all)), alert: false },
    { label: 'Wait promises kept', value: pctValue(kept.ratio), unit: kept.ratio === null ? undefined : '%', hint: 'walk-ins called by the time told', alert: false },
    { label: 'Past the time we told them', value: String(pastTold), hint: 'walk-ins waiting now', alert: pastTold > 0 },
    { label: 'Served today', value: String(servedCount(all)), alert: false },
    { label: 'No-shows', value: String(noShowCount(all)), alert: false },
    { label: 'Appointments still to come', value: String(apptsStillToCome(all)), alert: false },
  ];
}

export interface BranchCardView {
  branchId: BranchId;
  code: string;
  name: string;
  subtitle: string; // "SZR · 07:30–18:00 · 9 advisors[ · inactive]"
  figures: { label: string; value: string; alert: boolean }[]; // 8, in SPEC order
  mix: { free: number; busy: number; brk: number; offline: number };
  attention: string[]; // up to 5, longest first; [] -> "Nothing needs attention"
  receptionHref: string;
  displayHref: string;
}

function attentionFor(s: AppState, branchId: BranchId, now: EpochMs): string[] {
  const b = s.branches[branchId];
  if (!b) return [];
  const r = b.rules;
  const items: { min: number; text: string }[] = [];
  const vs = dayVisits(s, branchId);
  for (const v of vs) {
    if (v.status !== 'waiting' && v.status !== 'called' && v.status !== 'serving') continue;
    const t = v.ticketNo ?? '';
    if (v.status === 'waiting' && queuesAsWalkIn(v)) {
      const waited = waitedMin(v, now);
      if (v.quote && now > v.quote.toldBy) {
        const past = Math.floor((now - v.quote.toldBy) / MIN);
        items.push({ min: past, text: `Walk-in ${t} waiting ${past} min past the time we told them (told ${v.quote.quotedMin} min)` });
      } else if (waited >= r.walkInCapMin) {
        items.push({ min: waited, text: `Walk-in ${t} waiting ${waited} min (cap ${r.walkInCapMin})` });
      }
    } else if ((v.status === 'waiting' || v.status === 'called') && v.kind === 'appointment' && !v.lateAsWalkIn && v.booking) {
      const late = Math.floor((now - waitStartAt(v)) / MIN);
      if (late > r.onTimeTargetMin) {
        items.push({ min: late, text: `Appointment ${t} (${fmtClock(v.booking.slotAt)}) not started, ${late} min late` });
      }
    } else if (v.status === 'serving' && v.servedBy && v.startedAt !== null) {
      const expected = Math.round(expectedDeskMin(s, branchId, v.serviceCode, v.brand, v.servedBy));
      const m = Math.floor((now - v.startedAt) / MIN);
      if (m > expected * SERVING_ATTENTION_FACTOR) {
        items.push({ min: m, text: `${s.advisors[v.servedBy]?.name ?? ''} with ${t} for ${m} min (expected ${expected})` });
      }
    }
  }
  for (const a of Object.values(s.advisors)) {
    if (a.branchId !== branchId || !a.active || a.presence !== 'break' || !a.breakReason) continue;
    const m = Math.floor((now - a.presenceSince) / MIN);
    if (m > BREAK_MIN[a.breakReason]) items.push({ min: m, text: `${a.name} on break ${m} min (${a.breakReason})` });
  }
  return items
    .sort((x, y) => y.min - x.min || x.text.localeCompare(y.text))
    .slice(0, 5)
    .map((x) => x.text);
}

/** All branches incl. inactive, in branchOrder. */
export function selectBranchCards(s: AppState, now: EpochMs): BranchCardView[] {
  return selectAllBranches(s).map((b) => {
    const r = b.rules;
    const vs = dayVisits(s, b.id);
    const view = buildQueueView(s, b.id, now);
    const longest = longestWalkInWaitMin(vs, now);
    const overCap = overCapWalkIns(vs, r, now).length;
    const pastTold = pastToldWalkIns(vs, now).length;
    const mix = { free: 0, busy: 0, brk: 0, offline: 0 };
    for (const a of view.advisors) {
      const st = view.liveState[a.id] ?? 'offline';
      if (st === 'available') mix.free++;
      else if (st === 'serving' || st === 'calling') mix.busy++;
      else if (st === 'break') mix.brk++;
      else mix.offline++;
    }
    const n = view.advisors.length;
    return {
      branchId: b.id,
      code: b.code,
      name: b.name,
      subtitle: `${b.code} · ${fmtHours(b.opensAt, b.closesAt)} · ${n} advisor${n === 1 ? '' : 's'}${b.active ? '' : ' · inactive'}`,
      figures: [
        { label: 'Waiting', value: String(waitingNow(vs)), alert: overCap > 0 },
        { label: 'Longest', value: fmtMinTight(longest), alert: longest !== null && longest >= r.walkInCapMin },
        { label: 'Served', value: String(servedCount(vs)), alert: false },
        { label: 'On time', value: fmtPct(apptOnTime(vs, r).ratio), alert: false },
        { label: 'Walk-in wait', value: fmtMinTight(walkInWait(vs, now).avgMin), alert: false },
        { label: 'Promises kept', value: fmtPct(promisesKept(vs).ratio), alert: pastTold > 0 },
        { label: 'Desk time', value: fmtMinTight(deskTimeAvg(vs)), alert: false },
        { label: 'No-shows', value: String(noShowCount(vs)), alert: false },
      ],
      mix,
      attention: attentionFor(s, b.id, now),
      receptionHref: `/reception?branch=${encodeURIComponent(b.id)}`,
      displayHref: `/display/${encodeURIComponent(b.code)}`,
    };
  });
}
