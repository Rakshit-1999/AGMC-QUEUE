// Stage, header and footer shared by every TV state (ready, loading, not found).
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui';
import { useNow } from '@/store';
import { fmtClock } from '@/domain/time';
import { STAGE_H, STAGE_W, TV_COPY } from './copy';
import { useIdleCursor, useStageScale } from './hooks';
import styles from './DisplayPage.module.css';

/** Fixed 1920 × 1080 canvas, scaled to fit the viewport and letterboxed on --ground. */
export function TvStage({ children }: { children: ReactNode }) {
  const scale = useStageScale();
  const idle = useIdleCursor();
  return (
    <div className={idle ? `${styles.viewport} ${styles.idle}` : styles.viewport}>
      <div
        className={styles.stage}
        style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

export interface TvHeaderProps {
  /** "Main Branch (SZR) · Service reception"; omitted on loading / not-found (logo only). */
  title?: string;
}

export function TvHeader({ title }: TvHeaderProps) {
  return (
    <header className={styles.header}>
      <Logo tone="white" height={40} />
      {title ? (
        <>
          <span className={styles.divider} aria-hidden="true" />
          <h1 className={styles.branch}>{title}</h1>
        </>
      ) : null}
      {title ? <TvClock /> : null}
    </header>
  );
}

function TvClock() {
  const now = useNow();
  return (
    <time className={`mono ${styles.clock}`} aria-label="Current time">
      {fmtClock(now)}
    </time>
  );
}

export function TvFooter() {
  return (
    <footer className={styles.footer}>
      <span>{TV_COPY.footerLeft}</span>
      <span>{TV_COPY.footerRight}</span>
    </footer>
  );
}

/** Centred single message for loading and not-found states. */
export function TvMessage({ children, tone }: { children: ReactNode; tone: 'unavailable' | 'loading' }) {
  return (
    <main className={styles.messageBody}>
      <p
        className={tone === 'unavailable' ? styles.unavailable : styles.loading}
        role={tone === 'loading' ? 'status' : undefined}
      >
        {children}
      </p>
    </main>
  );
}
