import { useEffect, useState } from 'react';
import { cx } from './internal/cx';
import styles from './LoadingState.module.css';

export interface LoadingStateProps {
  /** page = centred 120 px below the top bar · card = inside a card body (min-height 120). */
  variant?: 'page' | 'card';
  className?: string;
}

const SHOW_AFTER_MS = 150;

/** "Loading…", shown only after 150 ms so it does not flash. */
export function LoadingState({ variant = 'page', className }: LoadingStateProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div className={cx(styles.loading, styles[variant], className)} role="status" aria-live="polite">
      {visible ? 'Loading…' : null}
    </div>
  );
}
