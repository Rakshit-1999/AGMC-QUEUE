import { selectDemoAccounts, useAppState } from '@/store';
import { Chip } from '@/components/ui';
import styles from './LoginPage.module.css';

type DemoGroups = ReturnType<typeof selectDemoAccounts>;

/** Structural equality so the list only re-renders when accounts actually change. */
function sameGroups(a: DemoGroups, b: DemoGroups): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((g, i) => {
    const h = b[i];
    if (!h || g.heading !== h.heading || g.rows.length !== h.rows.length) return false;
    return g.rows.every((r, j) => {
      const s = h.rows[j];
      return !!s && r.username === s.username && r.name === s.name && r.roleLabel === s.roleLabel;
    });
  });
}

/** "DEMO ACCOUNTS · PASSWORD agmc-demo" — demo only; clicking a row signs in as that person. */
export function DemoAccounts({ onPick }: { onPick: (username: string) => void }) {
  const groups = useAppState(selectDemoAccounts, sameGroups);

  return (
    <section className={styles.demo} aria-labelledby="demo-title">
      <h2 id="demo-title" className={styles.demoTitle}>
        Demo accounts · Password <span className={`mono ${styles.demoPassword}`}>agmc-demo</span>
      </h2>
      <div className={styles.demoList}>
        {groups.map((g) => (
          <div key={g.heading} role="group" aria-label={g.heading}>
            <h3 className={styles.groupHeading}>{g.heading}</h3>
            <ul>
              {g.rows.map((r) => (
                <li key={r.username}>
                  <button
                    type="button"
                    className={styles.demoRow}
                    onClick={() => onPick(r.username)}
                    aria-label={`Sign in as ${r.name} (${r.username}), ${r.roleLabel}`}
                  >
                    <span className={styles.demoWho}>
                      <span className={styles.demoName}>{r.name}</span>
                      <span className={`mono ${styles.demoUser}`}>{r.username}</span>
                    </span>
                    <Chip tone="grey">{r.roleLabel}</Chip>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
