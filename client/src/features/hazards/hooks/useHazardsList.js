import { useQuery } from '@tanstack/react-query';
import { hazardsApi } from '@/features/hazards/api/hazards-api';
import { normalizeHazard } from '@/features/hazards/hazard-mapper';

export function useHazardsList() {
  const query = useQuery({
    queryKey: ['hazards'],
    queryFn: async () => {
      const hazards = await hazardsApi.getHazards();
      return Array.isArray(hazards) ? hazards.map(normalizeHazard) : [];
    },
  });

  return {
    ...query,
    hazards: query.data || [],
  };
}
