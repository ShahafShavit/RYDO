/* eslint-disable react-refresh/only-export-components */
import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ROUTES } from './route-paths';
import { ProtectedRoute, AdminRoute } from './route-guards';

import PublicLayout from '@/shared/components/layout/PublicLayout';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AdminLayout from '@/shared/components/layout/AdminLayout';

// Lazy-loaded pages
const LandingPage = lazy(() => import('@/pages/landing/LandingPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const RoutesExplorePage = lazy(() => import('@/pages/routes/RoutesExplorePage'));
const RouteDetailsPage = lazy(() => import('@/pages/routes/RouteDetailsPage'));
const YourRoutesPage = lazy(() => import('@/pages/routes/YourRoutesPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminRoutesPage = lazy(() => import('@/pages/admin/AdminRoutesPage'));
const AdminHazardsPage = lazy(() => import('@/pages/admin/AdminHazardsPage'));
const NotFoundPage = lazy(() => import('@/pages/not-found/NotFoundPage'));
const RideEventPage = lazy(() => import('@/pages/rides/RideEventPage'));
const MyRidesPage = lazy(() => import('@/pages/rides/MyRidesPage'));
const ClubsPage = lazy(() => import('@/pages/clubs/ClubsPage'));
const ClubDetailPage = lazy(() => import('@/pages/clubs/ClubDetailPage'));

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: ROUTES.home, element: <LandingPage /> },
      { path: ROUTES.login, element: <LoginPage /> },
      { path: ROUTES.register, element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: ROUTES.dashboard, element: <DashboardPage /> },
          { path: ROUTES.routes, element: <RoutesExplorePage /> },
          { path: ROUTES.routeDetails, element: <RouteDetailsPage /> },
          { path: ROUTES.yourRoutes, element: <YourRoutesPage /> },
          { path: ROUTES.myRides, element: <MyRidesPage /> },

          { path: '/rides/groups', element: <Navigate to={ROUTES.clubs} replace /> },
          { path: ROUTES.clubs, element: <ClubsPage /> },
          { path: ROUTES.clubDetails, element: <ClubDetailPage /> },
          { path: ROUTES.rideEvent, element: <RideEventPage /> },

          { path: ROUTES.settings, element: <SettingsPage /> },
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
    path: '*',
    element: <NotFoundPage />,
  },
]);
