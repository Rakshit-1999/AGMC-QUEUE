import { useCallback } from 'react';
import { Card, Table, type TableColumn } from '@/components/ui';
import { fmtMinTight, fmtPct } from '@/domain/time';
import type { BranchId } from '@/domain/types';
import { selectAdvisorsToday, useAppState, type AppState } from '@/store';
import { rowsEqual } from '../shared/equality';
import styles from './BranchDashboardPage.module.css';

type Row = ReturnType<typeof selectAdvisorsToday>[number];

const COLUMNS: TableColumn<Row>[] = [
  { key: 'name', header: 'Advisor', render: (r) => r.name },
  { key: 'served', header: 'Served', numeric: true, width: 64, render: (r) => r.served },
  { key: 'appts', header: 'Appts', numeric: true, width: 60, render: (r) => r.appts },
  { key: 'walkIns', header: 'Walk-ins', numeric: true, width: 72, render: (r) => r.walkIns },
  { key: 'avg', header: 'Avg time', numeric: true, width: 72, render: (r) => fmtMinTight(r.avgMin) },
  {
    key: 'over',
    header: 'Over expected',
    numeric: true,
    width: 104,
    render: (r) =>
      r.overAlert ? (
        <span className={styles.clayText}>
          {fmtPct(r.overPct)}
          <span className="sr-only"> needs attention</span>
        </span>
      ) : (
        fmtPct(r.overPct)
      ),
  },
];

/** Advisors today: clay "Over expected" above 50%. */
export function AdvisorsTodayTable({ branchId }: { branchId: BranchId }) {
  const select = useCallback((s: AppState) => selectAdvisorsToday(s, branchId), [branchId]);
  const rows = useAppState(select, rowsEqual);

  return (
    <Card title="Advisors today">
      <Table columns={COLUMNS} rows={rows} rowKey={(r) => r.advisorId} dense caption="Advisors today" />
    </Card>
  );
}
