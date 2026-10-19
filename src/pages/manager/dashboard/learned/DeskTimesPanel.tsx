import { Card, CellStack, SectionLabel, Table, type TableColumn } from '@/components/ui';
import type { DeskTimesView } from '@/store';
import styles from './learned.module.css';

type ServiceRow = DeskTimesView['services'][number];
type AdvisorRow = DeskTimesView['advisors'][number];

const SERVICE_COLUMNS: TableColumn<ServiceRow>[] = [
  { key: 'service', header: 'Service', render: (r) => <CellStack primary={r.name} secondary={r.byBrand} /> },
  { key: 'configured', header: 'Configured', numeric: true, width: 84, render: (r) => r.configured },
  { key: 'measured', header: 'Measured', numeric: true, width: 80, render: (r) => r.measured },
  { key: 'visits', header: 'Visits', numeric: true, width: 56, render: (r) => r.visits },
  {
    key: 'nowUsing',
    header: 'Now using',
    numeric: true,
    width: 84,
    render: (r) =>
      r.nowUsingAlert ? (
        <span className={styles.clayText}>
          {r.nowUsing}
          <span className="sr-only"> needs attention</span>
        </span>
      ) : (
        r.nowUsing
      ),
  },
];

const ADVISOR_COLUMNS: TableColumn<AdvisorRow>[] = [
  { key: 'name', header: 'Advisor', render: (r) => r.name },
  { key: 'service', header: 'Service', render: (r) => r.service },
  { key: 'visits', header: 'Visits', numeric: true, width: 56, render: (r) => r.visits },
  { key: 'theirs', header: 'Their time', numeric: true, width: 80, render: (r) => r.theirs },
  { key: 'team', header: 'Team', numeric: true, width: 56, render: (r) => r.team },
  { key: 'difference', header: 'Difference', align: 'right', width: 96, render: (r) => r.difference },
];

/** Panel 2 — Desk times: learned minutes per service, then advisors against the team. */
export function DeskTimesPanel({ deskTimes }: { deskTimes: DeskTimesView }) {
  return (
    <Card
      title="Desk times"
      subtitle={'used for every forecast and the "fits before the next appointment" check'}
      className={styles.panel}
    >
      <Table columns={SERVICE_COLUMNS} rows={deskTimes.services} rowKey={(r) => r.code} caption="Desk times" />
      <SectionLabel as="h3">Advisors against the team</SectionLabel>
      <Table
        columns={ADVISOR_COLUMNS}
        rows={deskTimes.advisors}
        rowKey={(r) => `${r.advisorId}:${r.service}`}
        dense
        caption="Advisors against the team"
      />
      <p className={styles.footnote}>{deskTimes.footnote}</p>
    </Card>
  );
}
