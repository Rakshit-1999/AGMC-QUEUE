import { useCallback, useState } from 'react';
import { selectAuditLog, useAppState } from '@/store';
import { Card, Mono, Reveal, Table, type TableColumn } from '@/components/ui';
import { BranchFilter, SETTINGS_TABLE_MIN, type BranchFilterValue } from '../shared/controls';
import styles from '../shared/settings.module.css';

type AuditRow = ReturnType<typeof selectAuditLog>[number];

const AUDIT_LIMIT = 400;

const COLUMNS: TableColumn<AuditRow>[] = [
  { key: 'time', header: 'Time', width: 112, render: (r) => <span className={`num ${styles.nowrap}`}>{r.time}</span> },
  { key: 'branch', header: 'Branch', width: 72, render: (r) => r.branch },
  { key: 'who', header: 'Who', width: 132, render: (r) => <Mono className={styles.whoCell}>{r.who}</Mono> },
  { key: 'what', header: 'What', width: 120, render: (r) => <span className={styles.nowrap}>{r.what}</span> },
  { key: 'detail', header: 'Detail', minWidth: 240, render: (r) => r.detail },
];

/** Tab 6 — Audit log: newest first, latest 400, optional branch filter. */
export function AuditTab() {
  const [filter, setFilter] = useState<BranchFilterValue>('all');
  const rows = useAppState(useCallback((s) => selectAuditLog(s, filter, AUDIT_LIMIT), [filter]));

  return (
    <div className={styles.stack}>
      <Reveal>
        <Card title="Audit log" subtitle={`latest ${AUDIT_LIMIT}`} actions={<BranchFilter value={filter} onChange={setFilter} />}>
          <Table
            columns={COLUMNS}
            rows={rows}
            rowKey={(r) => r.id}
            dense
            stickyHeader
            minWidth={SETTINGS_TABLE_MIN}
            className={styles.tallScroll}
            caption="Audit log"
          />
        </Card>
      </Reveal>
    </div>
  );
}
