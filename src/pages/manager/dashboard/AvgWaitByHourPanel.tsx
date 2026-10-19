import { useCallback } from 'react';
import { Card } from '@/components/ui';
import { fmtMin } from '@/domain/time';
import type { BranchId } from '@/domain/types';
import { selectAvgWaitByHour, selectBranch, useAppState, type AppState } from '@/store';
import { rowsEqual } from '../shared/equality';
import { ChartLegend } from './charts/ChartLegend';
import { ColumnChart, type ColumnDatum } from './charts/ColumnChart';
import { EMPTY_TEXT } from './copy';

/** One column per hour (minutes from arrival or slot to being called) plus the clay walk-in cap line. */
export function AvgWaitByHourPanel({ branchId }: { branchId: BranchId }) {
  const select = useCallback((s: AppState) => selectAvgWaitByHour(s, branchId), [branchId]);
  const buckets = useAppState(select, rowsEqual);
  const cap = useAppState(useCallback((s: AppState) => selectBranch(s, branchId)?.rules.walkInCapMin ?? null, [branchId]));

  const data: ColumnDatum[] = buckets.map((b) => ({
    key: String(b.hour),
    axis: b.axis,
    segments: [{ value: b.avgMin ?? 0, tone: 'appt' }],
    tooltip: b.avgMin === null ? `${b.label} — no calls` : `${b.label} — Average wait ${fmtMin(b.avgMin, 1)}`,
  }));
  const empty = buckets.every((b) => b.avgMin === null);
  const capLabel = cap === null ? null : `Walk-in cap ${cap} min`;
  const range = buckets.length > 0 ? `, ${buckets[0]?.axis} to ${buckets[buckets.length - 1]?.axis}` : '';

  return (
    <Card title="Average wait by hour">
      <ChartLegend
        items={[
          { label: 'Minutes from arrival (or slot) to being called', kind: 'appt' },
          ...(capLabel === null ? [] : [{ label: capLabel, kind: 'cap' as const }]),
        ]}
      />
      <ColumnChart
        ariaLabel={`Average wait by hour${range}${capLabel === null ? '' : `, ${capLabel}`}`}
        data={data}
        capLine={cap === null || capLabel === null ? undefined : { value: cap, label: capLabel }}
        empty={empty}
        emptyText={EMPTY_TEXT}
        table={{
          caption: 'Average wait by hour',
          headers: ['Hour', 'Average wait'],
          rows: buckets.map((b) => [b.label, b.avgMin === null ? 'no calls' : fmtMin(b.avgMin, 1)]),
        }}
      />
    </Card>
  );
}
