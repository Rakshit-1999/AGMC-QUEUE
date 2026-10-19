import type { VisitCardInfo } from '@/store';
import styles from './CustomerDetailsGrid.module.css';

export interface CustomerDetailsGridProps {
  details: VisitCardInfo['details'];
}

/** MOBILE · PLATE · VEHICLE · SERVICE / ARRIVED · WAITED · KEYLOOP REF · EXPECTED TIME (label above, value below). */
export function CustomerDetailsGrid({ details }: CustomerDetailsGridProps) {
  return (
    <dl className={styles.grid}>
      {details.map((d) => (
        <div key={d.label} className={styles.item}>
          <dt className={styles.label}>{d.label}</dt>
          <dd className={d.mono ? `${styles.value} ${styles.mono} mono` : styles.value}>{d.value}</dd>
        </div>
      ))}
    </dl>
  );
}
