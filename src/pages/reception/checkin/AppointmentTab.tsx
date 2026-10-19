import { useState } from 'react';
import { Button, EmptyState, PlaceholderTag, TextInput, TicketNumber, TypeChip, useToast } from '@/components/ui';
import { checkInAppointment, selectCheckInList, useLive, type CheckInRow } from '@/store';
import type { BranchId, VisitId } from '@/domain/types';
import { PickAdvisorDialog } from './PickAdvisorDialog';
import styles from './CheckIn.module.css';

interface Props {
  branchId: BranchId;
  onIssued(visitId: VisitId): void;
}

/** Appointment tab: search + today's Keyloop bookings, most relevant first. */
export function AppointmentTab({ branchId, onIssued }: Props) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState<VisitId | null>(null);
  const rows = useLive((s, now) => selectCheckInList(s, branchId, query, now), [branchId, query]);

  const checkIn = (row: CheckInRow) => {
    // No advisor yet: reception must pick one (or "Whoever is free first") first.
    if (!row.hasAdvisor) {
      setPicking(row.visitId);
      return;
    }
    const r = checkInAppointment(row.visitId);
    if (r.ok) onIssued(r.data.visitId);
    else toast.error(r.error);
  };

  return (
    <>
      <TextInput
        search
        value={query}
        onChange={setQuery}
        placeholder="Name, plate, mobile or Keyloop ref"
        aria-label="Search today's appointments"
      />
      <p className={styles.hint}>
        Today&apos;s bookings from Keyloop <PlaceholderTag kind="MOCK DATA" />
      </p>
      {rows.length === 0 ? (
        <EmptyState text="No appointment matches" compact />
      ) : (
        <ul className={styles.apptList} aria-label="Today's appointments">
          {rows.map((row) => (
            <AppointmentRow key={row.visitId} row={row} onCheckIn={() => checkIn(row)} onChange={() => setPicking(row.visitId)} />
          ))}
        </ul>
      )}
      <PickAdvisorDialog
        branchId={branchId}
        visitId={picking}
        onClose={() => setPicking(null)}
        onIssued={(id) => {
          setPicking(null);
          onIssued(id);
        }}
      />
    </>
  );
}

function AppointmentRow({ row, onCheckIn, onChange }: { row: CheckInRow; onCheckIn(): void; onChange(): void }) {
  return (
    <li className={row.checkedIn ? `${styles.apptRow} ${styles.faded}` : styles.apptRow}>
      <span className={`${styles.slot} num`}>{row.slot}</span>
      <div className={styles.apptMain}>
        <div className={styles.apptName}>{row.name}</div>
        <div className={styles.apptLine2}>{row.plateVehicle}</div>
        <div className={styles.apptLine3}>{row.serviceAdvisor}</div>
        {!row.checkedIn && <TypeChip spec={row.chip} className={styles.apptChip} />}
      </div>
      <div className={styles.apptActions}>
        {row.checkedIn ? (
          <>
            {row.ticketNo && <TicketNumber value={row.ticketNo} size="sm" />}
            {row.statusChip && <TypeChip spec={row.statusChip} />}
          </>
        ) : (
          <>
            <Button size="sm" onClick={onCheckIn} aria-label={`Check in ${row.name}`}>
              Check in
            </Button>
            <Button variant="link" className={styles.changeLink} onClick={onChange} aria-label={`Change advisor for ${row.name}`}>
              change advisor
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
