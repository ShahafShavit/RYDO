import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import AppNavbar from '@/shared/components/navigation/AppNavbar';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppNavbar />
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 rounded-full border-2 border-border-strong border-t-rydo-purple animate-spin" />
        </div>
      }>
        <Outlet />
      </Suspense>
    </div>
  );
}
