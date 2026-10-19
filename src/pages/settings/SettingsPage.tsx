import type { ReactElement } from 'react';
import { useParams } from 'react-router-dom';
import { useHydrated } from '@/store';
import { LoadingState, PageHeading } from '@/components/ui';
import { SettingsTabs } from './SettingsTabs';
import { isSettingsTabId, panelDomId, tabDomId, type SettingsTabId } from './tabs';
import { BranchesTab } from './branches/BranchesTab';
import { AdvisorsTab } from './advisors/AdvisorsTab';
import { ServicesTab } from './services/ServicesTab';
import { UsersTab } from './users/UsersTab';
import { KeyloopTab } from './keyloop/KeyloopTab';
import { AuditTab } from './audit/AuditTab';
import { DemoTab } from './demo/DemoTab';
import styles from './SettingsPage.module.css';

const TAB_CONTENT: Readonly<Record<SettingsTabId, () => ReactElement>> = {
  branches: () => <BranchesTab />,
  advisors: () => <AdvisorsTab />,
  services: () => <ServicesTab />,
  users: () => <UsersTab />,
  keyloop: () => <KeyloopTab />,
  audit: () => <AuditTab />,
  demo: () => <DemoTab />,
};

/** Page 6 — Settings (/manager/settings/:tab). The route guard only lets known tabs through. */
export function SettingsPage() {
  const { tab: param } = useParams();
  const hydrated = useHydrated();
  const tab: SettingsTabId = isSettingsTabId(param) ? param : 'branches';

  return (
    <>
      <PageHeading title="Settings" subtitle="Everything here applies at once and is written to the audit log." />
      <div className={styles.layout}>
        <SettingsTabs current={tab} />
        <div id={panelDomId(tab)} role="tabpanel" aria-labelledby={tabDomId(tab)} tabIndex={-1} className={styles.panel}>
          {hydrated ? TAB_CONTENT[tab]() : <LoadingState variant="card" />}
        </div>
      </div>
    </>
  );
}
