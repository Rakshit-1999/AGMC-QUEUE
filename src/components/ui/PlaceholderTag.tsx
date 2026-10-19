import { cx } from './internal/cx';
import styles from './PlaceholderTag.module.css';

export interface PlaceholderTagProps {
  kind?: 'PLACEHOLDER' | 'MOCK DATA';
  /** Long custom tag in sentence case, e.g. "Placeholder · does Keyloop name one?". Overrides `kind`. */
  text?: string;
  className?: string;
}

/** Amber tag flagging parts still waiting on management decisions. Never hidden. */
export function PlaceholderTag({ kind = 'PLACEHOLDER', text, className }: PlaceholderTagProps) {
  return <span className={cx(styles.tag, text !== undefined && styles.long, className)}>{text ?? kind}</span>;
}
