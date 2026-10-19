import { useState } from 'react';
import { OK } from '@/domain/messages';
import { complete, useNow, type AdvisorDeskCard } from '@/store';
import { Button, Field, ProgressBar, Textarea, Timer, useToast } from '@/components/ui';
import { CustomerDetailsGrid } from './CustomerDetailsGrid';
import { HeroRow } from './HeroRow';
import { StatusLine } from './StatusLine';
import { TransferDialog } from './TransferDialog';
import styles from './CurrentCustomerCard.module.css';

export interface ServingStateProps {
  card: Extract<AdvisorDeskCard, { kind: 'serving' }>;
}

const MIN = 60_000;

/** State B — the customer is at the desk. Mounted per visit (keyed), so the note starts empty for each customer. */
export function ServingState({ card }: ServingStateProps) {
  const toast = useToast();
  const now = useNow();
  const [note, setNote] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);

  const elapsedMs = Math.max(0, now - card.startedAt);
  const expectedMs = card.expectedMin * MIN;
  const ratio = expectedMs > 0 ? elapsedMs / expectedMs : 0;
  const over = expectedMs > 0 && elapsedMs > expectedMs;
  const elapsedMin = Math.floor(elapsedMs / MIN);

  const onComplete = () => {
    const trimmed = note.trim();
    toast.fromResult(complete(trimmed === '' ? undefined : trimmed), OK.done);
  };

  return (
    <>
      <StatusLine text={`WITH YOU SINCE ${card.since}`} tone="green" />
      <HeroRow visit={card.visit} />
      <div className={styles.timerRow}>
        <Timer since={card.startedAt} expectedMin={card.expectedMin} size="xl" alertWhenOver />
        <ProgressBar
          className={styles.progress}
          value={ratio}
          alert={over}
          height={6}
          label="Desk time"
          valueText={`${elapsedMin} of ${card.expectedMin} minutes`}
        />
      </div>
      <hr className={styles.rule} />
      <CustomerDetailsGrid details={card.visit.details} />
      {card.notes.length > 0 && (
        <div className={styles.notes}>
          {card.notes.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
        </div>
      )}
      <Field label="Note for this visit (optional)" className={styles.noteField}>
        <Textarea
          value={note}
          onChange={setNote}
          rows={2}
          placeholder="e.g. job card opened in Keyloop, courtesy car booked"
        />
      </Field>
      <div className={styles.actions}>
        <Button variant="primary" size="lg" onClick={onComplete}>
          Complete
        </Button>
        <Button variant="secondary" size="lg" onClick={() => setTransferOpen(true)}>
          Transfer…
        </Button>
      </div>
      <TransferDialog open={transferOpen} ticketNo={card.visit.ticketNo} onClose={() => setTransferOpen(false)} />
    </>
  );
}
