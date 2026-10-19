// Reception ops: check-in, walk-ins, reassign, bump, no-show, cancel. Pure mutators on a draft.
import { queuesAsWalkIn } from '@/domain/eligibility';
import { issueTicketNo, newVisitId, ticketLetter } from '@/domain/ids';
import { customerName, ERR, LABEL } from '@/domain/messages';
import { quoteForAppointmentCheckIn, quoteWalkIn } from '@/domain/queue/quote';
import { dubaiDate, fmtClock } from '@/domain/time';
import type {
  ActionResult,
  AdvisorId,
  AppState,
  BranchId,
  BrandCode,
  Customer,
  ServiceCode,
  Visit,
  VisitId,
} from '@/domain/types';
import { fail, ok, okData, type OpCtx } from './audit';

const MIN = 60_000;

export interface IssueWalkInInput {
  branchId: BranchId;
  serviceCode: ServiceCode;
  brand: BrandCode;
  advisorId: AdvisorId | null;
  customer: Customer;
  note: string;
}

/** "Daniel Costa (Desk 3)" or the fallback. */
export function advisorLabel(s: AppState, id: AdvisorId | null, fallback: string = LABEL.whoeverFree): string {
  if (!id) return fallback;
  const a = s.advisors[id];
  return a ? `${a.name} (${a.desk})` : fallback;
}

function advisorInBranch(s: AppState, id: AdvisorId, branchId: BranchId): boolean {
  const a = s.advisors[id];
  return !!a && a.branchId === branchId && a.active;
}

function tag(v: Visit): string {
  return v.ticketNo ?? v.booking?.keyloopRef ?? v.id;
}

export function opCheckInAppointment(
  s: AppState,
  ctx: OpCtx,
  visitId: VisitId,
  advisor?: AdvisorId | 'first_free',
): ActionResult<{ visitId: VisitId }> {
  const v = s.visits[visitId];
  if (!v || v.kind !== 'appointment' || !v.booking) return fail(ERR.onlyBookedCheckIn);
  const neverArrivedNoShow = v.status === 'no_show' && v.arrivedAt === null;
  if (v.status !== 'booked' && !neverArrivedNoShow) return fail(ERR.onlyBookedCheckIn);
  if (v.date !== dubaiDate(ctx.now) || v.date !== s.today) return fail(ERR.notForToday);
  const branch = s.branches[v.branchId];
  if (!branch) return fail(ERR.notForToday);
  if (advisor && advisor !== 'first_free' && !advisorInBranch(s, advisor, v.branchId)) return fail(ERR.advisorNotInBranch);

  let advisorId = v.advisorId;
  let source = v.advisorSource;
  if (advisor === 'first_free') {
    if (v.advisorId === null) {
      advisorId = null;
      source = null;
    }
  } else if (advisor && advisor !== v.advisorId) {
    advisorId = advisor;
    source = 'reception';
  }

  const late = ctx.now > v.booking.slotAt + branch.rules.graceMin * MIN || v.status === 'no_show';
  const quote = quoteForAppointmentCheckIn(s, visitId, advisorId, ctx.now);
  const letter = ticketLetter({ kind: v.kind, lateAsWalkIn: late }, s.services[v.serviceCode]);
  v.ticketNo = issueTicketNo(s, v.branchId, v.date, letter);
  v.status = 'waiting';
  v.arrivedAt = ctx.now;
  v.lateAsWalkIn = late;
  v.advisorId = advisorId;
  v.advisorSource = source;
  v.quote = quote;
  v.endedAt = null;
  v.endReason = '';
  ctx.audit({
    branchId: v.branchId,
    what: 'check in',
    detail: `${v.ticketNo} ${customerName(v.customer.name)} (${fmtClock(v.booking.slotAt)}) → ${advisorLabel(s, advisorId)}${
      late ? ' · late, queues as walk-in' : ''
    }`,
  });
  return okData({ visitId });
}

export function opSetBookingAdvisor(s: AppState, ctx: OpCtx, visitId: VisitId, advisorId: AdvisorId): ActionResult {
  const v = s.visits[visitId];
  if (!v || (v.status !== 'booked' && v.status !== 'waiting')) return fail(ERR.onlyWaitingOrBookedMove);
  if (!advisorInBranch(s, advisorId, v.branchId)) return fail(ERR.advisorNotInBranch);
  v.advisorId = advisorId;
  v.advisorSource = 'reception';
  ctx.audit({ branchId: v.branchId, what: 'assign', detail: `${tag(v)} → ${advisorLabel(s, advisorId)}` });
  return ok();
}

export function opIssueWalkIn(s: AppState, ctx: OpCtx, input: IssueWalkInInput): ActionResult<{ visitId: VisitId }> {
  const svc = s.services[input.serviceCode];
  if (!svc || !svc.active) return fail(ERR.unknownService);
  const branch = s.branches[input.branchId];
  if (!branch) return fail(ERR.advisorNotInBranch);
  if (input.advisorId && !advisorInBranch(s, input.advisorId, input.branchId)) return fail(ERR.advisorNotInBranch);
  const q = quoteWalkIn(
    s,
    { branchId: input.branchId, serviceCode: input.serviceCode, brand: input.brand, advisorId: input.advisorId },
    ctx.now,
  );
  if (!q) return fail(ERR.noAdvisorCanTake);
  const id = newVisitId(s);
  const date = s.today;
  const letter = ticketLetter({ kind: 'walk_in', lateAsWalkIn: false }, svc);
  const ticketNo = issueTicketNo(s, input.branchId, date, letter);
  const name = input.customer.name?.trim() ? input.customer.name.trim() : null;
  const v: Visit = {
    id,
    branchId: input.branchId,
    date,
    kind: 'walk_in',
    status: 'waiting',
    ticketNo,
    customer: {
      name,
      mobile: input.customer.mobile.trim(),
      plate: input.customer.plate.trim(),
      vehicle: input.customer.vehicle.trim(),
    },
    brand: input.brand,
    serviceCode: input.serviceCode,
    booking: null,
    advisorId: input.advisorId,
    advisorSource: input.advisorId ? 'issue' : null,
    lateAsWalkIn: false,
    arrivedAt: ctx.now,
    quote: {
      issuedAt: ctx.now,
      advisorId: input.advisorId,
      forecastMin: q.forecastMin,
      marginPct: q.marginPct,
      quotedMin: q.quotedMin,
      toldBy: q.calledBy,
      sampleSize: q.sampleSize,
      afterClosing: q.afterClosing,
    },
    receptionNote: input.note.trim(),
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
  s.visits[id] = v;
  ctx.audit({
    branchId: input.branchId,
    what: 'walk in',
    detail: `${ticketNo} ${svc.name} · ${input.brand} → ${advisorLabel(s, input.advisorId)} · told about ${q.quotedMin} min`,
  });
  return okData({ visitId: id });
}

export function opChangeAdvisor(
  s: AppState,
  ctx: OpCtx,
  visitId: VisitId,
  advisorId: AdvisorId | null,
  reason: string,
): ActionResult {
  const v = s.visits[visitId];
  if (!v || (v.status !== 'waiting' && v.status !== 'booked')) return fail(ERR.onlyWaitingOrBookedMove);
  if (advisorId && !advisorInBranch(s, advisorId, v.branchId)) return fail(ERR.advisorNotInBranch);
  v.advisorId = advisorId;
  v.advisorSource = advisorId ? (queuesAsWalkIn(v) ? 'reassigned' : 'reception') : null;
  v.handover = null;
  const why = reason.trim();
  ctx.audit({
    branchId: v.branchId,
    what: 'assign',
    detail: `${tag(v)} → ${advisorLabel(s, advisorId)}${why ? `: ${why}` : ''}`,
  });
  return ok();
}

export function opMoveToFront(s: AppState, ctx: OpCtx, visitId: VisitId, reason: string): ActionResult {
  const v = s.visits[visitId];
  if (!v) return fail(ERR.onlyWaitingToFront);
  if (!queuesAsWalkIn(v)) return fail(ERR.appointmentsKeepSlot);
  if (v.status !== 'waiting') return fail(ERR.onlyWaitingToFront);
  const why = reason.trim();
  if (!why) return fail(ERR.giveReason);
  v.bump = { at: ctx.now, by: ctx.who, reason: why };
  ctx.audit({ branchId: v.branchId, what: 'bump', detail: `${tag(v)} moved to the front: ${why}` });
  return ok();
}

export function opMarkNoShow(s: AppState, ctx: OpCtx, visitId: VisitId, source: string = 'reception'): ActionResult {
  const v = s.visits[visitId];
  if (!v || (v.status !== 'booked' && v.status !== 'waiting' && v.status !== 'called')) return fail(ERR.cannotNoShow);
  v.status = 'no_show';
  v.endedAt = ctx.now;
  v.endReason = source;
  v.calledBy = null;
  ctx.audit({ branchId: v.branchId, what: 'no show', detail: `${tag(v)} ${customerName(v.customer.name)}: ${source}` });
  return ok();
}

export function opCancelTicket(s: AppState, ctx: OpCtx, visitId: VisitId, reason: string): ActionResult {
  const v = s.visits[visitId];
  if (!v || (v.status !== 'booked' && v.status !== 'waiting' && v.status !== 'called')) return fail(ERR.cannotCancel);
  const why = reason.trim();
  v.status = 'cancelled';
  v.endedAt = ctx.now;
  v.endReason = why;
  v.calledBy = null;
  ctx.audit({ branchId: v.branchId, what: 'cancel', detail: `${tag(v)} cancelled${why ? `: ${why}` : ''}` });
  return ok();
}
