import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { LoadingState } from '@/components/ui';
import { RequireSession } from './guards';
import { SmoothScroll } from './SmoothScroll';
import { TopBar } from './TopBar';

/** Root layout for every Lenis-scrolled route (sign in + signed-in pages). The TV route sits outside it. */
export function SmoothScrollLayout() {
  return (
    <SmoothScroll>
      <Suspense fallback={<LoadingState />}>
        <Outlet />
      </Suspense>
    </SmoothScroll>
  );
}

/**
 * Signed-in layout: the TopBar renders at once (bare until the store hydrates), the page shows
 * "Loading…" (after 150 ms) until the store is ready and the session is checked.
 */
export function AppShell() {
  return (
    <>
      <TopBar />
      <main id="main" tabIndex={-1} className="app-main">
        <RequireSession>
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </RequireSession>
      </main>
    </>
  );
}
