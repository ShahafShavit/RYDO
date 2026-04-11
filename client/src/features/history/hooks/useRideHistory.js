import { useQuery } from '@tanstack/react-query';
import { historyApi } from '@/features/history/api/history-api';

export function useRideHistory() {
  const query = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const rides = await historyApi.getHistory();
      return Array.isArray(rides)
        ? rides.map((ride) => ({
            id: ride.id,
            title: ride.routeTitle || ride.title || 'Untitled route',
            date: ride.completedAt || ride.date,
            distance: ride.distanceKm ? `${ride.distanceKm} km` : ride.distance || '—',
            rideGroupId: ride.rideGroupId ?? null,
            rideKind: ride.rideKind ?? null,
            clubName: ride.clubName ?? null,
            durationMinutes: ride.durationMinutes,
            estimatedDurationMinutes: ride.estimatedDurationMinutes,
          }))
        : [];
    },
  });

  return {
    ...query,
    rides: query.data || [],
  };
}
