import { useQuery } from '@tanstack/react-query';
import { normalizePaginatedResult } from '@/shared/api/api-helpers';
import { normalizeRoute } from '@/features/routes/route-mapper';
import { mapRideDto } from '@/features/rides/hooks/useRideEvent';
import { usersApi } from '@/features/users/api/usersApi';

export const userProfileActivityKeys = {
  all: ['users', 'activity'],
  routes: (userId) => [...userProfileActivityKeys.all, 'routes', Number(userId)],
  rides: (userId) => [...userProfileActivityKeys.all, 'rides', Number(userId)],
};

export function useUserUploadedRoutesPreview(userId, { enabled = true } = {}) {
  const id = Number(userId);
  return useQuery({
    queryKey: userProfileActivityKeys.routes(id),
    queryFn: async () =>
      normalizePaginatedResult(await usersApi.getUserRoutes(id, { skip: 0, take: 2 }), normalizeRoute),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

export function useUserParticipatedRidesPreview(userId, { enabled = true } = {}) {
  const id = Number(userId);
  return useQuery({
    queryKey: userProfileActivityKeys.rides(id),
    queryFn: async () =>
      normalizePaginatedResult(await usersApi.getUserRides(id, { skip: 0, take: 2 }), mapRideDto),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}
