// buildDemoState(seed, realNow): seed data + fast-forward of the morning (opening -> demoStart).
import { DEMO_DATE, DEMO_START } from '@/domain/constants';
import { addDays, atDubai, hhmmToMinutes } from '@/domain/time';
import type { AppState, BranchId, EpochMs } from '@/domain/types';
import { makeCtx } from '@/store/ops/audit';
import { opLoadDay } from '@/store/ops/keyloop';
import { refreshLearning } from '@/store/ops/settings';
import { emptyState } from '@/store/state';
import { synthesizeHistory } from './history';
import { inventDay, type MockBooking } from './keyloopMock';
import { buildBreaks, buildRoster, buildSameDay, buildWalkIns } from './script';
import { seedAdvisors } from './seed/advisors';
import { seedBranches } from './seed/branches';
import { SEED_BRANDS, seedServices } from './seed/services';
import { seedUsers } from './seed/users';
import { runUntil } from './step';

export interface DemoOptions {
  date?: string; // default DEMO_DATE
  demoStart?: string; // default DEMO_START ('11:00')
}

/** Static seed: branches, advisors, services, brands, users, history, roster, today's bookings, script. */
export function seedDemoState(seed: number, opts: DemoOptions = {}): AppState {
  const s = emptyState();
  const today = opts.date ?? DEMO_DATE;
  const demoStart = opts.demoStart ?? DEMO_START;
  s.today = today;
  s.simulator = { enabled: true, seed, drivers: {}, demoStart, stepSec: 5 };
  s.script.seed = seed;
  const createdAt = atDubai(addDays(today, -90), '09:00');

  for (const b of seedBranches(createdAt)) {
    s.branches[b.id] = b;
    s.branchOrder.push(b.id);
    s.keyloop.days[b.id] = {};
  }
  const advisors = seedAdvisors(createdAt);
  for (const a of advisors) {
    s.advisors[a.id] = a;
    s.simulator.drivers[a.id] = 'sim';
  }
  for (const svc of seedServices()) {
    s.services[svc.code] = svc;
    s.serviceOrder.push(svc.code);
  }
  s.brands = [...SEED_BRANDS];
  for (const u of seedUsers(advisors, createdAt)) s.users[u.username] = u;
  for (const id of s.branchOrder) s.history[id] = synthesizeHistory(s, id, seed);

  // Roster first: allocation and Keyloop naming respect who works today.
  s.script.roster = buildRoster(s, seed);

  // Nightly Keyloop load at 22:00 the evening before.
  const loadAt = atDubai(addDays(today, -1), s.keyloop.nightlyLoadAt);
  const ctx = makeCtx(s, loadAt, 'system');
  for (const id of s.branchOrder) opLoadDay(s, ctx, id, today, 'nightly');
  for (const id of s.branchOrder) refreshLearning(s, id, loadAt);

  s.script.walkIns = buildWalkIns(s, seed);
  s.script.breaks = buildBreaks(s, seed, s.script.roster);
  const existing: Record<BranchId, MockBooking[]> = {};
  for (const id of s.branchOrder) existing[id] = inventDay(s, id, today, seed);
  s.script.sameDay = buildSameDay(s, seed, existing);

  const earliestOpen = Math.min(...s.branchOrder.map((id) => hhmmToMinutes(s.branches[id]?.opensAt ?? '07:30')));
  const openHHMM = `${String(Math.floor(earliestOpen / 60)).padStart(2, '0')}:${String(earliestOpen % 60).padStart(2, '0')}`;
  s.lastProcessedAt = atDubai(today, openHHMM) - 60_000;
  return s;
}

/** Fast-forwards a seeded state to `to` with 5-second steps. */
export function fastForward(s: AppState, to: EpochMs): void {
  const step = s.simulator.stepSec;
  s.simulator.stepSec = 5;
  let guard = 0;
  while (s.lastProcessedAt + 5000 <= to && guard++ < 10_000) runUntil(s, to);
  s.simulator.stepSec = step;
}

/** The full demo: seed, replay the morning to demoStart, anchor the clock at demoStart = realNow. */
export function buildDemoState(seed: number, realNow: number, opts: DemoOptions = {}): AppState {
  const s = seedDemoState(seed, opts);
  const start = atDubai(s.today, s.simulator.demoStart);
  fastForward(s, start);
  s.lastProcessedAt = start;
  s.simulator.stepSec = 1;
  s.clock = { anchorSimMs: start, anchorRealMs: realNow, speed: 1 };
  s.rev = 1;
  s.writerId = '';
  return s;
}
