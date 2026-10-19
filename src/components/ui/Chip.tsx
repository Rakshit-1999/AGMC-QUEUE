import type { ReactNode } from 'react';
import { cx } from './internal/cx';
import styles from './Chip.module.css';

/** Same union as `Tone` in store/selectors/common.ts (ARCHITECTURE §3.8). */
export type ChipTone = 'grey' | 'green' | 'darkGreen' | 'amber' | 'clay' | 'blue' | 'outline';

export interface ChipProps {
  tone: ChipTone;
  /** Leading 6 px dot in currentColor (advisor states). */
  dot?: boolean;
  /** md = 22 px status pill (default) · sm = 18 px (Soonest chip). */
  size?: 'sm' | 'md';
  /** Gentle opacity pulse (Calling). Disabled under reduced motion. */
  pulse?: boolean;
  title?: string;
  className?: string;
  children: ReactNode;
}

export function Chip({ tone, dot = false, size = 'md', pulse = false, title, className, children }: ChipProps) {
  return (
    <span className={cx(styles.chip, styles[tone], styles[size], pulse && styles.pulse, className)} title={title}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}
