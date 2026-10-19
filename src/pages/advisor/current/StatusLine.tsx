import { cx } from '../cx';
import styles from './CurrentCustomerCard.module.css';

export interface StatusLineProps {
  text: string;
  tone: 'green' | 'amber' | 'grey';
  /** Gentle opacity pulse (CALLING). */
  pulse?: boolean;
}

/** Small-caps state line ("CALLING TO DESK 1", "WITH YOU SINCE 12:08", "READY", "ON BREAK · COFFEE", "OFFLINE"). */
export function StatusLine({ text, tone, pulse = false }: StatusLineProps) {
  return (
    <p className={cx(styles.status, styles[tone], pulse && styles.pulse)}>
      {text}
    </p>
  );
}
