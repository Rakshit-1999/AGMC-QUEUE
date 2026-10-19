// Advisor actions: the signed-in advisor acts on their own desk.
import type { ActionResult, AdvisorId, AppState, BreakReason, VisitId } from '@/domain/types';
import {
  opAdvisorNoShow,
  opCallAgain,
  opCallNext,
  opComplete,
  opNotHere,
  opSetPresence,
  opStartService,
  opTransfer,
} from '../ops/advisor';
import { fail, type OpCtx } from '../ops/audit';
import { commit } from '../store';
import { requireAdvisor } from './authz';

function asAdvisor<T>(run: (draft: AppState, ctx: OpCtx, advisorId: AdvisorId) => ActionResult<T>): ActionResult<T> {
  const auth = requireAdvisor();
  if (!auth.ok) return fail(auth.error);
  const { user, advisorId } = auth.value;
  return commit((d, ctx) => run(d, ctx, advisorId), user.username);
}

export function setAvailable(): ActionResult {
  return asAdvisor((d, ctx, id) => opSetPresence(d, ctx, id, 'available'));
}

export function startBreak(reason: BreakReason): ActionResult {
  return asAdvisor((d, ctx, id) => opSetPresence(d, ctx, id, 'break', reason));
}

export function goOffline(): ActionResult {
  return asAdvisor((d, ctx, id) => opSetPresence(d, ctx, id, 'offline'));
}

export function callNext(): ActionResult<{ visitId: VisitId; ticketNo: string }> {
  return asAdvisor((d, ctx, id) => opCallNext(d, ctx, id));
}

export function callAgain(): ActionResult {
  return asAdvisor((d, ctx, id) => opCallAgain(d, ctx, id));
}

export function startService(): ActionResult {
  return asAdvisor((d, ctx, id) => opStartService(d, ctx, id));
}

export function notHere(): ActionResult {
  return asAdvisor((d, ctx, id) => opNotHere(d, ctx, id));
}

export function advisorNoShow(): ActionResult {
  return asAdvisor((d, ctx, id) => opAdvisorNoShow(d, ctx, id));
}

export function complete(note?: string): ActionResult {
  return asAdvisor((d, ctx, id) => opComplete(d, ctx, id, note));
}

export function transfer(to: AdvisorId | null, reason: string): ActionResult {
  return asAdvisor((d, ctx, id) => opTransfer(d, ctx, id, to, reason));
}
