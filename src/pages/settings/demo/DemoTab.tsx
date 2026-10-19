import { useState } from 'react';
import type { Driver } from '@/domain/types';
import { LABEL, OK } from '@/domain/messages';
import { resetDemo, selectSimulatorView, setAdvisorDriver, setSimulatorEnabled, useAppState } from '@/store';
import { Button, Card, Dialog, Mono, Reveal, Switch, Table, useToast, type TableColumn } from '@/components/ui';
import { SETTINGS_TABLE_MIN } from '../shared/controls';
import styles from '../shared/settings.module.css';

type DriverRow = ReturnType<typeof selectSimulatorView>['rows'][number];

const RESET_QUESTION = "Wipe today's tickets and replay the day from opening time?";
const RESET_LABEL = "Reset today's demo data";

/** Tab 7 — Demo (prototype only; removed in the real system). */
export function DemoTab() {
  const toast = useToast();
  const view = useAppState(selectSimulatorView);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const toggleSimulator = (on: boolean) => toast.fromResult(setSimulatorEnabled(on), on ? OK.simulatorOn : OK.simulatorOff);

  const reset = () => {
    if (toast.fromResult(resetDemo(), OK.demoReplayed)) setConfirmOpen(false);
  };

  const setDriver = (row: DriverRow, simulated: boolean) => {
    const driver: Driver = simulated ? 'sim' : 'person';
    toast.fromResult(setAdvisorDriver(row.advisorId, driver), OK.saved);
  };

  const columns: TableColumn<DriverRow>[] = [
    { key: 'name', header: 'Advisor', minWidth: 160, render: (r) => r.name },
    { key: 'branch', header: 'Branch', minWidth: 160, render: (r) => r.branch },
    {
      key: 'login',
      header: 'Login',
      width: 140,
      render: (r) => (r.login === LABEL.none ? <span className={styles.muted}>{LABEL.none}</span> : <Mono>{r.login}</Mono>),
    },
    {
      key: 'driver',
      header: 'Simulated',
      width: 150,
      render: (r) => (
        <Switch
          checked={r.driver === 'sim'}
          onChange={(v) => setDriver(r, v)}
          onText="Simulator"
          offText="A person"
          ariaLabel={`Simulated: ${r.name}`}
        />
      ),
    },
  ];

  return (
    <div className={styles.stack}>
      <Reveal>
        <Card title="Live simulator">
          <p className={styles.text}>
            While on, appointment customers arrive (some early, some late, a few never) and walk-ins come in at about the RSI rate.
            Advisors that nobody is signed in as call, serve and finish customers by themselves.
          </p>
          <div className={styles.cardRow}>
            <Switch checked={view.enabled} onChange={toggleSimulator} onText="On" offText="Off" ariaLabel="Live simulator" />
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              {RESET_LABEL}
            </Button>
          </div>
        </Card>
      </Reveal>
      <Reveal delay={0.04}>
        <Card title="Who drives each advisor" subtitle="signing in as an advisor takes over from the simulator">
          <Table columns={columns} rows={view.rows} rowKey={(r) => r.advisorId} dense minWidth={SETTINGS_TABLE_MIN} caption="Who drives each advisor" />
        </Card>
      </Reveal>
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={RESET_QUESTION}
        actions={
          <>
            <Button variant="quiet" onClick={() => setConfirmOpen(false)}>
              Back
            </Button>
            <Button variant="danger" onClick={reset}>
              {RESET_LABEL}
            </Button>
          </>
        }
      />
    </div>
  );
}
