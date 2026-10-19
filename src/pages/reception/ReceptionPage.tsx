import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadingState, PageHeading, Reveal } from '@/components/ui';
import { selectReceptionHeading, shallowEqual, useAppState, useHydrated, type AppState } from '@/store';
import type { BranchId } from '@/domain/types';
import { ReceptionKpis } from './ReceptionKpis';
import { CheckInPanel } from './checkin/CheckInPanel';
import { QueueCard } from './queue/QueueCard';
import { AdvisorsCard } from './side/AdvisorsCard';
import { NotArrivedCard } from './side/NotArrivedCard';
import { RecentlyFinishedCard } from './side/RecentlyFinishedCard';
import styles from './ReceptionPage.module.css';

/**
 * Page 2 — Reception (SPEC). The route guard always puts `?branch=<id>` in the URL
 * (reception: own branch; manager: any branch, picked in the top bar).
 */
export function ReceptionPage() {
  const [params] = useSearchParams();
  const branchId = params.get('branch');
  const hydrated = useHydrated();
  if (!hydrated || !branchId) return <LoadingState />;
  // key: switching branch (manager picker) resets every local form, tab and dialog.
  return <ReceptionScreen key={branchId} branchId={branchId} />;
}

function ReceptionScreen({ branchId }: { branchId: BranchId }) {
  const select = useCallback((s: AppState) => selectReceptionHeading(s, branchId), [branchId]);
  const heading = useAppState(select, shallowEqual);
  if (!heading) return <LoadingState />;

  return (
    <>
      <PageHeading
        title={heading.title}
        subtitle={heading.subtitle}
        link={{ label: 'Open waiting-area screen ↗', to: heading.displayHref, newTab: true }}
      />
      <ReceptionKpis branchId={branchId} />
      <div className={styles.columns}>
        <CheckInPanel branchId={branchId} />
        <div className={styles.wide}>
          <Reveal>
            <QueueCard branchId={branchId} />
          </Reveal>
          <Reveal delay={0.04}>
            <AdvisorsCard branchId={branchId} />
          </Reveal>
          <div className={styles.pair}>
            <Reveal delay={0.08}>
              <NotArrivedCard branchId={branchId} />
            </Reveal>
            <Reveal delay={0.12}>
              <RecentlyFinishedCard branchId={branchId} />
            </Reveal>
          </div>
        </div>
      </div>
    </>
  );
}
