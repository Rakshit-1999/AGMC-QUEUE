import { KpiRow, KpiTile } from '@/components/ui';
import { selectReceptionKpis, useLive } from '@/store';
import type { BranchId } from '@/domain/types';
import { useMediaQuery } from './useMediaQuery';

/** The nine reception tiles: 9 columns at ≥1360, otherwise 5 + 4 (DESIGN §2.2). */
export function ReceptionKpis({ branchId }: { branchId: BranchId }) {
  const kpis = useLive((s, now) => selectReceptionKpis(s, branchId, now), [branchId]);
  const wide = useMediaQuery('(min-width: 1360px)');
  return (
    <KpiRow columns={wide ? 9 : 5}>
      {kpis.map((k) => (
        <KpiTile key={k.label} label={k.label} value={k.value} unit={k.unit} hint={k.hint} alert={k.alert} />
      ))}
    </KpiRow>
  );
}
