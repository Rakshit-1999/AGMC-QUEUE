import type { LineRow } from '@/store';
import { Card, CellStack, Table, TicketNumber, TypeChip, type TableColumn } from '@/components/ui';
import styles from './YourLine.module.css';

export interface YourLineProps {
  subtitle: string;
  rows: LineRow[];
}

const COLUMNS: TableColumn<LineRow>[] = [
  {
    key: 'ticket',
    header: 'Ticket',
    width: 110,
    render: (r) => (
      <div className={styles.ticketCell}>
        <TicketNumber value={r.ticketNo} size="sm" />
        <TypeChip spec={r.typeChip} />
      </div>
    ),
  },
  { key: 'customer', header: 'Customer', minWidth: 130, render: (r) => <CellStack primary={r.name} secondary={r.mobile} /> },
  { key: 'vehicle', header: 'Vehicle', minWidth: 150, render: (r) => <CellStack primary={r.vehicle} secondary={r.plateRef} /> },
  { key: 'service', header: 'Service', width: 110, render: (r) => <CellStack primary={r.service} secondary={r.brand} /> },
  { key: 'waiting', header: 'Waiting', width: 76, numeric: true, render: (r) => r.waiting },
  {
    key: 'call',
    header: 'You call them',
    width: 180,
    render: (r) => <CellStack primary={<span className="num">{r.youCall}</span>} secondary={r.told ?? undefined} />,
  },
];

/** Who is waiting for this advisor, in call order. Rendered only when someone waits. */
export function YourLine({ subtitle, rows }: YourLineProps) {
  return (
    <Card title="Your line" subtitle={subtitle} padding="none" className={styles.card}>
      <Table columns={COLUMNS} rows={rows} rowKey={(r) => r.visitId} minWidth={700} caption="Your line" />
    </Card>
  );
}
