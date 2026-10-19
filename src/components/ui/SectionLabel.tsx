import type { ReactNode } from 'react';
import { cx } from './internal/cx';
import styles from './SectionLabel.module.css';

export interface SectionLabelProps {
  children: ReactNode;
  /** Remove the top margin (first label in a block). */
  first?: boolean;
  /** Use ink-2 on tinted/ground backgrounds where ink-3 fails contrast. */
  onTint?: boolean;
  as?: 'div' | 'h3' | 'span';
  id?: string;
  className?: string;
}

/** Small-caps sub-section label: QUEUE RULES, SERVICE, ADVISORS AGAINST THE TEAM … (11/700, .06em, ink-3). */
export function SectionLabel({ children, first = false, onTint = false, as = 'div', id, className }: SectionLabelProps) {
  const Tag = as;
  return (
    <Tag id={id} className={cx(styles.label, first && styles.first, onTint && styles.onTint, className)}>
      {children}
    </Tag>
  );
}
