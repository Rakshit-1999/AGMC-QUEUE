// Deterministic randomness: mulberry32 plus FNV-1a sub-seeds. No Math.random() anywhere in sim/ or domain/.

export type Rng = () => number; // [0, 1)

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit hash of the keys joined. */
export function hashKeys(...keys: (string | number)[]): number {
  let h = 0x811c9dc5;
  const s = keys.join('␟');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** A sub-stream for one plan item: sub(seed, 'walkin', branchId, 3). */
export function sub(seed: number, ...keys: (string | number)[]): Rng {
  return mulberry32(hashKeys(seed, ...keys));
}

/** A single deterministic number in [0, 1) for the keys. */
export function unit(seed: number, ...keys: (string | number)[]): number {
  return sub(seed, ...keys)();
}

export function between(r: Rng, lo: number, hi: number): number {
  return lo + (hi - lo) * r();
}

export function intBetween(r: Rng, lo: number, hi: number): number {
  return Math.floor(between(r, lo, hi + 1));
}

export function pickOne<T>(r: Rng, items: readonly T[]): T {
  const v = items[Math.floor(r() * items.length)];
  if (v === undefined) throw new Error('pickOne on empty list');
  return v;
}

/** Picks a key by weight: [['SVC', 45], ['STD', 25], ['COL', 30]]. */
export function weighted<T>(r: Rng, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((n, [, w]) => n + w, 0);
  let x = r() * total;
  for (const [v, w] of entries) {
    x -= w;
    if (x < 0) return v;
  }
  const last = entries[entries.length - 1];
  if (!last) throw new Error('weighted on empty list');
  return last[0];
}

/** Knuth Poisson sample (small lambda). */
export function poisson(r: Rng, lambda: number): number {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= r();
  } while (p > l && k < 1000);
  return k - 1;
}
