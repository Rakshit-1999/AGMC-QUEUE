import { useState } from 'react';
import { Card, Segmented } from '@/components/ui';
import type { BranchId, VisitId } from '@/domain/types';
import { AppointmentTab } from './AppointmentTab';
import { WalkInTab } from './WalkInTab';
import { TicketIssued } from './TicketIssued';
import styles from './CheckIn.module.css';

type Tab = 'appointment' | 'walkin';

const TABS: { value: Tab; label: string }[] = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'walkin', label: 'Walk-in' },
];

/** Sticky 390 px Check in card: Appointment | Walk-in, replaced by Ticket issued after a check-in. */
export function CheckInPanel({ branchId }: { branchId: BranchId }) {
  const [tab, setTab] = useState<Tab>('appointment');
  const [issued, setIssued] = useState<VisitId | null>(null);

  return (
    <Card sticky title="Check in" className={styles.panel}>
      {issued ? (
        <div className={styles.body} data-lenis-prevent>
          <TicketIssued visitId={issued} onNext={() => setIssued(null)} />
        </div>
      ) : (
        <>
          <Segmented<Tab> options={TABS} value={tab} onChange={setTab} fullWidth ariaLabel="Check in type" className={styles.switch} />
          {/* Both tabs stay mounted so switching keeps the search and the half-filled walk-in form. */}
          <div className={styles.body} data-lenis-prevent hidden={tab !== 'appointment'}>
            <AppointmentTab branchId={branchId} onIssued={setIssued} />
          </div>
          <div className={styles.body} data-lenis-prevent hidden={tab !== 'walkin'}>
            <WalkInTab branchId={branchId} onIssued={setIssued} />
          </div>
        </>
      )}
    </Card>
  );
}
