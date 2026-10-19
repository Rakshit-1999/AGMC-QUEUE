import { useRef, type KeyboardEvent } from 'react';
import { cx } from './internal/cx';
import { Tooltip } from './Tooltip';
import styles from './Segmented.module.css';

export interface SegmentedOption<V> {
  value: V;
  label: string;
  /** Fill colour when active: green (default), amber (Break), dark (Offline). */
  tone?: 'green' | 'amber' | 'dark';
  disabled?: boolean;
  /** Shown on hover/focus; disabled segments stay focusable (aria-disabled) so the tooltip is reachable. */
  tooltip?: string;
}

export interface SegmentedProps<V> {
  /** V is inferred from `value` only. */
  options: SegmentedOption<NoInfer<V>>[];
  value: V;
  onChange(value: NoInfer<V>): void;
  /** md = 28 px segments (default) · sm = 24 px. */
  size?: 'sm' | 'md';
  /** Stretch to full width with equal segments (Appointment | Walk-in). */
  fullWidth?: boolean;
  ariaLabel: string;
  className?: string;
}

/** Radiogroup segmented switch (DESIGN §1.13). Arrow keys move the selection; Tab enters only the checked segment. */
export function Segmented<V extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  ariaLabel,
  className,
}: SegmentedProps<V>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
    if (enabled.length === 0) return;
    const at = Math.max(0, enabled.indexOf(selectedIndex));
    let next: number | undefined;
    if (e.key === 'Home') next = enabled[0];
    else if (e.key === 'End') next = enabled[enabled.length - 1];
    else {
      const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      next = enabled[(at + delta + enabled.length) % enabled.length];
    }
    if (next === undefined) return;
    const opt = options[next];
    if (!opt) return;
    if (opt.value !== value) onChange(opt.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cx(styles.group, fullWidth && styles.full, styles[size], className)}
      onKeyDown={onKeyDown}
    >
      {options.map((o, i) => {
        const checked = i === selectedIndex;
        const focusable = checked || (selectedIndex === -1 && i === 0);
        const segment = (
          <button
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={o.disabled || undefined}
            tabIndex={focusable ? 0 : -1}
            className={cx(styles.segment, checked && styles[o.tone ?? 'green'], o.disabled && styles.disabled)}
            onClick={() => {
              if (!o.disabled && !checked) onChange(o.value);
            }}
          >
            {o.label}
          </button>
        );
        return o.tooltip ? (
          <Tooltip key={String(o.value)} content={o.tooltip} block={fullWidth}>
            {segment}
          </Tooltip>
        ) : (
          <span key={String(o.value)} className={styles.cell}>
            {segment}
          </span>
        );
      })}
    </div>
  );
}
