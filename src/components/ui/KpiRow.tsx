import type { CSSProperties, ReactNode } from 'react';
import { cx } from './internal/cx';
import styles from './KpiRow.module.css';

export interface KpiRowProps {
  children: ReactNode;
  /** Min tile width in px for the auto-fit grid (default 120). Ignored when `columns` is set. */
  min?: number;
  /** Fixed column count (e.g. 9 on Reception, 4 on the advisor desk). Pages may override per breakpoint via className. */
  columns?: number;
  className?: string;
}

export function KpiRow({ children, min = 120, columns, className }: KpiRowProps) {
  const style: CSSProperties = {
    gridTemplateColumns: columns
      ? `repeat(${columns}, minmax(0, 1fr))`
      : `repeat(auto-fit, minmax(${min}px, 1fr))`,
  };
  return (
    <div className={cx(styles.row, className)} style={style}>
      {children}
    </div>
  );
}
