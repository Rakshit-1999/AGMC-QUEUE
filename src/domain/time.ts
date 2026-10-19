// Dubai time formatting. Dubai is UTC+4 all year (no DST), so a fixed offset
// plus getUTC*() is exact and identical in every browser.
import type { DateKey, EpochMs, HHMM } from './types';

export const DUBAI_OFFSET_MS: number = 4 * 3600_000;

const MIN_MS = 60_000;
const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function shifted(t: EpochMs): Date {
  return new Date(t + DUBAI_OFFSET_MS);
}

function parseIntSafe(s: string | undefined): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** '2026-10-19' (Dubai calendar date of an instant). */
export function dubaiDate(t: EpochMs): DateKey {
  const d = shifted(t);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Dubai wall time -> instant. */
export function atDubai(date: DateKey, hhmm: HHMM): EpochMs {
  const [y, m, d] = date.split('-');
  const [h, mi] = hhmm.split(':');
  return (
    Date.UTC(parseIntSafe(y), parseIntSafe(m) - 1, parseIntSafe(d), parseIntSafe(h), parseIntSafe(mi)) -
    DUBAI_OFFSET_MS
  );
}

/** Minutes since Dubai midnight, 0..1439. */
export function dubaiMinutesOfDay(t: EpochMs): number {
  const d = shifted(t);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Dubai hour of day, 0..23. */
export function dubaiHour(t: EpochMs): number {
  return shifted(t).getUTCHours();
}

/** '09:30' (24h, zero-padded, minutes floored). */
export function fmtClock(t: EpochMs): string {
  const d = shifted(t);
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

/** Rounds up to the next whole minute ("called by"). */
export function fmtClockCeil(t: EpochMs): string {
  return fmtClock(Math.ceil(t / MIN_MS) * MIN_MS);
}

function trimDecimal(n: number, decimals: 0 | 1): string {
  return decimals === 1 ? n.toFixed(1) : String(Math.round(n));
}

/** '12 min' / '34.4 min' / '—'. */
export function fmtMin(min: number | null, decimals: 0 | 1 = 0): string {
  if (min === null || !Number.isFinite(min)) return '—';
  return `${trimDecimal(min, decimals)} min`;
}

/** '12′' (U+2032 prime) / '—'. */
export function fmtMinTight(min: number | null): string {
  if (min === null || !Number.isFinite(min)) return '—';
  return `${Math.round(min)}′`;
}

/** '0:42', '12:03', '1:02:09' (floor seconds, never negative). */
export function fmtTimer(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}

/** 0.83 -> '83%' / '—'. */
export function fmtPct(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return '—';
  return `${Math.round(ratio * 100)}%`;
}

/** 'Monday, 19 Oct 2026'. */
export function fmtLongDate(t: EpochMs): string {
  const d = shifted(t);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** '19 Oct, 11:45'. */
export function fmtAuditTime(t: EpochMs): string {
  const d = shifted(t);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${fmtClock(t)}`;
}

/** '07:30–18:00' (en dash). */
export function fmtHours(open: HHMM, close: HHMM): string {
  return `${open}–${close}`;
}

/** (b - a) / 60000, unrounded. */
export function minutesBetween(a: EpochMs, b: EpochMs): number {
  return (b - a) / MIN_MS;
}

/** Strict 24h HH:MM. */
export function isHHMM(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

/** 8 -> '08:00'. */
export function hourLabel(h: number): string {
  return `${pad2(h)}:00`;
}

/** 8 -> '08:00–09:00'. */
export function hourRangeLabel(h: number): string {
  return `${hourLabel(h)}–${hourLabel(h + 1)}`;
}

/** HH:MM -> minutes since midnight. */
export function hhmmToMinutes(hhmm: HHMM): number {
  const [h, m] = hhmm.split(':');
  return parseIntSafe(h) * 60 + parseIntSafe(m);
}

/** Calendar arithmetic on DateKeys. */
export function addDays(date: DateKey, days: number): DateKey {
  return dubaiDate(atDubai(date, '12:00') + days * DAY_MS);
}

/** '2026-10-19' -> '1019' (Keyloop refs). */
export function monthDayKey(date: DateKey): string {
  const [, m, d] = date.split('-');
  return `${m ?? '00'}${d ?? '00'}`;
}

/** Simulated "now" for a clock anchor at a given real time: anchorSimMs + (realMs - anchorRealMs) * speed. */
export function simTimeAt(clock: { anchorSimMs: EpochMs; anchorRealMs: number; speed: number }, realMs: number): EpochMs {
  return clock.anchorSimMs + (realMs - clock.anchorRealMs) * clock.speed;
}

export const MINUTE_MS = MIN_MS;
export const DAY_IN_MS = DAY_MS;
