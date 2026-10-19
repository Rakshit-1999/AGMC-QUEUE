import { useRef, useState } from 'react';
import type { VisitStatus } from '@/domain/types';
import { useNow } from '@/store';
import {
  AdvisorBar,
  AdvisorStateChip,
  Banner,
  Button,
  Card,
  CellStack,
  Chip,
  Dialog,
  EmptyState,
  Field,
  FieldGrid,
  KpiRow,
  KpiTile,
  LoadingState,
  Logo,
  Mono,
  NumberInput,
  PageHeading,
  PillChoice,
  PlaceholderTag,
  ProgressBar,
  RowMenu,
  SectionLabel,
  Segmented,
  Select,
  StatusChip,
  Switch,
  Table,
  TextInput,
  Textarea,
  TicketNumber,
  Timer,
  Tooltip,
  TypeChip,
  useToast,
} from '@/components/ui';
import styles from './KitPage.module.css';

interface DemoRow {
  id: string;
  pos: number;
  ticket: string;
  name: string;
  plate: string;
  tone?: 'clay' | 'highlight' | 'faded';
}

const ROWS: DemoRow[] = [
  { id: '1', pos: 1, ticket: 'W-018', name: 'Chloe Karimi', plate: 'Dubai X 75542', tone: 'clay' },
  { id: '2', pos: 2, ticket: 'A-021', name: 'Fatima Haddad', plate: 'Dubai K 11203', tone: 'highlight' },
  { id: '3', pos: 3, ticket: 'C-004', name: 'Walk-in customer', plate: 'Sharjah 3 99120' },
  { id: '4', pos: 4, ticket: 'A-013', name: 'Sara Smith', plate: 'Dubai B 44010', tone: 'faded' },
];

const STATUSES: VisitStatus[] = ['booked', 'waiting', 'called', 'serving', 'done', 'no_show', 'cancelled'];

/** Dev-only gallery of every shared UI component (/__kit). Not part of the product. */
export function KitPage() {
  const toast = useToast();
  const now = useNow();
  const [tab, setTab] = useState<'appointment' | 'walkin'>('appointment');
  const [status, setStatus] = useState<'available' | 'break' | 'offline'>('available');
  const [service, setService] = useState('SVC');
  const [brands, setBrands] = useState<string[]>(['MINI']);
  const [on, setOn] = useState(true);
  const [advisor, setAdvisor] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('Aisha');
  const [num, setNum] = useState(15);
  const [note, setNote] = useState('');
  const [open, setOpen] = useState<'none' | 'narrow' | 'wide' | 'confirm'>('none');
  const backRef = useRef<HTMLButtonElement>(null);

  return (
    <div className={styles.page}>
      <PageHeading
        title="UI kit"
        subtitle="Dev-only gallery · every shared component in its states"
        link={{ label: 'Open waiting-area screen ↗', to: '/display/SZR', newTab: true }}
      />

      <KpiRow columns={9}>
        <KpiTile label="Waiting now" value={3} hint="1 being called" />
        <KpiTile label="Longest wait" value={16} unit="min" alert />
        <KpiTile label="With advisors" value={6} />
        <KpiTile label="Past the time we told them" value={1} hint="walk-ins still waiting" alert />
        <KpiTile label="Wait promises kept" value={83} unit="%" hint="18 walk-ins today" />
        <KpiTile label="Walk-ins over cap" value={0} hint="cap 15 min" />
        <KpiTile label="Appointments next 30 min" value={2} hint="0 running late" />
        <KpiTile label="Served today" value={31} hint="3 no-shows" />
        <KpiTile label="Appointments on time" value={null} />
      </KpiRow>

      <div className={styles.grid}>
        <Card title="Buttons" subtitle="sm · md · lg · pending · disabled">
          <div className={styles.row}>
            <Button size="sm">Check in</Button>
            <Button>Save</Button>
            <Button size="lg">Issue walk-in ticket</Button>
          </div>
          <div className={styles.row}>
            <Button variant="secondary">Print ticket</Button>
            <Button variant="quiet">Back</Button>
            <Button variant="danger">Mark no-show</Button>
            <Button variant="link">change advisor</Button>
          </div>
          <div className={styles.row}>
            <Button pending>Sign in</Button>
            <Button variant="secondary" disabled tooltip="Not built yet">
              Send SMS <PlaceholderTag />
            </Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className={styles.greenStrip}>
            <Button variant="navPillActive">Overview</Button>
            <Button variant="navPill">Settings</Button>
          </div>
        </Card>

        <Card title="Chips" subtitle="status · type · advisor state">
          <div className={styles.row}>
            {STATUSES.map((s) => (
              <StatusChip key={s} status={s} />
            ))}
          </div>
          <div className={styles.row}>
            <TypeChip spec={{ text: 'Appointment 12:30', tone: 'green' }} />
            <TypeChip spec={{ text: 'Walk-in', tone: 'outline' }} />
            <TypeChip spec={{ text: 'Late appt 11:00 · walk-in', tone: 'amber' }} />
            <TypeChip spec={{ text: '18 min late · walk-in', tone: 'clay' }} />
            <TypeChip spec={{ text: 'in 28 min', tone: 'grey' }} />
          </div>
          <div className={styles.row}>
            {(['serving', 'calling', 'available', 'break', 'offline'] as const).map((s) => (
              <AdvisorStateChip key={s} state={s} />
            ))}
            <Chip tone="green" size="sm">
              Soonest
            </Chip>
          </div>
          <div className={styles.row}>
            <PlaceholderTag />
            <PlaceholderTag kind="MOCK DATA" />
            <PlaceholderTag text="Placeholder · does Keyloop name one?" />
          </div>
        </Card>

        <Card title="Choices" subtitle="segmented · pills · switch">
          <Segmented
            fullWidth
            ariaLabel="Check-in type"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'appointment', label: 'Appointment' },
              { value: 'walkin', label: 'Walk-in' },
            ]}
          />
          <div className={styles.row}>
            <Segmented
              ariaLabel="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'available', label: 'Available' },
                { value: 'break', label: 'Break', tone: 'amber' },
                { value: 'offline', label: 'Offline', tone: 'dark', disabled: true, tooltip: 'Finish or transfer your customer first' },
              ]}
            />
          </div>
          <SectionLabel>Service</SectionLabel>
          <PillChoice
            ariaLabel="Service"
            value={service}
            onChange={setService}
            options={[
              { value: 'SVC', label: 'Service · 25m' },
              { value: 'STD', label: 'Standard · 15m' },
              { value: 'COL', label: 'Collection · 8m' },
            ]}
          />
          <SectionLabel>Brands</SectionLabel>
          <PillChoice
            multiple
            ariaLabel="Brands"
            value={brands}
            onChange={setBrands}
            options={[
              { value: 'BMW', label: 'BMW' },
              { value: 'MINI', label: 'MINI' },
              { value: 'BMWi', label: 'BMWi' },
            ]}
          />
          <div className={styles.row}>
            <Switch checked={on} onChange={setOn} label="Live simulator" onText="On" offText="Off" />
          </div>
        </Card>

        <Card title="Inputs">
          <FieldGrid columns={2}>
            <Field label="Customer name">
              <TextInput value={text} onChange={setText} />
            </Field>
            <Field label="Mobile" error={text === 'x' ? 'Example error' : undefined}>
              <TextInput type="tel" value="" onChange={() => undefined} placeholder="+971" />
            </Field>
            <Field label="Advisor">
              <Select<string | null>
                value={advisor}
                onChange={setAdvisor}
                options={[
                  { value: null, label: 'Whoever is free first' },
                  { value: 'omar', label: 'Omar Haddad · Desk 1 · free' },
                  { value: 'layla', label: 'Layla Mansour · Desk 2 · serving' },
                  { value: 'ravi', label: 'Ravi Menon · Desk 5 · break' },
                ]}
              />
            </Field>
            <Field label="Code" hint="Locked after creation">
              <TextInput value="SZR" onChange={() => undefined} locked mono />
            </Field>
            <Field label="Search" span="full">
              <TextInput search value={search} onChange={setSearch} placeholder="Name, plate, mobile or Keyloop ref" />
            </Field>
            <Field label="Walk-in wait cap">
              <NumberInput value={num} onChange={setNum} min={0} />
            </Field>
            <Field label="Note" span="full">
              <Textarea value={note} onChange={setNote} placeholder="Optional" />
            </Field>
          </FieldGrid>
        </Card>

        <Card title="Live values">
          <div className={styles.stack}>
            <div className={styles.row}>
              <TicketNumber value="A-014" size="xl" />
              <Timer since={now - 13 * 60_000} expectedMin={25} size="xl" alertWhenOver />
            </div>
            <ProgressBar value={13 / 25} height={6} valueText="13 of 25 minutes" />
            <ProgressBar value={33 / 25} alert valueText="33 of 25 minutes" />
            <AdvisorBar mix={{ free: 1, busy: 6, brk: 1, offline: 1 }} />
            <div className={styles.row}>
              <Mono>KL-SZR-1019-030</Mono>
              <Tooltip content="Finish or transfer your customer first">
                <Button variant="secondary" size="sm">
                  Hover me
                </Button>
              </Tooltip>
              <Logo tone="green" height={22} />
            </div>
          </div>
        </Card>

        <Card title="Feedback">
          <Banner>
            <strong>Queue rules are placeholders</strong> until management answers question 6.
          </Banner>
          <div className={styles.row}>
            <Button variant="secondary" onClick={() => toast.success('Advisor changed')}>
              Success toast
            </Button>
            <Button variant="secondary" onClick={() => toast.error('Finish your current customer first')}>
              Error toast
            </Button>
          </div>
          <div className={styles.row}>
            <Button onClick={() => setOpen('narrow')}>Narrow dialog</Button>
            <Button onClick={() => setOpen('wide')}>Wide dialog</Button>
            <Button variant="danger" onClick={() => setOpen('confirm')}>
              Confirm dialog
            </Button>
          </div>
          <EmptyState text="Nobody waiting" />
          <LoadingState variant="card" />
        </Card>
      </div>

      <Card title="Queue" subtitle="4 waiting · in the order they will be called" className={styles.tableCard}>
        <Table<DemoRow>
          minWidth={700}
          rows={ROWS}
          rowKey={(r) => r.id}
          rowTone={(r) => r.tone}
          columns={[
            { key: 'pos', header: '#', width: 28, numeric: true, render: (r) => r.pos },
            { key: 'ticket', header: 'Ticket', width: 72, render: (r) => <TicketNumber value={r.ticket} /> },
            { key: 'customer', header: 'Customer', render: (r) => <CellStack primary={r.name} secondary={r.plate} /> },
            { key: 'type', header: 'Type', width: 150, render: () => <TypeChip spec={{ text: 'Walk-in', tone: 'outline' }} /> },
            {
              key: 'menu',
              header: <span className="sr-only">Actions</span>,
              width: 40,
              render: (r) => (
                <RowMenu
                  ariaLabel={`Actions for ${r.ticket}`}
                  items={[
                    { label: 'Change advisor…', onSelect: () => setOpen('narrow') },
                    { label: 'Move to front…', onSelect: () => toast.success('Moved to the front') },
                    { label: 'Mark no-show', onSelect: () => setOpen('confirm') },
                    { label: 'Cancel ticket…', destructive: true, onSelect: () => toast.success('Ticket cancelled') },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      <Dialog
        open={open === 'narrow' || open === 'wide'}
        width={open === 'wide' ? 'wide' : 'default'}
        onClose={() => setOpen('none')}
        title="Change W-018's advisor"
        description="Chloe moves to this advisor's line and keeps their place by arrival time. Tell them who will see them."
        onSubmit={() => {
          toast.success('Advisor changed');
          setOpen('none');
        }}
        actions={
          <>
            <Button variant="quiet" onClick={() => setOpen('none')}>
              Back
            </Button>
            <Button type="submit">Change advisor</Button>
          </>
        }
      >
        <Field label="Advisor">
          <Select<string | null>
            value={advisor}
            onChange={setAdvisor}
            options={[
              { value: null, label: 'Whoever is free first' },
              { value: 'omar', label: 'Omar Haddad · Desk 1' },
            ]}
          />
        </Field>
        <Field label="Reason">
          <TextInput value={text} onChange={setText} />
        </Field>
      </Dialog>

      <Dialog
        open={open === 'confirm'}
        onClose={() => setOpen('none')}
        title="W-018 — no-show?"
        description="Chloe is not here. The ticket closes as a no-show."
        initialFocus={backRef}
        actions={
          <>
            <Button ref={backRef} variant="quiet" onClick={() => setOpen('none')}>
              Back
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                toast.success('Marked as no-show');
                setOpen('none');
              }}
            >
              Mark no-show
            </Button>
          </>
        }
      />
    </div>
  );
}
