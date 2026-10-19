import { Mono } from '@/components/ui';
import type { TvDesk } from '@/store';
import { TV_COPY, TV_LIMITS } from './copy';
import styles from './DisplayPage.module.css';

/** Everyone currently being served, 4 columns × at most 3 rows; extras are hidden (DESIGN §2.7). */
export function AtDesks({ desks }: { desks: readonly TvDesk[] }) {
  // SPEC gives no empty copy for this grid, so the whole section is omitted when nobody is at a desk.
  if (desks.length === 0) return null;
  return (
    <section aria-labelledby="tv-at-desks" className={styles.atDesks}>
      <h2 id="tv-at-desks" className={styles.caps}>
        {TV_COPY.atTheDesks}
      </h2>
      <ul className={styles.deskGrid}>
        {desks.slice(0, TV_LIMITS.deskTiles).map((d) => (
          <li key={d.ticketNo} className={styles.deskTile}>
            <Mono bold className={styles.deskTicket}>
              {d.ticketNo}
            </Mono>
            <span className={styles.deskName}>{d.desk}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
