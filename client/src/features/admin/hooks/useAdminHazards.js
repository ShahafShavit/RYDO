import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizePaginatedResult } from '@/shared/api/api-helpers';
import { adminApi, adminKeys } from '@/features/admin/api/adminApi';
import { normalizeAdminHazardRow } from '@/features/admin/admin-mapper';

export function useAdminHazards(options = {}) {
  const { skip = 0, take = 20 } = options;

  const query = useQuery({
    queryKey: adminKeys.hazardList({ skip, take }),
    queryFn: async () => normalizePaginatedResult(await adminApi.getHazards({ skip, take }), normalizeAdminHazardRow),
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    hazards: query.data?.items || [],
    pagination: query.data || normalizePaginatedResult([], normalizeAdminHazardRow),
  };
}

export function useUpdateHazardStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ hazardId, status }) => adminApi.updateHazardStatus(hazardId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.hazards() });
      queryClient.invalidateQueries({ queryKey: adminKeys.summary() });
    },
  });
}
