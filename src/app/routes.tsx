import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoadingState } from '@/components/ui';
import { AppShell, SmoothScrollLayout } from './AppShell';
import {
  PublicOnly,
  RequireAdvisorLink,
  RequireBranchAccess,
  RequireKnownBranch,
  RequireRole,
  RequireSettingsTab,
  RootRedirect,
} from './guards';

// Each page folder's index.ts exports its page component by name; pages are code-split.
const LoginPage = lazy(() => import('@/pages/login').then((m) => ({ default: m.LoginPage })));
const ReceptionPage = lazy(() => import('@/pages/reception').then((m) => ({ default: m.ReceptionPage })));
const AdvisorDeskPage = lazy(() => import('@/pages/advisor').then((m) => ({ default: m.AdvisorDeskPage })));
const OverviewPage = lazy(() => import('@/pages/manager/overview').then((m) => ({ default: m.OverviewPage })));
const BranchDashboardPage = lazy(() =>
  import('@/pages/manager/dashboard').then((m) => ({ default: m.BranchDashboardPage })),
);
const SettingsPage = lazy(() => import('@/pages/settings').then((m) => ({ default: m.SettingsPage })));
const DisplayPage = lazy(() => import('@/pages/display').then((m) => ({ default: m.DisplayPage })));
const KitPage = import.meta.env.DEV ? lazy(() => import('./dev/KitPage').then((m) => ({ default: m.KitPage }))) : null;

/** Route table (ARCHITECTURE §6.1). */
export const router = createBrowserRouter([
  {
    element: <SmoothScrollLayout />,
    children: [
      { path: '/', element: <RootRedirect /> },
      {
        path: '/login',
        element: (
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        ),
      },
      {
        element: <AppShell />,
        children: [
          {
            path: '/reception',
            element: (
              <RequireRole roles={['reception', 'manager']}>
                <RequireBranchAccess>
                  <ReceptionPage />
                </RequireBranchAccess>
              </RequireRole>
            ),
          },
          {
            path: '/advisor',
            element: (
              <RequireRole roles={['advisor']}>
                <RequireAdvisorLink>
                  <AdvisorDeskPage />
                </RequireAdvisorLink>
              </RequireRole>
            ),
          },
          {
            path: '/manager',
            element: (
              <RequireRole roles={['manager']}>
                <OverviewPage />
              </RequireRole>
            ),
          },
          {
            path: '/manager/branch/:branchId',
            element: (
              <RequireRole roles={['manager']}>
                <RequireKnownBranch>
                  <BranchDashboardPage />
                </RequireKnownBranch>
              </RequireRole>
            ),
          },
          { path: '/manager/settings', element: <Navigate to="/manager/settings/branches" replace /> },
          {
            path: '/manager/settings/:tab',
            element: (
              <RequireRole roles={['manager']}>
                <RequireSettingsTab>
                  <SettingsPage />
                </RequireSettingsTab>
              </RequireRole>
            ),
          },
        ],
      },
      ...(KitPage ? [{ path: '/__kit', element: <KitPage /> }] : []),
    ],
  },
  {
    // TV: no top bar, no Lenis, no session.
    path: '/display/:code',
    element: (
      <Suspense fallback={<LoadingState />}>
        <DisplayPage />
      </Suspense>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
