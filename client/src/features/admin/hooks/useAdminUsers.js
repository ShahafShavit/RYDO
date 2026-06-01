import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizePaginatedResult } from '@/shared/api/api-helpers';
import { adminApi, adminKeys } from '@/features/admin/api/adminApi';
import { normalizeAdminUserRow } from '@/features/admin/admin-mapper';

export function useAdminUsers(options = {}) {
  const { skip = 0, take = 20, search = '', role = '' } = options;
  const filters = { skip, take, search: search || undefined, role: role || undefined };

  const query = useQuery({
    queryKey: adminKeys.userList(filters),
    queryFn: async () => normalizePaginatedResult(await adminApi.getUsers(filters), normalizeAdminUserRow),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.summary() });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }) => adminApi.updateUserRole(userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}
