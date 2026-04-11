import { useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { dashboardNavigation } from '@/shared/config/navigation';
import { ROUTES } from '@/app/router/route-paths';
import AppLogo from '@/shared/components/navigation/AppLogo';
import Button from '@/shared/components/ui/button/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import MobileNavbar from '@/shared/components/layout/MobileNavbar';
import AnimatedOutlet from '@/shared/components/layout/AnimatedOutlet';
import { prefetchDashboardRoutes } from '@/shared/components/layout/prefetchDashboardRoutes';
import UserProfileDropdown from '@/shared/components/navigation/UserProfileDropdown';

export default function DashboardLayout() {
  const { isAdmin } = useAuth();

  useEffect(() => {
    prefetchDashboardRoutes();
  }, []);

  return (
    <div className="h-dvh w-full flex flex-col md:flex-row overflow-hidden bg-[#171717]">
      <MobileNavbar />

      <aside className="hidden md:flex flex-col w-60 h-full rydo-glass border-r border-white/8 p-6 shrink-0">
        <Link to={ROUTES.home} className="mb-6 inline-flex items-center gap-3 hover:opacity-80 transition-opacity border-b border-white/8 pb-6">
          <span className="h-3 w-3 rounded-full bg-[#21F1A8] shadow-[0_0_18px_rgba(33,241,168,0.65)]" />
          <AppLogo />
        </Link>

        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto w-full">
          {dashboardNavigation.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `rounded-2xl px-4 py-3 text-sm transition-[background-color,color,box-shadow] duration-300 ease-out ${isActive && !item.to.includes('?upload=true')
                  ? 'bg-[#7B5CFF]/18 text-white shadow-[0_0_24px_rgba(123,92,255,0.18)]'
                  : 'text-white/72 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 pt-6 flex flex-col gap-3 border-t border-white/8">
          <UserProfileDropdown />
          {isAdmin && (
            <NavLink to={ROUTES.admin} className="w-full block">
              <Button variant="secondary" className="w-full justify-center">Admin Mode</Button>
            </NavLink>
          )}
        </div>
      </aside>

      <main className="flex-1 h-full overflow-y-auto min-w-0 p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <AnimatedOutlet />
        </div>
      </main>
    </div>
  );
}
