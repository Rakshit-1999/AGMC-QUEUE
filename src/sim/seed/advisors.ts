import type { Advisor, DeskType, EpochMs } from '@/domain/types';

interface AdvisorSeed {
  id: string;
  branchId: string;
  name: string;
  desk: string;
  deskType: DeskType;
  brands?: string[];
  services?: string[];
  username: string | null;
}

const SEED: readonly AdvisorSeed[] = [
  { id: 'adv_omar_szr', branchId: 'szr', name: 'Omar Haddad', desk: 'Desk 1', deskType: 'all', username: 'omar.szr' },
  { id: 'adv_layla_szr', branchId: 'szr', name: 'Layla Mansour', desk: 'Desk 2', deskType: 'all', username: 'layla.szr' },
  { id: 'adv_daniel_szr', branchId: 'szr', name: 'Daniel Costa', desk: 'Desk 3', deskType: 'all', username: 'daniel.szr' },
  { id: 'adv_sara_szr', branchId: 'szr', name: 'Sara Ibrahim', desk: 'Desk 4', deskType: 'all', username: 'sara.szr' },
  { id: 'adv_ravi_szr', branchId: 'szr', name: 'Ravi Menon', desk: 'Desk 5', deskType: 'all', username: 'ravi.szr' },
  { id: 'adv_priya_szr', branchId: 'szr', name: 'Priya Nair', desk: 'Desk 6', deskType: 'walkin_desk', username: 'priya.szr' },
  { id: 'adv_marco_szr', branchId: 'szr', name: 'Marco Rossi', desk: 'Desk 7', deskType: 'all', brands: ['MINI'], username: 'marco.szr' },
  { id: 'adv_noura_szr', branchId: 'szr', name: 'Noura Saleh', desk: 'Desk 8', deskType: 'express_desk', services: ['COL'], username: 'noura.szr' },
  { id: 'adv_ahmed_szr', branchId: 'szr', name: 'Ahmed Farouk', desk: 'Desk 9', deskType: 'appointments_only', username: null },
  { id: 'adv_hassan_mc', branchId: 'mc', name: 'Hassan Ali', desk: 'Desk 1', deskType: 'all', username: 'hassan.mc' },
  { id: 'adv_mariam_mc', branchId: 'mc', name: 'Mariam Qasim', desk: 'Desk 2', deskType: 'all', username: 'mariam.mc' },
  { id: 'adv_vikram_mc', branchId: 'mc', name: 'Vikram Shah', desk: 'Desk 3', deskType: 'all', username: 'vikram.mc' },
  { id: 'adv_elena_mc', branchId: 'mc', name: 'Elena Petrova', desk: 'Desk 4', deskType: 'walkin_desk', username: 'elena.mc' },
  { id: 'adv_yusuf_mc', branchId: 'mc', name: 'Yusuf Karim', desk: 'Desk 5', deskType: 'express_desk', username: 'yusuf.mc' },
];

/** Advisors that are never rostered (offline all day). */
export const OFFLINE_ALL_DAY: ReadonlySet<string> = new Set(['adv_ahmed_szr']);

export function seedAdvisors(at: EpochMs): Advisor[] {
  return SEED.map((a) => ({
    id: a.id,
    branchId: a.branchId,
    name: a.name,
    desk: a.desk,
    deskType: a.deskType,
    brands: a.brands ?? [],
    services: a.services ?? [],
    active: true,
    presence: 'offline',
    breakReason: null,
    presenceSince: at,
    username: a.username,
  }));
}
