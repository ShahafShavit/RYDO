import { lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { queryClient } from '@/app/query-client';
import { env } from '@/shared/config/env';
import { ThemeProvider } from '@/app/providers/ThemeProvider';

const NativePersistProvider = lazy(() => import('@/app/providers/NativePersistProvider.jsx'));

function NativeBootSplash() {
  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-[var(--rydo-bg-deep)]">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-rydo-purple"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

export default function AppProviders({ children }) {
  if (!env.isNativeApp) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  return (
    <AuthProvider>
      <Suspense fallback={<NativeBootSplash />}>
        <NativePersistProvider>{children}</NativePersistProvider>
      </Suspense>
    </AuthProvider>
  );
}
