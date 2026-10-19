import { PageHeading, Reveal } from '@/components/ui';
import { fmtLongDate } from '@/domain/time';
import { selectBranchCards, selectGroupTotals, useLive } from '@/store';
import { KpiGrid } from '../shared/KpiGrid';
import { BranchCard } from './BranchCard';
import styles from './OverviewPage.module.css';

const SETTINGS_BRANCHES = '/manager/settings/branches';
/** DESIGN §3: stagger ≤ 40 ms, at most 6 items. */
const STAGGER_S = 0.04;
const MAX_STAGGERED = 5;

/** Page 4 — Manager overview (/manager): group totals, then one live card per branch. */
export function OverviewPage() {
  const subtitle = useLive((_s, now) => `${fmtLongDate(now)} · live`, []);
  const totals = useLive((s, now) => selectGroupTotals(s, now), []);
  const cards = useLive((s, now) => selectBranchCards(s, now), []);

  return (
    <>
      <PageHeading title="All branches" subtitle={subtitle} link={{ label: '+ Add a branch', to: SETTINGS_BRANCHES }} />
      <KpiGrid kpis={totals} ariaLabel="Group totals" />
      <div className={styles.cards}>
        {cards.map((card, i) => (
          <Reveal key={card.branchId} delay={Math.min(i, MAX_STAGGERED) * STAGGER_S} className={styles.cell}>
            <BranchCard card={card} />
          </Reveal>
        ))}
      </div>
    </>
  );
}
