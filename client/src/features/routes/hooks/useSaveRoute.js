import { useMutation, useQueryClient } from '@tanstack/react-query';
import { routeKeys, routesApi } from '@/features/routes/api/routesApi';

export function useSaveRoute() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: routesApi.save,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeKeys.savedRoot() });
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: routeKeys.details() });
    },
  });

  return {
    ...mutation,
    isLoading: mutation.isPending,
  };
}
