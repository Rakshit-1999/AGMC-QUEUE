import { createContext, useContext, useId, type ReactNode } from 'react';
import { cx } from './internal/cx';
import styles from './Field.module.css';

interface FieldContextValue {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  labelId: string;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** Inputs call this to pick up the id / aria wiring of the surrounding <Field>. */
export function useFieldControl(): FieldContextValue | null {
  return useContext(FieldContext);
}

export interface FieldProps {
  label: ReactNode;
  /** Grey hint under the control (e.g. "Locked after creation", "none picked = every brand"). */
  hint?: ReactNode;
  /** Clay inline error; also turns the control's border clay. */
  error?: string;
  /** Extra content beside the label (e.g. a PlaceholderTag). */
  labelExtra?: ReactNode;
  /** Span both columns in a 2-column FieldGrid. */
  span?: 'full';
  className?: string;
  children: ReactNode;
}

/** Label + control + hint/error (DESIGN §1.16). Wraps exactly one TextInput / NumberInput / Select / Textarea. */
export function Field({ label, hint, error, labelExtra, span, className, children }: FieldProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: !!error, labelId }}>
      <div className={cx(styles.field, span === 'full' && styles.full, className)}>
        <div className={styles.labelRow}>
          <label id={labelId} htmlFor={id} className={styles.label}>
            {label}
          </label>
          {labelExtra}
        </div>
        {children}
        {error && (
          <p id={errorId} className={styles.error}>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className={styles.hint}>
            {hint}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

export interface FieldGridProps {
  children: ReactNode;
  /** 1 (stack) or 2 columns (wide dialogs, walk-in fields). */
  columns?: 1 | 2;
  /** Gap in px (default 12). */
  gap?: number;
  className?: string;
}

/** Vertical stack (default) or 2-column grid of Fields. */
export function FieldGrid({ children, columns = 1, gap = 12, className }: FieldGridProps) {
  return (
    <div className={cx(styles.grid, columns === 2 && styles.two, className)} style={{ gap }}>
      {children}
    </div>
  );
}
