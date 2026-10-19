import { useCallback, useState } from 'react';
import type { Advisor, BranchId } from '@/domain/types';
import { LABEL } from '@/domain/messages';
import { getState, selectAdvisorsTable, useAppState } from '@/store';
import { Button, Card, Mono, Reveal, Table, type TableColumn } from '@/components/ui';
import { BranchFilter, EDIT_COL_WIDTH, EditButton, SETTINGS_TABLE_MIN, type BranchFilterValue } from '../shared/controls';
import { useDialogTarget } from '../shared/useDialogTarget';
import { AdvisorDialog } from './AdvisorDialog';
import styles from '../shared/settings.module.css';

type AdvisorRow = ReturnType<typeof selectAdvisorsTable>[number];

interface AdvisorTarget {
  advisor: Advisor | null;
  defaultBranch: BranchId | null;
}

/** Tab 2 — Advisors. Inactive advisors are faded. */
export function AdvisorsTab() {
  const [filter, setFilter] = useState<BranchFilterValue>('all');
  const rows = useAppState(useCallback((s) => selectAdvisorsTable(s, filter), [filter]));
  const dialog = useDialogTarget<AdvisorTarget>();

  const add = () => {
    const s = getState();
    const defaultBranch = filter !== 'all' ? filter : s.branchOrder[0] ?? null;
    dialog.show({ advisor: null, defaultBranch });
  };
  const edit = (row: AdvisorRow) => {
    const advisor = getState().advisors[row.id];
    if (advisor) dialog.show({ advisor, defaultBranch: advisor.branchId });
  };

  const columns: TableColumn<AdvisorRow>[] = [
    { key: 'name', header: 'Name', minWidth: 140, render: (r) => r.name },
    { key: 'branch', header: 'Branch', minWidth: 140, render: (r) => r.branch },
    { key: 'desk', header: 'Desk', width: 72, render: (r) => <span className={styles.nowrap}>{r.desk}</span> },
    { key: 'takes', header: 'Takes', width: 136, render: (r) => r.takes },
    { key: 'brands', header: 'Brands', width: 96, render: (r) => r.brands },
    { key: 'services', header: 'Services', width: 108, render: (r) => r.services },
    {
      key: 'login',
      header: 'Login',
      width: 120,
      render: (r) => (r.login === LABEL.none ? <span className={styles.muted}>{LABEL.none}</span> : <Mono>{r.login}</Mono>),
    },
    { key: 'edit', header: <span className="sr-only">Edit</span>, width: EDIT_COL_WIDTH, render: (r) => <EditButton name={r.name} onClick={() => edit(r)} /> },
  ];

  return (
    <div className={styles.stack}>
      <Reveal>
        <Card
          title="Service advisors"
          actions={
            <>
              <BranchFilter value={filter} onChange={setFilter} />
              <Button size="sm" onClick={add}>
                + Add advisor
              </Button>
            </>
          }
        >
          <Table
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            rowTone={(r) => (r.active ? undefined : 'faded')}
            dense
            minWidth={SETTINGS_TABLE_MIN}
            caption="Service advisors"
          />
        </Card>
      </Reveal>
      {dialog.target && (
        <AdvisorDialog
          key={dialog.session}
          open={dialog.open}
          advisor={dialog.target.advisor}
          defaultBranch={dialog.target.defaultBranch}
          onClose={dialog.close}
        />
      )}
    </div>
  );
}
