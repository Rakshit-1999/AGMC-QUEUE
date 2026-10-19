// Reception actions: reception (own branch) or manager (any branch).
import { ERR } from '@/domain/messages';
import type { ActionResult, AdvisorId, VisitId } from '@/domain/types';
import { fail } from '../ops/audit';
import {
  opCancelTicket,
  opChangeAdvisor,
  opCheckInAppointment,
  opIssueWalkIn,
  opMarkNoShow,
  opMoveToFront,
  opSetBookingAdvisor,
  type IssueWalkInInput,
} from '../ops/reception';
import { commit, getState } from '../store';
import { requireReceptionFor } from './authz';

export type { IssueWalkInInput } from '../ops/reception';

/** Authorizes against the visit's branch; unknown visits return `missing`. */
function forVisit<T>(visitId: VisitId, missing: string, run: (who: string) => ActionResult<T>): ActionResult<T> {
  const v = getState().visits[visitId];
  if (!v) return fail(missing);
  const auth = requireReceptionFor(v.branchId);
  if (!auth.ok) return fail(auth.error);
  return run(auth.value.username);
}

export function checkInAppointment(visitId: VisitId, advisor?: AdvisorId | 'first_free'): ActionResult<{ visitId: VisitId }> {
  return forVisit(visitId, ERR.onlyBookedCheckIn, (who) =>
    commit((d, ctx) => opCheckInAppointment(d, ctx, visitId, advisor ?? 'first_free'), who),
  );
}

export function setBookingAdvisor(visitId: VisitId, advisorId: AdvisorId): ActionResult {
  return forVisit(visitId, ERR.onlyWaitingOrBookedMove, (who) => commit((d, ctx) => opSetBookingAdvisor(d, ctx, visitId, advisorId), who));
}

export function issueWalkIn(input: IssueWalkInInput): ActionResult<{ visitId: VisitId }> {
  const auth = requireReceptionFor(input.branchId);
  if (!auth.ok) return fail(auth.error);
  return commit((d, ctx) => opIssueWalkIn(d, ctx, input), auth.value.username);
}

export function changeAdvisor(visitId: VisitId, advisorId: AdvisorId | null, reason: string): ActionResult {
  return forVisit(visitId, ERR.onlyWaitingOrBookedMove, (who) => commit((d, ctx) => opChangeAdvisor(d, ctx, visitId, advisorId, reason), who));
}

export function moveToFront(visitId: VisitId, reason: string): ActionResult {
  return forVisit(visitId, ERR.onlyWaitingToFront, (who) => commit((d, ctx) => opMoveToFront(d, ctx, visitId, reason), who));
}

export function markNoShow(visitId: VisitId): ActionResult {
  return forVisit(visitId, ERR.cannotNoShow, (who) => commit((d, ctx) => opMarkNoShow(d, ctx, visitId, 'marked by reception'), who));
}

export function cancelTicket(visitId: VisitId, reason: string): ActionResult {
  return forVisit(visitId, ERR.cannotCancel, (who) => commit((d, ctx) => opCancelTicket(d, ctx, visitId, reason), who));
}
