import { QueryClient } from '@tanstack/react-query';
import { env } from '@/shared/config/env';
import { ONE_HOUR_MS } from '@/app/query-constants';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      ...(env.isNativeApp ? { staleTime: ONE_HOUR_MS, gcTime: ONE_HOUR_MS * 2 } : {}),
    },
  },
});
