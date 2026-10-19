import type { EpochMs } from '@/domain/types';
import { fmtTimer } from '@/domain/time';
import { useNow } from '@/store';
import { cx } from './internal/cx';
import styles from './Timer.module.css';

export interface TimerProps {
  /** Start instant (sim time). */
  since: EpochMs;
  /** When set, renders "13:00 / 25:00 expected". */
  expectedMin?: number;
  /** sm = inline 13/600 · lg = 22/700 · xl = 36/700 mono (advisor serving timer). */
  size?: 'sm' | 'lg' | 'xl';
  /** Turn the elapsed time clay once it passes expectedMin. */
  alertWhenOver?: boolean;
  className?: string;
}

/**
 * Live count-up timer, m:ss (h:mm:ss past an hour), ticking with the shared 1-second clock.
 * The ticking text is aria-hidden; the accessible label only changes once a minute.
 */
export function Timer({ since, expectedMin, size = 'sm', alertWhenOver = false, className }: TimerProps) {
  const now = useNow();
  const elapsedMs = Math.max(0, now - since);
  const hasExpected = expectedMin !== undefined && expectedMin > 0;
  const over = hasExpected && elapsedMs > expectedMin * 60_000;
  const elapsedMin = Math.floor(elapsedMs / 60_000);
  const label = hasExpected
    ? `${elapsedMin} of ${expectedMin} minutes expected`
    : `${elapsedMin} ${elapsedMin === 1 ? 'minute' : 'minutes'}`;

  return (
    <span role="timer" aria-label={label} className={cx(styles.timer, styles[size], className)}>
      <span aria-hidden="true" className={cx(styles.elapsed, size === 'xl' && 'mono', alertWhenOver && over && styles.over)}>
        {fmtTimer(elapsedMs)}
      </span>
      {hasExpected && (
        <span aria-hidden="true" className={styles.expected}>
          {' / '}
          {fmtTimer(expectedMin * 60_000)} expected
        </span>
      )}
    </span>
  );
}
