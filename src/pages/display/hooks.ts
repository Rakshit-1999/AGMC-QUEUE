// Small browser hooks local to the TV page.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { STAGE_H, STAGE_W } from './copy';

// ---------- reduced motion ----------
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReduced(cb: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
  const mql = window.matchMedia(REDUCED_QUERY);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}
function getReduced(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(REDUCED_QUERY).matches;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, getReduced, () => false);
}

// ---------- stage scale (letterboxed 1920 × 1080) ----------
function computeScale(): number {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
}

export function useStageScale(): number {
  const [scale, setScale] = useState(computeScale);
  useEffect(() => {
    const onResize = () => setScale(computeScale());
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return scale;
}

// ---------- hide the cursor after 3 s idle ----------
const IDLE_MS = 3000;

export function useIdleCursor(): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    const onMove = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onMove);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
    };
  }, []);
  return idle;
}

// ---------- FLIP for the NOW CALLING list ----------
const SHIFT_MS = 400;
const ENTER_OFFSET_PX = 24;
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * Animates keyed rows when the list order changes: new rows slide in (y -24 → 0) and existing rows
 * glide from their old position (DESIGN §3, TV new-call pulse). Uses offsetTop, which is measured in
 * layout pixels and so is unaffected by the stage's scale transform. Skipped on first mount and under
 * reduced motion.
 */
export function useFlipList(keys: readonly string[], reduced: boolean) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const prevTops = useRef<Map<string, number> | null>(null);
  // Ticket numbers never contain '|', so the joined string is a faithful, stable dependency.
  const signature = keys.join('|');

  useLayoutEffect(() => {
    const tops = new Map<string, number>();
    for (const k of signature ? signature.split('|') : []) {
      const el = nodes.current.get(k);
      if (el) tops.set(k, el.offsetTop);
    }
    const prev = prevTops.current;
    prevTops.current = tops;
    if (!prev || reduced) return;
    for (const [k, top] of tops) {
      const el = nodes.current.get(k);
      if (!el || typeof el.animate !== 'function') continue;
      const before = prev.get(k);
      if (before === undefined) {
        el.animate([{ transform: `translateY(-${ENTER_OFFSET_PX}px)` }, { transform: 'translateY(0)' }], {
          duration: SHIFT_MS,
          easing: EASE_OUT,
        });
      } else if (before !== top) {
        el.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'translateY(0)' }], {
          duration: SHIFT_MS,
          easing: EASE_OUT,
        });
      }
    }
  }, [signature, reduced]);

  return (key: string) => (el: HTMLElement | null) => {
    if (el) nodes.current.set(key, el);
    else nodes.current.delete(key);
  };
}
