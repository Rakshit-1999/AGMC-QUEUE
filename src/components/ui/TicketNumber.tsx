import { cx } from './internal/cx';
import styles from './TicketNumber.module.css';

export interface TicketNumberProps {
  /** "A-014", "W-018", "C-004". */
  value: string;
  /** sm 13 (tables) · md 16 (Your line) · xl 44 (advisor desk, ticket issued) · tv 64. */
  size?: 'sm' | 'md' | 'xl' | 'tv';
  tone?: 'ink' | 'white';
  className?: string;
}

export function TicketNumber({ value, size = 'sm', tone = 'ink', className }: TicketNumberProps) {
  return <span className={cx('mono', styles.ticket, styles[size], tone === 'white' && styles.white, className)}>{value}</span>;
}
