import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import type { Role } from '@/domain/types';
import { ERR } from '@/domain/messages';
import { signOut, useAppState, useHydrated, useSession, useSessionStatus } from '@/store';
import { LoadingState, toast } from '@/components/ui';

/** Settings tabs (ARCHITECTURE §6.1). */
export const SETTINGS_TABS = ['branches', 'advisors', 'services', 'users', 'keyloop', 'audit', 'demo'] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

export function isSettingsTab(tab: string | undefined): tab is SettingsTab {
  return tab !== undefined && (SETTINGS_TABS as readonly string[]).includes(tab);
}

/** Shows a clay toast once, then redirects. */
function RedirectWithToast({ to, message }: { to: string; message: string }) {
  useEffect(() => {
    toast.error(message);
  }, [message]);
  return <Navigate to={to} replace />;
}

/** `/`: signed in → role home, else /login. */
export function RootRedirect() {
  const hydrated = useHydrated();
  const session = useSession();
  if (!hydrated) return <LoadingState />;
  return <Navigate to={session ? session.home : '/login'} replace />;
}

/** /login: signed-in users go straight to their home. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const session = useSession();
  if (!hydrated) return <LoadingState />;
  if (session) return <Navigate to={session.home} replace />;
  return <>{children}</>;
}

/**
 * Any signed-in route. A session whose user was removed or blocked ('invalid') → "Please sign in again."
 * + /login. No session at all ('none': never signed in, or just signed out) → /login quietly.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const status = useSessionStatus();
  const session = useSession();
  if (!hydrated) return <LoadingState />;
  if (status === 'invalid') return <RedirectWithToast to="/login" message={ERR.signInAgain} />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Role gate: wrong role → "Your role cannot open this" + own home. Must sit inside RequireSession. */
export function RequireRole({ roles, children }: { roles: readonly Role[]; children: ReactNode }) {
  const session = useSession();
  if (!session) return null;
  if (!roles.includes(session.user.role)) {
    return <RedirectWithToast to={session.home} message={ERR.roleCannotOpen} />;
  }
  return <>{children}</>;
}

/** /advisor: the account must be linked to an advisor, else toast + sign out → /login. */
export function RequireAdvisorLink({ children }: { children: ReactNode }) {
  const session = useSession();
  const linked = !!session?.advisor;
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    if (linked || signedOut) return;
    toast.error(ERR.notLinkedToAdvisor);
    signOut();
    setSignedOut(true);
  }, [linked, signedOut]);

  if (linked) return <>{children}</>;
  return signedOut ? <Navigate to="/login" replace /> : null;
}

/**
 * /reception?branch=<id>. Normalises the URL so `?branch=` is ALWAYS present:
 * - reception: own branch; another branch → "Not your branch" + own branch
 * - manager: any branch; missing or unknown → first active branch
 * The page reads the branch with `useSearchParams().get('branch')`.
 */
export function RequireBranchAccess({ children }: { children: ReactNode }) {
  const session = useSession();
  const [params] = useSearchParams();
  const branches = useAppState((s) => s.branches);
  const branchOrder = useAppState((s) => s.branchOrder);
  if (!session) return null;

  const requested = params.get('branch');

  if (session.user.role === 'reception') {
    const own = session.branch?.id ?? session.user.branchId;
    if (!own) return <RedirectWithToast to="/login" message={ERR.signInAgain} />;
    if (requested === own) return <>{children}</>;
    if (requested === null) return <Navigate to={`/reception?branch=${encodeURIComponent(own)}`} replace />;
    return <RedirectWithToast to={`/reception?branch=${encodeURIComponent(own)}`} message={ERR.notYourBranch} />;
  }

  // Manager
  if (requested !== null && branches[requested]) return <>{children}</>;
  const firstActive = branchOrder.find((id) => branches[id]?.active) ?? branchOrder[0];
  if (!firstActive) return <Navigate to="/manager" replace />;
  return <Navigate to={`/reception?branch=${encodeURIComponent(firstActive)}`} replace />;
}

/** /manager/branch/:branchId — unknown id → /manager. */
export function RequireKnownBranch({ children }: { children: ReactNode }) {
  const { branchId } = useParams();
  const exists = useAppState((s) => (branchId ? s.branches[branchId] !== undefined : false));
  if (!exists) return <Navigate to="/manager" replace />;
  return <>{children}</>;
}

/** /manager/settings/:tab — unknown tab → branches. */
export function RequireSettingsTab({ children }: { children: ReactNode }) {
  const { tab } = useParams();
  if (!isSettingsTab(tab)) return <Navigate to="/manager/settings/branches" replace />;
  return <>{children}</>;
}
