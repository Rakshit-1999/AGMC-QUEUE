// Settings tab ids and labels (SPEC Page 6). The ids mirror the route guard's list
// (src/app/guards.tsx SETTINGS_TABS); pages may not import from '@/app', so they are restated here.

export const SETTINGS_TAB_IDS = ['branches', 'advisors', 'services', 'users', 'keyloop', 'audit', 'demo'] as const;
export type SettingsTabId = (typeof SETTINGS_TAB_IDS)[number];

export const SETTINGS_TAB_LABEL: Readonly<Record<SettingsTabId, string>> = {
  branches: 'Branches & queue rules',
  advisors: 'Advisors',
  services: 'Service types & brands',
  users: 'Users & roles',
  keyloop: 'Keyloop bookings',
  audit: 'Audit log',
  demo: 'Demo',
};

export function isSettingsTabId(tab: string | undefined): tab is SettingsTabId {
  return tab !== undefined && (SETTINGS_TAB_IDS as readonly string[]).includes(tab);
}

export function settingsTabPath(tab: SettingsTabId): string {
  return `/manager/settings/${tab}`;
}

export const tabDomId = (tab: SettingsTabId): string => `settings-tab-${tab}`;
export const panelDomId = (tab: SettingsTabId): string => `settings-panel-${tab}`;
