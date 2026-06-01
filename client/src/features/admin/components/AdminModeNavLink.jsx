import { Link } from 'react-router-dom';
import { Bike, ChevronRight, LayoutDashboard } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from '@/shared/lib/cn';

/** Fixed strip above admin mobile tab bar — exit back to rider app. */
export function AdminMobileModeBar({ className }) {
  return (
    <Link
      to={ROUTES.dashboard}
      className={cn(
        'flex w-full shrink-0 items-center justify-center gap-2 border-t border-border bg-[rgba(15,15,16,0.92)] px-4 py-2.5 text-xs font-medium text-fg-muted backdrop-blur-xl transition-colors hover:text-fg',
        className,
      )}
    >
      <Bike className="h-3.5 w-3.5 shrink-0 text-rydo-green" aria-hidden />
      Back to rider app
    </Link>
  );
}

/** Fixed strip above rider mobile tab bar — enter admin (admins only). */
export function RiderMobileAdminBar({ className }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;

  return (
    <Link
      to={ROUTES.admin}
      className={cn(
        'flex w-full shrink-0 items-center justify-center gap-2 border-t border-border bg-[rgba(15,15,16,0.92)] px-4 py-2.5 text-xs font-medium text-fg-muted backdrop-blur-xl transition-colors hover:bg-rydo-purple/10 hover:text-fg',
        className,
      )}
    >
      <LayoutDashboard className="h-3.5 w-3.5 shrink-0 text-rydo-purple" aria-hidden />
      Admin panel
    </Link>
  );
}

export function AdminModeSettingsRow({ variant = 'desktop' }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;

  if (variant === 'bold') {
    return (
      <Link
        to={ROUTES.admin}
        className="rydo-bold-glass-row flex items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium"
      >
        <span className="inline-flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-rydo-purple" aria-hidden />
          Admin mode
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-fg-subtle">
          Manage platform
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </Link>
    );
  }

  return (
    <Link
      to={ROUTES.admin}
      className="flex items-center justify-between gap-4 rounded-2xl border border-rydo-purple/25 bg-rydo-purple/10 px-4 py-3 text-sm font-medium transition-colors hover:bg-rydo-purple/15"
    >
      <span className="inline-flex items-center gap-2">
        <LayoutDashboard className="h-4 w-4 text-rydo-purple" aria-hidden />
        Admin mode
      </span>
      <span className="text-xs text-fg-muted">Manage users, routes, hazards</span>
    </Link>
  );
}
