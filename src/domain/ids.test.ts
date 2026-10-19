import { describe, expect, it } from 'vitest';
import { baseState } from '@/test/fixtures';
import { formatTicketNo, issueTicketNo, newVisitId, ticketLetter } from './ids';

describe('ticket numbering', () => {
  it('formats with a 3-digit pad', () => {
    expect(formatTicketNo('A', 14)).toBe('A-014');
    expect(formatTicketNo('W', 18)).toBe('W-018');
    expect(formatTicketNo('C', 4)).toBe('C-004');
    expect(formatTicketNo('A', 1234)).toBe('A-1234');
  });

  it('picks A for appointments, W for walk-ins and late appointments, the service letter otherwise', () => {
    const s = baseState();
    const svc = s.services.SVC;
    const col = s.services.COL;
    expect(ticketLetter({ kind: 'appointment', lateAsWalkIn: false }, svc)).toBe('A');
    expect(ticketLetter({ kind: 'appointment', lateAsWalkIn: true }, svc)).toBe('W');
    expect(ticketLetter({ kind: 'walk_in', lateAsWalkIn: false }, svc)).toBe('W');
    expect(ticketLetter({ kind: 'walk_in', lateAsWalkIn: false }, col)).toBe('C');
    expect(ticketLetter({ kind: 'appointment', lateAsWalkIn: false }, col)).toBe('C');
  });

  it('counts per branch, day and letter, restarting at 001', () => {
    const s = baseState();
    expect(issueTicketNo(s, 'b1', '2026-10-19', 'A')).toBe('A-001');
    expect(issueTicketNo(s, 'b1', '2026-10-19', 'A')).toBe('A-002');
    expect(issueTicketNo(s, 'b1', '2026-10-19', 'W')).toBe('W-001');
    expect(issueTicketNo(s, 'b2', '2026-10-19', 'A')).toBe('A-001');
    expect(issueTicketNo(s, 'b1', '2026-10-20', 'A')).toBe('A-001');
    expect(issueTicketNo(s, 'b1', '2026-10-19', 'A')).toBe('A-003');
  });

  it('issues deterministic visit ids', () => {
    const s = baseState();
    expect(newVisitId(s)).toBe('v_000001');
    expect(newVisitId(s)).toBe('v_000002');
  });
});
