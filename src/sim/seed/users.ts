import { DEMO_PASSWORD } from '@/domain/constants';
import type { Advisor, EpochMs, User } from '@/domain/types';

export function seedUsers(advisors: Advisor[], createdAt: EpochMs): User[] {
  const users: User[] = [
    {
      username: 'manager',
      name: 'Aftersales Manager',
      role: 'manager',
      branchId: null,
      advisorId: null,
      password: DEMO_PASSWORD,
      canSignIn: true,
      createdAt,
    },
    {
      username: 'reception.szr',
      name: 'Reception',
      role: 'reception',
      branchId: 'szr',
      advisorId: null,
      password: DEMO_PASSWORD,
      canSignIn: true,
      createdAt,
    },
    {
      username: 'reception.mc',
      name: 'Reception',
      role: 'reception',
      branchId: 'mc',
      advisorId: null,
      password: DEMO_PASSWORD,
      canSignIn: true,
      createdAt,
    },
  ];
  for (const a of advisors) {
    if (!a.username) continue;
    users.push({
      username: a.username,
      name: a.name,
      role: 'advisor',
      branchId: a.branchId,
      advisorId: a.id,
      password: DEMO_PASSWORD,
      canSignIn: true,
      createdAt,
    });
  }
  return users;
}
