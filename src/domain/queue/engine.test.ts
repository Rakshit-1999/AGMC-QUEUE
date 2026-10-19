import { describe, expect, it } from 'vitest';
import { addAdvisor, appointment, at, baseState, MIN, walkIn } from '@/test/fixtures';
import { canServe } from '../eligibility';
import { REASON_TEXT } from '../messages';
import { pickNext } from './pickNext';
import { projectQueue } from './project';
import { buildQueueView, estimateFreeAt, fitsBefore, waitedMin } from './view';

const quote = (toldBy: number) => ({ issuedAt: 0, advisorId: null, forecastMin: 0, marginPct: 20, quotedMin: 5, toldBy, sampleSize: 0, afterClosing: false });

describe('eligibility', () => {
  it('applies desk types, brands and services', () => {
    const s = baseState();
    const svc = s.services.SVC!;
    const col = s.services.COL!;
    const appt = appointment(s, '10:00', { status: 'waiting', arrivedAt: at('09:55') });
    const w = walkIn(s, '09:00');
    const all = addAdvisor(s, 'all', 1);
    const apptOnly = addAdvisor(s, 'ao', 2, { deskType: 'appointments_only' });
    const walkDesk = addAdvisor(s, 'wd', 3, { deskType: 'walkin_desk' });
    const express = addAdvisor(s, 'ex', 4, { deskType: 'express_desk' });
    const mini = addAdvisor(s, 'mini', 5, { brands: ['MINI'] });
    expect(canServe(all, w, svc, 'own')).toBe(true);
    expect(canServe(apptOnly, w, svc, 'own')).toBe(false);
    expect(canServe(apptOnly, appt, svc, 'own')).toBe(true);
    expect(canServe(walkDesk, appt, svc, 'own')).toBe(false);
    expect(canServe(walkDesk, appt, svc, 'cover')).toBe(true);
    expect(canServe(express, w, svc, 'own')).toBe(false);
    expect(canServe(express, { ...w, serviceCode: 'COL' }, col, 'own')).toBe(true);
    expect(canServe(mini, w, svc, 'own')).toBe(false);
  });
});

describe('pickNext tiers', () => {
  const t = at('10:00');

  it('1. handover beats everything', () => {
    const s = baseState();
    addAdvisor(s, 'a1', 1);
    walkIn(s, '09:20'); // 40 min: at the ceiling
    const h = walkIn(s, '09:58', { handover: { at: at('09:59'), fromAdvisorId: 'a2', toAdvisorId: 'a1', reason: 'x' }, advisorId: 'a1' });
    expect(pickNext(buildQueueView(s, 'b1', t), 'a1', t)).toEqual({ visitId: h.id, reason: 'handover', covering: false });
  });

  it('"next free" handover is not taken back by the advisor who handed it over', () => {
    const s = baseState();
    addAdvisor(s, 'a1', 1);
    walkIn(s, '09:58', { handover: { at: at('09:59'), fromAdvisorId: 'a1', toAdvisorId: null, reason: 'x' } });
    expect(pickNext(buildQueueView(s, 'b1', t), 'a1', t)?.reason).toBe('fits');
  });

  it('2. hard ceiling beats a due appointment', () => {
    const s = baseState();
    addAdvisor(s, 'a1', 1);
    appointment(s, '10:00', { status: 'waiting', arrivedAt: at('09:50'), advisorId: 'a1' });
    const w = walkIn(s, '09:30', { advisorId: 'a2' }); // 30 min >= 25, a colleague's
    addAdvisor(s, 'a2', 2, { presence: 'break', breakReason: 'Lunch', presenceSince: at('09:50') });
    expect(pickNext(buildQueueView(s, 'b1', t), 'a1', t)).toEqual({ visitId: w.id, reason: 'ceiling', covering: true });
  });

  it('3. own due appointment beats over-cap and bumped walk-ins', () => {
    const s = baseState();
    addAdvisor(s, 'a1', 1);
    const a = appointment(s, '10:05', { status: 'waiting', arrivedAt: at('09:50'), advisorId: 'a1' });
    walkIn(s, '09:42', { bump: { at: at('09:50'), by: 'reception.b1', reason: 'VIP' } }); // 18 min: over cap, bumped
    expect(pickNext(buildQueueView(s, 'b1', t), 'a1', t)).toEqual({ visitId: a.id, reason: 'own_appt_due', covering: false });
  });

  it('4. covers an appointment of an advisor on break', () => {
    const s = baseState();
    addAdvisor(s, 'a1', 1);
    addAdvisor(s, 'a2', 2, { presence: 'break', breakReason: 'Coffee', presenceSince: at('09:55') });
    const a = appointment(s, '09:58', { status: 'waiting', arrivedAt: at('09:50'), advisorId: 'a2' });
    expect(pickNext(buildQueueView(s, 'b1', t), 'a1', t)).toEqual({ visitId: a.id, reason: 'cover_appt', covering: true });
  });

  it('4. waits for a busy colleague until help-after', () => {
    const s = baseState();
    addAdvisor(s, 'a1', 1);
    addAdvisor(s, 'a2', 2);
    walkIn(s, '09:30', { status: 'serving', servedBy: 'a2', startedAt: at('09:40'), calls: [], firstCalledAt: at('09:39') });
    const a = appointment(s, '09:55', { status: 'waiting', arrivedAt: at('09:50'), advisorId: 'a2' });
    expect(pickNext(buildQueueView(s, 'b1', t), 'a1', t)).toBeNull(); // 5 min late < help-after 10
    const later = at('10:06');
    expect(pickNext(buildQueueView(s, 'b1', later), 'a1', later)?.visitId).toBe(a.id);
  });

  it('5. bumped walk-in beats an over-cap one', () => {
    const s = baseState();
    addAdvisor(s, 'a1', 1);
    walkIn(s, '09:40'); // 20 min, over cap
    const b = walkIn(s, '09:55', { bump: { at: at('09:57'), by: 'reception.b1', reason: 'elderly' } });
    expect(pickNext(buildQueueView(s, 'b1', t), 'a1', t)?.reason).toBe('bumped');
    expect(pickNext(buildQueueView(s, 'b1', t), 'a1', t)?.visitId).toBe(b.id);
  });

  it('6. over-cap walk-in ignores the fit check; 8. a normal walk-in respects it', () => {
    const s = baseState();
    addAdvisor(s, 'a1', 1);
    appointment(s, '10:20', { advisorId: 'a1' }); // booked, next appointment in 20 min: SVC (25) does not fit
    const normal = walkIn(s, '09:55');
    let view = buildQueueView(s, 'b1', t);
    expect(fitsBefore(view, 'a1', normal, t)).toBe(false);
    expect(pickNext(view, 'a1', t)).toBeNull();
    const over = walkIn(s, '09:44');
    view = buildQueueView(s, 'b1', t);
    expect(pickNext(view, 'a1', t)).toEqual({ visitId: over.id, reason: 'over_cap', covering: false });
  });

  it('7. covers a colleague’s walk-in past the told time', () => {
    const s = baseState({ swapAdvisorMin: 0 });
    addAdvisor(s, 'a1', 1);
    addAdvisor(s, 'a2', 2);
    walkIn(s, '09:30', { status: 'serving', servedBy: 'a2', startedAt: at('09:50') });
    const w = walkIn(s, '09:52', { advisorId: 'a2', quote: quote(at('09:59')) });
    expect(pickNext(buildQueueView(s, 'b1', t), 'a1', t)).toEqual({ visitId: w.id, reason: 'cover_walkin', covering: true });
    const early = at('09:55');
    expect(pickNext(buildQueueView(s, 'b1', early), 'a1', early)).toBeNull();
  });

  it('7. swaps when the chosen advisor is far off', () => {
    const s = baseState({ swapAdvisorMin: 10 });
    addAdvisor(s, 'a1', 1);
    addAdvisor(s, 'a2', 2);
    walkIn(s, '09:30', { status: 'serving', servedBy: 'a2', startedAt: at('09:58') }); // busy until ~10:23
    const w = walkIn(s, '09:59', { advisorId: 'a2', quote: quote(at('10:30')) });
    expect(pickNext(buildQueueView(s, 'b1', t), 'a1', t)?.visitId).toBe(w.id);
  });

  it('8. fits: oldest walk-in first, mine or unassigned', () => {
    const s = baseState();
    addAdvisor(s, 'a1', 1);
    walkIn(s, '09:50', { advisorId: 'a2' });
    const older = walkIn(s, '09:52');
    walkIn(s, '09:56', { advisorId: 'a1' });
    addAdvisor(s, 'a2', 2);
    expect(pickNext(buildQueueView(s, 'b1', t), 'a1', t)).toEqual({ visitId: older.id, reason: 'fits', covering: false });
  });

  it('9. early appointment when nothing else waits', () => {
    const s = baseState();
    addAdvisor(s, 'a1', 1);
    const a = appointment(s, '10:40', { status: 'waiting', arrivedAt: at('09:58'), advisorId: 'a1' });
    expect(pickNext(buildQueueView(s, 'b1', t), 'a1', t)).toEqual({ visitId: a.id, reason: 'early_appt', covering: false });
  });

  it('every reason code has SPEC text', () => {
    expect(REASON_TEXT.fits).toBe('Walk-in that fits before your next appointment');
    expect(REASON_TEXT.cover_walkin).toBe("Covering a colleague's walk-in so we keep the time we told them");
    expect(Object.keys(REASON_TEXT)).toHaveLength(9);
  });
});

describe('projectQueue', () => {
  it('orders waiting visits and estimates call times across advisors', () => {
    const s = baseState();
    addAdvisor(s, 'a1', 1);
    addAdvisor(s, 'a2', 2);
    const w1 = walkIn(s, '09:50');
    const w2 = walkIn(s, '09:52');
    const w3 = walkIn(s, '09:54');
    const now = at('10:00');
    const p = projectQueue(s, 'b1', now);
    expect(p.order.map((c) => c.visitId)).toEqual([w1.id, w2.id, w3.id]);
    expect(p.byVisit[w1.id]?.estCallAt).toBe(now);
    expect(p.byVisit[w2.id]?.estCallAt).toBe(now);
    // third waits for the first free desk: 1 min walk + 25 min SVC
    expect(p.byVisit[w3.id]?.estCallAt).toBe(now + 26 * MIN);
    expect(p.order.map((c) => c.position)).toEqual([1, 2, 3]);
  });

  it('marks visits nobody can serve as unplaceable, last', () => {
    const s = baseState();
    addAdvisor(s, 'a1', 1, { brands: ['MINI'] });
    const bmw = walkIn(s, '09:50');
    const mini = walkIn(s, '09:55', { brand: 'MINI' });
    const p = projectQueue(s, 'b1', at('10:00'));
    expect(p.order.map((c) => c.visitId)).toEqual([mini.id, bmw.id]);
    expect(p.byVisit[bmw.id]).toMatchObject({ advisorId: null, estCallAt: null });
  });

  it('keeps an advisor free for an upcoming appointment (virtual arrival)', () => {
    const s = baseState();
    addAdvisor(s, 'a1', 1);
    appointment(s, '10:10', { advisorId: 'a1' });
    const w = walkIn(s, '09:59');
    const now = at('10:00');
    const p = projectQueue(s, 'b1', now);
    // SVC does not fit before 10:10, so the walk-in is called after the appointment
    expect(p.byVisit[w.id]?.estCallAt).toBeGreaterThan(at('10:10'));
  });

  it('estimates free times by state', () => {
    const s = baseState();
    addAdvisor(s, 'free', 1);
    addAdvisor(s, 'brk', 2, { presence: 'break', breakReason: 'Lunch', presenceSince: at('09:30') });
    addAdvisor(s, 'off', 3, { presence: 'offline' });
    const now = at('10:00');
    expect(estimateFreeAt(s, 'free', now)).toBe(now);
    expect(estimateFreeAt(s, 'brk', now)).toBe(at('10:15'));
    expect(estimateFreeAt(s, 'off', now)).toBe(Infinity);
    expect(waitedMin(walkIn(s, '09:47'), now)).toBe(13);
  });
});
