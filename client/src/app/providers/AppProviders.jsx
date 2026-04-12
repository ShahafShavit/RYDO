import { AuthProvider } from '@/features/auth/context/AuthContext';
import { queryClient } from '@/app/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/app/providers/ThemeProvider';

export default function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
