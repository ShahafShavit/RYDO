import { useQuery } from '@tanstack/react-query';
import { routeKeys, routesApi } from '@/features/routes/api/routesApi';
import { normalizeRoute } from '@/features/routes/route-mapper';

export function useRouteDetails(routeId) {
  const query = useQuery({
    queryKey: routeKeys.detail(routeId),
    queryFn: async () => normalizeRoute(await routesApi.getById(routeId)),
    enabled: Boolean(routeId),
  });

  return {
    route: query.data || null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
