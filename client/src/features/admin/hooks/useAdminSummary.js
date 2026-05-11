import { useQuery } from '@tanstack/react-query';
import { adminApi, adminKeys } from '@/features/admin/api/adminApi';

export function useAdminSummary() {
  return useQuery({
    queryKey: adminKeys.summary(),
    queryFn: adminApi.getSummary,
    staleTime: 60 * 1000,
  });
}
