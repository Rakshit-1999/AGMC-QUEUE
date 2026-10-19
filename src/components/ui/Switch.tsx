import { useId, type ReactNode } from 'react';
import { cx } from './internal/cx';
import styles from './Switch.module.css';

export interface SwitchProps {
  checked: boolean;
  onChange(value: boolean): void;
  /** Visible label to the right of the track (13.5 ink). */
  label?: ReactNode;
  /** Optional state word after the label, e.g. "On" / "Off", "Simulator" / "A person". */
  onText?: string;
  offText?: string;
  /** Accessible name when there is no visible label. */
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, label, onText, offText, ariaLabel, disabled = false, className }: SwitchProps) {
  const labelId = useId();
  const stateWord = checked ? onText : offText;
  const toggle = () => {
    if (!disabled) onChange(!checked);
  };
  return (
    <span className={cx(styles.wrap, disabled && styles.disabled, className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : ariaLabel}
        disabled={disabled}
        className={cx(styles.track, checked && styles.on)}
        onClick={toggle}
      >
        <span className={styles.thumb} aria-hidden="true" />
      </button>
      {label && (
        // Clicking the visible label toggles too; the button carries the semantics.
        <span id={labelId} className={styles.label} onClick={toggle}>
          {label}
        </span>
      )}
      {stateWord && <span className={styles.state}>{stateWord}</span>}
    </span>
  );
}
