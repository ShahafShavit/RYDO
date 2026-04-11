import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ridesApi } from '@/features/rides/api/rides-api';

export function useCreateRide() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ clubId, ...body }) => ridesApi.createClubRide(clubId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rides', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      if (variables?.clubId != null) {
        queryClient.invalidateQueries({ queryKey: ['clubs', 'rides', variables.clubId] });
      }
    },
  });

  return {
    ...mutation,
    createRide: mutation.mutateAsync,
  };
}
