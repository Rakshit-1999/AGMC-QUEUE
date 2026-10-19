import { forwardRef, type InputHTMLAttributes } from 'react';
import { useFieldControl } from './Field';
import { cx } from './internal/cx';
import styles from './internal/Input.module.css';

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'size' | 'width'> {
  value: string;
  onChange(value: string): void;
  placeholder?: string;
  /** JetBrains Mono (usernames, refs, the 22:00 time box). */
  mono?: boolean;
  disabled?: boolean;
  type?: 'text' | 'password' | 'tel' | 'search';
  autoFocus?: boolean;
  /** Locked after creation (Code / Username): read-only, muted. */
  locked?: boolean;
  /** Clay border (also set automatically by a surrounding <Field error>). */
  invalid?: boolean;
  /** Search box: magnifier icon on the left and a clear "×" button while it has a value. */
  search?: boolean;
  /** Fixed width in px (e.g. 80 for a time box). */
  width?: number;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { value, onChange, mono = false, type = 'text', locked = false, invalid, search = false, width, className, id, style, ...rest },
  ref,
) {
  const field = useFieldControl();
  const isInvalid = invalid ?? field?.invalid ?? false;

  const input = (
    <input
      {...rest}
      ref={ref}
      id={id ?? field?.id}
      type={search ? 'search' : type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={locked || rest.readOnly}
      aria-invalid={isInvalid || undefined}
      aria-describedby={field?.describedBy}
      className={cx(
        styles.box,
        mono && styles.mono,
        locked && styles.locked,
        isInvalid && styles.invalid,
        search && styles.withIcon,
        search && value !== '' && styles.withClear,
        className,
      )}
      style={width ? { ...style, width } : style}
    />
  );

  if (!search) return input;

  return (
    <span className={styles.wrap} style={width ? { width } : undefined}>
      <svg className={styles.searchIcon} viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M11 11l3.2 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {input}
      {value !== '' && (
        <button type="button" className={styles.clear} aria-label="Clear search" onClick={() => onChange('')}>
          <span aria-hidden="true">×</span>
        </button>
      )}
    </span>
  );
});
