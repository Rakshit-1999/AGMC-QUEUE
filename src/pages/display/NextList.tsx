import { LABEL } from '@/domain/messages';
import { Mono } from '@/components/ui';
import { TV_COPY } from './copy';
import styles from './DisplayPage.module.css';

export interface NextListProps {
  /** Up to ten ticket numbers in the order they will be called. */
  next: readonly string[];
  waitingCount: number;
}

export function NextList({ next, waitingCount }: NextListProps) {
  return (
    <section aria-labelledby="tv-next">
      <h2 id="tv-next" className={styles.caps}>
        {TV_COPY.next}
      </h2>
      {next.length > 0 ? (
        <ol className={styles.nextGrid}>
          {next.map((t) => (
            <li key={t} className={styles.nextTile}>
              <Mono bold className={styles.nextTicket}>
                {t}
              </Mono>
            </li>
          ))}
        </ol>
      ) : null}
      <p className={`num ${styles.waiting}`}>{TV_COPY.waiting(waitingCount)}</p>
      <p className={styles.explain}>{LABEL.tvExplain}</p>
    </section>
  );
}
