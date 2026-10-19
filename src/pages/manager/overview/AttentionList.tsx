import { LABEL } from '@/domain/messages';
import styles from './BranchCard.module.css';

export interface AttentionListProps {
  /** Up to five items, longest first (from the selector). */
  items: string[];
}

/** Clay attention items, or one green "Nothing needs attention" line. */
export function AttentionList({ items }: AttentionListProps) {
  if (items.length === 0) {
    return <p className={`${styles.attention} ${styles.allGood}`}>{LABEL.nothingNeedsAttention}</p>;
  }
  return (
    <ul className={styles.attention} aria-label="Needs attention">
      {items.map((text) => (
        <li key={text} className={styles.item}>
          {text}
        </li>
      ))}
    </ul>
  );
}
