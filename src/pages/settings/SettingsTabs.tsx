import { useRef, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { SETTINGS_TAB_IDS, SETTINGS_TAB_LABEL, panelDomId, settingsTabPath, tabDomId, type SettingsTabId } from './tabs';
import styles from './SettingsPage.module.css';

/**
 * Vertical tab list (DESIGN §2.6, §4.2). Each tab is a route (/manager/settings/<tab>);
 * Up/Down move the selection, Home/End jump, and the selected tab is the only tab stop.
 */
export function SettingsTabs({ current }: { current: SettingsTabId }) {
  const navigate = useNavigate();
  const refs = useRef<Partial<Record<SettingsTabId, HTMLButtonElement | null>>>({});

  const select = (tab: SettingsTabId, focus: boolean) => {
    if (focus) refs.current[tab]?.focus();
    if (tab !== current) navigate(settingsTabPath(tab));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = SETTINGS_TAB_IDS.indexOf(current);
    const last = SETTINGS_TAB_IDS.length - 1;
    let next: number | null = null;
    if (e.key === 'ArrowDown') next = i === last ? 0 : i + 1;
    else if (e.key === 'ArrowUp') next = i === 0 ? last : i - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    const tab = SETTINGS_TAB_IDS[next];
    if (tab) select(tab, true);
  };

  return (
    <div role="tablist" aria-orientation="vertical" aria-label="Settings" className={styles.tablist} onKeyDown={onKeyDown}>
      {SETTINGS_TAB_IDS.map((tab) => {
        const selected = tab === current;
        return (
          <button
            key={tab}
            ref={(el) => {
              refs.current[tab] = el;
            }}
            id={tabDomId(tab)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelDomId(tab)}
            tabIndex={selected ? 0 : -1}
            className={styles.tab}
            onClick={() => select(tab, false)}
          >
            {SETTINGS_TAB_LABEL[tab]}
          </button>
        );
      })}
    </div>
  );
}
