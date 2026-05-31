import { useState } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { queryClient } from '@/app/query-client';
import { getNativePersistOptions } from '@/app/query-persist.native.js';
import { ThemeProvider } from '@/app/providers/ThemeProvider';

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

export default function NativePersistProvider({ children }) {
  const { user } = useAuth();
  const [isRestoring, setIsRestoring] = useState(true);
  const buster = user?.id != null ? String(user.id) : 'guest';

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={getNativePersistOptions(buster)}
      onSuccess={() => setIsRestoring(false)}
    >
      {isRestoring ? <NativeBootSplash /> : <ThemeProvider>{children}</ThemeProvider>}
    </PersistQueryClientProvider>
  );
}
