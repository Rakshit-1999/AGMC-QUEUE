import { forwardRef, useEffect, useState } from 'react';
import { useFieldControl } from './Field';
import { cx } from './internal/cx';
import styles from './internal/Input.module.css';

export interface NumberInputProps {
  value: number;
  onChange(value: number): void;
  min?: number;
  max?: number;
  /** Width in px (default 72, the queue-rule number box). */
  width?: number;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  /** Accessible name when not inside a <Field>. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Integer box, right-aligned and tabular. Typing is free; the value is clamped to [min, max]
 * and committed on every valid keystroke, and normalised on blur.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { value, onChange, min, max, width = 72, disabled, invalid, id, ariaLabel, className },
  ref,
) {
  const field = useFieldControl();
  const [text, setText] = useState(String(value));
  const isInvalid = invalid ?? field?.invalid ?? false;

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const clamp = (n: number) => {
    let v = Math.round(n);
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  };

  return (
    <input
      ref={ref}
      id={id ?? field?.id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={text}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-invalid={isInvalid || undefined}
      aria-describedby={field?.describedBy}
      className={cx(styles.box, styles.number, isInvalid && styles.invalid, className)}
      style={{ width }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d-]/g, '');
        setText(raw);
        const n = Number(raw);
        if (raw !== '' && raw !== '-' && Number.isFinite(n)) onChange(clamp(n));
      }}
      onBlur={() => {
        const n = Number(text);
        const v = text === '' || !Number.isFinite(n) ? clamp(min ?? 0) : clamp(n);
        setText(String(v));
        if (v !== value) onChange(v);
      }}
    />
  );
});
