import { useCallback } from 'react';
import { Card } from '@/components/ui';
import { selectRecentlyFinished, useAppState, type AppState } from '@/store';
import type { BranchId } from '@/domain/types';
import { CompactList } from './CompactList';
import styles from './Side.module.css';

type Rows = ReturnType<typeof selectRecentlyFinished>;

/** Recently finished: finish time, "A-013 Sara Smith", "Daniel Costa · Standard", status chip. */
export function RecentlyFinishedCard({ branchId }: { branchId: BranchId }) {
  // Not time-dependent, so it only re-renders on store changes.
  const select = useCallback((s: AppState) => selectRecentlyFinished(s, branchId), [branchId]);
  const rows = useAppState(select, sameRows);
  return (
    <Card title="Recently finished">
      <CompactList
        label="Recently finished"
        empty="Nothing yet"
        rows={rows.map((r) => ({ id: r.visitId, time: r.time, main: <TicketAndName text={r.ticketName} />, sub: r.sub, chip: r.chip }))}
      />
    </Card>
  );
}

/** "A-013 Sara Smith": the selector joins ticket and name; ticket numbers have no spaces, so split at the first one. */
function TicketAndName({ text }: { text: string }) {
  const at = text.indexOf(' ');
  if (at < 0) return <span className="mono">{text}</span>;
  return (
    <>
      <span className={`mono ${styles.ticket}`}>{text.slice(0, at)}</span>
      {text.slice(at)}
    </>
  );
}

function sameRows(a: Rows, b: Rows): boolean {
  return (
    a.length === b.length &&
    a.every((x, i) => {
      const y = b[i];
      return !!y && x.visitId === y.visitId && x.time === y.time && x.sub === y.sub && x.chip.text === y.chip.text;
    })
  );
}
