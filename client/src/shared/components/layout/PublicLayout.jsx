import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppNavbar from '@/shared/components/navigation/AppNavbar';
import { ROUTES } from '@/app/router/route-paths';
import { BreadcrumbProvider } from '@/shared/context/BreadcrumbContext';
import PageBreadcrumbs from '@/shared/components/navigation/PageBreadcrumbs';

export default function PublicLayout({ nativeEntry = false }) {
  const location = useLocation();
  const showBreadcrumbBar = !nativeEntry && location.pathname !== ROUTES.home;

  if (nativeEntry) {
    return (
      <BreadcrumbProvider>
        <div className="flex min-h-dvh flex-col">
          <Suspense
            fallback={
              <div className="flex min-h-dvh flex-1 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-rydo-purple" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </BreadcrumbProvider>
    );
  }

  return (
    <BreadcrumbProvider>
    <div className="min-h-screen flex flex-col">
      <AppNavbar />
      {showBreadcrumbBar ? (
        <div className="rydo-container mx-auto w-full max-w-6xl px-4 pt-4 md:px-8">
          <PageBreadcrumbs variant="public" />
        </div>
      ) : null}
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 rounded-full border-2 border-border-strong border-t-rydo-purple animate-spin" />
        </div>
      }>
        <Outlet />
      </Suspense>
    </div>
    </BreadcrumbProvider>
  );
}
