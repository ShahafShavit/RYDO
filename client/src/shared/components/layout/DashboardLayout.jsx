import { useEffect } from 'react';
import { NavLink, Link, useMatch } from 'react-router-dom';
import { dashboardNavigation } from '@/shared/config/navigation';
import { ROUTES } from '@/app/router/route-paths';
import AppLogo from '@/shared/components/navigation/AppLogo';
import Button from '@/shared/components/ui/button/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import AnimatedOutlet from '@/shared/components/layout/AnimatedOutlet';
import { prefetchDashboardRoutes } from '@/shared/components/layout/prefetchDashboardRoutes';
import UserProfileDropdown from '@/shared/components/navigation/UserProfileDropdown';
import { ClubChatUiProvider, useClubChatUi } from '@/features/club-chat/club-chat-ui-context';
import ClubChatDock from '@/features/club-chat/components/ClubChatDock';
import { BreadcrumbProvider } from '@/shared/context/BreadcrumbContext';
import PageBreadcrumbs from '@/shared/components/navigation/PageBreadcrumbs';
import BoldTabBar from '@/shared/components/bold/BoldTabBar';

function DashboardLayoutBody() {
  const { isAdmin } = useAuth();
  const rideLiveMatch = useMatch({ path: ROUTES.rideLive, end: true });
  const { chatOpen } = useClubChatUi();
  const showMobileTabBar = !rideLiveMatch && !chatOpen;

  useEffect(() => {
    prefetchDashboardRoutes();
  }, []);

  return (
    <div className="rydo-app-shell h-full max-md:min-h-0 md:h-dvh w-full flex flex-col md:flex-row overflow-hidden bg-[var(--rydo-bg-deep)]">
      {!rideLiveMatch ? (
      <aside className="hidden md:flex flex-col w-60 h-full rydo-glass border-r border-border p-6 shrink-0">
        <Link to={ROUTES.home} className="mb-6 inline-flex items-center gap-3 hover:opacity-80 transition-opacity border-b border-border pb-6">
          <span className="h-3 w-3 rounded-full bg-rydo-green shadow-[0_0_18px_color-mix(in_srgb,var(--rydo-green)_65%,transparent)]" />
          <AppLogo />
        </Link>

        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto w-full">
          {dashboardNavigation.map((item) => {
            const ItemIcon = item.Icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-[background-color,color,box-shadow] duration-300 ease-out ${isActive && !item.to.includes('?upload=true')
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
          {isAdmin && (
            <NavLink to={ROUTES.admin} className="w-full block">
              <Button variant="secondary" className="w-full justify-center">Admin Mode</Button>
            </NavLink>
          )}
        </div>
      </aside>
      ) : null}

      <main
        className={`flex min-h-0 min-w-0 flex-1 flex-col ${rideLiveMatch ? 'overflow-hidden p-0' : 'max-md:overflow-hidden md:overflow-y-auto p-0 md:p-8 md:pb-8'}`}
      >
        <div
          className={
            rideLiveMatch
              ? 'h-full min-w-0'
              : 'mx-auto flex w-full min-w-0 max-w-6xl min-h-0 flex-1 flex-col max-md:overflow-hidden md:px-0 md:flex-none px-0'
          }
        >
          {!rideLiveMatch ? (
            <div className="hidden md:block px-0">
              <PageBreadcrumbs variant="dashboard" />
            </div>
          ) : null}
          <div className={rideLiveMatch ? 'h-full min-w-0' : 'flex min-h-0 flex-1 flex-col max-md:h-full max-md:overflow-hidden md:flex-none md:px-0 px-0'}>
            <AnimatedOutlet />
          </div>
        </div>
      </main>
      {showMobileTabBar ? <BoldTabBar /> : null}
      <ClubChatDock />
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <BreadcrumbProvider>
      <ClubChatUiProvider>
        <DashboardLayoutBody />
      </ClubChatUiProvider>
    </BreadcrumbProvider>
  );
}
