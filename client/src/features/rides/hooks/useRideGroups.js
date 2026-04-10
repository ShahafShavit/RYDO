import { useQuery } from '@tanstack/react-query';
import { ridesApi } from '@/features/rides/api/rides-api';

export function useRideGroups() {
  const query = useQuery({
    queryKey: ['rides', 'groups'],
    queryFn: async () => {
      const groups = await ridesApi.getGroups();
      return Array.isArray(groups)
        ? groups.map((group) => ({
            id: group.id,
            name: group.name,
            time: group.scheduledDate || group.time || 'TBD',
            riders: group.participants?.length || group.riders || 0,
          }))
        : [];
    },
  });

  return {
    ...query,
    groups: query.data || [],
  };
}
