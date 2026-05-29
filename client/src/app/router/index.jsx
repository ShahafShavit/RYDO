/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ROUTES } from './route-paths';
import { LegacyRideSpaRedirect, LegacyYourRoutesRedirect } from './legacy-redirects';
import { ProtectedRoute, AdminRoute, GuestOnlyRoute } from './route-guards';

import PublicLayout from '@/shared/components/layout/PublicLayout';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AdminLayout from '@/shared/components/layout/AdminLayout';
import ToolPageShell from '@/shared/components/layout/ToolPageShell';
import Loader from '@/shared/components/feedback/Loader';

const LandingPage = lazy(() => import('@/pages/landing/LandingPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const RoutesExplorePage = lazy(() => import('@/pages/routes/RoutesExplorePage'));
const RouteDetailsPage = lazy(() => import('@/pages/routes/RouteDetailsPage'));
const YourRoutesPage = lazy(() => import('@/pages/routes/YourRoutesPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const UserProfilePage = lazy(() => import('@/pages/users/UserProfilePage'));
const InboxPage = lazy(() => import('@/pages/inbox/InboxPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminRoutesPage = lazy(() => import('@/pages/admin/AdminRoutesPage'));
const AdminHazardsPage = lazy(() => import('@/pages/admin/AdminHazardsPage'));
const NotFoundPage = lazy(() => import('@/pages/not-found/NotFoundPage'));
const RideEventPage = lazy(() => import('@/pages/rides/RideEventPage'));
const MyRidesPage = lazy(() => import('@/pages/rides/MyRidesPage'));
const ClubsPage = lazy(() => import('@/pages/clubs/ClubsPage'));
const ClubDetailPage = lazy(() => import('@/pages/clubs/ClubDetailPage'));
const LeaderboardsPage = lazy(() => import('@/pages/leaderboards/LeaderboardsPage'));
const LiveRideReplayPage = lazy(() => import('@/features/live-ride/LiveRideReplayPage'));
const LiveRideRoute = lazy(() => import('@/features/live-ride/LiveRideRoute'));
const TimelapsePage = lazy(() => import('@/features/timelapse/TimelapsePage'));

/**
 * @param {{ nativeEntry?: boolean }} [options]
 * nativeEntry: skip marketing landing → login (Capacitor app)
 */
export function createAppRoutes(options = {}) {
  const { nativeEntry = false } = options;
  const homeElement = nativeEntry ? <Navigate to={ROUTES.login} replace /> : <LandingPage />;

  return [
    {
      element: <PublicLayout nativeEntry={nativeEntry} />,
      children: [
        { path: ROUTES.home, element: homeElement },
        {
          element: <GuestOnlyRoute />,
          children: [
            { path: ROUTES.login, element: <LoginPage /> },
            { path: ROUTES.register, element: <RegisterPage /> },
          ],
        },
      ],
    },
    {
      element: <ProtectedRoute />,
      children: [
        {
          element: <DashboardLayout />,
          children: [
            { path: ROUTES.dashboard, element: <DashboardPage /> },
            { path: ROUTES.leaderboards, element: <LeaderboardsPage /> },
            { path: ROUTES.routes, element: <RoutesExplorePage /> },
            { path: ROUTES.routeDetails, element: <RouteDetailsPage /> },
            { path: ROUTES.myRoutes, element: <YourRoutesPage /> },
            { path: '/your-routes', element: <LegacyYourRoutesRedirect /> },
            { path: ROUTES.myRides, element: <MyRidesPage /> },
            { path: '/rides/groups', element: <Navigate to={ROUTES.clubs} replace /> },
            { path: ROUTES.clubs, element: <ClubsPage /> },
            { path: ROUTES.clubDetails, element: <ClubDetailPage /> },
            { path: ROUTES.rideEvent, element: <RideEventPage /> },
            { path: ROUTES.rideLive, element: <LiveRideRoute /> },
            { path: '/rides/:rideId', element: <LegacyRideSpaRedirect /> },
            { path: ROUTES.settings, element: <SettingsPage /> },
            { path: ROUTES.inbox, element: <InboxPage /> },
            { path: ROUTES.findPeople, element: <Navigate to={ROUTES.routes} replace /> },
            { path: ROUTES.userProfile, element: <UserProfilePage /> },
          ],
        },
      ],
    },
    {
      element: <AdminRoute />,
      children: [
        {
          element: <AdminLayout />,
          children: [
            { path: ROUTES.admin, element: <AdminDashboardPage /> },
            { path: ROUTES.adminUsers, element: <AdminUsersPage /> },
            { path: ROUTES.adminRoutes, element: <AdminRoutesPage /> },
            { path: ROUTES.adminHazards, element: <AdminHazardsPage /> },
          ],
        },
      ],
    },
    {
      path: ROUTES.live,
      element: (
        <Suspense fallback={<Loader fullscreen />}>
          <ToolPageShell>
            <LiveRideReplayPage />
          </ToolPageShell>
        </Suspense>
      ),
    },
    {
      path: ROUTES.timelapse,
      element: (
        <Suspense fallback={<Loader fullscreen />}>
          <ToolPageShell>
            <TimelapsePage />
          </ToolPageShell>
        </Suspense>
      ),
    },
    {
      path: '*',
      element: <NotFoundPage />,
    },
  ];
}

export const appRoutes = createAppRoutes();
export const router = createBrowserRouter(appRoutes);
