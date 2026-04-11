import { useQuery } from '@tanstack/react-query';
import { historyApi } from '@/features/history/api/history-api';

export function useRideHistory() {
  const query = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const payload = await historyApi.getHistory({ skip: 0, take: 200 });
      const rides = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : [];
      return rides.map((ride) => ({
        id: ride.id,
        title: ride.routeTitle || ride.title || 'Untitled route',
        date: ride.completedAt || ride.date,
        distance: ride.distanceKm ? `${ride.distanceKm} km` : ride.distance || '—',
        rideGroupId: ride.rideGroupId ?? null,
        rideKind: ride.rideKind ?? null,
        clubName: ride.clubName ?? null,
        durationMinutes: ride.durationMinutes,
        estimatedDurationMinutes: ride.estimatedDurationMinutes,
      }));
    },
  });

  return {
    ...query,
    rides: query.data || [],
  };
}
