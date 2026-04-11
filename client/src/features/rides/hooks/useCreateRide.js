import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ridesApi } from '@/features/rides/api/rides-api';

export function useCreateRide() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ridesApi.createRide,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rides', 'groups'] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
  });

  return {
    ...mutation,
    createRide: mutation.mutateAsync,
  };
}
