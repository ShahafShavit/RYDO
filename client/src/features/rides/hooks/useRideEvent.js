import { useQuery } from '@tanstack/react-query';
import { ridesApi } from '@/features/rides/api/rides-api';

export function useRideEvent(rideId = 1) {
  const query = useQuery({
    queryKey: ['rides', 'detail', rideId],
    queryFn: async () => {
      const ride = await ridesApi.getRideDetails(rideId);
      return {
        id: ride.id,
        name: ride.name,
        routeName: ride.routeName || ride.route?.title || `Route #${ride.routeId || ''}`,
        time: ride.scheduledDate || ride.time || 'TBD',
        notes: ride.description || ride.notes || '',
      };
    },
    enabled: Boolean(rideId),
  });

  return {
    ...query,
    ride: query.data || null,
  };
}
