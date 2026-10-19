import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Branch } from '@/domain/types';
import { getState, selectBranchesTable, useAppState } from '@/store';
import { Banner, Button, Card, Reveal, Table, type TableColumn } from '@/components/ui';
import { ActiveChip, EDIT_COL_WIDTH, EditButton, SETTINGS_TABLE_MIN } from '../shared/controls';
import { useDialogTarget } from '../shared/useDialogTarget';
import { BranchDialog } from './BranchDialog';
import styles from '../shared/settings.module.css';

type BranchRow = ReturnType<typeof selectBranchesTable>[number];

/** Tab 1 — Branches & queue rules. `?new=1` opens "Add a branch" (ARCHITECTURE §6.1). */
export function BranchesTab() {
  const rows = useAppState(selectBranchesTable);
  const dialog = useDialogTarget<{ branch: Branch | null }>();
  const [params, setParams] = useSearchParams();
  const wantsNew = params.get('new') === '1';
  const { show } = dialog;

  useEffect(() => {
    if (!wantsNew) return;
    show({ branch: null });
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.delete('new');
        return next;
      },
      { replace: true },
    );
  }, [wantsNew, show, setParams]);

  const edit = (row: BranchRow) => {
    const branch = getState().branches[row.id];
    if (branch) show({ branch });
  };

  const columns: TableColumn<BranchRow>[] = [
    { key: 'code', header: 'Code', width: 64, render: (r) => r.code },
    { key: 'name', header: 'Name', minWidth: 160, render: (r) => r.name },
    { key: 'hours', header: 'Hours', width: 104, render: (r) => <span className="num">{r.hours}</span> },
    { key: 'grace', header: 'Grace', width: 64, numeric: true, render: (r) => r.grace },
    { key: 'cap', header: 'Walk-in cap', width: 92, numeric: true, render: (r) => r.cap },
    { key: 'ceiling', header: 'Ceiling', width: 72, numeric: true, render: (r) => r.ceiling },
    { key: 'early', header: 'Early', width: 64, numeric: true, render: (r) => r.early },
    { key: 'learning', header: 'Learning', width: 84, numeric: true, render: (r) => r.learning },
    { key: 'status', header: 'Status', width: 88, render: (r) => <ActiveChip active={r.active} /> },
    { key: 'edit', header: <span className="sr-only">Edit</span>, width: EDIT_COL_WIDTH, render: (r) => <EditButton name={r.name} onClick={() => edit(r)} /> },
  ];

  return (
    <div className={styles.stack}>
      <Banner className={styles.banner}>
        <strong>Queue rules are placeholders</strong> until management answers question 6 (maximum walk-in wait, grace for late
        customers). Each branch can have its own values.
      </Banner>
      <Reveal>
        <Card
          title="Branches"
          actions={
            <Button size="sm" onClick={() => show({ branch: null })}>
              + Add branch
            </Button>
          }
        >
          <Table
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            rowTone={(r) => (r.active ? undefined : 'faded')}
            dense
            minWidth={SETTINGS_TABLE_MIN}
            caption="Branches"
          />
        </Card>
      </Reveal>
      {dialog.target && <BranchDialog key={dialog.session} open={dialog.open} branch={dialog.target.branch} onClose={dialog.close} />}
    </div>
  );
}
