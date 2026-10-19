import { LABEL, OK } from '@/domain/messages';
import { setAvailable, type AdvisorDeskCard } from '@/store';
import { Button, useToast } from '@/components/ui';
import { StatusLine } from './StatusLine';
import styles from './CurrentCustomerCard.module.css';

export interface AwayStateProps {
  card: Extract<AdvisorDeskCard, { kind: 'away' }>;
  onBreak: boolean;
}

/** State E — on break (amber) or offline (grey). */
export function AwayState({ card, onBreak }: AwayStateProps) {
  const toast = useToast();
  return (
    <>
      <StatusLine text={card.label} tone={onBreak ? 'amber' : 'grey'} />
      <p className={styles.big}>{card.headline}</p>
      <p className={styles.bigLine}>{LABEL.awayLine}</p>
      <div className={styles.actions}>
        <Button variant="primary" size="lg" onClick={() => toast.fromResult(setAvailable(), OK.available)}>
          {"I'm back — available"}
        </Button>
      </div>
    </>
  );
}
