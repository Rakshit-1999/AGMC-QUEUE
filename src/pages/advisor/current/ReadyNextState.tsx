import { OK } from '@/domain/messages';
import { callNext, type AdvisorDeskCard } from '@/store';
import { Button, useToast } from '@/components/ui';
import { HeroRow } from './HeroRow';
import { StatusLine } from './StatusLine';
import styles from './CurrentCustomerCard.module.css';

export interface ReadyNextStateProps {
  card: Extract<AdvisorDeskCard, { kind: 'readyNext' }>;
}

/** State C — ready, and someone is next for this advisor. */
export function ReadyNextState({ card }: ReadyNextStateProps) {
  const toast = useToast();

  const onCall = () => {
    const r = callNext();
    // The engine may pick someone else than shown if the queue moved this second; name who was really called.
    if (r.ok) toast.success(OK.calling(r.data.ticketNo));
    else toast.error(r.error);
  };

  return (
    <>
      <StatusLine text="READY" tone="green" />
      <p className={styles.kicker}>Next for you</p>
      <HeroRow visit={card.next} />
      <p className={styles.line}>{card.whyLine}</p>
      <div className={styles.actions}>
        <Button variant="primary" size="lg" onClick={onCall}>
          Call {card.next.ticketNo}
        </Button>
      </div>
    </>
  );
}
