import { useCallback } from 'react';
import type { AdvisorId, AppState, EpochMs } from '@/domain/types';
import { ERR } from '@/domain/messages';
import { selectAdvisorDesk, useHydrated, useLive, useSession } from '@/store';
import { FullPageMessage, LoadingState, PageHeading, Reveal } from '@/components/ui';
import { AdvisorKpis } from './AdvisorKpis';
import { StatusSwitch } from './StatusSwitch';
import { CurrentCustomerCard } from './current/CurrentCustomerCard';
import { YourLine } from './YourLine';
import { MyDay } from './MyDay';
import styles from './AdvisorDeskPage.module.css';

/** Page 3 — Service advisor desk (/advisor). Everything comes from `selectAdvisorDesk`, live every second. */
export function AdvisorDeskPage() {
  const hydrated = useHydrated();
  const session = useSession();
  const advisorId: AdvisorId | null = session?.advisor?.id ?? null;

  const compute = useCallback(
    (s: AppState, now: EpochMs) => (advisorId === null ? null : selectAdvisorDesk(s, advisorId, now)),
    [advisorId],
  );
  const view = useLive(compute, [advisorId]);

  if (!hydrated) return <LoadingState />;
  // The route guard already handles an unlinked account; this covers an advisor (or branch) that vanished.
  if (view === null) return <FullPageMessage message={ERR.notLinkedToAdvisor} />;

  return (
    <div className={styles.page}>
      <PageHeading
        title={view.title}
        subtitle={view.subtitle}
        right={<StatusSwitch presence={view.advisor.presence} locked={view.statusLocked} />}
      />
      <AdvisorKpis kpis={view.kpis} />
      <div className={styles.columns}>
        <div className={styles.left}>
          <Reveal>
            <CurrentCustomerCard card={view.card} desk={view.advisor.desk} liveState={view.liveState} />
          </Reveal>
          {view.line.rows.length > 0 && <YourLine subtitle={view.line.subtitle} rows={view.line.rows} />}
        </div>
        <Reveal delay={0.04} className={styles.right}>
          <MyDay count={view.myDay.count} rows={view.myDay.rows} footer={view.myDay.footer} />
        </Reveal>
      </div>
    </div>
  );
}
