import { useInfiniteQuery } from '@tanstack/react-query';
import { normalizePaginatedResult } from '@/shared/api/api-helpers';
import { routeKeys, routesApi } from '@/features/routes/api/routesApi';
import { normalizeRoute } from '@/features/routes/route-mapper';

const PAGE_SIZE = 18;

/**
 * Server-side filtered + paginated route list for Explore (/routes).
 * @param {{ search?: string, terrain?: string, difficulty?: string, distance?: string, sort?: string }} filters
 */
export function useRoutesExploreInfinite(filters) {
  const { search, terrain, difficulty, distance, sort } = filters;
  const q = (search || '').trim() || undefined;

  return useInfiniteQuery({
    queryKey: [...routeKeys.lists(), 'explore', { q, terrain, difficulty, distance, sort }],
    queryFn: async ({ pageParam = 0 }) => {
      const raw = await routesApi.list({
        skip: pageParam,
        take: PAGE_SIZE,
        ...(q ? { q } : {}),
        ...(terrain && terrain !== 'all' ? { terrain } : {}),
        ...(difficulty && difficulty !== 'all' ? { difficulty } : {}),
        ...(distance && distance !== 'all' ? { distance } : {}),
      });
      return normalizePaginatedResult(raw, normalizeRoute);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextSkip = lastPage.skip + lastPage.items.length;
      if (nextSkip >= lastPage.total || lastPage.items.length === 0) return undefined;
      return nextSkip;
    },
  });
}
