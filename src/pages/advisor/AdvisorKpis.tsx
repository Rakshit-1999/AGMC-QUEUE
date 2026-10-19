import type { Kpi } from '@/store';
import { KpiRow, KpiTile } from '@/components/ui';

export interface AdvisorKpisProps {
  kpis: Kpi[];
}

/** Four tiles: Served today · Average desk time · Appointments on time · Waiting for you. */
export function AdvisorKpis({ kpis }: AdvisorKpisProps) {
  return (
    <KpiRow columns={4}>
      {kpis.map((k) => (
        <KpiTile key={k.label} label={k.label} value={k.value} unit={k.unit} hint={k.hint} alert={k.alert} />
      ))}
    </KpiRow>
  );
}
