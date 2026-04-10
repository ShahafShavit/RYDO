import { useMutation, useQueryClient } from '@tanstack/react-query';
import { hazardsApi } from '@/features/hazards/api/hazards-api';
import { normalizeHazard } from '@/features/hazards/hazard-mapper';

export function useReportHazard() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload) => normalizeHazard(await hazardsApi.createHazard(payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hazards'] }),
  });

  return {
    ...mutation,
    reportHazard: mutation.mutateAsync,
  };
}
