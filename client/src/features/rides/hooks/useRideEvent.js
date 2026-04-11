import { useQuery } from '@tanstack/react-query';
import { ridesApi } from '@/features/rides/api/rides-api';

function normalizeRide(raw) {
  if (!raw) return null;
  const scheduled = raw.scheduledDate || raw.time || '';
  const details = Array.isArray(raw.participantDetails) ? raw.participantDetails : [];
  const parts = Array.isArray(raw.participants) ? raw.participants : [];
  const participantCount =
    raw.participantCount != null ? Number(raw.participantCount) : details.length > 0 ? details.length : parts.length;
  return {
    id: raw.id,
    name: raw.name,
    routeName:
      raw.routeTitle ||
      raw.routeName ||
      raw.route?.title ||
      (raw.routeId != null ? `Route #${raw.routeId}` : 'No route yet'),
    routeId: raw.routeId,
    time: scheduled,
    notes: raw.description || raw.notes || '',
    participantDetails: details,
    participants: parts,
    participantCount,
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
