// Service advisor desk selectors (P3).
import { queuesAsWalkIn } from '@/domain/eligibility';
import { customerName, LABEL, REASON_TEXT } from '@/domain/messages';
import { expectedDeskMin } from '@/domain/queue/deskTime';
import { pickNext } from '@/domain/queue/pickNext';
import { buildQueueView, nextAppointmentFor, waitStartAt, waitedMin } from '@/domain/queue/view';
import { fmtClock, fmtClockCeil, fmtPct } from '@/domain/time';
import type { Advisor, AdvisorId, AdvisorLiveState, AppState, Branch, EpochMs, Visit, VisitId } from '@/domain/types';
import { advisorName, dayVisits, displayName, selectProjection, serviceName, statusChip, typeChip, type ChipSpec, type Kpi } from './common';

const MIN = 60_000;

export interface VisitCardInfo {
  visitId: VisitId;
  ticketNo: string;
  name: string;
  typeChip: ChipSpec;
  details: { label: string; value: string; mono?: boolean }[]; // MOBILE, PLATE, VEHICLE, SERVICE, ARRIVED, WAITED, KEYLOOP REF, EXPECTED TIME
}
export interface LineRow {
  visitId: VisitId;
  ticketNo: string;
  typeChip: ChipSpec;
  name: string;
  mobile: string;
  vehicle: string;
  plateRef: string;
  service: string;
  brand: string;
  waiting: string;
  youCall: string;
  told: string | null;
}
export interface MyDayRow {
  visitId: VisitId;
  time: string;
  ticketNo: string | null;
  name: string;
  sub: string;
  chip: ChipSpec;
}
export type AdvisorDeskCard =
  | { kind: 'calling'; visit: VisitCardInfo; calledAgoMs: number; callCount: number; tvLine: string }
  | { kind: 'serving'; visit: VisitCardInfo; since: string; startedAt: EpochMs; expectedMin: number; notes: string[] }
  | { kind: 'readyNext'; next: VisitCardInfo; whyLine: string }
  | { kind: 'readyEmpty'; nextAppt: { time: string; name: string } | null }
  | { kind: 'away'; label: string; headline: string };

export interface AdvisorDeskView {
  advisor: Advisor;
  branch: Branch;
  title: string;
  subtitle: string; // "Desk 1 · Main Branch (SZR)"
  liveState: AdvisorLiveState;
  statusLocked: boolean; // customer at desk -> other segments disabled
  kpis: Kpi[]; // 4 tiles
  card: AdvisorDeskCard;
  line: { subtitle: string; rows: LineRow[] }; // empty rows -> section hidden
  myDay: { count: number; rows: MyDayRow[]; footer: string };
}

function visitInfo(s: AppState, v: Visit, advisorId: AdvisorId, now: EpochMs): VisitCardInfo {
  const waited =
    v.arrivedAt === null ? null : Math.max(0, Math.floor(((v.firstCalledAt ?? now) - waitStartAt(v)) / MIN));
  const expected = Math.round(expectedDeskMin(s, v.branchId, v.serviceCode, v.brand, advisorId));
  return {
    visitId: v.id,
    ticketNo: v.ticketNo ?? '',
    name: customerName(v.customer.name),
    typeChip: typeChip(v),
    details: [
      { label: 'MOBILE', value: v.customer.mobile || LABEL.dash },
      { label: 'PLATE', value: v.customer.plate || LABEL.dash },
      { label: 'VEHICLE', value: v.customer.vehicle ? `${v.brand} ${v.customer.vehicle}` : LABEL.dash },
      { label: 'SERVICE', value: `${serviceName(s, v.serviceCode)} · ${v.brand}` },
      { label: 'ARRIVED', value: v.arrivedAt !== null ? fmtClock(v.arrivedAt) : LABEL.dash },
      { label: 'WAITED', value: waited === null ? LABEL.dash : `${waited} min` },
      { label: 'KEYLOOP REF', value: v.booking?.keyloopRef ?? LABEL.dash, mono: true },
      { label: 'EXPECTED TIME', value: `${expected} min` },
    ],
  };
}

function myVisits(s: AppState, advisorId: AdvisorId, branchId: string): Visit[] {
  return dayVisits(s, branchId).filter((v) => v.advisorId === advisorId || v.servedBy === advisorId);
}

function timeOf(v: Visit): EpochMs {
  return v.booking?.slotAt ?? v.arrivedAt ?? 0;
}

/** null when the advisor or its branch is unknown. */
export function selectAdvisorDesk(s: AppState, advisorId: AdvisorId, now: EpochMs): AdvisorDeskView | null {
  const advisor = s.advisors[advisorId];
  const branch = advisor ? s.branches[advisor.branchId] : undefined;
  if (!advisor || !branch) return null;
  const view = buildQueueView(s, branch.id, now);
  const liveState = view.liveState[advisorId] ?? (advisor.active ? advisor.presence : 'offline');
  const visits = dayVisits(s, branch.id);
  const current = visits.find(
    (v) => (v.status === 'called' && v.calledBy === advisorId) || (v.status === 'serving' && v.servedBy === advisorId),
  );

  // KPIs
  const served = visits.filter((v) => v.status === 'done' && v.servedBy === advisorId);
  const deskTimes = served.filter((v) => v.startedAt !== null && v.endedAt !== null).map((v) => ((v.endedAt ?? 0) - (v.startedAt ?? 0)) / MIN);
  const avgDesk = deskTimes.length > 0 ? deskTimes.reduce((a, b) => a + b, 0) / deskTimes.length : null;
  const apptsCalled = visits.filter(
    (v) => v.kind === 'appointment' && !v.lateAsWalkIn && v.firstCalledAt !== null && v.arrivedAt !== null && (v.servedBy === advisorId || v.calledBy === advisorId),
  );
  const onTimeN = apptsCalled.filter((v) => (v.firstCalledAt ?? 0) <= waitStartAt(v) + branch.rules.onTimeTargetMin * MIN).length;
  const onTime = apptsCalled.length > 0 ? onTimeN / apptsCalled.length : null;
  const waitingForMe = visits.filter((v) => v.status === 'waiting' && v.advisorId === advisorId);
  const kpis: Kpi[] = [
    { label: 'Served today', value: String(served.length), alert: false },
    { label: 'Average desk time', value: avgDesk === null ? null : avgDesk.toFixed(1), unit: avgDesk === null ? undefined : 'min', alert: false },
    { label: 'Appointments on time', value: onTime === null ? null : String(Math.round(onTime * 100)), unit: onTime === null ? undefined : '%', alert: false },
    { label: 'Waiting for you', value: String(waitingForMe.length), hint: 'your appointments + assigned', alert: false },
  ];

  // Current customer card
  let card: AdvisorDeskCard;
  if (current?.status === 'called') {
    const last = current.calls[current.calls.length - 1];
    card = {
      kind: 'calling',
      visit: visitInfo(s, current, advisorId, now),
      calledAgoMs: Math.max(0, now - (last?.at ?? now)),
      callCount: current.calls.length,
      tvLine: `The waiting-area screen shows ${current.ticketNo ?? ''} → ${advisor.desk}.`,
    };
  } else if (current?.status === 'serving') {
    const startedAt = current.startedAt ?? now;
    card = {
      kind: 'serving',
      visit: visitInfo(s, current, advisorId, now),
      since: fmtClock(startedAt),
      startedAt,
      expectedMin: Math.round(expectedDeskMin(s, branch.id, current.serviceCode, current.brand, advisorId)),
      notes: [...current.priorNotes, ...(current.receptionNote ? [current.receptionNote] : [])],
    };
  } else if (liveState === 'break' || liveState === 'offline') {
    card =
      liveState === 'break'
        ? { kind: 'away', label: `ON BREAK · ${(advisor.breakReason ?? 'Coffee').toUpperCase()}`, headline: 'Enjoy your break.' }
        : { kind: 'away', label: 'OFFLINE', headline: "You're not taking customers." };
  } else {
    const pick = pickNext(view, advisorId, now);
    const next = pick ? s.visits[pick.visitId] : undefined;
    if (pick && next) {
      const mins = Math.round(view.deskMin(next.serviceCode, next.brand, advisorId));
      card = {
        kind: 'readyNext',
        next: visitInfo(s, next, advisorId, now),
        whyLine: `${REASON_TEXT[pick.reason]} · ${serviceName(s, next.serviceCode)} · ${next.brand} · about ${mins} min`,
      };
    } else {
      const appt = nextAppointmentFor(view, advisorId, now);
      card = {
        kind: 'readyEmpty',
        nextAppt: appt?.booking ? { time: fmtClock(appt.booking.slotAt), name: displayName(appt) } : null,
      };
    }
  }

  // Your line
  const proj = selectProjection(s, branch.id, now);
  const lineRows: LineRow[] = waitingForMe
    .slice()
    .sort((a, b) => (proj.byVisit[a.id]?.position ?? 999) - (proj.byVisit[b.id]?.position ?? 999))
    .map((v) => {
      const pc = proj.byVisit[v.id];
      let youCall: string = LABEL.dash;
      if (pc?.estCallAt != null) {
        youCall = pc.advisorId && pc.advisorId !== advisorId ? `${advisorName(s, pc.advisorId) ?? ''} may cover` : `about ${fmtClock(pc.estCallAt)}`;
      }
      return {
        visitId: v.id,
        ticketNo: v.ticketNo ?? '',
        typeChip: typeChip(v),
        name: customerName(v.customer.name),
        mobile: v.customer.mobile,
        vehicle: `${v.brand} ${v.customer.vehicle}`.trim(),
        plateRef: [v.customer.plate, v.booking?.keyloopRef].filter(Boolean).join(' · '),
        service: serviceName(s, v.serviceCode),
        brand: v.brand,
        waiting: `${waitedMin(v, now)} min`,
        youCall,
        told: v.quote ? `told ${fmtClockCeil(v.quote.toldBy)}` : null,
      };
    });

  // My day
  const mine = myVisits(s, advisorId, branch.id)
    .filter((v) => !(v.status === 'cancelled' && v.ticketNo === null))
    .sort((a, b) => timeOf(a) - timeOf(b) || a.id.localeCompare(b.id));
  const myDayRows: MyDayRow[] = mine.map((v) => {
    const kind = queuesAsWalkIn(v) ? 'Walk-in' : 'Appointment';
    const servedByOther = v.servedBy && v.servedBy !== advisorId ? ` · served by ${advisorName(s, v.servedBy) ?? ''}` : '';
    return {
      visitId: v.id,
      time: fmtClock(timeOf(v)),
      ticketNo: v.ticketNo,
      name: customerName(v.customer.name),
      sub: `${kind} · ${serviceName(s, v.serviceCode)}${servedByOther}`,
      chip: statusChip(v.status),
    };
  });

  return {
    advisor,
    branch,
    title: advisor.name,
    subtitle: `${advisor.desk} · ${branch.name}`,
    liveState,
    statusLocked: current !== undefined,
    kpis,
    card,
    line: {
      subtitle: `${lineRows.length} waiting for you · pull up their vehicles in Keyloop before they reach your desk`,
      rows: lineRows,
    },
    myDay: {
      count: myDayRows.length,
      rows: myDayRows,
      footer: `On-time rate: ${fmtPct(onTime)} · counted from the later of slot and arrival`,
    },
  };
}

/** Transfer dialog "To": "Next free advisor", then colleagues "Name · Desk". */
export function selectTransferTargets(s: AppState, advisorId: AdvisorId): { value: AdvisorId | null; label: string }[] {
  const me = s.advisors[advisorId];
  if (!me) return [{ value: null, label: LABEL.nextFreeAdvisor }];
  const colleagues = Object.values(s.advisors)
    .filter((a) => a.branchId === me.branchId && a.active && a.id !== advisorId)
    .sort((a, b) => a.desk.localeCompare(b.desk, undefined, { numeric: true }));
  return [{ value: null, label: LABEL.nextFreeAdvisor }, ...colleagues.map((a) => ({ value: a.id as AdvisorId | null, label: `${a.name} · ${a.desk}` }))];
}
