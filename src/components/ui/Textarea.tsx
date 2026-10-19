import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { useFieldControl } from './Field';
import { cx } from './internal/cx';
import styles from './internal/Input.module.css';

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value: string;
  onChange(value: string): void;
  placeholder?: string;
  rows?: number;
  invalid?: boolean;
}

/** Multi-line note field (min-height 64). Carries data-lenis-prevent so it scrolls natively. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { value, onChange, rows = 3, invalid, className, id, ...rest },
  ref,
) {
  const field = useFieldControl();
  const isInvalid = invalid ?? field?.invalid ?? false;
  return (
    <textarea
      {...rest}
      ref={ref}
      id={id ?? field?.id}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={isInvalid || undefined}
      aria-describedby={field?.describedBy}
      className={cx(styles.box, styles.textarea, isInvalid && styles.invalid, className)}
      data-lenis-prevent
    />
  );
});
