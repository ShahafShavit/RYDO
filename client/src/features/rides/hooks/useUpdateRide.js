import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ridesApi } from '@/features/rides/api/rides-api';

export function useUpdateRide(rideId) {
  const queryClient = useQueryClient();
  const id = rideId != null && rideId !== '' ? String(rideId) : '';

  const mutation = useMutation({
    mutationFn: (payload) => {
      if (!id) throw new Error('Missing ride id');
      return ridesApi.updateRide(id, payload);
    },
    onSuccess: () => {
      if (id) queryClient.invalidateQueries({ queryKey: ['rides', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['rides', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['clubs', 'rides'] });
    },
  });

  return {
    ...mutation,
    updateRide: mutation.mutateAsync,
  };
}
