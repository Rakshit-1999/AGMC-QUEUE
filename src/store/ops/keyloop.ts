// Keyloop (mock) ops: nightly/manual loads, intraday syncs, advisor allocation per branch mode.
import { allocateAppointments } from '@/domain/allocation';
import { KEYLOOP_HISTORY_CAP } from '@/domain/constants';
import { newId, newVisitId } from '@/domain/ids';
import { ERR } from '@/domain/messages';
import { addDays, isHHMM } from '@/domain/time';
import type {
  ActionResult,
  AppState,
  BranchId,
  DateKey,
  KeyloopDayStatus,
  KeyloopSync,
  Visit,
  VisitId,
} from '@/domain/types';
import { inventDay, type MockBooking } from '@/sim/keyloopMock';
import { asSameDayAdd, asSameDayCancel, asSameDayMove, planForBooking, receptionCandidates } from '@/sim/script';
import { fail, ok, okData, type OpCtx } from './audit';

type LoadKind = KeyloopSync['kind'];

function createBookingVisit(s: AppState, branchId: BranchId, date: DateKey, mb: MockBooking, syncId: string, now: number): Visit {
  const id = newVisitId(s);
  const v: Visit = {
    id,
    branchId,
    date,
    kind: 'appointment',
    status: 'booked',
    ticketNo: null,
    customer: { ...mb.customer },
    brand: mb.brand,
    serviceCode: mb.serviceCode,
    booking: {
      keyloopRef: mb.keyloopRef,
      slotAt: mb.slotAt,
      keyloopAdvisorId: mb.keyloopAdvisorId,
      importedAt: now,
      syncId,
    },
    advisorId: null,
    advisorSource: null,
    lateAsWalkIn: false,
    arrivedAt: null,
    quote: null,
    receptionNote: '',
    priorNotes: [...mb.priorNotes],
    visitNote: '',
    bump: null,
    handover: null,
    calls: [],
    firstCalledAt: null,
    calledBy: null,
    startedAt: null,
    servedBy: null,
    endedAt: null,
    endReason: '',
  };
  s.visits[id] = v;
  s.script.appointments[id] = planForBooking(s.simulator.seed, mb.keyloopRef, receptionCandidates(s, branchId));
  return v;
}

/** Applies the branch's appointment-advisor mode to freshly imported visits. Returns the allocated count. */
function applyAdvisorMode(s: AppState, ctx: OpCtx, branchId: BranchId, date: DateKey, visitIds: VisitId[]): void {
  const b = s.branches[branchId];
  if (!b || visitIds.length === 0) return;
  if (b.appointmentAdvisorMode === 'reception_picks') return;
  const toAllocate: VisitId[] = [];
  for (const id of visitIds) {
    const v = s.visits[id];
    if (!v?.booking) continue;
    const named = v.booking.keyloopAdvisorId;
    const namedAdvisor = named ? s.advisors[named] : undefined;
    if (b.appointmentAdvisorMode === 'keyloop_else_allocate' && namedAdvisor?.active && namedAdvisor.branchId === branchId) {
      v.advisorId = namedAdvisor.id;
      v.advisorSource = 'keyloop';
    } else {
      toAllocate.push(id);
    }
  }
  if (toAllocate.length === 0) return;
  const result = allocateAppointments(s, branchId, date, toAllocate);
  let allocated = 0;
  for (const id of toAllocate) {
    const v = s.visits[id];
    const a = result[id] ?? null;
    if (!v) continue;
    v.advisorId = a;
    v.advisorSource = a ? 'allocated' : null;
    if (a) allocated++;
  }
  ctx.audit({
    branchId,
    what: 'allocate',
    detail: `${allocated} of ${toAllocate.length} appointments allocated for ${date}${
      allocated < toAllocate.length ? ` · ${toAllocate.length - allocated} open` : ''
    }`,
  });
}

/** Recomputes the per-day Keyloop status from the visits. */
export function refreshDayStatus(s: AppState, branchId: BranchId, date: DateKey, loadedAt?: number): KeyloopDayStatus {
  const list = Object.values(s.visits).filter(
    (v) => v.branchId === branchId && v.date === date && v.kind === 'appointment' && v.booking && !(v.status === 'cancelled' && v.arrivedAt === null),
  );
  const prev = s.keyloop.days[branchId]?.[date];
  const st: KeyloopDayStatus = {
    date,
    loadedAt: loadedAt ?? prev?.loadedAt ?? 0,
    count: list.length,
    namedByKeyloop: list.filter((v) => v.advisorSource === 'keyloop').length,
    allocated: list.filter((v) => v.advisorSource === 'allocated').length,
    open: list.filter((v) => v.advisorId === null).length,
  };
  (s.keyloop.days[branchId] ??= {})[date] = st;
  return st;
}

function pushSync(s: AppState, sync: KeyloopSync): void {
  s.keyloop.history.unshift(sync);
  if (s.keyloop.history.length > KEYLOOP_HISTORY_CAP) s.keyloop.history.length = KEYLOOP_HISTORY_CAP;
}

/** Loads a whole day for one branch (idempotent: refs already present are skipped). */
export function opLoadDay(s: AppState, ctx: OpCtx, branchId: BranchId, date: DateKey, kind: LoadKind): ActionResult<KeyloopSync> {
  const b = s.branches[branchId];
  if (!b) return fail(ERR.notYourBranch);
  const syncId = newId(s, 'ks');
  const existing = new Set(
    Object.values(s.visits)
      .filter((v) => v.branchId === branchId && v.date === date && v.booking)
      .map((v) => v.booking?.keyloopRef ?? ''),
  );
  const added: VisitId[] = [];
  for (const mb of inventDay(s, branchId, date, s.simulator.seed)) {
    if (existing.has(mb.keyloopRef)) continue;
    added.push(createBookingVisit(s, branchId, date, mb, syncId, ctx.now).id);
  }
  applyAdvisorMode(s, ctx, branchId, date, added);
  const st = refreshDayStatus(s, branchId, date, ctx.now);
  const sync: KeyloopSync = {
    id: syncId,
    at: ctx.now,
    branchId,
    source: 'mock',
    kind,
    date,
    added: added.length,
    updated: 0,
    removed: 0,
    note: `${st.count} bookings for ${date}`,
  };
  pushSync(s, sync);
  ctx.audit({ branchId, what: 'keyloop load', detail: `${sync.note} (${added.length} added)` });
  return okData(sync);
}

/** Applies due same-day changes (adds, moves, cancellations) for today. */
export function opSyncToday(s: AppState, ctx: OpCtx, branchId: BranchId, kind: 'intraday' | 'manual_today'): ActionResult<KeyloopSync> {
  const b = s.branches[branchId];
  if (!b) return fail(ERR.notYourBranch);
  const date = s.today;
  const syncId = newId(s, 'ks');
  let updated = 0;
  let removed = 0;
  const added: VisitId[] = [];
  const byRef = (ref: string): Visit | undefined =>
    Object.values(s.visits).find((v) => v.branchId === branchId && v.date === date && v.booking?.keyloopRef === ref);
  for (const p of s.script.sameDay) {
    if (p.branchId !== branchId || p.bookedAt > ctx.now) continue;
    const flag = `sameday:${p.id}`;
    if (s.counters[flag]) continue;
    s.counters[flag] = 1;
    if (p.kind === 'add') {
      const add = asSameDayAdd(p.payload);
      if (add && !byRef(add.booking.keyloopRef)) added.push(createBookingVisit(s, branchId, date, add.booking, syncId, ctx.now).id);
    } else if (p.kind === 'move') {
      const mv = asSameDayMove(p.payload);
      const v = mv ? byRef(mv.keyloopRef) : undefined;
      if (mv && v?.booking && v.status === 'booked') {
        v.booking.slotAt = mv.slotAt;
        v.booking.syncId = syncId;
        updated++;
      }
    } else {
      const c = asSameDayCancel(p.payload);
      const v = c ? byRef(c.keyloopRef) : undefined;
      if (v && v.status === 'booked') {
        v.status = 'cancelled';
        v.endedAt = ctx.now;
        v.endReason = 'Cancelled in Keyloop';
        if (v.booking) v.booking.syncId = syncId;
        removed++;
      }
    }
  }
  applyAdvisorMode(s, ctx, branchId, date, added);
  const st = refreshDayStatus(s, branchId, date);
  const sync: KeyloopSync = {
    id: syncId,
    at: ctx.now,
    branchId,
    source: 'mock',
    kind,
    date,
    added: added.length,
    updated,
    removed,
    note: `${st.count} bookings for ${date}`,
  };
  pushSync(s, sync);
  s.keyloop.lastIntradayAt = kind === 'intraday' ? ctx.now : s.keyloop.lastIntradayAt;
  if (kind === 'manual_today' || added.length + updated + removed > 0) {
    ctx.audit({ branchId, what: 'keyloop sync', detail: `${sync.note} · +${added.length} · ~${updated} · −${removed}` });
  }
  return okData(sync);
}

export function opSetNightlyLoadTime(s: AppState, ctx: OpCtx, hhmm: string): ActionResult {
  const t = hhmm.trim();
  if (!isHHMM(t)) return fail(ERR.timeHHMM);
  s.keyloop.nightlyLoadAt = t;
  ctx.audit({ branchId: null, what: 'settings', detail: `Nightly Keyloop load at ${t}` });
  return ok();
}

/** Loads tomorrow for every active branch. */
export function opLoadTomorrow(s: AppState, ctx: OpCtx, kind: 'nightly' | 'manual_tomorrow'): ActionResult<{ count: number }> {
  const date = addDays(s.today, 1);
  let count = 0;
  for (const id of s.branchOrder) {
    const b = s.branches[id];
    if (!b?.active) continue;
    const r = opLoadDay(s, ctx, id, date, kind);
    if (r.ok) count += refreshDayStatus(s, id, date).count;
  }
  return okData({ count });
}
