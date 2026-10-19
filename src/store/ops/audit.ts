// Op context, result helpers and the audit writer shared by every op.
import { AUDIT_CAP } from '@/domain/constants';
import { newId } from '@/domain/ids';
import type { ActionResult, AppState, AuditEntry, EpochMs, Who } from '@/domain/types';

export interface OpCtx {
  now: EpochMs;
  who: Who;
  audit(e: Omit<AuditEntry, 'id' | 'at' | 'who'>): void;
}

export type Op<T = undefined> = (draft: AppState, ctx: OpCtx) => ActionResult<T>;

export function ok(): ActionResult {
  return { ok: true };
}

export function okData<T>(data: T): ActionResult<T> {
  return { ok: true, data } as unknown as ActionResult<T>;
}

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export function pushAudit(s: AppState, at: EpochMs, who: Who, e: Omit<AuditEntry, 'id' | 'at' | 'who'>): void {
  s.audit.unshift({ id: newId(s, 'au'), at, who, ...e });
  if (s.audit.length > AUDIT_CAP) s.audit.length = AUDIT_CAP;
}

/** Context whose audit() writes into the given draft. */
export function makeCtx(s: AppState, now: EpochMs, who: Who): OpCtx {
  return { now, who, audit: (e) => pushAudit(s, now, who, e) };
}
