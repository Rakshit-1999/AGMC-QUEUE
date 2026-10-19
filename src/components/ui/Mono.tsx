import type { ReactNode } from 'react';
import { cx } from './internal/cx';

export interface MonoProps {
  children: ReactNode;
  /** Optional weight; defaults to the surrounding text weight. */
  bold?: boolean;
  title?: string;
  className?: string;
}

/** Inline JetBrains Mono (usernames, Keyloop refs). Ligatures off via the global .mono class. */
export function Mono({ children, bold = false, title, className }: MonoProps) {
  return (
    <span className={cx('mono', className)} style={bold ? { fontWeight: 700 } : undefined} title={title}>
      {children}
    </span>
  );
}
