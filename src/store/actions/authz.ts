// Authorization for actions: reads this tab's session. Errors are SPEC access messages.
import { ERR } from '@/domain/messages';
import type { AdvisorId, BranchId, User } from '@/domain/types';
import { getState } from '../store';
import { getSession, resolveSession } from '../session';

export type Authz<T> = { ok: true; value: T } | { ok: false; error: string };

function deny(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export function requireUser(): Authz<User> {
  const r = resolveSession(getState(), getSession());
  if (!r.info) return deny(ERR.signInAgain);
  return { ok: true, value: r.info.user };
}

export function requireManager(): Authz<User> {
  const u = requireUser();
  if (!u.ok) return u;
  if (u.value.role !== 'manager') return deny(ERR.roleCannotOpen);
  return u;
}

/** Reception of that branch, or a manager (any branch). */
export function requireReceptionFor(branchId: BranchId): Authz<User> {
  const u = requireUser();
  if (!u.ok) return u;
  if (u.value.role === 'manager') return u;
  if (u.value.role !== 'reception') return deny(ERR.roleCannotOpen);
  if (u.value.branchId !== branchId) return deny(ERR.notYourBranch);
  return u;
}

/** An advisor login linked to an existing advisor. */
export function requireAdvisor(): Authz<{ user: User; advisorId: AdvisorId }> {
  const u = requireUser();
  if (!u.ok) return u;
  if (u.value.role !== 'advisor') return deny(ERR.roleCannotOpen);
  const id = u.value.advisorId;
  if (!id || !getState().advisors[id]) return deny(ERR.notLinkedToAdvisor);
  return { ok: true, value: { user: u.value, advisorId: id } };
}
