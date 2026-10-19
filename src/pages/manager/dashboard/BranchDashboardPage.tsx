import { useParams } from 'react-router-dom';
import { FullPageMessage, PageHeading, Reveal } from '@/components/ui';
import { LABEL } from '@/domain/messages';
import type { BranchId } from '@/domain/types';
import { selectDashboardHeading, selectDashboardKpis, useLive } from '@/store';
import { KpiGrid } from '../shared/KpiGrid';
import { ActivityTable } from './ActivityTable';
import { AdvisorsTodayTable } from './AdvisorsTodayTable';
import { ArrivalsByHourPanel } from './ArrivalsByHourPanel';
import { AvgWaitByHourPanel } from './AvgWaitByHourPanel';
import { DeskTimeByServicePanel } from './DeskTimeByServicePanel';
import { LearnedSection } from './learned/LearnedSection';
import styles from './BranchDashboardPage.module.css';

const OVERVIEW = '/manager';
const STAGGER_S = 0.04;

/** Page 5 — Branch dashboard (/manager/branch/:branchId). */
export function BranchDashboardPage() {
  const branchId = (useParams<'branchId'>().branchId ?? '') as BranchId;
  const heading = useLive((s, now) => selectDashboardHeading(s, branchId, now), [branchId]);
  const kpis = useLive((s, now) => selectDashboardKpis(s, branchId, now), [branchId]);

  if (!heading) {
    return <FullPageMessage message={LABEL.tvUnknownBranch} action={{ label: 'Overview', to: OVERVIEW }} />;
  }

  return (
    <>
      <PageHeading
        title={heading.title}
        subtitle={heading.subtitle}
        back={{ label: '← All branches', to: OVERVIEW }}
        link={{ label: 'Open reception view →', to: `/reception?branch=${encodeURIComponent(branchId)}` }}
      />
      <KpiGrid kpis={kpis} ariaLabel="Today at this branch" />

      <div className={styles.panels}>
        <Reveal className={styles.cell}>
          <ArrivalsByHourPanel branchId={branchId} />
        </Reveal>
        <Reveal delay={STAGGER_S} className={styles.cell}>
          <AvgWaitByHourPanel branchId={branchId} />
        </Reveal>
        <Reveal delay={STAGGER_S * 2} className={styles.cell}>
          <DeskTimeByServicePanel branchId={branchId} />
        </Reveal>
        <Reveal delay={STAGGER_S * 3} className={styles.cell}>
          <AdvisorsTodayTable branchId={branchId} />
        </Reveal>
      </div>

      <LearnedSection branchId={branchId} />

      <Reveal className={styles.activity}>
        <ActivityTable branchId={branchId} />
      </Reveal>
    </>
  );
}
