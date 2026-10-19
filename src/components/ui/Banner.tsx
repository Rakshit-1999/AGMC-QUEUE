import type { ReactNode } from 'react';
import { cx } from './internal/cx';
import styles from './Banner.module.css';

export interface BannerProps {
  /** Wrap the lead phrase in <strong> (700). */
  children: ReactNode;
  /** Show the 16 px info icon on the left (default true). */
  icon?: boolean;
  className?: string;
}

/** Amber settings banner naming the open management question (DESIGN §1.11). */
export function Banner({ children, icon = true, className }: BannerProps) {
  return (
    <div role="note" className={cx(styles.banner, className)}>
      {icon && (
        <svg className={styles.icon} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="7.25" y="7" width="1.5" height="4.5" rx="0.75" fill="currentColor" />
          <circle cx="8" cy="4.9" r="0.95" fill="currentColor" />
        </svg>
      )}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
