// Waiting-area TV selector (P6). Never exposes names, plates or phone numbers: the view type has no
// field that could carry them, and only ticket numbers and desks are copied out of visits.
import { FRESH_CALL_SEC } from '@/domain/constants';
import { LABEL } from '@/domain/messages';
import type { AppState, EpochMs } from '@/domain/types';
import { dayVisits, selectBranchByCode, selectProjection } from './common';

export interface TvCall {
  ticketNo: string;
  desk: string;
  fresh: boolean;
}
export interface TvDesk {
  ticketNo: string;
  desk: string;
}
export interface TvViewOk {
  title: string; // "Main Branch (SZR) · Service reception"
  calling: TvCall[]; // newest first; fresh = last call within 20 s
  atDesks: TvDesk[];
  next: string[]; // up to 10 ticket numbers, projection order
  waitingCount: number;
}
export type TvView = { unavailable: string } | TvViewOk;

function deskNo(desk: string): number {
  const m = /\d+/.exec(desk);
  return m ? Number(m[0]) : Number.MAX_SAFE_INTEGER;
}

export function selectTvView(s: AppState, code: string, now: EpochMs): TvView {
  const b = selectBranchByCode(s, code);
  if (!b) return { unavailable: LABEL.tvUnknownBranch };
  if (!b.active) return { unavailable: LABEL.tvInactiveBranch };
  const visits = dayVisits(s, b.id);
  const calling = visits
    .filter((v) => v.status === 'called' && v.calledBy && v.ticketNo)
    .map((v) => ({ at: v.calls[v.calls.length - 1]?.at ?? 0, ticketNo: v.ticketNo ?? '', desk: s.advisors[v.calledBy ?? '']?.desk ?? '' }))
    .sort((x, y) => y.at - x.at || x.ticketNo.localeCompare(y.ticketNo))
    .map((c): TvCall => ({ ticketNo: c.ticketNo, desk: c.desk, fresh: now - c.at <= FRESH_CALL_SEC * 1000 }));
  const atDesks = visits
    .filter((v) => v.status === 'serving' && v.servedBy && v.ticketNo)
    .map((v): TvDesk => ({ ticketNo: v.ticketNo ?? '', desk: s.advisors[v.servedBy ?? '']?.desk ?? '' }))
    .sort((x, y) => deskNo(x.desk) - deskNo(y.desk) || x.desk.localeCompare(y.desk));
  const proj = selectProjection(s, b.id, now);
  const next: string[] = [];
  for (const pc of proj.order) {
    const t = s.visits[pc.visitId]?.ticketNo;
    if (t) next.push(t);
    if (next.length >= 10) break;
  }
  return {
    title: `${b.name} · Service reception`,
    calling,
    atDesks,
    next,
    waitingCount: proj.order.length,
  };
}
