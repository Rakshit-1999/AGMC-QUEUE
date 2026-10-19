import { useCallback } from 'react';
import type { AdvisorId, BranchId, Role, User } from '@/domain/types';
import { ERR, OK, ROLE_SCOPE_TEXT } from '@/domain/messages';
import { saveUser, selectAdvisorsOfBranch, shallowEqual, useAppState } from '@/store';
import { Button, Dialog, Field, FieldGrid, Select, Switch, TextInput, type SelectOption } from '@/components/ui';
import { useBranchOptions } from '../shared/controls';
import { useSettingsForm, type ErrorFieldMap } from '../shared/useSettingsForm';
import styles from '../shared/settings.module.css';

interface UserForm {
  username: string;
  name: string;
  role: Role;
  branchId: BranchId | null;
  advisorId: AdvisorId | null;
  password: string;
  canSignIn: boolean;
}

const ROLES: readonly Role[] = ['manager', 'reception', 'advisor'];
const ROLE_OPTIONS: SelectOption<Role>[] = ROLES.map((r) => ({ value: r, label: ROLE_SCOPE_TEXT[r] }));

const ERROR_FIELD: ErrorFieldMap<UserForm> = {
  [ERR.username]: 'username',
  [ERR.usernameTaken]: 'username',
  [ERR.branchRequired]: 'branchId',
  [ERR.pickAdvisor]: 'advisorId',
  [ERR.password]: 'password',
  [ERR.ownManagerAccess]: 'role',
};

function initForm(user: User | null): UserForm {
  return {
    username: user?.username ?? '',
    name: user?.name ?? '',
    role: user?.role ?? 'reception',
    branchId: user?.branchId ?? null,
    advisorId: user?.advisorId ?? null,
    password: '',
    canSignIn: user?.canSignIn ?? true,
  };
}

export interface UserDialogProps {
  open: boolean;
  /** null = "Add a user". */
  user: User | null;
  onClose(): void;
}

/** Add / edit a sign-in account. Branch is hidden for managers; Advisor shows for advisors only. */
export function UserDialog({ open, user, onClose }: UserDialogProps) {
  const isNew = user === null;
  const { form, errors, set, report } = useSettingsForm(() => initForm(user));
  const branchOptions = useBranchOptions();
  const branchId = form.branchId;
  const advisorOptions: SelectOption<AdvisorId | null>[] = useAppState(
    useCallback(
      (s) =>
        branchId
          ? selectAdvisorsOfBranch(s, branchId, { includeInactive: true }).map((a) => ({ value: a.id, label: `${a.name} · ${a.desk}` }))
          : [],
      [branchId],
    ),
    (a, b) => a.length === b.length && a.every((x, i) => shallowEqual(x, b[i])),
  );

  const setRole = (role: Role) => {
    set('role', role);
    if (role !== 'advisor') set('advisorId', null);
  };
  const setBranch = (id: BranchId | null) => {
    set('branchId', id);
    if (id !== form.branchId) set('advisorId', null);
  };

  const submit = () => {
    const r = saveUser(
      {
        username: form.username,
        name: form.name,
        role: form.role,
        branchId: form.role === 'manager' ? null : form.branchId,
        advisorId: form.role === 'advisor' ? form.advisorId : null,
        ...(form.password ? { password: form.password } : {}),
        canSignIn: form.canSignIn,
      },
      user?.username,
    );
    if (report(r, OK.saved, ERROR_FIELD)) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onSubmit={submit}
      title={isNew ? 'Add a user' : `Edit ${user.username}`}
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
        <Field label="Username" error={errors.username} hint={isNew ? undefined : 'Locked after creation'}>
          <TextInput
            value={form.username}
            onChange={(v) => set('username', v)}
            locked={!isNew}
            mono
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Field label="Name">
          <TextInput value={form.name} onChange={(v) => set('name', v)} autoComplete="off" />
        </Field>
        <Field label="Role" error={errors.role}>
          <Select<Role> value={form.role} onChange={setRole} options={ROLE_OPTIONS} />
        </Field>
        {form.role !== 'manager' && (
          <Field label="Branch" error={errors.branchId}>
            <Select<BranchId | null> value={form.branchId} onChange={setBranch} options={branchOptions} placeholder="Pick a branch" />
          </Field>
        )}
        {form.role === 'advisor' && (
          <Field label="Advisor" error={errors.advisorId}>
            <Select<AdvisorId | null>
              value={form.advisorId}
              onChange={(v) => set('advisorId', v)}
              options={advisorOptions}
              placeholder="Pick the advisor"
            />
          </Field>
        )}
        <Field label={isNew ? 'Password' : 'New password (leave blank to keep)'} error={errors.password}>
          <TextInput type="password" value={form.password} onChange={(v) => set('password', v)} autoComplete="new-password" />
        </Field>
      </FieldGrid>
      <div className={styles.switches}>
        <Switch checked={form.canSignIn} onChange={(v) => set('canSignIn', v)} label="Can sign in" />
      </div>
    </Dialog>
  );
}
