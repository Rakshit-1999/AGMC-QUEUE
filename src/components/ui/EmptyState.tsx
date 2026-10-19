import { cx } from './internal/cx';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  /** Exact SPEC text, e.g. "Nobody waiting". */
  text: string;
  /** Use ink-2 on tinted/ground backgrounds. */
  onTint?: boolean;
  /** Compact padding for table cells and short lists. */
  compact?: boolean;
  className?: string;
}

export function EmptyState({ text, onTint = false, compact = false, className }: EmptyStateProps) {
  return <p className={cx(styles.empty, onTint && styles.onTint, compact && styles.compact, className)}>{text}</p>;
}
