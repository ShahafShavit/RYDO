import { AuthProvider } from '@/features/auth/context/AuthContext';
import { queryClient } from '@/app/query-client';
import { QueryClientProvider } from '@tanstack/react-query';

export default function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
