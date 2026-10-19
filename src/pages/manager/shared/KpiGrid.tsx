import { KpiTile } from '@/components/ui';
import type { Kpi } from '@/store';
import styles from './KpiGrid.module.css';

export interface KpiGridProps {
  kpis: Kpi[];
  /** Accessible name of the tile group, e.g. "Group totals". */
  ariaLabel: string;
}

/**
 * Seven KPI tiles: 7 columns at ≥1200 px, 4 + 3 below (DESIGN §2.4 / §2.5).
 * KpiRow sets its columns inline, so it cannot switch counts per breakpoint; this grid does it in CSS.
 */
export function KpiGrid({ kpis, ariaLabel }: KpiGridProps) {
  return (
    <div className={styles.grid} role="group" aria-label={ariaLabel}>
      {kpis.map((k) => (
        <KpiTile key={k.label} label={k.label} value={k.value} unit={k.unit} hint={k.hint} alert={k.alert} />
      ))}
    </div>
  );
}
