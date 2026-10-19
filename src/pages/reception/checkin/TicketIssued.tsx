import { Button, EmptyState, PlaceholderTag, TicketNumber } from '@/components/ui';
import { selectIssuedTicket, useLive } from '@/store';
import { LABEL } from '@/domain/messages';
import type { VisitId } from '@/domain/types';
import styles from './CheckIn.module.css';

interface Props {
  visitId: VisitId;
  onNext(): void;
}

/** Ticket issued: replaces the switch and tab body after a check-in or a walk-in. */
export function TicketIssued({ visitId, onNext }: Props) {
  const t = useLive((s, now) => selectIssuedTicket(s, visitId, now), [visitId]);

  return (
    <div className={styles.issued}>
      {t ? (
        <div className={styles.issuedTicket} data-print-ticket>
          <div className={styles.issuedLabel}>Ticket issued</div>
          <TicketNumber value={t.ticketNo} size="xl" className={styles.issuedNo} />
          <div className={styles.issuedName}>{t.name}</div>
          <div className={styles.issuedService}>{t.serviceBrand}</div>
          <p className={styles.tellThem}>
            Tell them: <strong>{t.seenBy ? `${t.seenBy} will see you` : `${lowerFirst(LABEL.firstFreeAdvisor)} will see you`}</strong>{' '}
            in <strong>about {t.aboutMin} min</strong> — called by <strong className="num">{t.calledBy}</strong>
          </p>
          {t.lateNotice && <p className={styles.lateNotice}>{LABEL.lateNotice}</p>}
        </div>
      ) : (
        <EmptyState text="—" compact />
      )}
      <div className={styles.issuedButtons} data-print-hide>
        <Button variant="secondary" onClick={() => window.print()} disabled={!t}>
          Print ticket
        </Button>
        <Button variant="secondary" disabled>
          Send SMS <PlaceholderTag />
        </Button>
      </div>
      <Button size="lg" fullWidth onClick={onNext} className={styles.nextCustomer} data-print-hide autoFocus>
        Next customer
      </Button>
    </div>
  );
}

/** "The first free advisor" -> "the first free advisor" (mid-sentence). */
function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
