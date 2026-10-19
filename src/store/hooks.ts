// React hooks over the store and the 1-second ticker.
import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { AppState, EpochMs } from '@/domain/types';
import { getNowTick, subscribeNow } from './clock';
import { isLeader, subscribeLeader } from './leader';
import { appStore, getState, isHydrated, subscribeHydrated } from './store';

/** Shallow equality: same reference, or same keys with Object.is-equal values (arrays element-wise). */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  }
  return true;
}

function subscribeState(cb: () => void): () => void {
  return appStore.subscribe(cb);
}

/** Subscribe to a slice of AppState. Re-renders only when `equality` says the slice changed. */
export function useAppState<T>(selector: (s: AppState) => T, equality: (a: T, b: T) => boolean = Object.is): T {
  const cache = useRef<{ state: AppState; selector: (s: AppState) => T; value: T } | null>(null);
  const get = (): T => {
    const s = getState();
    const c = cache.current;
    if (c && c.state === s && c.selector === selector) return c.value;
    const next = selector(s);
    const value = c && equality(c.value, next) ? c.value : next;
    cache.current = { state: s, selector, value };
    return value;
  };
  return useSyncExternalStore(subscribeState, get, get);
}

function sameDeps(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
}

/**
 * Recomputes on store change and on each tick; returns the previous object if shallow-equal.
 * With `deps`, `compute` may be an inline closure: it re-runs only when state, tick or deps change.
 * Without `deps`, a new `compute` identity also triggers a recompute (still shallow-compared).
 */
export function useLive<T>(compute: (s: AppState, now: EpochMs) => T, deps?: unknown[]): T {
  const computeRef = useRef(compute);
  computeRef.current = compute;
  const key: readonly unknown[] = deps ?? [compute];
  const cache = useRef<{ state: AppState; now: EpochMs; key: readonly unknown[]; value: T } | null>(null);
  const get = (): T => {
    const s = getState();
    const now = getNowTick();
    const c = cache.current;
    if (c && c.state === s && c.now === now && sameDeps(c.key, key)) return c.value;
    const next = computeRef.current(s, now);
    const value = c && shallowEqual(c.value, next) ? c.value : next;
    cache.current = { state: s, now, key, value };
    return value;
  };
  const subscribe = useCallback((cb: () => void) => {
    const a = appStore.subscribe(cb);
    const b = subscribeNow(cb);
    return () => {
      a();
      b();
    };
  }, []);
  return useSyncExternalStore(subscribe, get, get);
}

/** false -> show "Loading…". */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeHydrated, isHydrated, isHydrated);
}

/** Whether this tab currently runs the leader loop (dev/demo indicator). */
export function useIsLeader(): boolean {
  return useSyncExternalStore(subscribeLeader, isLeader, isLeader);
}
