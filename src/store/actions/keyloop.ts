// Keyloop actions (manager only).
import type { ActionResult, BranchId, KeyloopSync } from '@/domain/types';
import { fail } from '../ops/audit';
import { opLoadTomorrow, opSetNightlyLoadTime, opSyncToday } from '../ops/keyloop';
import { commit } from '../store';
import { requireManager } from './authz';

export function setNightlyLoadTime(hhmm: string): ActionResult {
  const auth = requireManager();
  if (!auth.ok) return fail(auth.error);
  return commit((d, ctx) => opSetNightlyLoadTime(d, ctx, hhmm), auth.value.username);
}

export function loadTomorrow(): ActionResult<{ count: number }> {
  const auth = requireManager();
  if (!auth.ok) return fail(auth.error);
  return commit((d, ctx) => opLoadTomorrow(d, ctx, 'manual_tomorrow'), auth.value.username);
}

export function syncToday(branchId: BranchId): ActionResult<KeyloopSync> {
  const auth = requireManager();
  if (!auth.ok) return fail(auth.error);
  return commit((d, ctx) => opSyncToday(d, ctx, branchId, 'manual_today'), auth.value.username);
}
