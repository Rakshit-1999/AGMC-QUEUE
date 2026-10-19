import { useCallback } from 'react';
import type { BranchId } from '@/domain/types';
import { LABEL } from '@/domain/messages';
import { selectAllBranches, shallowEqual, useAppState } from '@/store';
import { Button, Chip, Select, type SelectOption } from '@/components/ui';

export type BranchFilterValue = BranchId | 'all';

/** Branch filter for card headers: "All branches" or one branch (Select sm, 200 wide). */
export function BranchFilter({ value, onChange }: { value: BranchFilterValue; onChange(v: BranchFilterValue): void }) {
  const options = useBranchOptions();
  const all: SelectOption<BranchFilterValue>[] = [{ value: 'all', label: LABEL.allBranches }, ...options];
  return <Select<BranchFilterValue> value={value} onChange={onChange} options={all} size="sm" width={200} ariaLabel="Branch" />;
}

/** Every branch (active and inactive) as select options, in branch order. */
export function useBranchOptions(): SelectOption<BranchId>[] {
  const branches = useAppState(
    useCallback((s) => selectAllBranches(s).map((b) => ({ id: b.id, name: b.name })), []),
    sameList,
  );
  return branches.map((b) => ({ value: b.id, label: b.name }));
}

function sameList<T extends object>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((x, i) => shallowEqual(x, b[i]));
}

/** The Edit cell: Secondary sm button in the last column. */
export function EditButton({ name, onClick }: { name: string; onClick(): void }) {
  return (
    <Button variant="secondary" size="sm" onClick={onClick} aria-label={`Edit ${name}`}>
      Edit
    </Button>
  );
}

/** Active / Inactive status chip (branches). */
export function ActiveChip({ active, offText = 'Inactive' }: { active: boolean; offText?: string }) {
  return <Chip tone={active ? 'green' : 'grey'}>{active ? 'Active' : offText}</Chip>;
}

/** Edit column definition width (DESIGN §2.6). */
export const EDIT_COL_WIDTH = 64;
/** Settings tables scroll horizontally below this width (DESIGN §1.5). */
export const SETTINGS_TABLE_MIN = 760;
