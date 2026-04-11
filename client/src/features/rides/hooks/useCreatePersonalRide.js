import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ridesApi } from '@/features/rides/api/rides-api';

export function useCreatePersonalRide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body) => ridesApi.createPersonalRide(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rides', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
}
