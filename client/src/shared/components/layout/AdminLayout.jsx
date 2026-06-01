import { useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { adminNavigation } from '@/shared/config/navigation';
import { ROUTES, getAppHomeRoute } from '@/app/router/route-paths';
import AppLogo from '@/shared/components/navigation/AppLogo';
import Button from '@/shared/components/ui/button/Button';
import AnimatedOutlet from '@/shared/components/layout/AnimatedOutlet';
import { prefetchAdminRoutes } from '@/shared/components/layout/prefetchAdminRoutes';
import UserProfileDropdown from '@/shared/components/navigation/UserProfileDropdown';
import { BreadcrumbProvider } from '@/shared/context/BreadcrumbContext';
import PageBreadcrumbs from '@/shared/components/navigation/PageBreadcrumbs';
import AdminBoldTabBar from '@/features/admin/components/AdminBoldTabBar';

export default function AdminLayout() {
  useEffect(() => {
    prefetchAdminRoutes();
  }, []);

  return (
    <BreadcrumbProvider>
      <div className="rydo-app-shell h-full max-md:min-h-0 md:h-dvh w-full flex flex-col md:flex-row overflow-hidden bg-[var(--rydo-bg-deep)]">
        <aside className="hidden md:flex flex-col w-60 h-full rydo-glass border-r border-border p-6 shrink-0 z-10">
          <Link
            to={getAppHomeRoute()}
            className="mb-6 inline-flex items-center gap-3 border-b border-border pb-6 hover:opacity-80 transition-opacity"
          >
            <span className="h-3 w-3 rounded-full bg-rydo-purple shadow-[0_0_18px_color-mix(in_srgb,var(--rydo-purple)_75%,transparent)]" />
            <AppLogo />
          </Link>

          <nav className="flex-1 flex flex-col gap-2 overflow-y-auto w-full">
            {adminNavigation.map((item) => {
              const ItemIcon = item.Icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === ROUTES.admin}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-[background-color,color,box-shadow] duration-300 ease-out ${
                      isActive
                        ? 'bg-rydo-purple/18 text-fg shadow-[0_0_24px_color-mix(in_srgb,var(--rydo-purple)_18%,transparent)]'
                        : 'text-fg-muted hover:bg-surface hover:text-fg'
                    }`
                  }
                >
                  {ItemIcon ? (
                    <ItemIcon className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={2} aria-hidden />
                  ) : null}
                  <span className="min-w-0">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-6 pt-6 flex flex-col gap-3 border-t border-border">
            <UserProfileDropdown />
            <NavLink to={ROUTES.dashboard} className="w-full block">
              <Button variant="secondary" className="w-full justify-center">
                Exit Admin
              </Button>
            </NavLink>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col max-md:overflow-hidden md:overflow-y-auto p-0 md:p-8 md:pb-8">
          <div className="mx-auto flex w-full min-w-0 max-w-6xl min-h-0 flex-1 flex-col max-md:overflow-hidden md:min-h-min md:flex-none">
            <div className="hidden md:block">
              <PageBreadcrumbs variant="admin" />
            </div>
            <div className="flex min-h-0 flex-1 flex-col max-md:h-full max-md:overflow-hidden md:block">
              <AnimatedOutlet />
            </div>
          </div>
        </main>

        <AdminBoldTabBar />
      </div>
    </BreadcrumbProvider>
  );
}
