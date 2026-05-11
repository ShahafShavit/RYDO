import { useQuery } from '@tanstack/react-query';
import { normalizePaginatedResult } from '@/shared/api/api-helpers';
import { routeKeys, routesApi } from '@/features/routes/api/routesApi';
import { normalizeRoute } from '@/features/routes/route-mapper';

/** Single-page route list (e.g. pickers). Filtering is applied on the server. */
export function useRoutesList(options = {}) {
  const { skip = 0, take = 50, search, terrain, difficulty, distance, sort } = options;

  const q = (search || '').trim() || undefined;

  const query = useQuery({
    queryKey: routeKeys.list({ skip, take, q, terrain, difficulty, distance, sort }),
    queryFn: async () =>
      normalizePaginatedResult(
        await routesApi.list({
          skip,
          take,
          ...(q ? { q } : {}),
          ...(terrain && terrain !== 'all' ? { terrain } : {}),
          ...(difficulty && difficulty !== 'all' ? { difficulty } : {}),
          ...(distance && distance !== 'all' ? { distance } : {}),
        }),
        normalizeRoute,
      ),
    staleTime: 5 * 60 * 1000,
  });

  const routes = query.data?.items || [];

  return {
    routes,
    pagination: query.data || normalizePaginatedResult([], normalizeRoute),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    raw: routes,
  };
}
