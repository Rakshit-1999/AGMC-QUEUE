import type { ActionResult } from '@/domain/types';
import { fail, okData, ok } from '../ops/audit';
import { opSignIn, opSignOut } from '../ops/auth';
import { getSession, homeFor, setSession } from '../session';
import { commit, simNow } from '../store';

/** "Wrong username or password" for unknown, wrong password and blocked accounts alike. */
export function signIn(username: string, password: string): ActionResult<{ home: string }> {
  const name = username.trim().toLowerCase();
  const r = commit((draft, ctx) => opSignIn(draft, ctx, name, password), name);
  if (!r.ok) return fail(r.error);
  setSession({ username: r.data.user.username, signedInAt: simNow() });
  return okData({ home: homeFor(r.data.user) });
}

export function signOut(): ActionResult {
  const sess = getSession();
  if (sess) commit((draft, ctx) => opSignOut(draft, ctx, sess.username), sess.username);
  setSession(null);
  return ok();
}
