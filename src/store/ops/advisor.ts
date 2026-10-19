// Advisor desk ops. The advisor role and the simulator call the same functions.
import { customerName, ERR, REASON_TEXT } from '@/domain/messages';
import { pickNext } from '@/domain/queue/pickNext';
import { buildQueueView, currentVisitOf } from '@/domain/queue/view';
import type { ActionResult, AdvisorId, AdvisorPresence, AppState, BreakReason, Visit, VisitId } from '@/domain/types';
import { fail, ok, okData, type OpCtx } from './audit';
import { opMarkNoShow } from './reception';

function deskLabel(s: AppState, id: AdvisorId): string {
  const a = s.advisors[id];
  return a ? `${a.name} (${a.desk})` : id;
}

function presenceText(p: AdvisorPresence, reason: BreakReason | null): string {
  if (p === 'available') return 'Available';
  if (p === 'break') return `On break${reason ? ` (${reason})` : ''}`;
  return 'Offline';
}

export function opSetPresence(
  s: AppState,
  ctx: OpCtx,
  advisorId: AdvisorId,
  presence: AdvisorPresence,
  reason: BreakReason | null = null,
): ActionResult {
  const a = s.advisors[advisorId];
  if (!a) return fail(ERR.notLinkedToAdvisor);
  const nextReason = presence === 'break' ? reason ?? 'Coffee' : null;
  if (a.presence === presence && a.breakReason === nextReason) return ok();
  if (currentVisitOf(s, advisorId)) return fail(ERR.finishOrTransferFirst);
  a.presence = presence;
  a.breakReason = nextReason;
  a.presenceSince = ctx.now;
  ctx.audit({ branchId: a.branchId, what: 'advisor status', detail: `${a.name}: ${presenceText(presence, nextReason)}` });
  return ok();
}

export function opCallNext(s: AppState, ctx: OpCtx, advisorId: AdvisorId): ActionResult<{ visitId: VisitId; ticketNo: string }> {
  const a = s.advisors[advisorId];
  if (!a) return fail(ERR.notLinkedToAdvisor);
  if (a.presence !== 'available' || !a.active) return fail(ERR.setAvailableFirst);
  if (currentVisitOf(s, advisorId)) return fail(ERR.finishCurrentFirst);
  const pick = pickNext(buildQueueView(s, a.branchId, ctx.now), advisorId, ctx.now);
  const v = pick ? s.visits[pick.visitId] : undefined;
  if (!pick || !v) return fail(ERR.nobodyWaiting);
  v.status = 'called';
  v.calls = [{ at: ctx.now, advisorId, reason: pick.reason }];
  v.firstCalledAt ??= ctx.now;
  v.calledBy = advisorId;
  const ticketNo = v.ticketNo ?? v.id;
  ctx.audit({ branchId: a.branchId, what: 'call', detail: `${ticketNo} → ${deskLabel(s, advisorId)}: ${REASON_TEXT[pick.reason]}` });
  return okData({ visitId: v.id, ticketNo });
}

function current(s: AppState, advisorId: AdvisorId, status: Visit['status']): Visit | null {
  const v = currentVisitOf(s, advisorId);
  return v && v.status === status ? v : null;
}

export function opCallAgain(s: AppState, ctx: OpCtx, advisorId: AdvisorId): ActionResult {
  const v = current(s, advisorId, 'called');
  if (!v) return fail(ERR.noCustomerInState);
  const last = v.calls[v.calls.length - 1];
  v.calls.push({ at: ctx.now, advisorId, reason: last?.reason ?? 'fits' });
  ctx.audit({ branchId: v.branchId, what: 'call again', detail: `${v.ticketNo ?? v.id} → ${deskLabel(s, advisorId)} (call ${v.calls.length})` });
  return ok();
}

export function opStartService(s: AppState, ctx: OpCtx, advisorId: AdvisorId): ActionResult {
  const v = current(s, advisorId, 'called');
  if (!v) return fail(ERR.noCustomerInState);
  v.status = 'serving';
  v.startedAt = ctx.now;
  v.servedBy = advisorId;
  ctx.audit({ branchId: v.branchId, what: 'start', detail: `${v.ticketNo ?? v.id} ${customerName(v.customer.name)} with ${deskLabel(s, advisorId)}` });
  return ok();
}

export function opNotHere(s: AppState, ctx: OpCtx, advisorId: AdvisorId): ActionResult {
  const v = current(s, advisorId, 'called');
  if (!v) return fail(ERR.noCustomerInState);
  v.status = 'waiting';
  v.calls = [];
  v.calledBy = null;
  ctx.audit({ branchId: v.branchId, what: 'not here', detail: `${v.ticketNo ?? v.id} back in the queue (not at ${deskLabel(s, advisorId)})` });
  return ok();
}

export function opAdvisorNoShow(s: AppState, ctx: OpCtx, advisorId: AdvisorId): ActionResult {
  const v = currentVisitOf(s, advisorId);
  if (!v || v.status !== 'called') return fail(ERR.noCustomerInState);
  return opMarkNoShow(s, ctx, v.id, `not at ${deskLabel(s, advisorId)}`);
}

export function opComplete(s: AppState, ctx: OpCtx, advisorId: AdvisorId, note?: string): ActionResult {
  const v = current(s, advisorId, 'serving');
  if (!v) return fail(ERR.noCustomerInState);
  v.status = 'done';
  v.endedAt = ctx.now;
  v.visitNote = (note ?? '').trim();
  v.calledBy = null;
  const mins = v.startedAt !== null ? Math.round((ctx.now - v.startedAt) / 60_000) : 0;
  ctx.audit({ branchId: v.branchId, what: 'complete', detail: `${v.ticketNo ?? v.id} by ${deskLabel(s, advisorId)} · ${mins} min` });
  return ok();
}

export function opTransfer(s: AppState, ctx: OpCtx, advisorId: AdvisorId, to: AdvisorId | null, reason: string): ActionResult {
  const v = current(s, advisorId, 'serving');
  if (!v) return fail(ERR.noCustomerInState);
  if (to !== null) {
    const t = s.advisors[to];
    if (!t || t.branchId !== v.branchId || !t.active) return fail(ERR.advisorNotInBranch);
  }
  const why = reason.trim();
  v.status = 'waiting';
  v.calls = [];
  v.calledBy = null;
  v.startedAt = null;
  v.servedBy = null;
  v.handover = { at: ctx.now, fromAdvisorId: advisorId, toAdvisorId: to, reason: why };
  v.advisorId = to;
  v.advisorSource = 'handover';
  ctx.audit({
    branchId: v.branchId,
    what: 'transfer',
    detail: `${v.ticketNo ?? v.id} ${deskLabel(s, advisorId)} → ${to ? deskLabel(s, to) : 'Next free advisor'}${why ? `: ${why}` : ''}`,
  });
  return ok();
}
