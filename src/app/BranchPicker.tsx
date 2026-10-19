import { useSearchParams } from 'react-router-dom';
import { useAppState } from '@/store';
import { Select } from '@/components/ui';

/** Manager-only branch picker on /reception: writes `?branch=<id>`. Lists active branches in branchOrder. */
export function BranchPicker() {
  const [params, setParams] = useSearchParams();
  const branches = useAppState((s) => s.branches);
  const branchOrder = useAppState((s) => s.branchOrder);

  const current = params.get('branch') ?? '';
  const options = branchOrder
    .map((id) => branches[id])
    .filter((b): b is NonNullable<typeof b> => !!b && (b.active || b.id === current))
    .map((b) => ({ value: b.id, label: b.name }));

  return (
    <Select
      variant="onGreen"
      ariaLabel="Branch"
      value={current}
      options={options}
      minWidth={200}
      onChange={(id) => {
        const next = new URLSearchParams(params);
        next.set('branch', id);
        setParams(next, { replace: true });
      }}
    />
  );
}
