// Page 7 — Waiting-area TV (/display/:code). Public, passive screen: no top bar, no Lenis, no session.
// Renders only `selectTvView`, whose type carries ticket numbers and desks and nothing personal.
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LABEL } from '@/domain/messages';
import { selectTvView, useHydrated, useLive } from '@/store';
import { AtDesks } from './AtDesks';
import { NextList } from './NextList';
import { NowCalling } from './NowCalling';
import { TvFooter, TvHeader, TvMessage, TvStage } from './TvChrome';
import { TV_COPY } from './copy';
import { usePrefersReducedMotion } from './hooks';
import styles from './DisplayPage.module.css';

export function DisplayPage() {
  const hydrated = useHydrated();
  return <TvStage>{hydrated ? <TvScreen /> : <TvLoading />}</TvStage>;
}

function TvLoading() {
  return (
    <>
      <TvHeader />
      <TvMessage tone="loading">Loading…</TvMessage>
      <TvFooter />
    </>
  );
}

function TvScreen() {
  const { code = '' } = useParams<{ code: string }>();
  const view = useLive((s, now) => (code ? selectTvView(s, code, now) : { unavailable: LABEL.tvUnknownBranch }), [code]);
  const reduced = usePrefersReducedMotion();
  const title = 'unavailable' in view ? null : view.title;

  useEffect(() => {
    const prev = document.title;
    document.title = title ?? 'AGMC Queue';
    return () => {
      document.title = prev;
    };
  }, [title]);

  if ('unavailable' in view) {
    return (
      <>
        <TvHeader />
        <TvMessage tone="unavailable">{TV_COPY.unavailable(view.unavailable)}</TvMessage>
        <TvFooter />
      </>
    );
  }

  return (
    <>
      <TvHeader title={view.title} />
      <main className={styles.body}>
        <div className={styles.left}>
          <NowCalling calls={view.calling} reduced={reduced} />
          <AtDesks desks={view.atDesks} />
        </div>
        <div className={styles.right}>
          <NextList next={view.next} waitingCount={view.waitingCount} />
        </div>
      </main>
      <TvFooter />
    </>
  );
}
