// Leader election: exactly one tab runs time-driven logic (system jobs + simulator).
// navigator.locks when available; otherwise a localStorage lease.
import { runUntil } from '@/sim/step';
import { commitIfChanged, getState, simNow, tabId } from './store';

const LOCK_NAME = 'agmc-queue-leader';
const LEASE_KEY = 'agmc-queue:leader';
const TICK_MS = 1000;
const LEASE_MS = 3500;

let started = false;
let leading = false;
let loopTimer: ReturnType<typeof setInterval> | null = null;
/** In-memory cursor: unchanged steps are not committed, so the stored cursor may lag behind. */
let cursor = 0;
let cursorAnchor = Number.NaN;
const listeners = new Set<() => void>();

export function isLeader(): boolean {
  return leading;
}

export function subscribeLeader(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function setLeading(v: boolean): void {
  if (leading === v) return;
  leading = v;
  for (const l of listeners) l();
}

/** One leader step: reconcile the state up to sim "now". */
export function leaderTick(): void {
  const to = simNow();
  commitIfChanged((draft) => {
    // A reset (or ?speed) re-anchors the clock: the in-memory cursor belongs to the old timeline.
    if (draft.clock.anchorRealMs !== cursorAnchor) {
      cursorAnchor = draft.clock.anchorRealMs;
      cursor = draft.lastProcessedAt;
    }
    if (cursor > draft.lastProcessedAt && cursor <= to) draft.lastProcessedAt = cursor;
    const r = runUntil(draft, to);
    cursor = draft.lastProcessedAt;
    return r.ok && r.data.changed;
  }, 'system');
}

function startLoop(): void {
  if (loopTimer !== null) return;
  cursor = getState().lastProcessedAt;
  setLeading(true);
  leaderTick();
  loopTimer = setInterval(leaderTick, TICK_MS);
}

function stopLoop(): void {
  if (loopTimer !== null) clearInterval(loopTimer);
  loopTimer = null;
  setLeading(false);
}

interface Lease {
  tabId: string;
  until: number;
}

function readLease(): Lease | null {
  try {
    const raw = localStorage.getItem(LEASE_KEY);
    if (!raw) return null;
    const l = JSON.parse(raw) as Partial<Lease>;
    return typeof l.tabId === 'string' && typeof l.until === 'number' ? { tabId: l.tabId, until: l.until } : null;
  } catch {
    return null;
  }
}

function leaseFallback(): void {
  const renew = (): void => {
    const now = Date.now();
    const l = readLease();
    if (!l || l.until < now || l.tabId === tabId) {
      try {
        localStorage.setItem(LEASE_KEY, JSON.stringify({ tabId, until: now + LEASE_MS } satisfies Lease));
      } catch {
        // storage unavailable: lead alone
      }
      const confirm = readLease();
      if (!confirm || confirm.tabId === tabId) startLoop();
      else stopLoop();
    } else {
      stopLoop();
    }
  };
  renew();
  setInterval(renew, TICK_MS);
  window.addEventListener('pagehide', () => {
    const l = readLease();
    if (l?.tabId === tabId) {
      try {
        localStorage.removeItem(LEASE_KEY);
      } catch {
        // ignore
      }
    }
  });
}

/** Starts leader election (idempotent). The tab holding the lock runs the loop until it closes. */
export function startLeader(): void {
  if (started) return;
  started = true;
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (locks && typeof locks.request === 'function') {
    void locks
      .request(LOCK_NAME, () => {
        startLoop();
        return new Promise<void>(() => {
          // Held until the tab closes; the browser then grants the lock to another tab.
        });
      })
      .catch(() => {
        if (typeof window !== 'undefined') leaseFallback();
      });
    return;
  }
  if (typeof window !== 'undefined') leaseFallback();
}
