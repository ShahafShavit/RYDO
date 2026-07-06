import { useQuery } from '@tanstack/react-query';
import { hazardsApi } from '@/features/hazards/api/hazards-api';
import { normalizeHazard } from '@/features/hazards/hazard-mapper';

export const routeHazardsKey = (routeId) => ['route-hazards', routeId];

const EMPTY_HAZARDS = [];

export function useRouteHazards(routeId, { enabled = true } = {}) {
  const rid = routeId != null ? String(routeId) : '';

  const query = useQuery({
    queryKey: routeHazardsKey(rid),
    enabled: Boolean(rid) && enabled,
    queryFn: async () => {
      const raw = await hazardsApi.listForRoute(rid);
      const list = Array.isArray(raw) ? raw : [];
      return list.map(normalizeHazard);
    },
    staleTime: 30_000,
  });

  return {
    hazards: query.data ?? EMPTY_HAZARDS,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
