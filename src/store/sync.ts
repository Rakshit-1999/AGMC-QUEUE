// Persistence (localStorage) and cross-tab sync (BroadcastChannel, storage event fallback).
import { SCHEMA_VERSION } from '@/domain/constants';
import { dubaiDate, simTimeAt } from '@/domain/time';
import type { AppState } from '@/domain/types';
import { buildDemoState } from '@/sim/replay';
import { appStore, getState, registerPersistence, replaceState, setHydrated, tabId } from './store';

export const STORAGE_KEY = 'agmc-queue:v1';
const REV_KEY = 'agmc-queue:v1:rev';
const CHANNEL = 'agmc-queue';
const WRITE_INTERVAL_MS = 250; // at most 4 writes per second

interface StateMessage {
  type: 'state';
  rev: number;
  writerId: string;
  state: AppState;
}

let channel: BroadcastChannel | null = null;
let pending: AppState | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let lastWriteAt = 0;
let started = false;
let lastMessageAt = Date.now();

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function isNewer(incoming: { rev: number; writerId: string }, local: AppState): boolean {
  return incoming.rev > local.rev || (incoming.rev === local.rev && incoming.writerId > local.writerId);
}

function looksValid(x: unknown): x is AppState {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Partial<AppState>;
  return s.schemaVersion === SCHEMA_VERSION && typeof s.rev === 'number' && typeof s.today === 'string' && !!s.clock && !!s.visits;
}

/** Reads the persisted state, or null when missing/invalid. */
export function readStoredState(): AppState | null {
  const ls = storage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return looksValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeNow(): void {
  writeTimer = null;
  const s = pending;
  pending = null;
  if (!s) return;
  const ls = storage();
  if (!ls) return;
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(s));
    ls.setItem(REV_KEY, `${s.rev}|${s.writerId}`);
    lastWriteAt = Date.now();
  } catch {
    // Quota or privacy mode: keep running in memory; other tabs still get BroadcastChannel messages.
  }
}

function scheduleWrite(s: AppState): void {
  pending = s;
  if (writeTimer !== null) return;
  const wait = Math.max(0, WRITE_INTERVAL_MS - (Date.now() - lastWriteAt));
  writeTimer = setTimeout(writeNow, wait);
}

/** Flushes a pending write immediately (pagehide). */
export function flushPersist(): void {
  if (writeTimer !== null) clearTimeout(writeTimer);
  writeNow();
}

function adoptNewerFromStorage(): void {
  const ls = storage();
  if (!ls) return;
  try {
    const marker = ls.getItem(REV_KEY);
    if (!marker) return;
    const [revStr, writerId = ''] = marker.split('|');
    const rev = Number(revStr);
    const local = getState();
    if (!isNewer({ rev, writerId }, local)) return;
    const stored = readStoredState();
    if (stored && isNewer(stored, local)) replaceState(stored);
  } catch {
    // ignore
  }
}

function onPublished(s: AppState): void {
  scheduleWrite(s);
  if (channel) {
    const msg: StateMessage = { type: 'state', rev: s.rev, writerId: s.writerId, state: s };
    try {
      channel.postMessage(msg);
    } catch {
      // ignore (e.g. channel closed)
    }
  }
}

function onIncoming(msg: unknown): void {
  if (typeof msg !== 'object' || msg === null) return;
  const m = msg as Partial<StateMessage>;
  if (m.type !== 'state' || !looksValid(m.state)) return;
  lastMessageAt = Date.now();
  if (m.state.writerId === tabId && m.state.rev <= getState().rev) return;
  if (isNewer(m.state, getState())) replaceState(m.state);
}

/** Starts BroadcastChannel + storage-event sync and registers the commit hooks (idempotent). */
export function startSync(): void {
  if (started) return;
  started = true;
  registerPersistence({ adoptNewer: adoptNewerFromStorage, published: onPublished });
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (e: MessageEvent) => onIncoming(e.data);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        onIncoming({ type: 'state', state: JSON.parse(e.newValue) as unknown });
      } catch {
        // ignore
      }
    });
    window.addEventListener('pagehide', flushPersist);
  }
}

/** Real-time ms since the last message from another tab (DESIGN: amber dot after 10 s of silence). */
export function msSinceLastSyncMessage(): number {
  return Date.now() - lastMessageAt;
}

/**
 * Boot: adopt localStorage when it is valid and for the current sim day; otherwise build a fresh demo
 * (in a timeout so "Loading…" paints first). Applies ?speed=N. Marks the store hydrated.
 */
export function hydrateStore(): Promise<void> {
  return new Promise((resolve) => {
    const stored = readStoredState();
    const fresh = stored && dubaiDate(simTimeAt(stored.clock, Date.now())) === stored.today;
    const finish = (): void => {
      applySpeedParam();
      setHydrated(true);
      resolve();
    };
    if (stored && fresh) {
      replaceState(stored);
      finish();
      return;
    }
    setTimeout(() => {
      const demo = buildDemoState(stored?.simulator.seed ?? getState().simulator.seed, Date.now());
      demo.rev = Math.max(stored?.rev ?? 0, getState().rev) + 1;
      demo.writerId = tabId;
      replaceState(demo);
      onPublished(demo);
      finish();
    }, 0);
  });
}

function applySpeedParam(): void {
  if (typeof window === 'undefined') return;
  const raw = new URLSearchParams(window.location.search).get('speed');
  if (!raw) return;
  const speed = Number(raw);
  if (!Number.isFinite(speed) || speed <= 0 || speed > 600) return;
  const s = getState();
  if (s.clock.speed === speed) return;
  const realNow = Date.now();
  const next: AppState = { ...s, clock: { anchorSimMs: simTimeAt(s.clock, realNow), anchorRealMs: realNow, speed } };
  next.rev = s.rev + 1;
  next.writerId = tabId;
  appStore.setState(next, true);
  onPublished(next);
}
