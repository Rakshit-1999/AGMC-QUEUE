import type { BreakReason, QueueRules } from './types';

/** Minutes from "call" to the customer reaching the desk (used in forecasts). */
export const CALL_TO_START_MIN = 1;

/** Expected break lengths per reason (minutes). */
export const BREAK_MIN: Readonly<Record<BreakReason, number>> = {
  Coffee: 15,
  Prayer: 15,
  Lunch: 45,
  Workshop: 30,
  Meeting: 30,
};

export const BREAK_REASONS: readonly BreakReason[] = ['Coffee', 'Prayer', 'Lunch', 'Workshop', 'Meeting'];

/** A booked customer who never arrives becomes a no-show at slot + grace + this. */
export const AUTO_NO_SHOW_AFTER_GRACE_MIN = 30;
/** Walk-in wait turns amber this many minutes before the cap. */
export const NEAR_CAP_MIN = 3;
/** Quote margin used when learning is off or too few walk-ins were learned from. */
export const FIXED_MARGIN_PCT = 20;
/** Minimum walk-ins in the learning window before the learned margin is used. */
export const MIN_LEARNED_WALKINS = 5;
/** Shrinkage weight (K) for desk-time learning. */
export const PRIOR_WEIGHT_VISITS = 5;
/** Quotes at or above this many minutes trigger the "Long wait" advice. */
export const LONG_WAIT_MIN = 30;
/** A call is "fresh" on the TV for this many seconds. */
export const FRESH_CALL_SEC = 20;
/** Audit log is capped to this many entries (newest first). */
export const AUDIT_CAP = 2000;
/** Keyloop sync history cap. */
export const KEYLOOP_HISTORY_CAP = 200;
/** "Now using" desk time turns clay when it differs this much from configured. */
export const DESK_TIME_ALERT_MIN = 3;
/** A serving visit becomes an attention item at expected × this. */
export const SERVING_ATTENTION_FACTOR = 1.5;
/** Learning refresh cadence (sim minutes). */
export const LEARNING_REFRESH_MIN = 10;
/** Projection guards. */
export const PROJECTION_MAX_ITER = 600;
export const PROJECTION_HORIZON_AFTER_CLOSE_MIN = 180;
export const PROJECTION_IDLE_STEP_MIN = 5;
/** Projection memo bucket size. */
export const PROJECTION_CACHE_MS = 5000;

export const DEFAULT_RULES: Readonly<QueueRules> = {
  earlyWindowMin: 10,
  graceMin: 15,
  walkInCapMin: 15,
  hardCeilingMin: 25,
  safetyBufferMin: 5,
  helpAfterMin: 10,
  swapAdvisorMin: 10,
  onTimeTargetMin: 5,
  learnDays: 28,
  promiseTargetPct: 80,
};

export const DEMO_DATE = '2026-10-19';
export const DEMO_SEED = 20261019;
export const DEMO_START: string = '11:00';
export const DEMO_PASSWORD = 'agmc-demo';
export const DEFAULT_NIGHTLY_LOAD_AT = '22:00';
export const SCHEMA_VERSION = 1 as const;
