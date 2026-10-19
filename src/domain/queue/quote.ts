// Walk-in wait quotes and the per-advisor options list.
import { FIXED_MARGIN_PCT, LONG_WAIT_MIN, MIN_LEARNED_WALKINS } from '../constants';
import { canServe } from '../eligibility';
import { LABEL } from '../messages';
import { atDubai } from '../time';
import type {
  AdvisorId,
  AppState,
  BranchId,
  BrandCode,
  EpochMs,
  LearningSnapshot,
  Quote,
  QueueRules,
  ServiceCode,
  Visit,
  VisitId,
} from '../types';
import { projectQueueView } from './project';
import { buildQueueView, type QueueView } from './view';

const MIN = 60_000;
const HYPO_ID = '__quote__';

export interface WalkInQuoteInput {
  branchId: BranchId;
  serviceCode: ServiceCode;
  brand: BrandCode;
  advisorId: AdvisorId | null;
}
export interface WalkInQuote {
  forecastMin: number;
  marginPct: number;
  quotedMin: number;
  calledBy: EpochMs;
  seenBy: AdvisorId | null; // chosen advisor, or null = "The first free advisor"
  sampleSize: number;
  learningOff: boolean;
  afterClosing: boolean; // calledBy + deskMin > closesAt
  longWait: boolean; // quotedMin >= 30
}

export interface WalkInOptionRow {
  advisorId: AdvisorId | null;
  name: string;
  desk: string | null;
  quote: WalkInQuote;
  soonest: boolean;
}
export interface WalkInOptions {
  rows: WalkInOptionRow[]; // eligible present advisors sorted by quotedMin then desk; last row = "Whoever is free first"
  defaultAdvisorId: AdvisorId | null; // soonest
  presentCount: number;
  noneCanTake: boolean;
}

/** max(5, ceil(min / 5) * 5). A tiny epsilon keeps 15 × 1.0 at 15 despite float noise. */
export function roundQuote(min: number): number {
  return Math.max(5, Math.ceil(min / 5 - 1e-9) * 5);
}

export function marginFor(
  snapshot: LearningSnapshot | undefined,
  rules: QueueRules,
): { marginPct: number; sampleSize: number; learningOff: boolean } {
  if (rules.learnDays === 0) return { marginPct: FIXED_MARGIN_PCT, sampleSize: 0, learningOff: true };
  const n = snapshot?.quote.sampleSize ?? 0;
  if (!snapshot || n < MIN_LEARNED_WALKINS) return { marginPct: FIXED_MARGIN_PCT, sampleSize: n, learningOff: false };
  return { marginPct: snapshot.quote.marginPct, sampleSize: n, learningOff: false };
}

/** quotedMin = roundQuote(forecast × (1 + margin)). */
export function quotedMinutes(forecastMin: number, marginPct: number): number {
  return roundQuote(forecastMin * (1 + marginPct / 100));
}

function hypotheticalWalkIn(
  view: QueueView,
  serviceCode: ServiceCode,
  brand: BrandCode,
  advisorId: AdvisorId | null,
  now: EpochMs,
): Visit {
  return {
    id: HYPO_ID,
    branchId: view.branch.id,
    date: '',
    kind: 'walk_in',
    status: 'waiting',
    ticketNo: null,
    customer: { name: null, mobile: '', plate: '', vehicle: '' },
    brand,
    serviceCode,
    booking: null,
    advisorId,
    advisorSource: advisorId ? 'issue' : null,
    lateAsWalkIn: false,
    arrivedAt: now,
    quote: null,
    receptionNote: '',
    priorNotes: [],
    visitNote: '',
    bump: null,
    handover: null,
    calls: [],
    firstCalledAt: null,
    calledBy: null,
    startedAt: null,
    servedBy: null,
    endedAt: null,
    endReason: '',
  };
}

/** Present advisors who could take `v` (own mode when it is theirs or unassigned). */
function eligibleFor(view: QueueView, v: Visit): string[] {
  const svc = view.services[v.serviceCode];
  if (!svc) return [];
  return view.advisors
    .filter((a) => view.liveState[a.id] !== 'offline' && canServe(a, v, svc, 'own'))
    .map((a) => a.id);
}

function quoteOnView(s: AppState, view: QueueView, input: WalkInQuoteInput, now: EpochMs): WalkInQuote | null {
  const svc = view.services[input.serviceCode];
  if (!svc || !svc.active) return null;
  const hypo = hypotheticalWalkIn(view, input.serviceCode, input.brand, input.advisorId, now);
  const eligible = eligibleFor(view, { ...hypo, advisorId: null });
  if (eligible.length === 0) return null;
  if (input.advisorId && !eligible.includes(input.advisorId)) return null;
  const proj = projectQueueView(view, now, [hypo]);
  const call = proj.byVisit[HYPO_ID];
  if (!call || call.estCallAt === null) return null;
  const forecastMin = Math.max(0, Math.round((call.estCallAt - now) / MIN));
  const m = marginFor(s.learning[view.branch.id], view.branch.rules);
  const quotedMin = quotedMinutes(forecastMin, m.marginPct);
  const calledBy = now + quotedMin * MIN;
  const desk = view.deskMin(input.serviceCode, input.brand, call.advisorId);
  const closesAt = atDubai(s.today, view.branch.closesAt);
  return {
    forecastMin,
    marginPct: m.marginPct,
    quotedMin,
    calledBy,
    seenBy: input.advisorId,
    sampleSize: m.sampleSize,
    learningOff: m.learningOff,
    afterClosing: calledBy + desk * MIN > closesAt,
    longWait: quotedMin >= LONG_WAIT_MIN,
  };
}

/** null = nobody can take it. */
export function quoteWalkIn(s: AppState, input: WalkInQuoteInput, now: EpochMs): WalkInQuote | null {
  if (!s.branches[input.branchId]) return null;
  return quoteOnView(s, buildQueueView(s, input.branchId, now), input, now);
}

export function walkInOptions(
  s: AppState,
  branchId: BranchId,
  serviceCode: ServiceCode,
  brand: BrandCode,
  now: EpochMs,
): WalkInOptions {
  if (!s.branches[branchId]) return { rows: [], defaultAdvisorId: null, presentCount: 0, noneCanTake: true };
  const view = buildQueueView(s, branchId, now);
  const presentCount = view.advisors.filter((a) => view.liveState[a.id] !== 'offline').length;
  const hypo = hypotheticalWalkIn(view, serviceCode, brand, null, now);
  const eligible = view.services[serviceCode] ? eligibleFor(view, hypo) : [];
  const rows: WalkInOptionRow[] = [];
  for (const id of eligible) {
    const a = view.advisors.find((x) => x.id === id);
    if (!a) continue;
    const q = quoteOnView(s, view, { branchId, serviceCode, brand, advisorId: id }, now);
    if (q) rows.push({ advisorId: id, name: a.name, desk: a.desk, quote: q, soonest: false });
  }
  const deskIdx = (id: AdvisorId | null): number => view.advisors.findIndex((a) => a.id === id);
  rows.sort((x, y) => x.quote.quotedMin - y.quote.quotedMin || x.quote.forecastMin - y.quote.forecastMin || deskIdx(x.advisorId) - deskIdx(y.advisorId));
  const firstRow = rows[0];
  if (firstRow) firstRow.soonest = true;
  if (rows.length > 0) {
    const any = quoteOnView(s, view, { branchId, serviceCode, brand, advisorId: null }, now);
    if (any) rows.push({ advisorId: null, name: LABEL.whoeverFree, desk: null, quote: any, soonest: false });
  }
  return {
    rows,
    defaultAdvisorId: firstRow?.advisorId ?? null,
    presentCount,
    noneCanTake: rows.length === 0,
  };
}

/** Quote stored on an appointment at check-in ("Tell them … called by …"). */
export function quoteForAppointmentCheckIn(
  s: AppState,
  visitId: VisitId,
  advisorId: AdvisorId | null,
  now: EpochMs,
): Quote {
  const v = s.visits[visitId];
  if (!v) throw new Error(`Unknown visit ${visitId}`);
  const branch = s.branches[v.branchId];
  if (!branch) throw new Error(`Unknown branch ${v.branchId}`);
  const slot = v.booking?.slotAt ?? now;
  const late = now > slot + branch.rules.graceMin * MIN || v.status === 'no_show';
  const hypo: Visit = { ...v, status: 'waiting', arrivedAt: now, advisorId, lateAsWalkIn: late, quote: null };
  const view = buildQueueView(s, v.branchId, now);
  const proj = projectQueueView(view, now, [hypo]);
  const call = proj.byVisit[visitId];
  const fallback = Math.max(0, Math.round((slot - now) / MIN));
  const forecastMin =
    call && call.estCallAt !== null ? Math.max(0, Math.round((call.estCallAt - now) / MIN)) : late ? 0 : fallback;
  const m = marginFor(s.learning[v.branchId], branch.rules);
  const quotedMin = quotedMinutes(forecastMin, m.marginPct);
  const toldBy = now + quotedMin * MIN;
  const desk = view.deskMin(v.serviceCode, v.brand, call?.advisorId ?? advisorId);
  return {
    issuedAt: now,
    advisorId,
    forecastMin,
    marginPct: m.marginPct,
    quotedMin,
    toldBy,
    sampleSize: m.sampleSize,
    afterClosing: toldBy + desk * MIN > atDubai(s.today, branch.closesAt),
  };
}
