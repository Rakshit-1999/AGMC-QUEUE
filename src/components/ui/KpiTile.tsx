import { cx } from './internal/cx';
import styles from './KpiTile.module.css';

export interface KpiTileProps {
  label: string;
  /** null (or '') renders "—" with no unit. */
  value: string | number | null;
  unit?: string;
  hint?: string;
  /** Clay "needs attention" state. */
  alert?: boolean;
  className?: string;
}

export function KpiTile({ label, value, unit, hint, alert = false, className }: KpiTileProps) {
  const empty = value === null || value === '';
  return (
    <div role="group" aria-label={label} className={cx(styles.tile, alert && styles.alert, className)}>
      <div className={styles.label}>{label}</div>
      <div className={styles.valueRow}>
        {empty ? (
          <span className={cx(styles.value, styles.empty)}>—</span>
        ) : (
          <>
            <span className={styles.value}>{value}</span>
            {unit && <span className={styles.unit}>{unit}</span>}
          </>
        )}
        {alert && <span className="sr-only">needs attention</span>}
      </div>
      {hint && (
        <div className={styles.hint} title={hint}>
          {hint}
        </div>
      )}
    </div>
  );
}
