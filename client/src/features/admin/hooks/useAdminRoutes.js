import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizePaginatedResult } from '@/shared/api/api-helpers';
import { adminApi, adminKeys } from '@/features/admin/api/adminApi';
import { normalizeAdminRouteRow } from '@/features/admin/admin-mapper';

export function useAdminRoutes(options = {}) {
  const { skip = 0, take = 20, search = '', status = '' } = options;
  const filters = { skip, take, search: search || undefined, status: status || undefined };

  const query = useQuery({
    queryKey: adminKeys.routeList(filters),
    queryFn: async () => normalizePaginatedResult(await adminApi.getRoutes(filters), normalizeAdminRouteRow),
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    routes: query.data?.items || [],
    pagination: query.data || normalizePaginatedResult([], normalizeAdminRouteRow),
  };
}

export function useDeleteRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.deleteRoute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.routes() });
      queryClient.invalidateQueries({ queryKey: adminKeys.summary() });
    },
  });
}

export function useModerateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ routeId, status }) => adminApi.moderateRoute(routeId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.routes() }),
  });
}
