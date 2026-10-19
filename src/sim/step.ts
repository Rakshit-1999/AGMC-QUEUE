// runUntil(draft, to): ordered system jobs + simulator reconcile, in fixed steps.
import type { ActionResult, AppState, EpochMs } from '@/domain/types';
import { okData } from '@/store/ops/audit';
import { runSimulator } from './simulator';
import { runSystemJobs } from './system';

/** Gaps larger than this are caught up in coarse steps. */
const CATCH_UP_AFTER_MS = 60_000;
const CATCH_UP_STEP_SEC = 5;
/** Max steps per call, so a long catch-up spreads over several leader ticks. */
export const MAX_STEPS_PER_RUN = 1500;

/**
 * Processes every step after `draft.lastProcessedAt` up to `to` (at most MAX_STEPS_PER_RUN steps).
 * `changed` reports whether any op changed the state (the cursor move alone does not count).
 */
export function runUntil(draft: AppState, to: EpochMs): ActionResult<{ changed: boolean }> {
  const from = draft.lastProcessedAt;
  const gap = to - from;
  if (gap <= 0) return okData({ changed: false });
  const stepSec = gap > CATCH_UP_AFTER_MS ? Math.max(CATCH_UP_STEP_SEC, draft.simulator.stepSec) : Math.max(1, draft.simulator.stepSec);
  const stepMs = stepSec * 1000;
  let changed = false;
  let steps = 0;
  for (let t = from + stepMs; t <= to && steps < MAX_STEPS_PER_RUN; t += stepMs, steps++) {
    if (runSystemJobs(draft, t)) changed = true;
    if (runSimulator(draft, t)) changed = true;
    draft.lastProcessedAt = t;
  }
  return okData({ changed });
}
