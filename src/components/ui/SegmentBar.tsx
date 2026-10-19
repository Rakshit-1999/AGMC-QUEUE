import { cx } from './internal/cx';
import styles from './SegmentBar.module.css';

export type SegmentColor = 'green' | 'ink' | 'ochre' | 'lightGrey';

export interface SegmentBarProps {
  segments: { value: number; color: SegmentColor }[];
  /** Bar height (default 6). */
  height?: number;
  className?: string;
}

/** Thin proportional bar with 1 px white gaps; zero values draw nothing. Decorative (aria-hidden). */
export function SegmentBar({ segments, height = 6, className }: SegmentBarProps) {
  const visible = segments.filter((s) => s.value > 0);
  return (
    <div className={cx(styles.bar, className)} style={{ height }} aria-hidden="true">
      {visible.map((s, i) => (
        <span key={`${s.color}-${i}`} className={styles[s.color]} style={{ flexGrow: s.value }} />
      ))}
    </div>
  );
}
