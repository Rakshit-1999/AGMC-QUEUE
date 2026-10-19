import type { AdvisorLiveState } from '@/domain/types';
import type { AdvisorDeskCard } from '@/store';
import { Card } from '@/components/ui';
import { AwayState } from './AwayState';
import { CallingState } from './CallingState';
import { ReadyEmptyState } from './ReadyEmptyState';
import { ReadyNextState } from './ReadyNextState';
import { ServingState } from './ServingState';
import styles from './CurrentCustomerCard.module.css';

export interface CurrentCustomerCardProps {
  card: AdvisorDeskCard;
  /** "Desk 1" — for the CALLING TO DESK 1 line. */
  desk: string;
  /** Tells break (amber line) from offline (grey line) in state E. */
  liveState: AdvisorLiveState;
}

/** The big card: one of five states (A Calling · B Serving · C Ready, next · D Ready, nobody · E Away). */
export function CurrentCustomerCard({ card, desk, liveState }: CurrentCustomerCardProps) {
  return (
    <Card className={styles.card} aria-label="Current customer">
      {/* Persistent polite live region: announces state changes only, never ticking timers (DESIGN §4.2). */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement(card, desk)}
      </p>
      {renderState(card, desk, liveState)}
    </Card>
  );
}

function renderState(card: AdvisorDeskCard, desk: string, liveState: AdvisorLiveState) {
  switch (card.kind) {
    case 'calling':
      return <CallingState card={card} desk={desk} />;
    case 'serving':
      // Keyed per visit so the note field and Transfer dialog reset for each customer.
      return <ServingState key={card.visit.visitId} card={card} />;
    case 'readyNext':
      return <ReadyNextState card={card} />;
    case 'readyEmpty':
      return <ReadyEmptyState card={card} />;
    case 'away':
      return <AwayState card={card} onBreak={liveState === 'break'} />;
  }
}

function announcement(card: AdvisorDeskCard, desk: string): string {
  switch (card.kind) {
    case 'calling':
      return `Calling ${card.visit.ticketNo} to ${desk}`;
    case 'serving':
      return `With you: ${card.visit.ticketNo}`;
    case 'readyNext':
      return `Ready. Next for you: ${card.next.ticketNo}`;
    case 'readyEmpty':
      return 'Ready. Nobody is waiting for you.';
    case 'away':
      return card.headline;
  }
}
