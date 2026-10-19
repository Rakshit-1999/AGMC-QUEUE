import { useCallback } from 'react';
import type { Advisor, BranchId, BrandCode, DeskType, ServiceCode } from '@/domain/types';
import { DESK_TYPE_TEXT, ERR, OK } from '@/domain/messages';
import { saveAdvisor, selectBrands, selectServiceTypes, shallowEqual, useAppState } from '@/store';
import {
  Button,
  Dialog,
  Field,
  FieldGrid,
  PillChoice,
  SectionLabel,
  Select,
  Switch,
  TextInput,
  type PillOption,
  type SelectOption,
} from '@/components/ui';
import { useBranchOptions } from '../shared/controls';
import { useSettingsForm, type ErrorFieldMap } from '../shared/useSettingsForm';
import styles from '../shared/settings.module.css';

interface AdvisorForm {
  name: string;
  branchId: BranchId | null;
  desk: string;
  deskType: DeskType;
  brands: BrandCode[];
  services: ServiceCode[];
  active: boolean;
  loginUsername: string;
  loginPassword: string;
}

const DESK_TYPES: readonly DeskType[] = ['all', 'appointments_only', 'walkin_desk', 'express_desk'];
const TAKES_OPTIONS: SelectOption<DeskType>[] = DESK_TYPES.map((t) => ({ value: t, label: DESK_TYPE_TEXT[t] }));

const ERROR_FIELD: ErrorFieldMap<AdvisorForm> = {
  [ERR.advisorNotInBranch]: 'branchId',
  [ERR.username]: 'loginUsername',
  [ERR.usernameTaken]: 'loginUsername',
  [ERR.password]: 'loginPassword',
};

function initForm(advisor: Advisor | null, defaultBranch: BranchId | null): AdvisorForm {
  return {
    name: advisor?.name ?? '',
    branchId: advisor?.branchId ?? defaultBranch,
    desk: advisor?.desk ?? '',
    deskType: advisor?.deskType ?? 'all',
    brands: advisor ? [...advisor.brands] : [],
    services: advisor ? [...advisor.services] : [],
    active: advisor?.active ?? true,
    loginUsername: '',
    loginPassword: '',
  };
}

const selectServiceOptions = (s: Parameters<typeof selectServiceTypes>[0]) =>
  selectServiceTypes(s, { includeInactive: true }).map((t) => ({ value: t.code, label: t.name }));

export interface AdvisorDialogProps {
  open: boolean;
  /** null = "Add an advisor". */
  advisor: Advisor | null;
  /** Branch preselected when adding (the current filter), if any. */
  defaultBranch: BranchId | null;
  onClose(): void;
}

/** Add / edit a service advisor (wide dialog). Login fields only while the advisor has no login. */
export function AdvisorDialog({ open, advisor, defaultBranch, onClose }: AdvisorDialogProps) {
  const isNew = advisor === null;
  const hasLogin = !!advisor?.username;
  const { form, errors, set, report } = useSettingsForm(() => initForm(advisor, defaultBranch));
  const branchOptions = useBranchOptions();
  const brandOptions: PillOption<BrandCode>[] = useAppState(selectBrands, shallowEqual).map((b) => ({ value: b, label: b }));
  const serviceOptions: PillOption<ServiceCode>[] = useAppState(
    useCallback(selectServiceOptions, []),
    (a, b) => a.length === b.length && a.every((x, i) => shallowEqual(x, b[i])),
  );

  const submit = () => {
    const r = saveAdvisor(
      {
        name: form.name,
        // An empty branch is rejected by the action ("Advisor not in this branch").
        branchId: form.branchId ?? '',
        desk: form.desk,
        deskType: form.deskType,
        brands: form.brands,
        services: form.services,
        active: form.active,
        ...(!hasLogin && form.loginUsername.trim()
          ? { loginUsername: form.loginUsername, loginPassword: form.loginPassword }
          : {}),
      },
      advisor?.id,
    );
    if (report(r, isNew ? OK.advisorAdded : OK.saved, ERROR_FIELD)) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onSubmit={submit}
      width="wide"
      title={isNew ? 'Add an advisor' : `Edit ${advisor.name}`}
      actions={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{isNew ? 'Add advisor' : 'Save'}</Button>
        </>
      }
    >
      <FieldGrid columns={2}>
        <Field label="Name">
          <TextInput value={form.name} onChange={(v) => set('name', v)} autoComplete="off" />
        </Field>
        <Field label="Branch" error={errors.branchId}>
          <Select<BranchId | null> value={form.branchId} onChange={(v) => set('branchId', v)} options={branchOptions} />
        </Field>
        <Field label="Desk">
          <TextInput value={form.desk} onChange={(v) => set('desk', v)} placeholder="Desk 3" autoComplete="off" />
        </Field>
        <Field label="Takes">
          <Select<DeskType> value={form.deskType} onChange={(v) => set('deskType', v)} options={TAKES_OPTIONS} />
        </Field>
      </FieldGrid>

      <div className={styles.pillGroup}>
        <SectionLabel first>BRANDS</SectionLabel>
        <PillChoice<BrandCode>
          multiple
          options={brandOptions}
          value={form.brands}
          onChange={(v) => set('brands', v)}
          ariaLabel="Brands"
        />
        <p className={styles.pillHint}>none picked = every brand</p>
      </div>

      <div className={styles.pillGroup}>
        <SectionLabel first>SERVICE TYPES</SectionLabel>
        <PillChoice<ServiceCode>
          multiple
          options={serviceOptions}
          value={form.services}
          onChange={(v) => set('services', v)}
          ariaLabel="Service types"
        />
        <p className={styles.pillHint}>none picked = every service</p>
      </div>

      <div className={styles.switches}>
        <Switch checked={form.active} onChange={(v) => set('active', v)} label="Active" />
      </div>

      {!hasLogin && (
        <FieldGrid columns={2}>
          <Field label="Login username (optional)" error={errors.loginUsername}>
            <TextInput
              value={form.loginUsername}
              onChange={(v) => set('loginUsername', v)}
              placeholder="firstname.branch"
              mono
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <Field label="Password" error={errors.loginPassword}>
            <TextInput
              type="password"
              value={form.loginPassword}
              onChange={(v) => set('loginPassword', v)}
              autoComplete="new-password"
            />
          </Field>
        </FieldGrid>
      )}
    </Dialog>
  );
}
