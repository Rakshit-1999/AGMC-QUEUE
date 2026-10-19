import { useState } from 'react';
import type { AppState, BranchId } from '@/domain/types';
import { ADVISOR_MODE_SHORT, OK } from '@/domain/messages';
import {
  loadTomorrow,
  selectKeyloopHistoryRows,
  selectKeyloopView,
  setNightlyLoadTime,
  syncToday,
  useAppState,
} from '@/store';
import { Banner, Button, Card, Chip, Reveal, Table, TextInput, useToast, type TableColumn } from '@/components/ui';
import { SETTINGS_TABLE_MIN } from '../shared/controls';
import styles from '../shared/settings.module.css';

type PerBranchRow = ReturnType<typeof selectKeyloopView>['perBranch'][number];
type HistoryRow = ReturnType<typeof selectKeyloopHistoryRows>[number];

const selectBranches = (s: AppState) => s.branches;

/** Tab 5 — Keyloop bookings (mock source). */
export function KeyloopTab() {
  return (
    <div className={styles.stack}>
      <Banner className={styles.banner}>
        <strong>Bookings come from a mock Keyloop source</strong> that invents a realistic day per branch and, like an online booking,
        names no advisor. Question 3 (Keyloop API or a scheduled export file) decides the real connector; only that connector changes.
      </Banner>
      <Reveal>
        <LoadTimeCard />
      </Reveal>
      <Reveal delay={0.04}>
        <PerBranchCard />
      </Reveal>
      <Reveal delay={0.08}>
        <HistoryCard />
      </Reveal>
    </div>
  );
}

function LoadTimeCard() {
  const toast = useToast();
  const saved = useAppState((s) => s.keyloop.nightlyLoadAt);
  // null = untouched: follows the stored time.
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const value = draft ?? saved;

  const save = () => {
    const r = setNightlyLoadTime(value.trim());
    toast.fromResult(r, OK.saved);
    setInvalid(!r.ok);
    if (r.ok) setDraft(null);
  };

  return (
    <Card title="When bookings are loaded" subtitle={<Chip tone="grey">Source: mock</Chip>}>
      <form
        className={`${styles.text} ${styles.sentence}`}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        noValidate
      >
        <span>
          <strong>The night before:</strong> tomorrow&apos;s bookings load at
        </span>
        <TextInput
          value={value}
          onChange={(v) => {
            setDraft(v);
            setInvalid(false);
          }}
          mono
          width={80}
          inputMode="numeric"
          aria-label="Nightly load time"
          invalid={invalid}
          autoComplete="off"
        />
        <Button type="submit" variant="secondary" size="sm">
          Save
        </Button>
        <span>and every appointment gets its advisor, so advisors see their day before it starts.</span>
      </form>
      <p className={styles.text}>
        <strong>During the day:</strong> every 10 minutes, for same-day bookings, moves and cancellations.
      </p>
    </Card>
  );
}

function PerBranchCard() {
  const toast = useToast();
  const view = useAppState(selectKeyloopView);
  const branches = useAppState(selectBranches);

  const modeLabel = (id: BranchId, fallback: string): string => {
    const b = branches[id];
    return b ? ADVISOR_MODE_SHORT[b.appointmentAdvisorMode] : fallback;
  };

  const columns: TableColumn<PerBranchRow>[] = [
    { key: 'branch', header: 'Branch', minWidth: 140, render: (r) => r.name },
    { key: 'mode', header: 'Advisor for appointments', minWidth: 150, render: (r) => <span title={r.mode}>{modeLabel(r.branchId, r.mode)}</span> },
    { key: 'today', header: 'Today', width: 64, numeric: true, render: (r) => r.today },
    { key: 'todayAdvisors', header: "Today's advisors", minWidth: 180, render: (r) => r.todayAdvisors },
    { key: 'tomorrow', header: 'Tomorrow', width: 92, numeric: true, render: (r) => <span className={styles.nowrap}>{r.tomorrow}</span> },
    { key: 'tomorrowAdvisors', header: "Tomorrow's advisors", minWidth: 160, render: (r) => r.tomorrowAdvisors },
    {
      key: 'sync',
      header: <span className="sr-only">Sync today</span>,
      width: 100,
      render: (r) => (
        <Button
          variant="secondary"
          size="sm"
          aria-label={`Sync today: ${r.name}`}
          onClick={() => toast.fromResult(syncToday(r.branchId), OK.todaySynced)}
        >
          Sync today
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="Bookings per branch"
      actions={
        <Button size="sm" onClick={() => toast.fromResult(loadTomorrow(), OK.tomorrowLoaded)}>
          Load tomorrow now
        </Button>
      }
    >
      <Table columns={columns} rows={view.perBranch} rowKey={(r) => r.branchId} dense minWidth={SETTINGS_TABLE_MIN} caption="Bookings per branch" />
    </Card>
  );
}

function HistoryCard() {
  const rows = useAppState(selectKeyloopHistoryRows);
  const columns: TableColumn<HistoryRow>[] = [
    { key: 'time', header: 'Time', width: 112, render: (r) => <span className={`num ${styles.nowrap}`}>{r.time}</span> },
    { key: 'branch', header: 'Branch', width: 72, render: (r) => r.branch },
    { key: 'source', header: 'Source', width: 72, render: (r) => r.source },
    { key: 'added', header: 'Added', width: 72, numeric: true, render: (r) => r.added },
    { key: 'updated', header: 'Updated', width: 80, numeric: true, render: (r) => r.updated },
    { key: 'removed', header: 'Removed', width: 80, numeric: true, render: (r) => r.removed },
    { key: 'note', header: 'Note', minWidth: 200, render: (r) => r.note },
  ];
  return (
    <Card title="Sync history">
      <Table
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        dense
        stickyHeader
        minWidth={SETTINGS_TABLE_MIN}
        className={styles.tallScroll}
        caption="Sync history"
      />
    </Card>
  );
}
