import { Suspense } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { adminNavigation } from '@/shared/config/navigation';
import { ROUTES } from '@/app/router/route-paths';
import AppLogo from '@/shared/components/navigation/AppLogo';
import Button from '@/shared/components/ui/button/Button';
import MobileNavbar from '@/shared/components/layout/MobileNavbar';
import AnimatedOutlet from '@/shared/components/layout/AnimatedOutlet';
import UserProfileDropdown from '@/shared/components/navigation/UserProfileDropdown';

export default function AdminLayout() {
  return (
    <div className="h-dvh w-full flex flex-col md:flex-row overflow-hidden bg-[#0f0f10]">
      <MobileNavbar isAdminLayout />

      <aside className="hidden md:flex flex-col w-60 h-full rydo-glass border-r border-white/8 p-6 shrink-0 z-10">
        <Link to={ROUTES.home} className="mb-8 inline-flex items-center gap-3 hover:opacity-80 transition-opacity">
          <span className="h-3 w-3 rounded-full bg-[#7B5CFF] shadow-[0_0_18px_rgba(123,92,255,0.75)]" />
          <AppLogo />
        </Link>

        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto w-full">
          {adminNavigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-2xl px-4 py-3 text-sm transition-[background-color,color,box-shadow] duration-300 ease-out ${isActive
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
          <NavLink to={ROUTES.dashboard} className="w-full block">
            <Button variant="secondary" className="w-full justify-center">Exit Admin</Button>
          </NavLink>
        </div>
      </aside>

      <main className="flex-1 h-full overflow-y-auto min-w-0 p-4 md:p-8 relative z-0">
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={
            <div className="flex h-[50vh] items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#7B5CFF] animate-spin" />
            </div>
          }>
            <AnimatedOutlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
