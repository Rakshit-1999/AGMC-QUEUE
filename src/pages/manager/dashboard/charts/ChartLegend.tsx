import styles from './charts.module.css';

export type LegendKind = 'appt' | 'walk' | 'cap' | 'tick';

export interface LegendItem {
  label: string;
  kind: LegendKind;
}

/** Legend above the plot, right-aligned (DESIGN §2.5). */
export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className={styles.legend}>
      {items.map((it) => (
        <li key={it.label} className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles[`swatch_${it.kind}`]}`} aria-hidden="true" />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
