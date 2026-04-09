import { useRoutesList as useApiRoutesList } from '../api/routesApi';

export function useRoutesList(options = {}) {
  const { skip = 0, take = 50, search, terrain, difficulty, distance } = options;

  // Fetch base data from the API hook (supports skip/take)
  const res = useApiRoutesList({ skip, take });
  const data = res.data || [];

  // Apply client-side filtering so UI works immediately with mocks/backend
  const filtered = data.filter((route) => {
    if (search && !route.name?.toLowerCase().includes(search.toLowerCase())) return false;

    if (terrain && terrain !== 'all' && route.terrain !== terrain) return false;

    if (difficulty && difficulty !== 'all' && route.difficulty !== difficulty) return false;

    if (distance && distance !== 'all') {
      const km = route.distanceKm || 0;
      if (distance === 'short' && km >= 20) return false;
      if (distance === 'medium' && (km < 20 || km > 50)) return false;
      if (distance === 'long' && km <= 50) return false;
    }

    return true;
  });

  return {
    routes: filtered,
    isLoading: res.isLoading,
    isError: res.isError,
    error: res.error,
    // expose raw results for debugging if needed
    raw: data,
  };
}
