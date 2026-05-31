import { useQuery } from '@tanstack/react-query';
import { normalizePaginatedResult } from '@/shared/api/api-helpers';
import { normalizeRoute } from '@/features/routes/route-mapper';
import { mapRideDto } from '@/features/rides/hooks/useRideEvent';
import { usersApi } from '@/features/users/api/usersApi';
import { normalizeHandle } from '@/shared/lib/user-paths';

export const userProfileActivityKeys = {
  all: ['users', 'activity'],
  routes: (handle) => [...userProfileActivityKeys.all, 'routes', normalizeHandle(handle)],
  rides: (handle) => [...userProfileActivityKeys.all, 'rides', normalizeHandle(handle)],
};

export function useUserUploadedRoutesPreview(handle, { enabled = true } = {}) {
  const h = normalizeHandle(handle);
  return useQuery({
    queryKey: userProfileActivityKeys.routes(h),
    queryFn: async () =>
      normalizePaginatedResult(await usersApi.getUserRoutes(h, { skip: 0, take: 2 }), normalizeRoute),
    enabled: enabled && h.length > 0,
  });
}

export function useUserParticipatedRidesPreview(handle, { enabled = true } = {}) {
  const h = normalizeHandle(handle);
  return useQuery({
    queryKey: userProfileActivityKeys.rides(h),
    queryFn: async () =>
      normalizePaginatedResult(await usersApi.getUserRides(h, { skip: 0, take: 2 }), mapRideDto),
    enabled: enabled && h.length > 0,
  });
}
