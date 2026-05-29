import { useQuery } from '@tanstack/react-query';
import { ridesApi } from '@/features/rides/api/rides-api';

/** @param {{ scheduledDate?: string, time?: string } | null | undefined} ride */
export function isRideUpcoming(ride) {
  const iso = ride?.scheduledDate || ride?.time;
  if (!iso) return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return true;
  return d.getTime() >= Date.now();
}

/** Leaflet preview `{ coordinates }` from API ride DTO or normalized ride. */
export function resolveRideMapPreview(raw) {
  if (raw?.preview?.coordinates?.length > 1) return raw.preview;
  if (raw?.routePreview?.coordinates?.length > 1) {
    return { coordinates: raw.routePreview.coordinates };
  }
  return null;
}

/** Maps `GET /rides/:id` and ride list items from `GET /users/me/rides`. */
export function mapRideDto(raw) {
  if (!raw) return null;
  const scheduled = raw.scheduledDate || raw.time || '';
  const details = Array.isArray(raw.participantDetails) ? raw.participantDetails : [];
  const parts = Array.isArray(raw.participants) ? raw.participants : [];
  const participantCount =
    raw.participantCount != null ? Number(raw.participantCount) : details.length > 0 ? details.length : parts.length;
  const routePreview = resolveRideMapPreview(raw);
  const createdBy = raw.createdBy
    ? {
        id: raw.createdBy.id != null ? Number(raw.createdBy.id) : null,
        fullName: String(raw.createdBy.fullName || '').trim(),
        avatarUrl:
          typeof raw.createdBy.avatarUrl === 'string' && raw.createdBy.avatarUrl.trim()
            ? raw.createdBy.avatarUrl.trim()
            : null,
      }
    : null;

  return {
    id: raw.id,
    name: raw.name,
    createdBy,
    routeName:
      raw.routeTitle ||
      raw.routeName ||
      raw.route?.title ||
      (raw.routeId != null ? `Route #${raw.routeId}` : 'No route yet'),
    routeTitle: raw.routeTitle || raw.routeName || (raw.routeId != null ? `Route #${raw.routeId}` : 'No route yet'),
    routeId: raw.routeId,
    scheduledDate: scheduled,
    time: scheduled,
    notes: raw.description || raw.notes || '',
    preview: routePreview,
    participantDetails: details,
    participants: parts,
    participantCount,
    maxParticipants: raw.maxParticipants ?? 20,
    clubId: raw.clubId ?? null,
    clubName: raw.clubName ?? null,
    clubAvatarUrl: raw.clubAvatarUrl ?? null,
    rideKind: raw.rideKind ?? 'scheduled',
    viewerCanEdit: Boolean(raw.viewerCanEdit),
  };
}

export function useRideEvent(rideId) {
  const query = useQuery({
    queryKey: ['rides', 'detail', rideId],
    queryFn: async () => {
      const ride = await ridesApi.getRideDetails(rideId);
      return mapRideDto(ride);
    },
    enabled: Boolean(rideId),
  });

  return {
    ...query,
    ride: query.data || null,
  };
}
