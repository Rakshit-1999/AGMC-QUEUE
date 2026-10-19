import type { MyDayRow } from '@/store';
import { Card, EmptyState, TicketNumber, TypeChip } from '@/components/ui';
import styles from './MyDay.module.css';

export interface MyDayProps {
  count: number;
  rows: MyDayRow[];
  footer: string;
}

/** Every appointment and walk-in of this advisor today, in time order, with the on-time footer. */
export function MyDay({ count, rows, footer }: MyDayProps) {
  return (
    <Card title="My day" subtitle={String(count)} className={styles.card}>
      {rows.length === 0 ? (
        <EmptyState text="Nothing booked for you today" />
      ) : (
        <ul className={styles.list} data-lenis-prevent>
          {rows.map((r) => (
            <li key={r.visitId} className={styles.row}>
              <span className={styles.time}>{r.time}</span>
              <div className={styles.text}>
                <div className={styles.main}>
                  {r.ticketNo && (
                    <>
                      <TicketNumber value={r.ticketNo} size="sm" />{' '}
                    </>
                  )}
                  {r.name}
                </div>
                <div className={styles.sub} title={r.sub}>
                  {r.sub}
                </div>
              </div>
              <TypeChip spec={r.chip} />
            </li>
          ))}
        </ul>
      )}
      <p className={styles.footer}>{footer}</p>
    </Card>
  );
}
