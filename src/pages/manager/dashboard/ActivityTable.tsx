import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, Mono, Table, type TableColumn } from '@/components/ui';
import { LABEL } from '@/domain/messages';
import type { BranchId } from '@/domain/types';
import { selectActivity, useAppState, type AppState } from '@/store';
import { rowsEqual } from '../shared/equality';
import styles from './BranchDashboardPage.module.css';

type Row = ReturnType<typeof selectActivity>[number];

const AUDIT_LOG = '/manager/settings/audit';
const LIMIT = 40;

/** "simulator" and "system" are not usernames, so they are not set in mono. */
function isActor(who: string): boolean {
  return who === LABEL.simulator || who === LABEL.system;
}

const COLUMNS: TableColumn<Row>[] = [
  { key: 'time', header: 'Time', numeric: true, width: 64, render: (r) => r.time },
  {
    key: 'who',
    header: 'Who',
    width: 150,
    render: (r) => (isActor(r.who) ? r.who : <Mono className={styles.who}>{r.who}</Mono>),
  },
  { key: 'what', header: 'What', width: 120, render: (r) => r.what },
  { key: 'detail', header: 'Detail', render: (r) => r.detail },
];

/** Activity: the latest 40 audit entries of this branch. */
export function ActivityTable({ branchId }: { branchId: BranchId }) {
  const select = useCallback((s: AppState) => selectActivity(s, branchId, LIMIT), [branchId]);
  const rows = useAppState(select, rowsEqual);

  return (
    <Card
      title="Activity"
      subtitle={
        <>
          latest 40 · full log in{' '}
          <Link to={AUDIT_LOG} className={styles.inlineLink}>
            Settings › Audit log
          </Link>
        </>
      }
    >
      <Table columns={COLUMNS} rows={rows} rowKey={(r) => r.id} dense minWidth={640} caption="Activity" />
    </Card>
  );
}
