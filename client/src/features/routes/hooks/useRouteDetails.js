import { useRouteById } from '../api/routesApi';

export function useRouteDetails(routeId) {
  const res = useRouteById(routeId);
  return {
    route: res.data || null,
    isLoading: res.isLoading,
    isError: res.isError,
    error: res.error,
  };
}
