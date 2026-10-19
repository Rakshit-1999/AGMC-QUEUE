import { DEFAULT_RULES } from '@/domain/constants';
import type { Branch, EpochMs } from '@/domain/types';

export function seedBranches(createdAt: EpochMs): Branch[] {
  return [
    {
      id: 'szr',
      code: 'SZR',
      name: 'Main Branch (SZR)',
      opensAt: '07:30',
      closesAt: '18:00',
      active: true,
      appointmentAdvisorMode: 'keyloop_else_allocate',
      rules: { ...DEFAULT_RULES },
      createdAt,
    },
    {
      id: 'mc',
      code: 'MC',
      name: 'Motor City',
      opensAt: '07:30',
      closesAt: '18:00',
      active: true,
      appointmentAdvisorMode: 'reception_picks',
      rules: { ...DEFAULT_RULES },
      createdAt,
    },
  ];
}

/** Bookings per day the mock Keyloop invents for each seed branch. */
export const BOOKINGS_PER_DAY: Readonly<Record<string, number>> = { szr: 63, mc: 30 };
/** Approximate walk-ins per day by branch. */
export const WALKINS_PER_DAY: Readonly<Record<string, number>> = { szr: 50, mc: 22 };
/** Approximate bookings Keyloop names an advisor for (SZR "about 12"). */
export const KEYLOOP_NAMED_SHARE = 0.19;
