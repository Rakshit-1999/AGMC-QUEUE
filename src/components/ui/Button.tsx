import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from './internal/cx';
import { Tooltip } from './Tooltip';
import styles from './Button.module.css';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'quiet'
  | 'danger' // clay outlined (destructive)
  | 'link'
  | 'navPill' // white-outlined pill on the green top bar
  | 'navPillActive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'disabled'> {
  variant?: ButtonVariant;
  /** sm 28 · md 34 (default) · lg 44 "big" */
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  /** Pending: label stays, spinner replaces the icon, aria-busy, clicks ignored. */
  pending?: boolean;
  /** Leading icon (16 px). */
  icon?: ReactNode;
  /** Tooltip text; also shown while disabled (the button then uses aria-disabled so it stays focusable). */
  tooltip?: string;
  type?: 'button' | 'submit';
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    disabled = false,
    pending = false,
    icon,
    tooltip,
    type = 'button',
    className,
    onClick,
    children,
    ...rest
  },
  ref,
) {
  const inert = disabled || pending;
  // With a tooltip the button must stay focusable/hoverable, so use aria-disabled instead of the native attribute.
  const useAriaDisabled = disabled && !!tooltip;

  const button = (
    <button
      ref={ref}
      type={type}
      className={cx(
        styles.button,
        styles[variant],
        variant !== 'link' && styles[size],
        fullWidth && styles.full,
        !inert && styles.live,
        pending && !icon && styles.pendingBare,
        className,
      )}
      disabled={disabled && !useAriaDisabled ? true : undefined}
      aria-disabled={disabled || undefined}
      aria-busy={pending || undefined}
      onClick={(e) => {
        if (inert) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...rest}
    >
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {pending ? <span className={styles.spinner} /> : icon}
        </span>
      ) : pending ? (
        <span className={cx(styles.spinner, styles.spinnerCentered)} aria-hidden="true" />
      ) : null}
      <span className={styles.label}>{children}</span>
    </button>
  );

  return tooltip ? <Tooltip content={tooltip} block={fullWidth}>{button}</Tooltip> : button;
});
