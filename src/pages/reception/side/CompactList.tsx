import type { ReactNode } from 'react';
import { EmptyState, TypeChip } from '@/components/ui';
import type { ChipSpec } from '@/store';
import styles from './Side.module.css';

export interface CompactListRow {
  id: string;
  time: string;
  main: ReactNode;
  sub: string;
  chip: ChipSpec;
}

/** 36 px lines: time · main · secondary · chip, scrolling inside the card (max-height 320). */
export function CompactList({ rows, empty, label }: { rows: CompactListRow[]; empty: string; label: string }) {
  if (rows.length === 0) return <EmptyState text={empty} compact />;
  return (
    <ul className={styles.list} aria-label={label} data-lenis-prevent>
      {rows.map((r) => (
        <li key={r.id} className={styles.line}>
          <span className={`${styles.lineTime} num`}>{r.time}</span>
          <span className={styles.lineText}>
            <span className={styles.lineMain}>{r.main}</span>
            <span className={styles.lineSub}> · {r.sub}</span>
          </span>
          <TypeChip spec={r.chip} />
        </li>
      ))}
    </ul>
  );
}
