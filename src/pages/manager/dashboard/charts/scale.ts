// Small, pure helpers for the hand-made SVG charts.

export interface LinearScale {
  /** Top of the domain (a multiple of `step`). */
  max: number;
  step: number;
  /** 0, step, 2·step … max (4–5 gridlines). */
  ticks: number[];
}

/**
 * "Nice" 0-based scale with about `target` steps (DESIGN: 4–5 ticks).
 * `integer` keeps steps whole (counts), so the 2.5 step is skipped.
 */
export function niceScale(dataMax: number, target = 4, integer = false): LinearScale {
  const m = dataMax > 0 && Number.isFinite(dataMax) ? dataMax : target;
  const raw = m / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const factors = integer ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  let step = (factors.find((f) => norm <= f) ?? 10) * mag;
  if (integer) step = Math.max(1, Math.round(step));
  const max = Math.ceil(m / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { max, step, ticks };
}

/** Tick label without float noise: 2.5 stays "2.5", 10 stays "10". */
export function fmtTick(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
}

/** SVG path for a bar with only its top corners rounded. */
export function topRoundedBar(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, h, w / 2));
  return [
    `M${x},${y + h}`,
    `V${y + rr}`,
    `Q${x},${y} ${x + rr},${y}`,
    `H${x + w - rr}`,
    `Q${x + w},${y} ${x + w},${y + rr}`,
    `V${y + h}`,
    'Z',
  ].join(' ');
}

/** SVG path for a horizontal bar with only its right corners rounded. */
export function rightRoundedBar(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w, h / 2));
  return [
    `M${x},${y}`,
    `H${x + w - rr}`,
    `Q${x + w},${y} ${x + w},${y + rr}`,
    `V${y + h - rr}`,
    `Q${x + w},${y + h} ${x + w - rr},${y + h}`,
    `H${x}`,
    'Z',
  ].join(' ');
}

/** Splits an axis label into at most two lines at the space nearest the middle. */
export function splitLabel(label: string): [string] | [string, string] {
  const spaces: number[] = [];
  for (let i = 0; i < label.length; i++) if (label[i] === ' ') spaces.push(i);
  if (spaces.length === 0) return [label];
  const mid = label.length / 2;
  const at = spaces.reduce((best, i) => (Math.abs(i - mid) < Math.abs(best - mid) ? i : best));
  return [label.slice(0, at), label.slice(at + 1)];
}
