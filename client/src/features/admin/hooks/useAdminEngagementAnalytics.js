import { useQuery } from '@tanstack/react-query';
import { adminApi, adminKeys } from '@/features/admin/api/adminApi';

export function useAdminEngagementAnalytics(days = 7) {
  return useQuery({
    queryKey: adminKeys.analyticsEngagement(days),
    queryFn: () => adminApi.getEngagementAnalytics({ days }),
    staleTime: 60 * 1000,
  });
}

export async function refreshAdminEngagementAnalytics(queryClient, days = 7) {
  await queryClient.fetchQuery({
    queryKey: adminKeys.analyticsEngagement(days),
    queryFn: () => adminApi.getEngagementAnalytics({ days, refresh: true }),
  });
}
