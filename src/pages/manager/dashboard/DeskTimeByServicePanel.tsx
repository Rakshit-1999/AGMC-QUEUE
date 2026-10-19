import { useCallback } from 'react';
import { Card } from '@/components/ui';
import { fmtMinTight } from '@/domain/time';
import type { BranchId } from '@/domain/types';
import { selectDeskTimeByService, useAppState, type AppState } from '@/store';
import { rowsEqual } from '../shared/equality';
import { ChartLegend } from './charts/ChartLegend';
import { HBarChart, type HBarDatum } from './charts/HBarChart';
import { EMPTY_TEXT } from './copy';

/** One horizontal bar per active service, dark tick at the configured minutes, value in clay when over. */
export function DeskTimeByServicePanel({ branchId }: { branchId: BranchId }) {
  const select = useCallback((s: AppState) => selectDeskTimeByService(s, branchId), [branchId]);
  const rows = useAppState(select, rowsEqual);

  const data: HBarDatum[] = rows.map((r) => ({
    key: r.code,
    label: r.name,
    value: r.avgMin,
    marker: r.configuredMin,
    valueText: fmtMinTight(r.avgMin),
    over: r.over,
    tooltip: `${r.name} — Average ${r.avgMin === null ? '—' : `${r.avgMin} min`}, Configured ${r.configuredMin} min, Visits ${r.visits}`,
  }));
  const empty = rows.every((r) => r.avgMin === null);

  return (
    <Card title="Desk time by service type">
      <ChartLegend
        items={[
          { label: 'Average actual', kind: 'appt' },
          { label: 'Configured', kind: 'tick' },
        ]}
      />
      <HBarChart
        ariaLabel="Desk time by service type, average actual against configured minutes"
        data={data}
        empty={empty}
        emptyText={EMPTY_TEXT}
        table={{
          caption: 'Desk time by service type',
          headers: ['Service', 'Average', 'Configured', 'Visits'],
          rows: rows.map((r) => [r.name, r.avgMin === null ? '—' : `${r.avgMin} min`, `${r.configuredMin} min`, r.visits]),
        }}
      />
    </Card>
  );
}
