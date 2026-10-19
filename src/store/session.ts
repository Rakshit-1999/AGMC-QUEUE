// Per-tab session (sessionStorage). Never shared across tabs, so a demo can run several roles at once.
import { useRef, useSyncExternalStore } from 'react';
import type { Advisor, AppState, Branch, Session, User } from '@/domain/types';
import { appStore, getState } from './store';

const KEY = 'agmc-queue:session';

export interface SessionInfo {
  user: User;
  branch: Branch | null;
  advisor: Advisor | null;
  home: string;
}

export type SessionStatus = 'none' | 'invalid' | 'ok';

function readSession(): Session | null {
  try {
    const raw = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Session>;
    return typeof s.username === 'string' && typeof s.signedInAt === 'number' ? { username: s.username, signedInAt: s.signedInAt } : null;
  } catch {
    return null;
  }
}

let session: Session | null = readSession();
const listeners = new Set<() => void>();

export function getSession(): Session | null {
  return session;
}

export function setSession(next: Session | null): void {
  session = next;
  try {
    if (next) sessionStorage.setItem(KEY, JSON.stringify(next));
    else sessionStorage.removeItem(KEY);
  } catch {
    // ignore (private mode)
  }
  for (const l of listeners) l();
}

export function subscribeSession(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function homeFor(user: User): '/manager' | '/reception' | '/advisor' {
  if (user.role === 'manager') return '/manager';
  if (user.role === 'reception') return '/reception';
  return '/advisor';
}

/** Resolves the tab's session against the state: missing or blocked users are 'invalid'. */
export function resolveSession(s: AppState, sess: Session | null): { status: SessionStatus; info: SessionInfo | null } {
  if (!sess) return { status: 'none', info: null };
  const user = s.users[sess.username];
  if (!user || !user.canSignIn) return { status: 'invalid', info: null };
  const branch = user.branchId ? s.branches[user.branchId] ?? null : null;
  const advisor = user.advisorId ? s.advisors[user.advisorId] ?? null : null;
  return { status: 'ok', info: { user, branch, advisor, home: homeFor(user) } };
}

/** The signed-in user of this tab, or null. */
export function currentUser(): User | null {
  return resolveSession(getState(), session).info?.user ?? null;
}

function subscribeBoth(cb: () => void): () => void {
  const a = appStore.subscribe(cb);
  const b = subscribeSession(cb);
  return () => {
    a();
    b();
  };
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Session info for this tab; stable reference while the user/branch/advisor are unchanged. */
export function useSession(): SessionInfo | null {
  const cache = useRef<{ state: AppState; sess: Session | null; value: SessionInfo | null } | null>(null);
  const get = (): SessionInfo | null => {
    const s = getState();
    const c = cache.current;
    if (c && c.state === s && c.sess === session) return c.value;
    const next = resolveSession(s, session).info;
    const value = c && sameJson(c.value, next) ? c.value : next;
    cache.current = { state: s, sess: session, value };
    return value;
  };
  return useSyncExternalStore(subscribeBoth, get, get);
}

/** 'none' (never signed in) / 'invalid' (user removed or blocked → "Please sign in again.") / 'ok'. */
export function useSessionStatus(): SessionStatus {
  const get = (): SessionStatus => resolveSession(getState(), session).status;
  return useSyncExternalStore(subscribeBoth, get, get);
}
