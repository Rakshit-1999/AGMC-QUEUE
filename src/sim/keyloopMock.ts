// Mock Keyloop source: invents a realistic day of bookings per branch. Like an online booking,
// most bookings name no advisor. Only this connector changes when the real Keyloop link lands.
import { rosteredAt } from '@/domain/allocation';
import { compareDesk } from '@/domain/eligibility';
import { atDubai, hhmmToMinutes, monthDayKey } from '@/domain/time';
import type { AdvisorId, AppState, BranchId, BrandCode, Customer, DateKey, EpochMs, ServiceCode } from '@/domain/types';
import { pickOne, sub, weighted, type Rng } from './rng';
import { BOOKINGS_PER_DAY, KEYLOOP_NAMED_SHARE } from './seed/branches';
import { makeCustomer, PRIOR_NOTES } from './seed/people';
import { APPOINTMENT_SERVICE_MIX, BRAND_MIX } from './seed/services';

const MIN = 60_000;

export interface MockBooking {
  keyloopRef: string;
  slotAt: EpochMs;
  serviceCode: ServiceCode;
  brand: BrandCode;
  customer: Customer;
  keyloopAdvisorId: AdvisorId | null;
  priorNotes: string[];
}

export function keyloopRef(code: string, date: DateKey, seq: number): string {
  return `KL-${code}-${monthDayKey(date)}-${String(seq).padStart(3, '0')}`;
}

/** Bookings per day for a branch: seed value, else about 7 per appointment-capable advisor. */
export function bookingsPerDay(s: AppState, branchId: BranchId): number {
  const seeded = BOOKINGS_PER_DAY[branchId];
  if (seeded !== undefined) return seeded;
  const capable = Object.values(s.advisors).filter(
    (a) => a.branchId === branchId && a.active && (a.deskType === 'all' || a.deskType === 'appointments_only'),
  ).length;
  return capable * 7;
}

function pickServiceAndBrand(s: AppState, r: Rng): { serviceCode: ServiceCode; brand: BrandCode } {
  const services = APPOINTMENT_SERVICE_MIX.filter(([c]) => s.services[c]?.active);
  const serviceCode =
    services.length > 0 ? weighted(r, services) : pickOne(r, s.serviceOrder.filter((c) => s.services[c]?.active));
  const brands = BRAND_MIX.filter(([b]) => s.brands.includes(b));
  const brand = brands.length > 0 ? weighted(r, brands) : pickOne(r, s.brands);
  return { serviceCode, brand };
}

/** Today's (or tomorrow's) bookings for one branch, deterministic per (seed, branch, date). */
export function inventDay(s: AppState, branchId: BranchId, date: DateKey, seed: number): MockBooking[] {
  const branch = s.branches[branchId];
  if (!branch || s.brands.length === 0) return [];
  const count = bookingsPerDay(s, branchId);
  const r = sub(seed, 'keyloop', branchId, date);
  const open = hhmmToMinutes(branch.opensAt);
  const lastSlot = hhmmToMinutes(branch.closesAt) - 60;
  const slots: number[] = [];
  for (let m = open; m <= lastSlot; m += 15) slots.push(m);
  if (slots.length === 0) return [];
  const capable = Object.values(s.advisors)
    .filter((a) => a.branchId === branchId && a.active && (a.deskType === 'all' || a.deskType === 'appointments_only'))
    .sort(compareDesk);
  const perSlotCap = Math.max(1, Math.ceil(Math.max(capable.length, 1) / 2));
  const used = new Map<number, number>();
  // Morning-heavy weights.
  const weights = slots.map((m) => (m < 11 * 60 ? 1.4 : m < 13 * 60 ? 1 : m < 15 * 60 ? 0.8 : 1.1));
  const slotWeights = slots.map((_slot, k) => [k, weights[k] ?? 1] as const);
  const chosen: number[] = [];
  for (let i = 0; i < count; i++) {
    let idx = weighted(r, slotWeights);
    for (let tries = 0; tries < slots.length && (used.get(idx) ?? 0) >= perSlotCap; tries++) idx = (idx + 1) % slots.length;
    used.set(idx, (used.get(idx) ?? 0) + 1);
    chosen.push(slots[idx] ?? open);
  }
  chosen.sort((a, b) => a - b);

  const named: { advisorId: AdvisorId; slotAt: EpochMs }[] = [];
  return chosen.map((minutes, i) => {
    const slotAt = atDubai(date, `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
    const { serviceCode, brand } = pickServiceAndBrand(s, r);
    const customer = makeCustomer(r, brand);
    let keyloopAdvisorId: AdvisorId | null = null;
    if (r() < KEYLOOP_NAMED_SHARE) {
      const options = capable.filter(
        (a) =>
          rosteredAt(s, a.id, slotAt) &&
          (a.brands.length === 0 || a.brands.includes(brand)) &&
          (a.services.length === 0 || a.services.includes(serviceCode)) &&
          !named.some((n) => n.advisorId === a.id && Math.abs(n.slotAt - slotAt) < 45 * MIN),
      );
      if (options.length > 0) {
        keyloopAdvisorId = pickOne(r, options).id;
        named.push({ advisorId: keyloopAdvisorId, slotAt });
      }
    }
    const priorNotes = r() < 0.3 ? [pickOne(r, PRIOR_NOTES)] : [];
    return { keyloopRef: keyloopRef(branch.code, date, i + 1), slotAt, serviceCode, brand, customer, keyloopAdvisorId, priorNotes };
  });
}
