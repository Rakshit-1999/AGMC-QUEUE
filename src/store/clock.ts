// Simulated Dubai clock and the one global 1-second ticker.
import { useSyncExternalStore } from 'react';
import type { EpochMs } from '@/domain/types';
import { appStore, getState, simNow } from './store';

export { simNow } from './store';

let nowTick: EpochMs = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function floorSecond(t: EpochMs): EpochMs {
  return Math.floor(t / 1000) * 1000;
}

function notify(): void {
  for (const l of listeners) l();
}

function refresh(): void {
  const t = floorSecond(simNow());
  if (t !== nowTick) {
    nowTick = t;
    notify();
  }
}

function loop(): void {
  refresh();
  const speed = Math.max(0.01, getState().clock.speed);
  const n = simNow();
  const msToNextSimSecond = (1000 - (((n % 1000) + 1000) % 1000)) / speed;
  timer = setTimeout(loop, Math.max(16, Math.min(1000, msToNextSimSecond + 2)));
}

/** Starts the ticker (idempotent). Re-anchors immediately when the state's clock changes. */
export function startTicker(): void {
  if (timer !== null) return;
  let lastClock = getState().clock;
  appStore.subscribe((s) => {
    if (s.clock !== lastClock) {
      lastClock = s.clock;
      refresh();
    }
  });
  loop();
}

export function stopTicker(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}

/** Current tick (sim time floored to the second). */
export function getNowTick(): EpochMs {
  if (nowTick === 0) nowTick = floorSecond(simNow());
  return nowTick;
}

export function subscribeNow(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Sim Dubai "now", re-renders every second. */
export function useNow(): EpochMs {
  return useSyncExternalStore(subscribeNow, getNowTick, getNowTick);
}
