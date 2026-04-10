import { useQuery } from '@tanstack/react-query';
import { normalizePaginatedResult } from '@/shared/api/api-helpers';
import { routeKeys, routesApi } from '@/features/routes/api/routesApi';
import { normalizeRoute } from '@/features/routes/route-mapper';

export function useMyRoutes(options = {}) {
  const { skip = 0, take = 20 } = options;

  const query = useQuery({
    queryKey: routeKeys.my({ skip, take }),
    queryFn: async () => normalizePaginatedResult(await routesApi.getMine({ skip, take }), normalizeRoute),
  });

  return {
    ...query,
    myRoutes: query.data?.items || [],
    pagination: query.data || normalizePaginatedResult([], normalizeRoute),
  };
}
