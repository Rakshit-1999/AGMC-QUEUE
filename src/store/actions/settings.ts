// Settings actions (manager only).
import type { ActionResult, AdvisorId, BranchId, ServiceCode, Username } from '@/domain/types';
import { fail } from '../ops/audit';
import {
  opSaveAdvisor,
  opSaveBranch,
  opSaveBrands,
  opSaveServiceType,
  opSaveUser,
  type AdvisorInput,
  type BranchInput,
  type ServiceTypeInput,
  type UserInput,
} from '../ops/settings';
import { commit } from '../store';
import { requireManager } from './authz';

export type { AdvisorInput, BranchInput, ServiceTypeInput, UserInput } from '../ops/settings';

export function saveBranch(input: BranchInput, id?: BranchId): ActionResult<{ id: BranchId }> {
  const auth = requireManager();
  if (!auth.ok) return fail(auth.error);
  return commit((d, ctx) => opSaveBranch(d, ctx, input, id), auth.value.username);
}

export function saveAdvisor(input: AdvisorInput, id?: AdvisorId): ActionResult<{ id: AdvisorId }> {
  const auth = requireManager();
  if (!auth.ok) return fail(auth.error);
  return commit((d, ctx) => opSaveAdvisor(d, ctx, input, id), auth.value.username);
}

export function saveServiceType(input: ServiceTypeInput, code?: ServiceCode): ActionResult {
  const auth = requireManager();
  if (!auth.ok) return fail(auth.error);
  return commit((d, ctx) => opSaveServiceType(d, ctx, input, code), auth.value.username);
}

export function saveBrands(text: string): ActionResult {
  const auth = requireManager();
  if (!auth.ok) return fail(auth.error);
  return commit((d, ctx) => opSaveBrands(d, ctx, text), auth.value.username);
}

export function saveUser(input: UserInput, username?: Username): ActionResult {
  const auth = requireManager();
  if (!auth.ok) return fail(auth.error);
  const acting = auth.value.username;
  return commit((d, ctx) => opSaveUser(d, ctx, input, username, acting), acting);
}
