import type { AdvisorDeskCard } from '@/store';
import { StatusLine } from './StatusLine';
import styles from './CurrentCustomerCard.module.css';

export interface ReadyEmptyStateProps {
  card: Extract<AdvisorDeskCard, { kind: 'readyEmpty' }>;
}

/** State D — ready, nobody waiting. */
export function ReadyEmptyState({ card }: ReadyEmptyStateProps) {
  return (
    <>
      <StatusLine text="READY" tone="green" />
      <p className={styles.big}>Nobody is waiting for you.</p>
      <p className={styles.bigLine}>
        {card.nextAppt
          ? `Your next appointment is at ${card.nextAppt.time} (${card.nextAppt.name}). Walk-ins that fit before it will come to you automatically.`
          : 'No more appointments booked for you today.'}
      </p>
    </>
  );
}
