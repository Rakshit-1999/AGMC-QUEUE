// The single zustand store holding AppState, and the one write path: commit().
import { createStore } from 'zustand/vanilla';
import { simTimeAt } from '@/domain/time';
import type { ActionResult, AppState, Who } from '@/domain/types';
import { makeCtx, type OpCtx } from './ops/audit';
import { emptyState } from './state';

export type { OpCtx } from './ops/audit';

export const appStore = createStore<AppState>()(() => emptyState());

export function getState(): AppState {
  return appStore.getState();
}

function makeTabId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `tab-${Date.now().toString(36)}-${Math.floor(performance.now() * 1000).toString(36)}`;
}

/** This tab's id (writerId on commits). */
export const tabId: string = makeTabId();

/** Sim "now" from the state's clock anchor (non-React). */
export function simNow(): number {
  return simTimeAt(getState().clock, Date.now());
}

// ---------- persistence hooks (registered by sync.ts) ----------

export interface PersistenceHooks {
  /** Adopt a newer state from storage before writing (commit step 1). */
  adoptNewer(): void;
  /** Persist + broadcast a committed state. */
  published(state: AppState): void;
}
let hooks: PersistenceHooks | null = null;
export function registerPersistence(h: PersistenceHooks): void {
  hooks = h;
}

// ---------- hydration flag ----------

let hydrated = false;
const hydratedListeners = new Set<() => void>();
export function isHydrated(): boolean {
  return hydrated;
}
export function setHydrated(v: boolean): void {
  if (hydrated === v) return;
  hydrated = v;
  for (const l of hydratedListeners) l();
}
export function subscribeHydrated(cb: () => void): () => void {
  hydratedListeners.add(cb);
  return () => hydratedListeners.delete(cb);
}

// ---------- writes ----------

/** Replaces the in-memory state without persisting or broadcasting (used when adopting another tab's state). */
export function replaceState(next: AppState): void {
  appStore.setState(next, true);
}

function publish(base: AppState, draft: AppState): void {
  draft.rev = Math.max(base.rev, draft.rev) + 1;
  draft.writerId = tabId;
  appStore.setState(draft, true);
  hooks?.published(draft);
}

/**
 * The one write path: adopt newer storage state, clone, run the pure op on the draft,
 * and on ok bump rev, set, persist and broadcast. On ok:false nothing changes.
 */
export function commit<T>(op: (draft: AppState, ctx: OpCtx) => ActionResult<T>, who: Who): ActionResult<T> {
  hooks?.adoptNewer();
  const base = getState();
  const draft = structuredClone(base);
  const ctx = makeCtx(draft, simTimeAt(base.clock, Date.now()), who);
  const r = op(draft, ctx);
  if (!r.ok) return r;
  publish(base, draft);
  return r;
}

/** Like commit, for time-driven jobs: the op returns whether it changed anything; unchanged drafts are dropped. */
export function commitIfChanged(op: (draft: AppState, ctx: OpCtx) => boolean, who: Who): boolean {
  hooks?.adoptNewer();
  const base = getState();
  const draft = structuredClone(base);
  const ctx = makeCtx(draft, simTimeAt(base.clock, Date.now()), who);
  if (!op(draft, ctx)) return false;
  publish(base, draft);
  return true;
}
