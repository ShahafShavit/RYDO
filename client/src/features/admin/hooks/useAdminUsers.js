import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizePaginatedResult } from '@/shared/api/api-helpers';
import { adminApi, adminKeys } from '@/features/admin/api/adminApi';
import { normalizeAdminUserRow } from '@/features/admin/admin-mapper';

export function useAdminUsers(options = {}) {
  const { skip = 0, take = 20 } = options;

  const query = useQuery({
    queryKey: adminKeys.userList({ skip, take }),
    queryFn: async () => normalizePaginatedResult(await adminApi.getUsers({ skip, take }), normalizeAdminUserRow),
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    users: query.data?.items || [],
    pagination: query.data || normalizePaginatedResult([], normalizeAdminUserRow),
  };
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.users() }),
  });
}
