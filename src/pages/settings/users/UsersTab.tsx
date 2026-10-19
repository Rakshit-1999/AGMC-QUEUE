import type { User } from '@/domain/types';
import { getState, selectUsersTable, useAppState } from '@/store';
import { Banner, Button, Card, Chip, Mono, Reveal, Table, type TableColumn } from '@/components/ui';
import { EDIT_COL_WIDTH, EditButton, SETTINGS_TABLE_MIN } from '../shared/controls';
import { useDialogTarget } from '../shared/useDialogTarget';
import { UserDialog } from './UserDialog';
import styles from '../shared/settings.module.css';

type UserRow = ReturnType<typeof selectUsersTable>[number];

/** Tab 4 — Users & roles. */
export function UsersTab() {
  const rows = useAppState(selectUsersTable);
  const dialog = useDialogTarget<{ user: User | null }>();

  const edit = (row: UserRow) => {
    const user = getState().users[row.username];
    if (user) dialog.show({ user });
  };

  const columns: TableColumn<UserRow>[] = [
    { key: 'username', header: 'Username', width: 140, render: (r) => <Mono>{r.username}</Mono> },
    { key: 'name', header: 'Name', minWidth: 140, render: (r) => r.name },
    { key: 'role', header: 'Role', minWidth: 190, render: (r) => r.roleLabel },
    { key: 'branch', header: 'Branch', minWidth: 140, render: (r) => r.branch },
    {
      key: 'status',
      header: 'Status',
      width: 88,
      render: (r) => (r.active ? <Chip tone="green">Active</Chip> : <Chip tone="clay">Blocked</Chip>),
    },
    { key: 'edit', header: <span className="sr-only">Edit</span>, width: EDIT_COL_WIDTH, render: (r) => <EditButton name={r.username} onClick={() => edit(r)} /> },
  ];

  return (
    <div className={styles.stack}>
      <Banner className={styles.banner}>
        <strong>Sign-in is a placeholder.</strong> Usernames and passwords for now; AGMC Microsoft sign-in (SSO) replaces them
        (question 8). A branch-manager role (one branch only) can be added if management wants it (question 7).
      </Banner>
      <Reveal>
        <Card
          title="Users & roles"
          actions={
            <Button size="sm" onClick={() => dialog.show({ user: null })}>
              + Add user
            </Button>
          }
        >
          <Table columns={columns} rows={rows} rowKey={(r) => r.username} dense minWidth={SETTINGS_TABLE_MIN} caption="Users & roles" />
        </Card>
      </Reveal>
      {dialog.target && <UserDialog key={dialog.session} open={dialog.open} user={dialog.target.user} onClose={dialog.close} />}
    </div>
  );
}
