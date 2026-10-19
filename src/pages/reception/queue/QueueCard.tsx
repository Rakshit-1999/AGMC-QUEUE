import { useState } from 'react';
import { Card, CellStack, EmptyState, RowMenu, Table, TicketNumber, TypeChip, type TableColumn } from '@/components/ui';
import { selectQueueRows, useLive, type QueueRowView } from '@/store';
import type { BranchId } from '@/domain/types';
import { QueueDialogs, type QueueAction } from './QueueDialogs';
import styles from './Queue.module.css';

/** Queue: one row per waiting customer, in the order they will be called. */
export function QueueCard({ branchId }: { branchId: BranchId }) {
  const queue = useLive((s, now) => selectQueueRows(s, branchId, now), [branchId]);
  const [action, setAction] = useState<QueueAction | null>(null);

  const columns: TableColumn<QueueRowView>[] = [
    { key: 'pos', header: '#', width: 28, numeric: true, render: (r) => r.position },
    { key: 'ticket', header: 'Ticket', width: 72, render: (r) => <TicketNumber value={r.ticketNo} size="sm" /> },
    { key: 'customer', header: 'Customer', minWidth: 140, render: (r) => <CellStack primary={r.name} secondary={r.plate} /> },
    {
      key: 'type',
      header: 'Type',
      width: 150,
      render: (r) => (
        <div>
          <TypeChip spec={r.typeChip} />
          {r.movedUp && <div className={styles.movedUp}>{r.movedUp}</div>}
          {r.assignedTo && <div className={styles.assigned}>{r.assignedTo}</div>}
        </div>
      ),
    },
    { key: 'service', header: 'Service', width: 110, render: (r) => <CellStack primary={r.service} secondary={r.brand} /> },
    { key: 'arrived', header: 'Arrived', width: 64, render: (r) => <span className="num">{r.arrived}</span> },
    {
      key: 'waiting',
      header: 'Waiting',
      width: 130,
      render: (r) => (
        <div>
          <div className={`${styles.wait} ${styles[`wait_${r.waiting.tone}`]} num`}>{r.waiting.text}</div>
          {r.waiting.sub && (
            <div className={r.waiting.subTone === 'clayBold' ? styles.subClayBold : styles.subGrey}>{r.waiting.sub}</div>
          )}
        </div>
      ),
    },
    {
      key: 'advisor',
      header: 'Advisor',
      minWidth: 150,
      render: (r) => (
        <div>
          <div className={styles.advisorName}>{r.advisor.name}</div>
          <div className={styles[`adv_${r.advisor.subTone}`]}>{r.advisor.sub}</div>
        </div>
      ),
    },
    {
      key: 'menu',
      header: <span className="sr-only">Actions</span>,
      width: 40,
      align: 'right',
      render: (r) => (
        <RowMenu
          ariaLabel={`Actions for ${r.ticketNo}`}
          items={[
            { label: 'Change advisor…', onSelect: () => setAction({ kind: 'change', row: r }) },
            ...(r.canMoveToFront ? [{ label: 'Move to front…', onSelect: () => setAction({ kind: 'front', row: r }) }] : []),
            { label: 'Mark no-show', onSelect: () => setAction({ kind: 'noShow', row: r }) },
            { label: 'Cancel ticket…', destructive: true, onSelect: () => setAction({ kind: 'cancel', row: r }) },
          ]}
        />
      ),
    },
  ];

  return (
    <Card title="Queue" subtitle={<span aria-live="polite">{queue.subtitle}</span>} padding="none" className={styles.card}>
      <Table
        columns={columns}
        rows={queue.rows}
        rowKey={(r) => r.visitId}
        rowTone={(r) => (r.pastTold ? 'clay' : r.highlighted ? 'highlight' : undefined)}
        minWidth={900}
        caption="Queue, in the order customers will be called"
        empty={<EmptyState text="Nobody waiting" compact />}
      />
      <QueueDialogs branchId={branchId} action={action} onClose={() => setAction(null)} />
    </Card>
  );
}
