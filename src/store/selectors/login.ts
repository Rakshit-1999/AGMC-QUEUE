// Sign-in page selectors (P1).
import { compareDesk } from '@/domain/eligibility';
import { ROLE_TEXT } from '@/domain/messages';
import type { AppState, Role, User } from '@/domain/types';
import { selectAllBranches } from './common';

export interface DemoAccountGroup {
  heading: string;
  rows: { username: string; name: string; role: Role; roleLabel: 'Manager' | 'Reception' | 'Service advisor' }[];
}

function row(u: User): DemoAccountGroup['rows'][number] {
  return { username: u.username, name: u.name, role: u.role, roleLabel: ROLE_TEXT[u.role] };
}

/** Groups: "Manager", then one per branch name; only users who can sign in. */
export function selectDemoAccounts(s: AppState): DemoAccountGroup[] {
  const users = Object.values(s.users).filter((u) => u.canSignIn);
  const groups: DemoAccountGroup[] = [];
  const managers = users.filter((u) => u.role === 'manager').sort((a, b) => a.username.localeCompare(b.username));
  if (managers.length > 0) groups.push({ heading: 'Manager', rows: managers.map(row) });
  for (const b of selectAllBranches(s)) {
    const reception = users.filter((u) => u.role === 'reception' && u.branchId === b.id).sort((a, c) => a.username.localeCompare(c.username));
    const advisors = users
      .filter((u) => u.role === 'advisor' && u.branchId === b.id)
      .sort((a, c) => {
        const x = a.advisorId ? s.advisors[a.advisorId] : undefined;
        const y = c.advisorId ? s.advisors[c.advisorId] : undefined;
        return x && y ? compareDesk(x, y) : a.username.localeCompare(c.username);
      });
    const rows = [...reception, ...advisors].map(row);
    if (rows.length > 0) groups.push({ heading: b.name, rows });
  }
  return groups;
}
