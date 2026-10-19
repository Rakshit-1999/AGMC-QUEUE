import { cx } from './internal/cx';
import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  /** 0..1; values above 1 are allowed (over expected) and render a full bar. */
  value: number;
  /** Clay fill (over expected). */
  alert?: boolean;
  /** 4 on advisor cards (default), 6 on the serving timer. */
  height?: number;
  /** aria-valuetext, e.g. "13 of 25 minutes". */
  valueText?: string;
  /** Accessible name, e.g. "Desk time". */
  label?: string;
  className?: string;
}

export function ProgressBar({ value, alert = false, height = 4, valueText, label, className }: ProgressBarProps) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const pct = Math.min(1, safe) * 100;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safe * 100)}
      aria-valuetext={valueText}
      className={cx(styles.track, className)}
      style={{ height }}
    >
      <div className={cx(styles.fill, alert && styles.alert)} style={{ width: `${pct}%` }} />
    </div>
  );
}
