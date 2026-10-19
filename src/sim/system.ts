// Always-on jobs (run even with the simulator off): auto no-show, Keyloop syncs, nightly load, learning refresh.
import { AUTO_NO_SHOW_AFTER_GRACE_MIN, LEARNING_REFRESH_MIN } from '@/domain/constants';
import { addDays, dubaiMinutesOfDay, hhmmToMinutes } from '@/domain/time';
import type { AppState, EpochMs } from '@/domain/types';
import { makeCtx } from '@/store/ops/audit';
import { opLoadTomorrow, opSyncToday } from '@/store/ops/keyloop';
import { opMarkNoShow } from '@/store/ops/reception';
import { refreshLearning } from '@/store/ops/settings';

const MIN = 60_000;
const INTRADAY_MS = 10 * MIN;

function isOpen(s: AppState, branchId: string, t: EpochMs): boolean {
  const b = s.branches[branchId];
  if (!b?.active) return false;
  const m = dubaiMinutesOfDay(t);
  return m >= hhmmToMinutes(b.opensAt) && m < hhmmToMinutes(b.closesAt);
}

/** Returns true when anything changed. */
export function runSystemJobs(s: AppState, t: EpochMs): boolean {
  let changed = false;
  const ctx = makeCtx(s, t, 'system');

  // 1. Auto no-show: booked appointments past slot + grace + 30 min.
  for (const v of Object.values(s.visits)) {
    if (v.status !== 'booked' || v.kind !== 'appointment' || !v.booking || v.date !== s.today) continue;
    const b = s.branches[v.branchId];
    if (!b) continue;
    if (t > v.booking.slotAt + (b.rules.graceMin + AUTO_NO_SHOW_AFTER_GRACE_MIN) * MIN) {
      if (opMarkNoShow(s, ctx, v.id, 'never arrived').ok) changed = true;
    }
  }

  // 2. Keyloop intraday sync at :00, :10, … :50 during opening hours.
  const slot = Math.floor(t / INTRADAY_MS) * INTRADAY_MS;
  const last = s.keyloop.lastIntradayAt;
  if (last === null || last < slot) {
    const open = s.branchOrder.filter((id) => isOpen(s, id, slot));
    if (open.length > 0) {
      const syncCtx = makeCtx(s, t, 'system');
      for (const id of open) opSyncToday(s, syncCtx, id, 'intraday');
      s.keyloop.lastIntradayAt = slot;
      changed = true;
    }
  }

  // 3. Nightly load of tomorrow's bookings.
  if (dubaiMinutesOfDay(t) >= hhmmToMinutes(s.keyloop.nightlyLoadAt)) {
    const tomorrow = addDays(s.today, 1);
    const missing = s.branchOrder.some((id) => s.branches[id]?.active && !s.keyloop.days[id]?.[tomorrow]);
    if (missing) {
      opLoadTomorrow(s, ctx, 'nightly');
      changed = true;
    }
  }

  // 4. Learning refresh every 10 sim minutes per branch.
  for (const id of s.branchOrder) {
    const snap = s.learning[id];
    if (!snap || t - snap.computedAt >= LEARNING_REFRESH_MIN * MIN) {
      refreshLearning(s, id, t);
      changed = true;
    }
  }
  return changed;
}
