import { useRef, type KeyboardEvent } from 'react';
import { Chip } from '@/components/ui';
import type { WalkInOptionRow } from '@/store';
import type { AdvisorId } from '@/domain/types';
import { LABEL } from '@/domain/messages';
import styles from './CheckIn.module.css';

interface Props {
  rows: WalkInOptionRow[];
  selected: WalkInOptionRow | null;
  aboutLine(row: WalkInOptionRow): string;
  onPick(advisorId: AdvisorId | null): void;
}

/** Walk-in ADVISOR rows: a radiogroup, soonest first; the last row is "Whoever is free first". */
export function AdvisorChoice({ rows, selected, aboutLine, onPick }: Props) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = selected ? rows.indexOf(selected) : -1;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const fwd = e.key === 'ArrowDown' || e.key === 'ArrowRight';
    const back = e.key === 'ArrowUp' || e.key === 'ArrowLeft';
    if (!fwd && !back) return;
    e.preventDefault();
    const next = (Math.max(0, selectedIndex) + (fwd ? 1 : -1) + rows.length) % rows.length;
    const row = rows[next];
    if (!row) return;
    onPick(row.advisorId);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Advisor" className={styles.advisorRows} onKeyDown={onKeyDown}>
      {rows.map((row, i) => {
        const checked = i === selectedIndex;
        return (
          <button
            key={row.advisorId ?? 'first_free'}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (selectedIndex === -1 && i === 0) ? 0 : -1}
            className={checked ? `${styles.advisorRow} ${styles.advisorRowOn}` : styles.advisorRow}
            onClick={() => onPick(row.advisorId)}
          >
            <span className={styles.advisorWho}>
              {row.advisorId === null ? (
                LABEL.whoeverFree
              ) : (
                <>
                  <strong>{row.name}</strong>
                  {row.desk && <> · {row.desk}</>}
                </>
              )}
              {row.soonest && (
                <Chip tone="green" size="sm" className={styles.soonest}>
                  {LABEL.soonest}
                </Chip>
              )}
            </span>
            <span className={`${styles.advisorAbout} num`}>{aboutLine(row)}</span>
          </button>
        );
      })}
    </div>
  );
}
