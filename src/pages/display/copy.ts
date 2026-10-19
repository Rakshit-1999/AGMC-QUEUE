// Fixed TV copy (SPEC "Page 7 — Waiting-area TV"). Shared strings come from LABEL in @/domain/messages;
// the strings below are only used on this screen, so they live here rather than in the domain module.
export const TV_COPY = {
  nowCalling: 'NOW CALLING',
  atTheDesks: 'AT THE DESKS',
  next: 'NEXT',
  footerLeft: 'Please keep your ticket number ready.',
  footerRight: 'AGMC Aftersales',
  unavailable: (reason: string) => `Screen not available: ${reason}`,
  waiting: (n: number) => `${n} waiting`,
  toDesk: (desk: string) => `→ ${desk}`,
} as const;

/** Layout limits from DESIGN §2.7. */
export const TV_LIMITS = {
  callingRows: 4,
  deskTiles: 12,
} as const;

/** Fixed design canvas (DESIGN §2.7). */
export const STAGE_W = 1920;
export const STAGE_H = 1080;
