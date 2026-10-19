// Reception page selectors (P2).
import { NEAR_CAP_MIN } from '@/domain/constants';
import { canServe, queuesAsWalkIn } from '@/domain/eligibility';
import {
  apptOnTime,
  apptsNext30,
  apptsRunningLate,
  beingCalled,
  longestWaitMin,
  noShowCount,
  overCapWalkIns,
  pastToldWalkIns,
  promisesKept,
  servedCount,
  waitingNow,
  walkInsIssued,
  withAdvisors,
} from '@/domain/kpi';
import { customerName, LABEL, noneHandlesLine } from '@/domain/messages';
import { expectedDeskMin } from '@/domain/queue/deskTime';
import { walkInOptions, type WalkInOptionRow, type WalkInOptions } from '@/domain/queue/quote';
import { buildQueueView, nextAppointmentFor, waitedMin } from '@/domain/queue/view';
import { fmtClock, fmtClockCeil } from '@/domain/time';
import type { AdvisorId, AdvisorLiveState, AppState, BranchId, BrandCode, EpochMs, ServiceCode, Visit, VisitId } from '@/domain/types';
import {
  advisorName,
  advisorSourceLabel,
  advisorStateChip,
  advisorSubtitle,
  appointmentArrivalChip,
  dayVisits,
  displayName,
  firstName,
  notArrivedChip,
  selectAdvisorsOfBranch,
  selectProjection,
  serviceName,
  statusChip,
  typeChip,
  type ChipSpec,
  type Kpi,
} from './common';

const MIN = 60_000;

function pctValue(r: number | null): string | null {
  return r === null ? null : String(Math.round(r * 100));
}

// ---------- KPIs ----------

/** Exactly the 9 tiles, in SPEC order. */
export function selectReceptionKpis(s: AppState, branchId: BranchId, now: EpochMs): Kpi[] {
  const b = s.branches[branchId];
  if (!b) return [];
  const r = b.rules;
  const vs = dayVisits(s, branchId);
  const longest = longestWaitMin(vs, now);
  const pastTold = pastToldWalkIns(vs, now).length;
  const kept = promisesKept(vs);
  const overCap = overCapWalkIns(vs, r, now).length;
  const onTime = apptOnTime(vs, r);
  return [
    { label: 'Waiting now', value: String(waitingNow(vs)), hint: `${beingCalled(vs)} being called`, alert: false },
    { label: 'Longest wait', value: longest === null ? null : String(longest), unit: longest === null ? undefined : 'min', alert: longest !== null && longest >= r.walkInCapMin },
    { label: 'With advisors', value: String(withAdvisors(vs)), alert: false },
    { label: 'Past the time we told them', value: String(pastTold), hint: 'walk-ins still waiting', alert: pastTold > 0 },
    { label: 'Wait promises kept', value: pctValue(kept.ratio), unit: kept.ratio === null ? undefined : '%', hint: `${walkInsIssued(vs)} walk-ins today`, alert: false },
    { label: 'Walk-ins over cap', value: String(overCap), hint: `cap ${r.walkInCapMin} min`, alert: overCap > 0 },
    { label: 'Appointments next 30 min', value: String(apptsNext30(vs, now)), hint: `${apptsRunningLate(vs, r, now)} running late`, alert: false },
    { label: 'Served today', value: String(servedCount(vs)), hint: `${noShowCount(vs)} no-shows`, alert: false },
    { label: 'Appointments on time', value: pctValue(onTime.ratio), unit: onTime.ratio === null ? undefined : '%', alert: false },
  ];
}

// ---------- Check in: appointment tab ----------

export interface CheckInRow {
  visitId: VisitId;
  slot: string;
  name: string;
  plateVehicle: string; // "Dubai X 75542 · BMW X6 M60i"
  serviceAdvisor: string; // "Service · Layla Mansour (allocated)"
  chip: ChipSpec;
  checkedIn: boolean;
  ticketNo: string | null;
  statusChip: ChipSpec | null;
  hasAdvisor: boolean;
}

function digits(x: string): string {
  return x.replace(/\D+/g, '');
}

function matches(v: Visit, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  const compact = lower.replace(/\s+/g, '');
  const name = (v.customer.name ?? '').toLowerCase();
  const plate = v.customer.plate.toLowerCase().replace(/\s+/g, '');
  const ref = (v.booking?.keyloopRef ?? '').toLowerCase();
  const qd = digits(q);
  return (
    name.includes(lower) ||
    (compact.length > 0 && plate.includes(compact)) ||
    ref.includes(compact) ||
    (qd.length >= 3 && digits(v.customer.mobile).includes(qd)) ||
    (v.ticketNo ?? '').toLowerCase().includes(compact)
  );
}

function serviceAdvisorLine(s: AppState, v: Visit): string {
  const svc = serviceName(s, v.serviceCode);
  const name = advisorName(s, v.advisorId);
  if (!name) return `${svc} · ${LABEL.noAdvisorYet}`;
  const src = advisorSourceLabel(v);
  return `${svc} · ${name}${src ? ` ${src}` : ''}`;
}

/** Order: due/late-within-grace, upcoming by slot, past-grace, missed, then checked-in (faded). */
export function selectCheckInList(s: AppState, branchId: BranchId, query: string, now: EpochMs): CheckInRow[] {
  const b = s.branches[branchId];
  if (!b) return [];
  const r = b.rules;
  const q = query.trim();
  const group = (v: Visit): number => {
    if (v.arrivedAt !== null) return 4;
    if (v.status === 'no_show') return 3;
    const slot = v.booking?.slotAt ?? 0;
    if (now > slot + r.graceMin * MIN) return 2;
    if (now >= slot - r.earlyWindowMin * MIN) return 0;
    return 1;
  };
  return dayVisits(s, branchId)
    .filter((v) => v.kind === 'appointment' && v.booking && !(v.status === 'cancelled' && v.arrivedAt === null) && matches(v, q))
    .map((v) => ({ v, g: group(v) }))
    .sort((x, y) => x.g - y.g || (x.v.booking?.slotAt ?? 0) - (y.v.booking?.slotAt ?? 0) || x.v.id.localeCompare(y.v.id))
    .map(({ v }) => {
      const checkedIn = v.arrivedAt !== null;
      return {
        visitId: v.id,
        slot: v.booking ? fmtClock(v.booking.slotAt) : '',
        name: displayName(v),
        plateVehicle: `${v.customer.plate} · ${v.brand} ${v.customer.vehicle}`.trim(),
        serviceAdvisor: serviceAdvisorLine(s, v),
        chip: appointmentArrivalChip(v, r, now),
        checkedIn,
        ticketNo: v.ticketNo,
        statusChip: checkedIn ? statusChip(v.status) : null,
        hasAdvisor: v.advisorId !== null,
      };
    });
}

function liveWord(state: AdvisorLiveState): string {
  if (state === 'available') return 'free';
  if (state === 'break') return 'break';
  if (state === 'offline') return 'offline';
  return 'serving';
}

/** Pick-advisor dialog: title, explanation and options ("Omar Haddad · Desk 1 · free|serving|break"). */
export function selectPickAdvisorOptions(
  s: AppState,
  branchId: BranchId,
  visitId: VisitId,
  now: EpochMs,
): { title: string; explanation: string; options: { value: AdvisorId | 'first_free'; label: string }[] } {
  const v = s.visits[visitId];
  const b = s.branches[branchId];
  if (!v || !b) return { title: '', explanation: '', options: [] };
  const view = buildQueueView(s, branchId, now);
  const svc = s.services[v.serviceCode];
  const options: { value: AdvisorId | 'first_free'; label: string }[] = [];
  if (v.advisorId === null) options.push({ value: 'first_free', label: LABEL.whoeverFree });
  for (const a of view.advisors) {
    const state = view.liveState[a.id] ?? 'offline';
    const eligible = svc ? canServe({ ...a, presence: 'available' }, { ...v, lateAsWalkIn: false }, svc, 'own') : false;
    if (!eligible) continue;
    if (state === 'offline' && a.id !== v.advisorId) continue;
    options.push({ value: a.id, label: `${a.name} · ${a.desk} · ${liveWord(state)}` });
  }
  const slot = v.booking ? fmtClock(v.booking.slotAt) : '';
  return {
    title: `Check in ${displayName(v)}`,
    explanation: `${slot} · ${serviceName(s, v.serviceCode)} · ${v.brand}. Customers booking online do not choose an advisor — pick who serves them.`,
    options,
  };
}

// ---------- Check in: walk-in tab ----------

export interface QuoteBoxView {
  tone: 'green' | 'clay';
  tell: string; // "Tell the customer"
  about: string; // "About 15 min"
  seenByName: string | null; // "Ravi Menon" (bold) or null -> "The first free advisor will see them"
  calledBy: string; // "12:56"
  greyLine: string;
  afterClosing: string | null;
  longWait: string | null;
}

export interface WalkInOptionsView extends WalkInOptions {
  quoteLine: (row: WalkInOptionRow) => string;
  /** Everything the quote box shows for a row. */
  quoteBox: (row: WalkInOptionRow) => QuoteBoxView;
  /** "about 15 min" for the advisor rows. */
  aboutLine: (row: WalkInOptionRow) => string;
  /** Clay box when nobody can take it. */
  none: { title: string; line: string } | null;
}

export function quoteGreyLine(row: WalkInOptionRow, s: AppState, branchId: BranchId): string {
  const q = row.quote;
  const b = s.branches[branchId];
  const days = b?.rules.learnDays ?? 0;
  const target = b?.rules.promiseTargetPct ?? 80;
  if (q.learningOff) return `Forecast ${q.forecastMin} min + ${q.marginPct}% margin (learning is off for this branch)`;
  return `Forecast ${q.forecastMin} min + ${q.marginPct}% margin, so about ${Math.round(target / 10)} in 10 walk-ins are called sooner than told · learned from ${q.sampleSize} walk-ins over the last ${days} days`;
}

export function selectWalkInOptions(
  s: AppState,
  branchId: BranchId,
  serviceCode: ServiceCode,
  brand: BrandCode,
  now: EpochMs,
): WalkInOptionsView {
  const opts = walkInOptions(s, branchId, serviceCode, brand, now);
  const quoteLine = (row: WalkInOptionRow): string => quoteGreyLine(row, s, branchId);
  return {
    ...opts,
    quoteLine,
    aboutLine: (row) => `about ${row.quote.quotedMin} min`,
    quoteBox: (row) => ({
      tone: row.quote.longWait || row.quote.afterClosing ? 'clay' : 'green',
      tell: LABEL.tellTheCustomer,
      about: `About ${row.quote.quotedMin} min`,
      seenByName: row.advisorId ? row.name : null,
      calledBy: fmtClockCeil(row.quote.calledBy),
      greyLine: quoteLine(row),
      afterClosing: row.quote.afterClosing ? LABEL.afterClosing : null,
      longWait: row.quote.longWait ? LABEL.longWait : null,
    }),
    none: opts.noneCanTake ? { title: LABEL.noAdvisorCanTake, line: noneHandlesLine(opts.presentCount) } : null,
  };
}

// ---------- Queue ----------

export interface QueueRowView {
  visitId: VisitId;
  position: number;
  ticketNo: string;
  name: string;
  plate: string;
  typeChip: ChipSpec;
  movedUp: string | null;
  assignedTo: string | null;
  service: string;
  brand: string;
  arrived: string;
  waiting: { text: string; tone: 'normal' | 'amber' | 'clay'; sub: string | null; subTone: 'grey' | 'clayBold' };
  advisor: { name: string; sub: string; subTone: 'grey' | 'amber' | 'clay' };
  pastTold: boolean;
  highlighted: boolean;
  canMoveToFront: boolean;
  customerFirstName: string;
}

export function selectQueueRows(s: AppState, branchId: BranchId, now: EpochMs): { subtitle: string; rows: QueueRowView[] } {
  const b = s.branches[branchId];
  if (!b) return { subtitle: '', rows: [] };
  const r = b.rules;
  const proj = selectProjection(s, branchId, now);
  const rows: QueueRowView[] = [];
  for (const pc of proj.order) {
    const v = s.visits[pc.visitId];
    if (!v) continue;
    const walkLike = queuesAsWalkIn(v);
    let waiting: QueueRowView['waiting'];
    if (walkLike) {
      const m = waitedMin(v, now);
      const tone = m >= r.walkInCapMin ? 'clay' : m >= r.walkInCapMin - NEAR_CAP_MIN ? 'amber' : 'normal';
      let sub: string | null = null;
      let subTone: 'grey' | 'clayBold' = 'grey';
      if (v.quote) {
        if (now > v.quote.toldBy) {
          sub = `${Math.floor((now - v.quote.toldBy) / MIN)} min past told time`;
          subTone = 'clayBold';
        } else sub = `told by ${fmtClockCeil(v.quote.toldBy)}`;
      }
      waiting = { text: `${m} min`, tone, sub, subTone };
    } else {
      const slot = v.booking?.slotAt ?? now;
      waiting =
        now >= slot
          ? { text: `${Math.floor((now - slot) / MIN)} min`, tone: 'normal', sub: null, subTone: 'grey' }
          : { text: `early · slot ${fmtClock(slot)}`, tone: 'normal', sub: null, subTone: 'grey' };
    }
    let advisor: QueueRowView['advisor'];
    const owner = advisorName(s, v.advisorId) ?? LABEL.whoeverFree;
    if (pc.estCallAt === null) advisor = { name: owner, sub: LABEL.noAdvisorAvailable, subTone: 'clay' };
    else if (pc.covering && pc.advisorId) advisor = { name: owner, sub: `est. ${fmtClock(pc.estCallAt)} · ${advisorName(s, pc.advisorId) ?? ''} covering`, subTone: 'amber' };
    else advisor = { name: owner, sub: `est. ${fmtClock(pc.estCallAt)}`, subTone: 'grey' };
    const assigned =
      v.advisorId && (v.advisorSource === 'reassigned' || v.advisorSource === 'handover') ? `Assigned → ${advisorName(s, v.advisorId) ?? ''}` : null;
    const movedUp = v.bump ? `Moved up: ${v.bump.reason}` : null;
    rows.push({
      visitId: v.id,
      position: pc.position,
      ticketNo: v.ticketNo ?? '',
      name: displayName(v),
      plate: v.customer.plate,
      typeChip: typeChip(v),
      movedUp,
      assignedTo: assigned,
      service: serviceName(s, v.serviceCode),
      brand: v.brand,
      arrived: v.arrivedAt !== null ? fmtClock(v.arrivedAt) : '',
      waiting,
      advisor,
      pastTold: walkLike && v.quote !== null && now > v.quote.toldBy,
      highlighted: movedUp !== null || assigned !== null,
      canMoveToFront: walkLike,
      customerFirstName: firstName(v),
    });
  }
  return { subtitle: `${rows.length} waiting · in the order they will be called`, rows };
}

// ---------- Advisors ----------

export interface AdvisorCardView {
  advisorId: AdvisorId;
  name: string;
  subtitle: string;
  state: AdvisorLiveState;
  chip: ChipSpec;
  customer: { ticketNo: string; name: string; elapsedMin: number; expectedMin: number; over: boolean } | null;
  line: string | null; // "Next appointment 14:00" / "Free" / "Break · Coffee · 12 min" / "Not signed in"
  shaded: boolean;
}

const BUSY_ORDER: Readonly<Record<AdvisorLiveState, number>> = { serving: 0, calling: 1, available: 2, break: 3, offline: 4 };

export function selectAdvisorCards(s: AppState, branchId: BranchId, now: EpochMs): { subtitle: string; cards: AdvisorCardView[] } {
  if (!s.branches[branchId]) return { subtitle: '', cards: [] };
  const view = buildQueueView(s, branchId, now);
  const current = new Map<AdvisorId, Visit>();
  for (const v of dayVisits(s, branchId)) {
    if (v.status === 'called' && v.calledBy) current.set(v.calledBy, v);
    if (v.status === 'serving' && v.servedBy) current.set(v.servedBy, v);
  }
  const cards = view.advisors.map((a, deskIndex): { card: AdvisorCardView; deskIndex: number } => {
    const state = view.liveState[a.id] ?? 'offline';
    const cur = current.get(a.id) ?? null;
    let customer: AdvisorCardView['customer'] = null;
    let line: string | null = null;
    if (cur) {
      const since = cur.status === 'serving' ? cur.startedAt ?? now : cur.calls[0]?.at ?? now;
      const elapsedMin = Math.max(0, Math.floor((now - since) / MIN));
      const expectedMin = Math.round(expectedDeskMin(s, branchId, cur.serviceCode, cur.brand, a.id));
      customer = { ticketNo: cur.ticketNo ?? '', name: displayName(cur), elapsedMin, expectedMin, over: cur.status === 'serving' && elapsedMin > expectedMin };
    } else if (state === 'available') {
      const next = nextAppointmentFor(view, a.id, now);
      line = next?.booking ? `Next appointment ${fmtClock(next.booking.slotAt)}` : 'Free';
    } else if (state === 'break') {
      line = `Break · ${a.breakReason ?? 'Coffee'} · ${Math.max(0, Math.floor((now - a.presenceSince) / MIN))} min`;
    } else {
      line = 'Not signed in';
    }
    const card: AdvisorCardView = {
      advisorId: a.id,
      name: a.name,
      subtitle: advisorSubtitle(a),
      state,
      chip: advisorStateChip(state),
      customer,
      line,
      shaded: state === 'break' || state === 'offline',
    };
    return { card, deskIndex };
  });
  const sorted = cards
    .sort((x, y) => BUSY_ORDER[x.card.state] - BUSY_ORDER[y.card.state] || x.deskIndex - y.deskIndex)
    .map((x) => x.card);
  const present = sorted.filter((c) => c.state !== 'offline').length;
  return { subtitle: `${present} of ${sorted.length} present`, cards: sorted };
}

// ---------- Appointments not arrived / recently finished ----------

export function selectNotArrived(
  s: AppState,
  branchId: BranchId,
  now: EpochMs,
): { count: number; rows: { visitId: VisitId; slot: string; name: string; sub: string; chip: ChipSpec }[] } {
  const b = s.branches[branchId];
  if (!b) return { count: 0, rows: [] };
  const rows = dayVisits(s, branchId)
    .filter((v) => v.kind === 'appointment' && v.booking && v.arrivedAt === null && (v.status === 'booked' || v.status === 'no_show'))
    .sort((x, y) => (x.booking?.slotAt ?? 0) - (y.booking?.slotAt ?? 0) || x.id.localeCompare(y.id))
    .map((v) => ({
      visitId: v.id,
      slot: v.booking ? fmtClock(v.booking.slotAt) : '',
      name: displayName(v),
      sub: `${advisorName(s, v.advisorId) ?? LABEL.noAdvisorYet} · ${serviceName(s, v.serviceCode)}`,
      chip: notArrivedChip(v, b.rules, now),
    }));
  return { count: rows.length, rows };
}

export function selectRecentlyFinished(
  s: AppState,
  branchId: BranchId,
  limit = 10,
): { visitId: VisitId; time: string; ticketName: string; sub: string; chip: ChipSpec }[] {
  return dayVisits(s, branchId)
    .filter((v) => v.ticketNo !== null && v.endedAt !== null && (v.status === 'done' || v.status === 'no_show' || v.status === 'cancelled'))
    .sort((x, y) => (y.endedAt ?? 0) - (x.endedAt ?? 0) || y.id.localeCompare(x.id))
    .slice(0, limit)
    .map((v) => ({
      visitId: v.id,
      time: fmtClock(v.endedAt ?? 0),
      ticketName: `${v.ticketNo ?? ''} ${displayName(v)}`,
      sub: `${advisorName(s, v.servedBy ?? v.advisorId) ?? LABEL.whoeverFree} · ${serviceName(s, v.serviceCode)}`,
      chip: statusChip(v.status),
    }));
}

// ---------- Ticket issued ----------

export interface IssuedTicketView {
  ticketNo: string;
  name: string;
  serviceBrand: string;
  seenBy: string | null; // null -> "the first free advisor will see you"
  aboutMin: number;
  calledBy: string;
  lateNotice: boolean;
}

/** null when the visit is unknown or has no ticket. */
export function selectIssuedTicket(s: AppState, visitId: VisitId, now: EpochMs): IssuedTicketView | null {
  const v = s.visits[visitId];
  if (!v || !v.ticketNo) return null;
  const quotedMin = v.quote?.quotedMin ?? 5;
  return {
    ticketNo: v.ticketNo,
    name: customerName(v.customer.name),
    serviceBrand: `${serviceName(s, v.serviceCode)} · ${v.brand}`,
    seenBy: advisorName(s, v.advisorId),
    aboutMin: quotedMin,
    calledBy: fmtClockCeil(v.quote?.toldBy ?? now + quotedMin * MIN),
    lateNotice: v.kind === 'appointment' && v.lateAsWalkIn,
  };
}

/** For the reception page heading: "Reception · open 07:30–18:00". */
export function selectReceptionHeading(s: AppState, branchId: BranchId): { title: string; subtitle: string; displayHref: string } | null {
  const b = s.branches[branchId];
  if (!b) return null;
  return { title: b.name, subtitle: `Reception · open ${b.opensAt}–${b.closesAt}`, displayHref: `/display/${b.code}` };
}

/** Advisors of the branch for the change-advisor dialog: "Whoever is free first" + "Name · Desk". */
export function selectChangeAdvisorOptions(s: AppState, branchId: BranchId): { value: AdvisorId | null; label: string }[] {
  return [
    { value: null, label: LABEL.whoeverFree },
    ...selectAdvisorsOfBranch(s, branchId).map((a) => ({ value: a.id as AdvisorId | null, label: `${a.name} · ${a.desk}` })),
  ];
}
