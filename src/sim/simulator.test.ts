import { describe, expect, it } from 'vitest';
import { atDubai } from '@/domain/time';
import type { AppState } from '@/domain/types';
import { selectTvView } from '@/store/selectors/tv';
import { selectReceptionKpis } from '@/store/selectors/reception';
import { selectBranchCards, selectGroupTotals } from '@/store/selectors/manager';
import { selectAdvisorDesk } from '@/store/selectors/advisor';
import { selectLearning } from '@/store/selectors/dashboard';
import { buildDemoState } from './replay';
import { runUntil } from './step';

const REAL_NOW = 1_700_000_000_000;

function checkInvariants(s: AppState): void {
  const busy = new Map<string, number>();
  for (const v of Object.values(s.visits)) {
    if (v.status === 'called' && v.calledBy) busy.set(v.calledBy, (busy.get(v.calledBy) ?? 0) + 1);
    if (v.status === 'serving' && v.servedBy) busy.set(v.servedBy, (busy.get(v.servedBy) ?? 0) + 1);
    if (['waiting', 'called', 'serving', 'done'].includes(v.status)) {
      expect(v.ticketNo).toMatch(/^[AWC]-\d{3}$/);
      expect(v.arrivedAt).not.toBeNull();
    }
    if (v.status === 'serving') expect(v.startedAt).not.toBeNull();
  }
  for (const [, n] of busy) expect(n).toBe(1);
  const tickets = Object.values(s.visits).map((v) => `${v.branchId}:${v.ticketNo}`).filter((t) => !t.endsWith(':null'));
  expect(new Set(tickets).size).toBe(tickets.length);
}

describe('demo simulator', () => {
  const s = buildDemoState(20261019, REAL_NOW);

  it('seeds branches, advisors, bookings and users', () => {
    expect(s.branchOrder).toEqual(['szr', 'mc']);
    expect(Object.values(s.advisors).filter((a) => a.branchId === 'szr')).toHaveLength(9);
    expect(Object.values(s.advisors).filter((a) => a.branchId === 'mc')).toHaveLength(5);
    expect(s.keyloop.days.szr?.['2026-10-19']?.count).toBeGreaterThanOrEqual(63);
    expect(s.keyloop.days.mc?.['2026-10-19']?.count).toBeGreaterThanOrEqual(30);
    expect(s.users['omar.szr']?.password).toBe('agmc-demo');
    expect(s.clock.anchorSimMs).toBe(atDubai('2026-10-19', '11:00'));
    expect(s.clock.anchorRealMs).toBe(REAL_NOW);
  });

  it('replays a realistic morning to 11:00', () => {
    const now = atDubai('2026-10-19', '11:00');
    const visits = Object.values(s.visits).filter((v) => v.date === '2026-10-19');
    expect(visits.filter((v) => v.status === 'done').length).toBeGreaterThan(20);
    expect(visits.filter((v) => v.kind === 'walk_in').length).toBeGreaterThan(10);
    expect(s.audit.length).toBeGreaterThan(100);
    expect(selectReceptionKpis(s, 'szr', now)).toHaveLength(9);
    expect(selectGroupTotals(s, now)).toHaveLength(7);
    expect(selectBranchCards(s, now)).toHaveLength(2);
    expect(selectAdvisorDesk(s, 'adv_omar_szr', now)?.title).toBe('Omar Haddad');
    expect(selectLearning(s, 'szr').off).toBe(false);
    checkInvariants(s);
  });

  it('is deterministic for a seed', () => {
    const again = buildDemoState(20261019, REAL_NOW);
    expect(Object.keys(again.visits).length).toBe(Object.keys(s.visits).length);
    expect(again.audit[0]).toEqual(s.audit[0]);
  });

  it('runs a simulated hour without errors and keeps invariants', () => {
    const d = structuredClone(s);
    const end = atDubai('2026-10-19', '12:00');
    let guard = 0;
    while (d.lastProcessedAt < end && guard++ < 100) {
      expect(runUntil(d, end).ok).toBe(true);
      checkInvariants(d);
    }
    expect(d.lastProcessedAt).toBe(end);
    checkInvariants(d);
  });

  it('TV view exposes ticket numbers and desks only, never names, plates or mobiles', () => {
    const now = atDubai('2026-10-19', '11:00');
    const tv = selectTvView(s, 'szr', now);
    expect('unavailable' in tv).toBe(false);
    const json = JSON.stringify(tv);
    for (const v of Object.values(s.visits)) {
      if (v.customer.name) expect(json).not.toContain(v.customer.name);
      if (v.customer.plate) expect(json).not.toContain(v.customer.plate);
      if (v.customer.mobile) expect(json).not.toContain(v.customer.mobile);
    }
    expect(selectTvView(s, 'NOPE', now)).toEqual({ unavailable: 'Unknown branch' });
  });
});
