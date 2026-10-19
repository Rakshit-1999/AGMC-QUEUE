import { cx } from './internal/cx';
import { SegmentBar, type SegmentColor } from './SegmentBar';
import styles from './AdvisorBar.module.css';

export interface AdvisorMix {
  free: number;
  busy: number;
  brk: number;
  offline: number;
}

export interface AdvisorBarProps {
  /** Same shape as BranchCardView.mix. */
  mix: AdvisorMix;
  /** Left label (default "Advisors"). */
  label?: string;
  className?: string;
}

const ITEMS: { key: keyof AdvisorMix; text: string; color: SegmentColor }[] = [
  { key: 'free', text: 'Free', color: 'green' },
  { key: 'busy', text: 'Busy', color: 'ink' },
  { key: 'brk', text: 'Break', color: 'ochre' },
  { key: 'offline', text: 'Offline', color: 'lightGrey' },
];

/** Manager overview "Advisors" line: legend "Free 1 · Busy 6 · Break 1 · Offline 1" + a split bar (DESIGN §1.21). */
export function AdvisorBar({ mix, label = 'Advisors', className }: AdvisorBarProps) {
  return (
    <div className={cx(styles.wrap, className)}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <ul className={styles.legend}>
          {ITEMS.map((it) => (
            <li key={it.key} className={styles.item}>
              <span className={cx(styles.swatch, styles[it.color])} aria-hidden="true" />
              <span className="num">
                {it.text} {mix[it.key]}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <SegmentBar className={styles.bar} segments={ITEMS.map((it) => ({ value: mix[it.key], color: it.color }))} />
    </div>
  );
}
