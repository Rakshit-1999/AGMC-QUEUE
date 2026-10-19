import { Card, Chip } from '@/components/ui';
import type { PromisesView } from '@/store';
import { ChartLegend } from '../charts/ChartLegend';
import { ColumnChart, type ColumnDatum } from '../charts/ColumnChart';
import { EMPTY_TEXT } from '../copy';
import styles from './learned.module.css';

const HISTOGRAM_HEIGHT = 160;

/** Panel 1 — Wait promises: big kept figure, margin sentence, example chips, sooner/later columns. */
export function WaitPromisesPanel({ promises }: { promises: PromisesView }) {
  const empty = promises.histogram.every((h) => h.count === 0);
  const data: ColumnDatum[] = promises.histogram.map((h) => ({
    key: h.label,
    axis: h.label,
    segments: [{ value: h.count, tone: h.side === 'sooner' ? 'appt' : 'walk' }],
    valueLabel: String(h.count),
  }));

  return (
    <Card title="Wait promises" subtitle="what walk-ins feel is the wait against what they were told" className={styles.panel}>
      <div className={styles.figureRow}>
        <span className={promises.keptPct === '—' ? `${styles.bigFigure} ${styles.bigEmpty}` : styles.bigFigure}>{promises.keptPct}</span>
        <span className={styles.figureLine}>{promises.keptLine}</span>
      </div>
      <p className={styles.sentence}>
        {promises.sentence.before}
        <strong>{promises.sentence.bold}</strong>
        {promises.sentence.after}
      </p>
      <p className={styles.small}>{promises.sampleLine}</p>
      <ul className={styles.chips} aria-label="Examples">
        {promises.examples.map((e) => (
          <li key={e}>
            <Chip tone="outline">{e}</Chip>
          </li>
        ))}
      </ul>
      <ChartLegend
        items={[
          { label: 'Called sooner than told', kind: 'appt' },
          { label: 'Called later than told', kind: 'walk' },
        ]}
      />
      <ColumnChart
        ariaLabel="Walk-ins by how they were called against the time they were told"
        data={data}
        height={HISTOGRAM_HEIGHT}
        integer
        wrapAxisLabels
        empty={empty}
        emptyText={EMPTY_TEXT}
        table={{
          caption: 'Walk-ins by how they were called against the time they were told',
          headers: ['Called', 'Walk-ins'],
          rows: promises.histogram.map((h) => [h.label, h.count]),
        }}
      />
    </Card>
  );
}
