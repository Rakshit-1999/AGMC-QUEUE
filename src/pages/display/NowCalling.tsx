import { LABEL } from '@/domain/messages';
import { TicketNumber } from '@/components/ui';
import type { TvCall } from '@/store';
import { TV_COPY, TV_LIMITS } from './copy';
import { useFlipList } from './hooks';
import styles from './DisplayPage.module.css';

export interface NowCallingProps {
  /** Newest first, already capped to TV_LIMITS.callingRows. */
  calls: readonly TvCall[];
  reduced: boolean;
}

// PLACEHOLDER (SPEC Page 7, not built): play a chime when a new ticket is called, and show Arabic text
// alongside English. Hook point: a new key at index 0 of `calls` with `fresh === true`.
export function NowCalling({ calls, reduced }: NowCallingProps) {
  const visible = calls.slice(0, TV_LIMITS.callingRows);
  const refFor = useFlipList(
    visible.map((c) => c.ticketNo),
    reduced,
  );

  return (
    <section aria-labelledby="tv-now-calling">
      <h2 id="tv-now-calling" className={styles.caps}>
        {TV_COPY.nowCalling}
      </h2>
      {visible.length === 0 ? (
        <p className={styles.emptyRow}>{LABEL.tvEmpty}</p>
      ) : (
        <ol className={styles.callList} aria-live="polite">
          {visible.map((c) => (
            <li
              key={c.ticketNo}
              ref={refFor(c.ticketNo)}
              className={c.fresh ? `${styles.callRow} ${styles.fresh}` : styles.callRow}
            >
              <TicketNumber value={c.ticketNo} size="tv" tone={c.fresh ? 'white' : 'ink'} className={styles.fade} />
              {c.desk ? <span className={styles.callDesk}>{TV_COPY.toDesk(c.desk)}</span> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
