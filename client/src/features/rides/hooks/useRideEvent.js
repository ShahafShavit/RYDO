import { useQuery } from '@tanstack/react-query';
import { ridesApi } from '@/features/rides/api/rides-api';

function normalizeRide(raw) {
  if (!raw) return null;
  const scheduled = raw.scheduledDate || raw.time || '';
  return {
    id: raw.id,
    name: raw.name,
    routeName: raw.routeTitle || raw.routeName || raw.route?.title || `Route #${raw.routeId ?? ''}`,
    routeId: raw.routeId,
    time: scheduled,
    notes: raw.description || raw.notes || '',
    participantDetails: Array.isArray(raw.participantDetails)
      ? raw.participantDetails
      : [],
    participants: Array.isArray(raw.participants) ? raw.participants : [],
    maxParticipants: raw.maxParticipants ?? 20,
    clubId: raw.clubId ?? null,
    clubName: raw.clubName ?? null,
  };
}

export function useRideEvent(rideId) {
  const query = useQuery({
    queryKey: ['rides', 'detail', rideId],
    queryFn: async () => {
      const ride = await ridesApi.getRideDetails(rideId);
      return normalizeRide(ride);
    },
    enabled: Boolean(rideId),
  });

  return {
    ...query,
    ride: query.data || null,
  };
}
