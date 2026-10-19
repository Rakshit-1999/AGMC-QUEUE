// Branch dashboard selectors (P4).
import { DESK_TIME_ALERT_MIN } from '@/domain/constants';
import { queuesAsWalkIn } from '@/domain/eligibility';
import {
  apptOnTime,
  arrivals,
  brokenPromiseAvgOverMin,
  cancelledCount,
  deskTimeAvg,
  longestWaitMin,
  noShowCount,
  pastToldWalkIns,
  promisesKept,
  servedCount,
  waitingNow,
  walkInWait,
} from '@/domain/kpi';
import { LABEL } from '@/domain/messages';
import { expectedDeskMin } from '@/domain/queue/deskTime';
import { marginFor, quotedMinutes } from '@/domain/queue/quote';
import { waitStartAt } from '@/domain/queue/view';
import { dubaiHour, fmtClock, fmtLongDate, fmtMinTight, fmtPct, hhmmToMinutes, hourLabel, hourRangeLabel } from '@/domain/time';
import type { AdvisorId, AppState, BranchId, EpochMs, ServiceCode } from '@/domain/types';
import { dayVisits, selectAdvisorsOfBranch, serviceName, type Kpi } from './common';

const MIN = 60_000;

function pctValue(r: number | null): string | null {
  return r === null ? null : String(Math.round(r * 100));
}

function roundMin(x: number | null): string | null {
  return x === null ? null : String(Math.round(x));
}

/** 7 tiles. */
export function selectDashboardKpis(s: AppState, branchId: BranchId, now: EpochMs): Kpi[] {
  const b = s.branches[branchId];
  if (!b) return [];
  const r = b.rules;
  const vs = dayVisits(s, branchId);
  const arr = arrivals(vs);
  const wait = walkInWait(vs, now);
  const onTime = apptOnTime(vs, r);
  const kept = promisesKept(vs);
  const broken = brokenPromiseAvgOverMin(vs);
  const pastTold = pastToldWalkIns(vs, now).length;
  const longest = longestWaitMin(vs, now);
  const desk = deskTimeAvg(vs);
  return [
    { label: 'Arrivals', value: String(arr.den), hint: `${fmtPct(arr.ratio)} walk-ins`, alert: false },
    { label: 'Served', value: String(servedCount(vs)), hint: `${noShowCount(vs)} no-shows · ${cancelledCount(vs)} cancelled`, alert: false },
    { label: 'Waiting now', value: String(waitingNow(vs)), hint: `longest ${longest ?? 0} min`, alert: false },
    {
      label: 'Walk-in wait',
      value: roundMin(wait.avgMin),
      unit: wait.avgMin === null ? undefined : 'min',
      hint: `max ${Math.round(wait.maxMin ?? 0)} min · cap ${r.walkInCapMin}`,
      alert: wait.maxMin !== null && wait.maxMin >= r.walkInCapMin,
    },
    {
      label: 'Appointments on time',
      value: pctValue(onTime.ratio),
      unit: onTime.ratio === null ? undefined : '%',
      hint: `avg delay ${Math.round(onTime.avgDelayMin ?? 0)} min`,
      alert: false,
    },
    {
      label: 'Wait promises kept',
      value: pctValue(kept.ratio),
      unit: kept.ratio === null ? undefined : '%',
      hint: broken !== null ? `broken ones ran ${Math.round(broken)} min over` : 'walk-ins called by the time told',
      alert: pastTold > 0,
    },
    { label: 'Average desk time', value: roundMin(desk), unit: desk === null ? undefined : 'min', alert: false },
  ];
}

function openingHours(s: AppState, branchId: BranchId): number[] {
  const b = s.branches[branchId];
  if (!b) return [];
  const from = Math.floor(hhmmToMinutes(b.opensAt) / 60);
  const to = Math.ceil(hhmmToMinutes(b.closesAt) / 60);
  const out: number[] = [];
  for (let h = from; h < to; h++) out.push(h);
  return out;
}

export interface HourBucket {
  hour: number;
  /** "08:00–09:00" (hover). */
  label: string;
  /** "08" (axis). */
  axis: string;
}

/** Stacked columns per opening hour: appointments bottom, walk-ins (incl. late appointments) on top. */
export function selectArrivalsByHour(s: AppState, branchId: BranchId): (HourBucket & { appointments: number; walkIns: number })[] {
  const vs = dayVisits(s, branchId).filter((v) => v.arrivedAt !== null);
  return openingHours(s, branchId).map((h) => {
    const inHour = vs.filter((v) => dubaiHour(v.arrivedAt ?? 0) === h);
    const walkIns = inHour.filter(queuesAsWalkIn).length;
    return { hour: h, label: hourRangeLabel(h), axis: hourLabel(h).slice(0, 2), appointments: inHour.length - walkIns, walkIns };
  });
}

/** Average minutes from arrival (or slot) to being called, by hour of that start. null = "no calls". */
export function selectAvgWaitByHour(s: AppState, branchId: BranchId): (HourBucket & { avgMin: number | null })[] {
  const called = dayVisits(s, branchId).filter((v) => v.firstCalledAt !== null && v.arrivedAt !== null);
  return openingHours(s, branchId).map((h) => {
    const waits = called.filter((v) => dubaiHour(waitStartAt(v)) === h).map((v) => Math.max(0, ((v.firstCalledAt ?? 0) - waitStartAt(v)) / MIN));
    const avg = waits.length > 0 ? Math.round((waits.reduce((a, b) => a + b, 0) / waits.length) * 10) / 10 : null;
    return { hour: h, label: hourLabel(h), axis: hourLabel(h).slice(0, 2), avgMin: avg };
  });
}

export function selectDeskTimeByService(
  s: AppState,
  branchId: BranchId,
): { code: ServiceCode; name: string; avgMin: number | null; configuredMin: number; visits: number; over: boolean }[] {
  const done = dayVisits(s, branchId).filter((v) => v.status === 'done' && v.startedAt !== null && v.endedAt !== null);
  return s.serviceOrder
    .map((c) => s.services[c])
    .filter((x): x is NonNullable<typeof x> => !!x && x.active)
    .map((svc) => {
      const mins = done.filter((v) => v.serviceCode === svc.code).map((v) => ((v.endedAt ?? 0) - (v.startedAt ?? 0)) / MIN);
      const avg = mins.length > 0 ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : null;
      return { code: svc.code, name: svc.name, avgMin: avg, configuredMin: svc.expectedMin, visits: mins.length, over: avg !== null && avg > svc.expectedMin };
    });
}

export function selectAdvisorsToday(
  s: AppState,
  branchId: BranchId,
): { advisorId: AdvisorId; name: string; served: number; appts: number; walkIns: number; avgMin: number | null; overPct: number | null; overAlert: boolean }[] {
  const done = dayVisits(s, branchId).filter((v) => v.status === 'done' && v.servedBy !== null && v.startedAt !== null && v.endedAt !== null);
  return selectAdvisorsOfBranch(s, branchId).map((a) => {
    const mine = done.filter((v) => v.servedBy === a.id);
    const mins = mine.map((v) => ((v.endedAt ?? 0) - (v.startedAt ?? 0)) / MIN);
    const over = mine.filter((v, i) => (mins[i] ?? 0) > expectedDeskMin(s, branchId, v.serviceCode, v.brand, a.id)).length;
    const overPct = mine.length > 0 ? over / mine.length : null;
    return {
      advisorId: a.id,
      name: a.name,
      served: mine.length,
      appts: mine.filter((v) => !queuesAsWalkIn(v)).length,
      walkIns: mine.filter(queuesAsWalkIn).length,
      avgMin: mins.length > 0 ? Math.round(mins.reduce((x, y) => x + y, 0) / mins.length) : null,
      overPct,
      overAlert: overPct !== null && overPct > 0.5,
    };
  });
}

// ---------- What the system has learned ----------

export interface PromisesView {
  keptPct: string; // "83%" or "—"
  keptLine: string; // "called by the time told (18)"
  marginPct: number;
  sentence: { before: string; bold: string; after: string }; // "Quotes add **4%** to the forecast so about 8 in 10 …"
  sampleLine: string; // "learned from 18 walk-ins over the last 28 days · forecast drift: typical 0 min, 8 in 10 within 0.6 min"
  examples: string[]; // "forecast 5′ → told 10′" …
  histogram: { label: string; count: number; side: 'sooner' | 'later' }[]; // 6 columns
}

export interface DeskTimesView {
  services: {
    code: ServiceCode;
    name: string;
    byBrand: string; // "BMW 32′ · BMWi 31′ · MINI 33′"
    configured: string; // "25′"
    measured: string; // "33′" / "—"
    visits: number;
    nowUsing: string; // "31′"
    nowUsingAlert: boolean; // 3+ min from configured
  }[];
  advisors: { advisorId: AdvisorId; name: string; service: string; visits: number; theirs: string; team: string; difference: string }[];
  footnote: string;
}

const HIST_LABELS: readonly [string, 'sooner' | 'later'][] = [
  ['10+ min sooner', 'sooner'],
  ['5–10 sooner', 'sooner'],
  ['0–5 sooner', 'sooner'],
  ['1–5 later', 'later'],
  ['5–10 later', 'later'],
  ['10+ min later', 'later'],
];

function fmtDrift(x: number): string {
  const r = Math.round(x * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function difference(their: number, team: number): string {
  if (team <= 0) return 'same';
  const pct = Math.round((their / team - 1) * 100);
  if (pct === 0) return 'same';
  return pct < 0 ? `${-pct}% faster` : `+${pct}% slower`;
}

export function selectLearning(
  s: AppState,
  branchId: BranchId,
): { off: true; subtitle: string } | { off: false; subtitle: string; promises: PromisesView; deskTimes: DeskTimesView } {
  const b = s.branches[branchId];
  if (!b || b.rules.learnDays === 0) return { off: true, subtitle: LABEL.learningOff };
  const snap = s.learning[branchId];
  const days = b.rules.learnDays;
  const target = Math.round(b.rules.promiseTargetPct / 10);
  const m = marginFor(snap, b.rules);
  const q = snap?.quote;
  const n = q?.sampleSize ?? 0;
  const promises: PromisesView = {
    keptPct: fmtPct(q?.keptPct ?? null),
    keptLine: `called by the time told (${n})`,
    marginPct: m.marginPct,
    sentence: { before: 'Quotes add ', bold: `${m.marginPct}%`, after: ` to the forecast so about ${target} in 10 walk-ins are called sooner than told.` },
    sampleLine: `learned from ${n} walk-ins over the last ${days} days · forecast drift: typical ${fmtDrift(q?.driftTypicalMin ?? 0)} min, 8 in 10 within ${fmtDrift(q?.driftP80Min ?? 0)} min`,
    examples: [5, 15, 30, 60].map((f) => `forecast ${f}′ → told ${quotedMinutes(f, m.marginPct)}′`),
    histogram: HIST_LABELS.map(([label, side], i) => ({ label, side, count: q?.histogram[i] ?? 0 })),
  };

  const services: DeskTimesView['services'] = s.serviceOrder
    .map((c) => s.services[c])
    .filter((x): x is NonNullable<typeof x> => !!x && x.active)
    .map((svc) => {
      const l = snap?.services[svc.code];
      const byBrand = l
        ? Object.entries(l.byBrand)
            .sort(([x], [y]) => x.localeCompare(y))
            .map(([brand, v]) => `${brand} ${fmtMinTight(v.measuredMin)}`)
            .join(' · ')
        : '';
      const nowUsing = l?.nowUsingMin ?? svc.expectedMin;
      return {
        code: svc.code,
        name: svc.name,
        byBrand,
        configured: fmtMinTight(svc.expectedMin),
        measured: fmtMinTight(l?.measuredMin ?? null),
        visits: l?.visits ?? 0,
        nowUsing: fmtMinTight(nowUsing),
        nowUsingAlert: Math.abs(Math.round(nowUsing) - svc.expectedMin) >= DESK_TIME_ALERT_MIN,
      };
    });

  const advisors: DeskTimesView['advisors'] = [];
  for (const a of selectAdvisorsOfBranch(s, branchId)) {
    const per = snap?.advisors[a.id];
    if (!per) continue;
    for (const code of s.serviceOrder) {
      const x = per[code];
      if (!x || x.visits <= 0) continue;
      advisors.push({
        advisorId: a.id,
        name: a.name,
        service: serviceName(s, code),
        visits: x.visits,
        theirs: fmtMinTight(x.theirMin),
        team: fmtMinTight(x.teamMin),
        difference: difference(x.theirMin, x.teamMin),
      });
    }
  }

  return {
    off: false,
    subtitle: `From the last ${days} days at this branch · updates every 10 minutes`,
    promises,
    deskTimes: { services, advisors, footnote: LABEL.deskTimesFootnote },
  };
}

/** Activity: latest audit entries of the branch. */
export function selectActivity(s: AppState, branchId: BranchId, limit = 40): { id: string; time: string; who: string; what: string; detail: string }[] {
  const out: { id: string; time: string; who: string; what: string; detail: string }[] = [];
  for (const e of s.audit) {
    if (e.branchId !== branchId) continue;
    out.push({ id: e.id, time: fmtClock(e.at), who: e.who, what: e.what, detail: e.detail });
    if (out.length >= limit) break;
  }
  return out;
}

/** Dashboard heading: "Monday, 19 Oct 2026 · open 07:30–18:00". */
export function selectDashboardHeading(s: AppState, branchId: BranchId, now: EpochMs): { title: string; subtitle: string } | null {
  const b = s.branches[branchId];
  if (!b) return null;
  return { title: b.name, subtitle: `${fmtLongDate(now)} · open ${b.opensAt}–${b.closesAt}` };
}
