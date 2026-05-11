import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from './route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Loader from '@/shared/components/feedback/Loader';

export function ProtectedRoute() {
  const { isAuthenticated, isAuthReady } = useAuth();

  if (!isAuthReady) return <Loader fullscreen />;
  if (!isAuthenticated) return <Navigate to={ROUTES.login} replace />;

  return <Outlet />;
}

export function GuestOnlyRoute() {
  const { isAuthenticated, isAdmin, isAuthReady } = useAuth();

  if (!isAuthReady) return <Loader fullscreen />;
  if (isAuthenticated) {
    const to = isAdmin ? ROUTES.admin : ROUTES.dashboard;
    return <Navigate to={to} replace />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { isAuthenticated, isAdmin, isAuthReady } = useAuth();

  if (!isAuthReady) return <Loader fullscreen />;
  if (!isAuthenticated) return <Navigate to={ROUTES.login} replace />;
  if (!isAdmin) return <Navigate to={ROUTES.dashboard} replace />;

  return <Outlet />;
}
