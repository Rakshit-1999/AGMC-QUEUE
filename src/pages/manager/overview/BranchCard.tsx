import { Link } from 'react-router-dom';
import { AdvisorBar, Card } from '@/components/ui';
import type { BranchCardView } from '@/store';
import { AttentionList } from './AttentionList';
import styles from './BranchCard.module.css';

/** The selector contract ends the sub line with " · inactive" for a switched-off branch. */
const INACTIVE_SUFFIX = ' · inactive';

export interface BranchCardProps {
  card: BranchCardView;
}

/** One branch on the overview: header, 4 × 2 figures, advisor mix, attention list, footer links. */
export function BranchCard({ card }: BranchCardProps) {
  const inactive = card.subtitle.endsWith(INACTIVE_SUFFIX);
  const sub = inactive ? card.subtitle.slice(0, -INACTIVE_SUFFIX.length) : card.subtitle;
  const headingId = `branch-${card.branchId}-name`;

  return (
    <Card aria-labelledby={headingId} className={styles.card}>
      <header className={styles.header}>
        <div className={styles.titles}>
          <h2 id={headingId} className={styles.name}>
            {card.name}
          </h2>
          <p className={styles.sub}>
            {sub}
            {inactive && <span className={styles.inactive}>{INACTIVE_SUFFIX}</span>}
          </p>
        </div>
        <Link to={`/manager/branch/${encodeURIComponent(card.branchId)}`} className={styles.link}>
          Dashboard →
        </Link>
      </header>

      <dl className={styles.figures}>
        {card.figures.map((f) => (
          <div key={f.label} className={styles.figure}>
            <dt className={styles.figLabel}>{f.label}</dt>
            <dd className={f.alert ? `${styles.figValue} ${styles.alert} num` : `${styles.figValue} num`}>
              {f.value}
              {f.alert && <span className="sr-only"> needs attention</span>}
            </dd>
          </div>
        ))}
      </dl>

      <AdvisorBar mix={card.mix} />

      <AttentionList items={card.attention} />

      <footer className={styles.footer}>
        <Link to={card.receptionHref} className={styles.footLink}>
          Reception view
        </Link>
        <a href={card.displayHref} target="_blank" rel="noopener noreferrer" className={styles.footLink}>
          Waiting-area screen ↗
        </a>
      </footer>
    </Card>
  );
}
