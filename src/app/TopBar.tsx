import type { MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Role } from '@/domain/types';
import { ROLE_TEXT } from '@/domain/messages';
import { fmtClock } from '@/domain/time';
import { signOut, useNow, useSession, type SessionInfo } from '@/store';
import { Logo } from '@/components/ui';
import { BranchPicker } from './BranchPicker';
import styles from './TopBar.module.css';

interface NavItem {
  label: string;
  to: string;
  /** Path prefixes (exact or followed by "/") that make this pill active. */
  match: string[];
}

const NAV: Record<Role, NavItem[]> = {
  manager: [
    // Overview is active on /manager and /manager/branch/*, not on /manager/settings.
    { label: 'Overview', to: '/manager', match: ['/manager/branch'] },
    { label: 'Settings', to: '/manager/settings', match: ['/manager/settings'] },
  ],
  reception: [{ label: 'Queue', to: '/reception', match: ['/reception'] }],
  advisor: [{ label: 'My desk', to: '/advisor', match: ['/advisor'] }],
};

function isActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.to) return true;
  return item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

/** "Omar Haddad" + " · Service advisor" / " · Main Branch (SZR) · Reception" / " · Manager". */
function identity(session: SessionInfo): { name: string; rest: string } {
  const { user, branch } = session;
  const role = ROLE_TEXT[user.role];
  if (user.role === 'reception' && branch) return { name: user.name, rest: ` · ${branch.name} · ${role}` };
  return { name: user.name, rest: ` · ${role}` };
}

/** Green 58 px sticky top bar (SPEC "Global elements", DESIGN §1.1). Renders a bare bar while there is no session. */
export function TopBar() {
  const session = useSession();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const home = session?.home ?? '/login';
  const showPicker = session?.user.role === 'manager' && pathname === '/reception';

  const onSignOut = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  return (
    <header className={`${styles.bar} on-green`}>
      <a className="skip-link" href="#main" onClick={focusMain}>
        Skip to content
      </a>
      <Link to={home} className={styles.brand} aria-label="AGMC Queue — home">
        <Logo tone="white" height={22} />
        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.product}>Queue</span>
      </Link>

      {session && (
        <nav className={styles.nav} aria-label="Main">
          {NAV[session.user.role].map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={active ? styles.pillActive : styles.pill}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}

      {showPicker && (
        <div className={styles.picker}>
          <BranchPicker />
        </div>
      )}

      {session && <RightGroup session={session} onSignOut={onSignOut} />}
    </header>
  );
}

function RightGroup({ session, onSignOut }: { session: SessionInfo; onSignOut: () => void }) {
  const now = useNow();
  const { name, rest } = identity(session);
  return (
    <div className={styles.right}>
      <time className={`${styles.clock} num`} aria-label={`Time ${fmtClock(now)}`}>
        {fmtClock(now)}
      </time>
      <span className={styles.user} title={`${name}${rest}`}>
        <span className={styles.userName}>{name}</span>
        <span className={styles.userRole}>{rest}</span>
      </span>
      <button type="button" className={`${styles.pill} ${styles.signOut}`} onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}

/**
 * Skip link: move focus to <main> without a hash jump (Lenis owns scrolling, and SPEC forbids href="#…" jumps).
 * The href stays for semantics; the default is prevented.
 */
function focusMain(e: MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  const main = document.getElementById('main');
  main?.focus();
}
