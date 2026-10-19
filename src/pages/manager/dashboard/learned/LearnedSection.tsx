import { useCallback } from 'react';
import { Reveal } from '@/components/ui';
import type { BranchId } from '@/domain/types';
import { selectLearning, useAppState, type AppState } from '@/store';
import { DeskTimesPanel } from './DeskTimesPanel';
import { WaitPromisesPanel } from './WaitPromisesPanel';
import styles from './learned.module.css';

type Learning = ReturnType<typeof selectLearning>;

/** Re-render only when the learned figures change (they update every 10 minutes), not on every store write. */
function sameLearning(a: Learning, b: Learning): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

/** "What the system has learned": wait promises and desk times, or the learning-off line. */
export function LearnedSection({ branchId }: { branchId: BranchId }) {
  const select = useCallback((s: AppState) => selectLearning(s, branchId), [branchId]);
  const learning = useAppState(select, sameLearning);

  return (
    <section aria-labelledby="learned-title" className={styles.section}>
      <div className={styles.head}>
        <h2 id="learned-title" className={styles.title}>
          What the system has learned
        </h2>
        <p className={styles.meta}>{learning.subtitle}</p>
      </div>
      {!learning.off && (
        <div className={styles.grid}>
          <Reveal className={styles.cell}>
            <WaitPromisesPanel promises={learning.promises} />
          </Reveal>
          <Reveal delay={0.04} className={styles.cell}>
            <DeskTimesPanel deskTimes={learning.deskTimes} />
          </Reveal>
        </div>
      )}
    </section>
  );
}
