import { OK } from '@/domain/messages';
import { fmtTimer } from '@/domain/time';
import { advisorNoShow, callAgain, notHere, startService, type AdvisorDeskCard } from '@/store';
import { Button, useToast } from '@/components/ui';
import { CustomerDetailsGrid } from './CustomerDetailsGrid';
import { HeroRow } from './HeroRow';
import { StatusLine } from './StatusLine';
import styles from './CurrentCustomerCard.module.css';

export interface CallingStateProps {
  card: Extract<AdvisorDeskCard, { kind: 'calling' }>;
  desk: string;
}

/** State A — the customer is walking to the desk. */
export function CallingState({ card, desk }: CallingStateProps) {
  const toast = useToast();
  const times = card.callCount === 1 ? 'time' : 'times';

  return (
    <>
      <StatusLine text={`CALLING TO ${desk.toUpperCase()}`} tone="amber" pulse />
      <HeroRow visit={card.visit} />
      <p className={styles.line}>
        <span className={styles.num}>
          Called {fmtTimer(card.calledAgoMs)} ago · called {card.callCount} {times}.
        </span>{' '}
        {card.tvLine}
      </p>
      <hr className={styles.rule} />
      <CustomerDetailsGrid details={card.visit.details} />
      <div className={styles.actions}>
        <Button variant="primary" size="lg" onClick={() => toast.fromResult(startService(), OK.started)}>
          Customer is here — start
        </Button>
        <Button variant="secondary" size="lg" onClick={() => toast.fromResult(callAgain(), OK.calledAgain)}>
          Call again
        </Button>
        <Button variant="secondary" onClick={() => toast.fromResult(notHere(), OK.backInQueue)}>
          Not here — back to queue
        </Button>
        <Button variant="danger" onClick={() => toast.fromResult(advisorNoShow(), OK.markedNoShow)}>
          No-show
        </Button>
      </div>
    </>
  );
}
