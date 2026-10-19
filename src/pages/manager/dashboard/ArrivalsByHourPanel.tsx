import { useCallback } from 'react';
import { Card } from '@/components/ui';
import type { BranchId } from '@/domain/types';
import { selectArrivalsByHour, useAppState, type AppState } from '@/store';
import { rowsEqual } from '../shared/equality';
import { ChartLegend } from './charts/ChartLegend';
import { ColumnChart, type ColumnDatum } from './charts/ColumnChart';
import { EMPTY_TEXT } from './copy';

/** Stacked columns per opening hour: appointments at the bottom, walk-ins on top. */
export function ArrivalsByHourPanel({ branchId }: { branchId: BranchId }) {
  const select = useCallback((s: AppState) => selectArrivalsByHour(s, branchId), [branchId]);
  const buckets = useAppState(select, rowsEqual);

  const data: ColumnDatum[] = buckets.map((b) => ({
    key: String(b.hour),
    axis: b.axis,
    segments: [
      { value: b.appointments, tone: 'appt' },
      { value: b.walkIns, tone: 'walk' },
    ],
    tooltip: `${b.label} — Appointments ${b.appointments}, Walk-ins ${b.walkIns}`,
  }));
  const empty = buckets.every((b) => b.appointments + b.walkIns === 0);
  const range = buckets.length > 0 ? `, ${buckets[0]?.axis} to ${buckets[buckets.length - 1]?.axis}` : '';

  return (
    <Card title="Arrivals by hour">
      <ChartLegend
        items={[
          { label: 'Appointments', kind: 'appt' },
          { label: 'Walk-ins', kind: 'walk' },
        ]}
      />
      <ColumnChart
        ariaLabel={`Arrivals by hour${range}`}
        data={data}
        integer
        empty={empty}
        emptyText={EMPTY_TEXT}
        table={{
          caption: 'Arrivals by hour',
          headers: ['Hour', 'Appointments', 'Walk-ins'],
          rows: buckets.map((b) => [b.label, b.appointments, b.walkIns]),
        }}
      />
    </Card>
  );
}
