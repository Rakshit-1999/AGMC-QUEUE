// Settings input validation. Each function returns an ERR string or null.
import { ERR } from './messages';
import { isHHMM, hhmmToMinutes } from './time';
import type { AppState, BranchId, HHMM, QueueRules } from './types';

const USERNAME_RE = /^[a-z0-9._-]{3,64}$/;
const CODE_RE = /^[A-Za-z0-9]+$/;

export function validateCode(code: string): string | null {
  return CODE_RE.test(code.trim()) ? null : ERR.codeLettersDigits;
}

export function validateHours(opensAt: HHMM, closesAt: HHMM): string | null {
  if (!isHHMM(opensAt) || !isHHMM(closesAt)) return ERR.openingHours;
  return hhmmToMinutes(opensAt) < hhmmToMinutes(closesAt) ? null : ERR.openingHours;
}

export function validateTime(hhmm: string): string | null {
  return isHHMM(hhmm) ? null : ERR.timeHHMM;
}

export function validateUsername(username: string): string | null {
  return USERNAME_RE.test(username) ? null : ERR.username;
}

export function validatePassword(password: string): string | null {
  return password.length >= 8 ? null : ERR.password;
}

export function isUsernameTaken(s: AppState, username: string): boolean {
  return Object.prototype.hasOwnProperty.call(s.users, username);
}

export function branchCodeTaken(s: AppState, code: string, exceptId?: BranchId): boolean {
  const c = code.trim().toUpperCase();
  return Object.values(s.branches).some((b) => b.id !== exceptId && b.code.toUpperCase() === c);
}

/** Rule numbers are integers >= 0 (the dialog clamps; we clamp again). */
export function sanitizeRules(r: QueueRules): QueueRules {
  const n = (x: number): number => (Number.isFinite(x) ? Math.max(0, Math.round(x)) : 0);
  return {
    earlyWindowMin: n(r.earlyWindowMin),
    graceMin: n(r.graceMin),
    walkInCapMin: n(r.walkInCapMin),
    hardCeilingMin: n(r.hardCeilingMin),
    safetyBufferMin: n(r.safetyBufferMin),
    helpAfterMin: n(r.helpAfterMin),
    swapAdvisorMin: n(r.swapAdvisorMin),
    onTimeTargetMin: n(r.onTimeTargetMin),
    learnDays: n(r.learnDays),
    promiseTargetPct: Math.min(99, Math.max(1, n(r.promiseTargetPct))),
  };
}

/** "BMW, MINI, BMWi" -> ['BMW','MINI','BMWi'] (trimmed, de-duplicated case-insensitively). */
export function parseBrands(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of text.split(',')) {
    const b = raw.trim();
    if (!b || seen.has(b.toLowerCase())) continue;
    seen.add(b.toLowerCase());
    out.push(b);
  }
  return out;
}
