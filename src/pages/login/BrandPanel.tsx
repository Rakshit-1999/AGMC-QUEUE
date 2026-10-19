import { Logo } from '@/components/ui';
import styles from './LoginPage.module.css';

export function BrandPanel() {
  return (
    <aside className={styles.brand} aria-label="AGMC Queue">
      <span className={styles.brandLogo}>
        <Logo tone="white" />
      </span>
      <div className={styles.brandCopy}>
        <h2 className={styles.headline}>Every customer, in the right order.</h2>
        <p className={styles.line}>
          Aftersales queue for every AGMC branch — appointments from Keyloop keep their slot, walk-ins fill the gaps, and
          nobody waits without an honest estimate.
        </p>
      </div>
      <p className={styles.footer}>© 2026 AGMC · Prototype</p>
    </aside>
  );
}
