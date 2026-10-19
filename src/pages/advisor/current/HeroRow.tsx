import type { VisitCardInfo } from '@/store';
import { TicketNumber, TypeChip } from '@/components/ui';
import styles from './CurrentCustomerCard.module.css';

export interface HeroRowProps {
  visit: VisitCardInfo;
}

/** Ticket number (44 px mono) · customer name (22/700) · type chip, baseline-aligned; the chip wraps when tight. */
export function HeroRow({ visit }: HeroRowProps) {
  return (
    <div className={styles.hero}>
      <TicketNumber value={visit.ticketNo} size="xl" />
      <span className={styles.name}>{visit.name}</span>
      <TypeChip spec={visit.typeChip} className={styles.chip} />
    </div>
  );
}
