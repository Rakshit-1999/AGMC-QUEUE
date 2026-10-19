import type { ServiceType } from '@/domain/types';
import { getState, selectServiceTypesTable, useAppState } from '@/store';
import { Banner, Button, Card, Chip, Reveal, Table, type TableColumn } from '@/components/ui';
import { EDIT_COL_WIDTH, EditButton, SETTINGS_TABLE_MIN } from '../shared/controls';
import { useDialogTarget } from '../shared/useDialogTarget';
import { BrandsCard } from './BrandsCard';
import { ServiceTypeDialog } from './ServiceTypeDialog';
import styles from '../shared/settings.module.css';

type ServiceRow = ReturnType<typeof selectServiceTypesTable>[number];

/** Tab 3 — Service types & brands. */
export function ServicesTab() {
  const rows = useAppState(selectServiceTypesTable);
  const dialog = useDialogTarget<{ service: ServiceType | null }>();

  const edit = (row: ServiceRow) => {
    const service = getState().services[row.code];
    if (service) dialog.show({ service });
  };

  const columns: TableColumn<ServiceRow>[] = [
    { key: 'code', header: 'Code', width: 72, render: (r) => r.code },
    { key: 'name', header: 'Name', minWidth: 160, render: (r) => r.name },
    { key: 'minutes', header: 'Expected minutes', width: 136, numeric: true, render: (r) => r.expectedMin },
    {
      key: 'lane',
      header: 'Lane',
      width: 96,
      render: (r) => (r.express ? <Chip tone="amber">Express</Chip> : <Chip tone="grey">Regular</Chip>),
    },
    { key: 'letter', header: 'Ticket letter', width: 104, render: (r) => r.letter },
    { key: 'status', header: 'Status', width: 80, render: (r) => <Chip tone={r.active ? 'green' : 'grey'}>{r.active ? 'Active' : 'Off'}</Chip> },
    { key: 'edit', header: <span className="sr-only">Edit</span>, width: EDIT_COL_WIDTH, render: (r) => <EditButton name={r.name} onClick={() => edit(r)} /> },
  ];

  return (
    <div className={styles.stack}>
      <Banner className={styles.banner}>
        <strong>Placeholder service types</strong> copied from the current RSI system (Service, Standard, Collection). What they mean
        and how long each takes is question 5 for management.
      </Banner>
      <Reveal>
        <Card
          title="Service types"
          actions={
            <Button size="sm" onClick={() => dialog.show({ service: null })}>
              + Add
            </Button>
          }
        >
          <Table
            columns={columns}
            rows={rows}
            rowKey={(r) => r.code}
            rowTone={(r) => (r.active ? undefined : 'faded')}
            dense
            minWidth={SETTINGS_TABLE_MIN}
            caption="Service types"
          />
        </Card>
      </Reveal>
      <Reveal delay={0.04}>
        <BrandsCard />
      </Reveal>
      {dialog.target && <ServiceTypeDialog key={dialog.session} open={dialog.open} service={dialog.target.service} onClose={dialog.close} />}
    </div>
  );
}
