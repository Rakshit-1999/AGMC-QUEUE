// Test fixtures for domain/sim tests (not imported by app code).
import { DEFAULT_RULES } from '@/domain/constants';
import { atDubai } from '@/domain/time';
import type { Advisor, AppState, QueueRules, Visit } from '@/domain/types';
import { seedServices } from '@/sim/seed/services';
import { emptyState } from '@/store/state';

export const DAY = '2026-10-19';
export const at = (hhmm: string): number => atDubai(DAY, hhmm);
export const MIN = 60_000;

export function baseState(rules: Partial<QueueRules> = {}): AppState {
  const s = emptyState();
  s.today = DAY;
  s.branches.b1 = {
    id: 'b1',
    code: 'B1',
    name: 'Test Branch',
    opensAt: '07:30',
    closesAt: '18:00',
    active: true,
    appointmentAdvisorMode: 'allocate_all',
    rules: { ...DEFAULT_RULES, learnDays: 0, ...rules },
    createdAt: 0,
  };
  s.branchOrder = ['b1'];
  for (const svc of seedServices()) {
    s.services[svc.code] = svc;
    s.serviceOrder.push(svc.code);
  }
  s.brands = ['BMW', 'MINI', 'BMWi'];
  return s;
}

export function addAdvisor(s: AppState, id: string, desk: number, patch: Partial<Advisor> = {}): Advisor {
  const a: Advisor = {
    id,
    branchId: 'b1',
    name: id.toUpperCase(),
    desk: `Desk ${desk}`,
    deskType: 'all',
    brands: [],
    services: [],
    active: true,
    presence: 'available',
    breakReason: null,
    presenceSince: at('07:30'),
    username: null,
    ...patch,
  };
  s.advisors[id] = a;
  return a;
}

let n = 0;
export function addVisit(s: AppState, patch: Partial<Visit> & { kind: Visit['kind'] }): Visit {
  n++;
  const id = patch.id ?? `v_${String(n).padStart(6, '0')}`;
  const v: Visit = {
    id,
    branchId: 'b1',
    date: DAY,
    status: 'waiting',
    ticketNo: `${patch.kind === 'walk_in' ? 'W' : 'A'}-${String(n).padStart(3, '0')}`,
    customer: { name: `Customer ${n}`, mobile: '+971 50 000 0000', plate: 'Dubai A 10000', vehicle: 'X5' },
    brand: 'BMW',
    serviceCode: 'SVC',
    booking: null,
    advisorId: null,
    advisorSource: null,
    lateAsWalkIn: false,
    arrivedAt: null,
    quote: null,
    receptionNote: '',
    priorNotes: [],
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
    ...patch,
  };
  s.visits[id] = v;
  return v;
}

export function appointment(s: AppState, slot: string, patch: Partial<Visit> = {}): Visit {
  return addVisit(s, {
    kind: 'appointment',
    status: 'booked',
    booking: { keyloopRef: `KL-B1-1019-${Object.keys(s.visits).length + 1}`, slotAt: at(slot), keyloopAdvisorId: null, importedAt: 0, syncId: 'ks' },
    ...patch,
  });
}

export function walkIn(s: AppState, arrived: string, patch: Partial<Visit> = {}): Visit {
  return addVisit(s, { kind: 'walk_in', status: 'waiting', arrivedAt: at(arrived), ...patch });
}
