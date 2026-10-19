import type { ServiceType } from '@/domain/types';
import { ERR, OK } from '@/domain/messages';
import { saveServiceType } from '@/store';
import { Button, Dialog, Field, FieldGrid, NumberInput, Switch, TextInput } from '@/components/ui';
import { useSettingsForm, type ErrorFieldMap } from '../shared/useSettingsForm';
import styles from '../shared/settings.module.css';

interface ServiceTypeForm {
  code: string;
  name: string;
  expectedMin: number;
  ticketLetter: string;
  expressLane: boolean;
  active: boolean;
}

const ERROR_FIELD: ErrorFieldMap<ServiceTypeForm> = {
  [ERR.codeLettersDigits]: 'code',
  [ERR.serviceCodeExists]: 'code',
};

/** Starting minutes for a new service type (the shortest seed type is 8; Standard is 15). */
const NEW_EXPECTED_MIN = 15;

function initForm(svc: ServiceType | null): ServiceTypeForm {
  return {
    code: svc?.code ?? '',
    name: svc?.name ?? '',
    expectedMin: svc?.expectedMin ?? NEW_EXPECTED_MIN,
    ticketLetter: svc?.ticketLetter ?? '',
    expressLane: svc?.expressLane ?? false,
    active: svc?.active ?? true,
  };
}

export interface ServiceTypeDialogProps {
  open: boolean;
  /** null = "Add a service type". */
  service: ServiceType | null;
  onClose(): void;
}

/** Add / edit a service type. The code is locked after creation. */
export function ServiceTypeDialog({ open, service, onClose }: ServiceTypeDialogProps) {
  const isNew = service === null;
  const { form, errors, set, report } = useSettingsForm(() => initForm(service));

  const submit = () => {
    const letter = form.ticketLetter.trim();
    const r = saveServiceType(
      {
        code: form.code,
        name: form.name,
        expectedMin: form.expectedMin,
        ticketLetter: letter === '' ? null : letter,
        expressLane: form.expressLane,
        active: form.active,
      },
      service?.code,
    );
    if (report(r, OK.saved, ERROR_FIELD)) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onSubmit={submit}
      title={isNew ? 'Add a service type' : `Edit ${service.name}`}
      actions={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </>
      }
    >
      <FieldGrid>
        <Field label="Code" error={errors.code} hint={isNew ? undefined : 'Locked after creation'}>
          <TextInput value={form.code} onChange={(v) => set('code', v)} locked={!isNew} autoComplete="off" />
        </Field>
        <Field label="Name">
          <TextInput value={form.name} onChange={(v) => set('name', v)} autoComplete="off" />
        </Field>
        <Field label="Expected minutes at the desk">
          <NumberInput value={form.expectedMin} onChange={(v) => set('expectedMin', v)} min={1} max={480} />
        </Field>
        <Field label="Ticket letter (blank = A/W)">
          <TextInput value={form.ticketLetter} onChange={(v) => set('ticketLetter', v)} maxLength={1} width={72} autoComplete="off" />
        </Field>
      </FieldGrid>
      <div className={styles.switchStack}>
        <Switch checked={form.expressLane} onChange={(v) => set('expressLane', v)} label="Express lane (short visits, e.g. collection)" />
        <Switch checked={form.active} onChange={(v) => set('active', v)} label="Active" />
      </div>
    </Dialog>
  );
}
