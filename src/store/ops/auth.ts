// Sign-in / sign-out ops (prototype credentials, see ARCHITECTURE section 10).
import { ERR } from '@/domain/messages';
import type { ActionResult, AppState, User, Username } from '@/domain/types';
import { fail, ok, okData, type OpCtx } from './audit';

export function opSignIn(s: AppState, ctx: OpCtx, username: string, password: string): ActionResult<{ user: User }> {
  const u = s.users[username.trim().toLowerCase()];
  if (!u || !u.canSignIn || u.password !== password) return fail(ERR.wrongCredentials);
  const branchId = u.branchId;
  if (u.role === 'advisor' && u.advisorId) {
    const a = s.advisors[u.advisorId];
    if (a) {
      s.simulator.drivers[a.id] = 'person';
      if (a.presence === 'offline' && a.active) {
        a.presence = 'available';
        a.breakReason = null;
        a.presenceSince = ctx.now;
      }
    }
  }
  ctx.audit({ branchId, what: 'sign in', detail: `${u.username} (${u.role})` });
  return okData({ user: u });
}

export function opSignOut(s: AppState, ctx: OpCtx, username: Username): ActionResult {
  const u = s.users[username];
  if (!u) return ok();
  if (u.role === 'advisor' && u.advisorId && s.advisors[u.advisorId]) s.simulator.drivers[u.advisorId] = 'sim';
  ctx.audit({ branchId: u.branchId, what: 'sign out', detail: u.username });
  return ok();
}
