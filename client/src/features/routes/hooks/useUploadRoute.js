import { useMutation, useQueryClient } from '@tanstack/react-query';
import { routeKeys, routesApi } from '@/features/routes/api/routesApi';
import { normalizeRoute, toRouteUploadPayload } from '@/features/routes/route-mapper';

export function useUploadRoute() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ file, ...data }) => {
      const payload = toRouteUploadPayload(data);
      return normalizeRoute(await routesApi.upload({ file, ...payload }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: routeKeys.myRoot() });
    },
  });

  return {
    upload: mutation.mutateAsync,
    ...mutation,
    isLoading: mutation.isPending,
  };
}
