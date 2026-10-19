import { useState } from 'react';
import { Button, Field, FieldGrid, PillChoice, SectionLabel, TextInput, Textarea, useToast } from '@/components/ui';
import { issueWalkIn, selectBrands, selectServiceTypes, selectWalkInOptions, useAppState, useLive } from '@/store';
import type { AdvisorId, BranchId, BrandCode, ServiceCode, VisitId } from '@/domain/types';
import { AdvisorChoice } from './AdvisorChoice';
import { QuoteBox } from './QuoteBox';
import styles from './CheckIn.module.css';

interface Props {
  branchId: BranchId;
  onIssued(visitId: VisitId): void;
}

interface Form {
  name: string;
  mobile: string;
  plate: string;
  vehicle: string;
  note: string;
}

const EMPTY_FORM: Form = { name: '', mobile: '', plate: '', vehicle: '', note: '' };

/** "auto" follows the soonest advisor as the quotes move; otherwise the advisor reception picked. */
type AdvisorPick = { kind: 'auto' } | { kind: 'picked'; advisorId: AdvisorId | null };

/** Walk-in tab: service, brand, advisor (live quotes), customer fields, Issue walk-in ticket. */
export function WalkInTab({ branchId, onIssued }: Props) {
  const toast = useToast();
  const services = useAppState(
    (s) => selectServiceTypes(s).map((t) => ({ value: t.code, label: `${t.name} · ${t.expectedMin}m` })),
    sameOptions,
  );
  const brands = useAppState(selectBrands);

  const [serviceChoice, setService] = useState<ServiceCode | null>(null);
  const [brandChoice, setBrand] = useState<BrandCode | null>(null);
  const [pick, setPick] = useState<AdvisorPick>({ kind: 'auto' });
  const [form, setForm] = useState<Form>(EMPTY_FORM);

  // Fall back to the first option if nothing is chosen yet or the choice was removed in Settings.
  const serviceCode = services.find((o) => o.value === serviceChoice)?.value ?? services[0]?.value ?? null;
  const brand = brands.find((b) => b === brandChoice) ?? brands[0] ?? null;

  const options = useLive(
    (s, now) => (serviceCode && brand ? selectWalkInOptions(s, branchId, serviceCode, brand, now) : null),
    [branchId, serviceCode, brand],
  );

  const rows = options?.rows ?? [];
  const selected =
    (pick.kind === 'picked' ? rows.find((r) => r.advisorId === pick.advisorId) : undefined) ??
    rows.find((r) => r.advisorId === options?.defaultAdvisorId) ??
    rows[0] ??
    null;

  const set = (key: keyof Form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const issue = () => {
    if (!serviceCode || !brand || !selected) return;
    const r = issueWalkIn({
      branchId,
      serviceCode,
      brand,
      advisorId: selected.advisorId,
      customer: { name: form.name.trim() || null, mobile: form.mobile, plate: form.plate, vehicle: form.vehicle },
      note: form.note.trim(),
    });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setForm(EMPTY_FORM);
    setPick({ kind: 'auto' });
    onIssued(r.data.visitId);
  };

  const canIssue = !!selected && !options?.none;

  return (
    <form
      className={styles.walkIn}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        issue();
      }}
    >
      <SectionLabel first id="walkin-service">
        Service
      </SectionLabel>
      {serviceCode !== null && (
        <PillChoice<ServiceCode>
          options={services}
          value={serviceCode}
          onChange={(v) => {
            setService(v);
            setPick({ kind: 'auto' });
          }}
          ariaLabel="Service"
        />
      )}

      <SectionLabel>Brand</SectionLabel>
      {brand !== null && (
        <PillChoice<BrandCode>
          options={brands.map((b) => ({ value: b, label: b }))}
          value={brand}
          onChange={(v) => {
            setBrand(v);
            setPick({ kind: 'auto' });
          }}
          ariaLabel="Brand"
        />
      )}

      {options && rows.length > 0 && !options.none && (
        <>
          <SectionLabel>Advisor</SectionLabel>
          <AdvisorChoice
            rows={rows}
            selected={selected}
            aboutLine={options.aboutLine}
            onPick={(advisorId) => setPick({ kind: 'picked', advisorId })}
          />
        </>
      )}

      {options?.none ? (
        <QuoteBox none={options.none} />
      ) : (
        options && selected && <QuoteBox quote={options.quoteBox(selected)} />
      )}

      <FieldGrid columns={2} gap={10} className={styles.fields}>
        <Field label="Customer name">
          <TextInput value={form.name} onChange={set('name')} autoComplete="off" />
        </Field>
        <Field label="Mobile">
          <TextInput type="tel" value={form.mobile} onChange={set('mobile')} placeholder="+971" autoComplete="off" />
        </Field>
        <Field label="Plate">
          <TextInput value={form.plate} onChange={set('plate')} autoComplete="off" />
        </Field>
        <Field label="Vehicle">
          <TextInput value={form.vehicle} onChange={set('vehicle')} placeholder="e.g. X5 xDrive40i" autoComplete="off" />
        </Field>
        <Field label="Note" span="full">
          <Textarea value={form.note} onChange={set('note')} placeholder="Optional" rows={2} />
        </Field>
      </FieldGrid>

      <Button type="submit" size="lg" fullWidth disabled={!canIssue} className={styles.issue}>
        Issue walk-in ticket
      </Button>
    </form>
  );
}

function sameOptions(a: { value: string; label: string }[], b: { value: string; label: string }[]): boolean {
  return a.length === b.length && a.every((x, i) => x.value === b[i]?.value && x.label === b[i]?.label);
}
