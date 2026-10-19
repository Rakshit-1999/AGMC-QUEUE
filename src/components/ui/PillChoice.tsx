import { useRef, type KeyboardEvent } from 'react';
import { cx } from './internal/cx';
import styles from './PillChoice.module.css';

export interface PillOption<V> {
  value: V;
  label: string;
  disabled?: boolean;
}

interface PillChoiceBase<V> {
  /** V is inferred from `value` only. */
  options: PillOption<NoInfer<V>>[];
  ariaLabel: string;
  className?: string;
}

/** Single choice (radiogroup): Service, Brand, Break reason. */
export interface PillChoiceSingleProps<V> extends PillChoiceBase<V> {
  multiple?: false;
  value: V;
  onChange(value: NoInfer<V>): void;
}

/** Toggle pills (aria-pressed): BRANDS, SERVICE TYPES. */
export interface PillChoiceMultiProps<V> extends PillChoiceBase<V> {
  multiple: true;
  value: V[];
  onChange(value: NoInfer<V>[]): void;
}

export type PillChoiceProps<V> = PillChoiceSingleProps<V> | PillChoiceMultiProps<V>;

/** Choice pills (DESIGN §1.14). Selected = solid green. */
export function PillChoice<V extends string | number>(props: PillChoiceProps<V>) {
  return props.multiple ? <MultiPills {...props} /> : <SinglePills {...props} />;
}

function MultiPills<V extends string | number>({ options, value, onChange, ariaLabel, className }: PillChoiceMultiProps<V>) {
  const selected = new Set(value);
  const toggle = (v: V) => {
    const next = selected.has(v) ? value.filter((x) => x !== v) : [...value, v];
    // Keep the option order stable.
    onChange(options.map((o) => o.value).filter((x) => next.includes(x)));
  };
  return (
    <div role="group" aria-label={ariaLabel} className={cx(styles.group, className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={selected.has(o.value)}
          disabled={o.disabled}
          className={cx(styles.pill, selected.has(o.value) && styles.selected)}
          onClick={() => toggle(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SinglePills<V extends string | number>({ options, value, onChange, ariaLabel, className }: PillChoiceSingleProps<V>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const fwd = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
    if (!fwd && !back) return;
    e.preventDefault();
    const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
    if (enabled.length === 0) return;
    const at = Math.max(0, enabled.indexOf(selectedIndex));
    const next = enabled[(at + (fwd ? 1 : -1) + enabled.length) % enabled.length];
    if (next === undefined) return;
    const opt = options[next];
    if (!opt) return;
    onChange(opt.value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cx(styles.group, className)} onKeyDown={onKeyDown}>
      {options.map((o, i) => {
        const checked = i === selectedIndex;
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (selectedIndex === -1 && i === 0) ? 0 : -1}
            disabled={o.disabled}
            className={cx(styles.pill, checked && styles.selected)}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
