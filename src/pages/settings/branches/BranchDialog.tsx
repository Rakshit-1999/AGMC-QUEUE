import { useId } from 'react';
import type { AppointmentAdvisorMode, Branch, QueueRules } from '@/domain/types';
import { ADVISOR_MODE_TEXT, ERR, OK } from '@/domain/messages';
import { DEFAULT_RULES, saveBranch } from '@/store';
import {
  Button,
  Dialog,
  Field,
  FieldGrid,
  NumberInput,
  PlaceholderTag,
  SectionLabel,
  Select,
  Switch,
  TextInput,
  type SelectOption,
} from '@/components/ui';
import { useSettingsForm, type ErrorFieldMap } from '../shared/useSettingsForm';
import { QUEUE_RULES } from './rules';
import styles from '../shared/settings.module.css';

interface BranchForm {
  code: string;
  name: string;
  opensAt: string;
  closesAt: string;
  active: boolean;
  mode: AppointmentAdvisorMode;
  rules: QueueRules;
  receptionPassword: string;
}

const MODE_ORDER: readonly AppointmentAdvisorMode[] = ['keyloop_else_allocate', 'allocate_all', 'reception_picks'];
const MODE_OPTIONS: SelectOption<AppointmentAdvisorMode>[] = MODE_ORDER.map((m) => ({ value: m, label: ADVISOR_MODE_TEXT[m] }));

/** New-branch defaults: the seed branches' hours and the SPEC rule defaults. */
const NEW_BRANCH: Omit<BranchForm, 'rules'> = {
  code: '',
  name: '',
  opensAt: '07:30',
  closesAt: '18:00',
  active: true,
  mode: 'keyloop_else_allocate',
  receptionPassword: '',
};

const ERROR_FIELD: ErrorFieldMap<BranchForm> = {
  [ERR.codeLettersDigits]: 'code',
  [ERR.branchCodeExists]: 'code',
  [ERR.openingHours]: 'opensAt',
  [ERR.receptionPassword]: 'receptionPassword',
  [ERR.usernameTaken]: 'receptionPassword',
};

function initForm(branch: Branch | null): BranchForm {
  if (!branch) return { ...NEW_BRANCH, rules: { ...DEFAULT_RULES } };
  return {
    code: branch.code,
    name: branch.name,
    opensAt: branch.opensAt,
    closesAt: branch.closesAt,
    active: branch.active,
    mode: branch.appointmentAdvisorMode,
    rules: { ...branch.rules },
    receptionPassword: '',
  };
}

export interface BranchDialogProps {
  open: boolean;
  /** null = "Add a branch". */
  branch: Branch | null;
  onClose(): void;
}

/** Add / edit a branch with its appointment-advisor mode and queue rules (wide dialog). */
export function BranchDialog({ open, branch, onClose }: BranchDialogProps) {
  const isNew = branch === null;
  const { form, errors, set, report } = useSettingsForm(() => initForm(branch));
  const ruleIdBase = useId();

  const setRule = (key: keyof QueueRules, value: number) => set('rules', { ...form.rules, [key]: value });

  const submit = () => {
    const r = saveBranch(
      {
        code: form.code,
        name: form.name,
        opensAt: form.opensAt,
        closesAt: form.closesAt,
        active: form.active,
        appointmentAdvisorMode: form.mode,
        rules: form.rules,
        ...(isNew && form.receptionPassword ? { receptionPassword: form.receptionPassword } : {}),
      },
      branch?.id,
    );
    if (report(r, isNew ? OK.branchAdded : OK.saved, ERROR_FIELD)) onClose();
  };

  const receptionLogin = `reception.${form.code.trim().toLowerCase() || '<code>'}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onSubmit={submit}
      width="wide"
      title={isNew ? 'Add a branch' : `Edit ${branch.name}`}
      actions={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{isNew ? 'Add branch' : 'Save'}</Button>
        </>
      }
    >
      <FieldGrid columns={2}>
        <Field label="Code" error={errors.code}>
          <TextInput value={form.code} onChange={(v) => set('code', v)} placeholder="e.g. AUH" autoComplete="off" />
        </Field>
        <Field label="Name">
          <TextInput value={form.name} onChange={(v) => set('name', v)} autoComplete="off" />
        </Field>
        <Field label="Opens" error={errors.opensAt}>
          <TextInput value={form.opensAt} onChange={(v) => set('opensAt', v)} width={80} inputMode="numeric" autoComplete="off" />
        </Field>
        <Field label="Closes">
          <TextInput
            value={form.closesAt}
            onChange={(v) => set('closesAt', v)}
            width={80}
            inputMode="numeric"
            autoComplete="off"
            invalid={errors.opensAt !== undefined}
          />
        </Field>
        <Field
          label="Advisor for appointments"
          labelExtra={<PlaceholderTag text="Placeholder · does Keyloop name one?" className={styles.tagGap} />}
          span="full"
        >
          <Select<AppointmentAdvisorMode> value={form.mode} onChange={(v) => set('mode', v)} options={MODE_OPTIONS} />
        </Field>
        {isNew && (
          <Field label={`Reception login password (creates ${receptionLogin}; optional)`} error={errors.receptionPassword} span="full">
            <TextInput
              type="password"
              value={form.receptionPassword}
              onChange={(v) => set('receptionPassword', v)}
              autoComplete="new-password"
            />
          </Field>
        )}
      </FieldGrid>

      <div className={styles.switches}>
        <Switch checked={form.active} onChange={(v) => set('active', v)} label="Active" />
      </div>

      <section className={styles.dialogSection} aria-labelledby={`${ruleIdBase}-head`}>
        <div className={styles.sectionHead}>
          <SectionLabel as="h3" id={`${ruleIdBase}-head`}>
            QUEUE RULES
          </SectionLabel>
          <PlaceholderTag />
        </div>
        {QUEUE_RULES.map((rule) => {
          const id = `${ruleIdBase}-${rule.key}`;
          return (
            <div key={rule.key} className={styles.ruleRow}>
              <div>
                <label htmlFor={id} className={styles.ruleName}>
                  {rule.name}
                </label>
                <p className={styles.ruleText}>{rule.explanation}</p>
              </div>
              <NumberInput id={id} value={form.rules[rule.key]} onChange={(v) => setRule(rule.key, v)} min={0} max={rule.max} />
            </div>
          );
        })}
      </section>
    </Dialog>
  );
}
