import type { ServiceType } from '@/domain/types';

export function seedServices(): ServiceType[] {
  return [
    { code: 'SVC', name: 'Service', expectedMin: 25, expressLane: false, ticketLetter: null, active: true },
    { code: 'STD', name: 'Standard', expectedMin: 15, expressLane: false, ticketLetter: null, active: true },
    { code: 'COL', name: 'Collection', expectedMin: 8, expressLane: true, ticketLetter: 'C', active: true },
  ];
}

export const SEED_BRANDS: readonly string[] = ['BMW', 'MINI', 'BMWi'];

/** Walk-in service mix (SPEC/ARCHITECTURE 5.6). */
export const WALKIN_SERVICE_MIX: readonly (readonly [string, number])[] = [
  ['SVC', 45],
  ['STD', 25],
  ['COL', 30],
];
/** Appointment service mix. */
export const APPOINTMENT_SERVICE_MIX: readonly (readonly [string, number])[] = [
  ['SVC', 60],
  ['STD', 30],
  ['COL', 10],
];
export const BRAND_MIX: readonly (readonly [string, number])[] = [
  ['BMW', 60],
  ['MINI', 30],
  ['BMWi', 10],
];
