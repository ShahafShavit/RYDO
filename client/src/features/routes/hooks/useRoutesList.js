import { useQuery } from '@tanstack/react-query';
import { normalizePaginatedResult } from '@/shared/api/api-helpers';
import { routeKeys, routesApi } from '@/features/routes/api/routesApi';
import { normalizeRoute } from '@/features/routes/route-mapper';

export function useRoutesList(options = {}) {
  const { skip = 0, take = 50, search, terrain, difficulty, distance, sort } = options;

  const query = useQuery({
    queryKey: routeKeys.list({ skip, take, search, terrain, difficulty, distance, sort }),
    queryFn: async () => normalizePaginatedResult(await routesApi.list({ skip, take }), normalizeRoute),
    staleTime: 5 * 60 * 1000,
  });

  const data = query.data?.items || [];

  let filtered = data.filter((route) => {
    if (search && !route.title?.toLowerCase().includes(search.toLowerCase())) return false;

    if (terrain && terrain !== 'all' && route.terrain !== terrain) return false;

    if (difficulty && difficulty !== 'all' && route.difficulty !== difficulty) return false;

    if (distance && distance !== 'all') {
      const km = route.distanceKm;
      if (distance === 'short' && km >= 20) return false;
      if (distance === 'medium' && (km < 20 || km > 50)) return false;
      if (distance === 'long' && km <= 50) return false;
    }

    return true;
  });

  if (sort === 'newest') {
    filtered = [...filtered].sort((left, right) => {
      const leftDate = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightDate = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightDate - leftDate;
    });
  }

  return {
    routes: filtered,
    pagination: query.data || normalizePaginatedResult([], normalizeRoute),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    raw: data,
  };
}
