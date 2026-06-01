import { NavLink, useLocation } from 'react-router-dom';
import { adminNavigation } from '@/shared/config/navigation';
import { ROUTES } from '@/app/router/route-paths';
import { AdminMobileModeBar } from '@/features/admin/components/AdminModeNavLink';
import MobileBottomChrome from '@/shared/components/layout/mobile-chrome/MobileBottomChrome';
import { cn } from '@/shared/lib/cn';

function resolveAdminActiveTab(pathname) {
  if (pathname.startsWith(ROUTES.adminUsers)) return ROUTES.adminUsers;
  if (pathname.startsWith(ROUTES.adminRoutes)) return ROUTES.adminRoutes;
  if (pathname.startsWith(ROUTES.adminHazards)) return ROUTES.adminHazards;
  if (pathname.startsWith(ROUTES.adminChallenges)) return ROUTES.adminChallenges;
  if (pathname === ROUTES.admin || pathname.startsWith(`${ROUTES.admin}/`)) return ROUTES.admin;
  return ROUTES.admin;
}

export function AdminTabNav({ className }) {
  const location = useLocation();
  const activeTo = resolveAdminActiveTab(location.pathname);

  return adminNavigation.map((item) => {
    const Icon = item.Icon;
    const isActive = activeTo === item.to;

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === ROUTES.admin}
        className={({ isActive: navActive }) =>
          cn('rydo-bold-tab min-w-0 px-1', (navActive || isActive) && 'rydo-bold-tab-active', className)
        }
        aria-label={item.label}
      >
        <span className="rydo-bold-tab-icon">
          <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.9} aria-hidden />
        </span>
        <span className="truncate text-[10px]">{item.shortLabel || item.label}</span>
      </NavLink>
    );
  });
}

export default function AdminBoldTabBar({ className }) {
  return (
    <MobileBottomChrome
      className={className}
      ariaLabel="Admin sections"
      modeBar={<AdminMobileModeBar />}
      tabs={<AdminTabNav />}
    />
  );
}
