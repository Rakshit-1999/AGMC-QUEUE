import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from './internal/cx';
import styles from './Card.module.css';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Rendered as an h2 (17/700). */
  title?: ReactNode;
  /** Meta text beside the title (12.5 ink-3), e.g. "3 waiting · in the order they will be called". */
  subtitle?: ReactNode;
  /** Right-aligned header content (buttons, filters, links). */
  actions?: ReactNode;
  /** 'md' = 16 px (default), 'none' = flush (tables that bleed to the edge). */
  padding?: 'none' | 'md';
  /** Sticky below the top bar (top: 58 + 16). */
  sticky?: boolean;
  children: ReactNode;
}

export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { title, subtitle, actions, padding = 'md', sticky = false, className, children, ...rest },
  ref,
) {
  const hasHeader = title !== undefined || subtitle !== undefined || actions !== undefined;
  return (
    <section
      ref={ref}
      className={cx(styles.card, padding === 'none' && styles.flush, sticky && styles.sticky, className)}
      {...rest}
    >
      {hasHeader && (
        <header className={styles.header}>
          {title !== undefined && <h2 className={styles.title}>{title}</h2>}
          {subtitle !== undefined && <span className={styles.subtitle}>{subtitle}</span>}
          {actions !== undefined && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
});
