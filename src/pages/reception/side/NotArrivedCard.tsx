import { Card } from '@/components/ui';
import { selectNotArrived, useLive } from '@/store';
import type { BranchId } from '@/domain/types';
import { CompactList } from './CompactList';

/** Appointments not arrived: slot, name, "Layla Mansour · Service", chip. */
export function NotArrivedCard({ branchId }: { branchId: BranchId }) {
  const view = useLive((s, now) => selectNotArrived(s, branchId, now), [branchId]);
  return (
    <Card title="Appointments not arrived" subtitle={<span className="num">{view.count}</span>}>
      <CompactList
        label="Appointments not arrived"
        empty="None left today"
        rows={view.rows.map((r) => ({ id: r.visitId, time: r.slot, main: r.name, sub: r.sub, chip: r.chip }))}
      />
    </Card>
  );
}
