import { AdvisorStateChip, Card, ProgressBar } from '@/components/ui';
import { selectAdvisorCards, useLive, type AdvisorCardView } from '@/store';
import { fmtMinTight } from '@/domain/time';
import type { BranchId } from '@/domain/types';
import styles from './Side.module.css';

/** Advisors: a grid of cards, busiest first. */
export function AdvisorsCard({ branchId }: { branchId: BranchId }) {
  const view = useLive((s, now) => selectAdvisorCards(s, branchId, now), [branchId]);
  return (
    <Card title="Advisors" subtitle={view.subtitle}>
      {view.cards.length > 0 && (
        <ul className={styles.advisorGrid}>
          {view.cards.map((c) => (
            <AdvisorTile key={c.advisorId} card={c} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function AdvisorTile({ card }: { card: AdvisorCardView }) {
  const cur = card.customer;
  return (
    <li className={card.shaded ? `${styles.advisor} ${styles.shaded}` : styles.advisor}>
      <div className={styles.advisorHead}>
        <span className={styles.advisorName}>{card.name}</span>
        <AdvisorStateChip state={card.state} />
      </div>
      <div className={styles.advisorDesk}>{card.subtitle}</div>
      {cur ? (
        <>
          <div className={styles.advisorCustomer}>
            <span className={styles.advisorWho}>
              <span className="mono">{cur.ticketNo}</span> {cur.name}
            </span>
            <span className={`${styles.advisorTimes} num`}>
              {fmtMinTight(cur.elapsedMin)} / {fmtMinTight(cur.expectedMin)}
            </span>
          </div>
          <ProgressBar
            value={cur.expectedMin > 0 ? cur.elapsedMin / cur.expectedMin : 0}
            alert={cur.over}
            label={`${card.name} desk time`}
            valueText={`${cur.elapsedMin} of ${cur.expectedMin} minutes`}
            className={styles.advisorBar}
          />
        </>
      ) : (
        card.line && <div className={styles.advisorLine}>{card.line}</div>
      )}
    </li>
  );
}
