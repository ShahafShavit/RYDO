import { useInfiniteQuery } from '@tanstack/react-query';
import { normalizePaginatedResult } from '@/shared/api/api-helpers';
import { usersApi } from '@/features/users/api/usersApi';
import { mapRideDto } from '@/features/rides/hooks/useRideEvent';
import { userProfileActivityKeys } from '@/features/users/hooks/useUserProfileActivity';
import { normalizeHandle } from '@/shared/lib/user-paths';

const PAGE_SIZE = 8;

/**
 * Paginated rides for {@link usersApi.getUserRides} (member’s public participated rides).
 */
export function useMemberParticipatedRidesInfinite(handle, search) {
  const q = (search || '').trim() || undefined;
  const h = normalizeHandle(handle);

  return useInfiniteQuery({
    queryKey: [...userProfileActivityKeys.rides(h), 'infinite', q],
    queryFn: async ({ pageParam = 0 }) => {
      const raw = await usersApi.getUserRides(h, {
        skip: pageParam,
        take: PAGE_SIZE,
        ...(q ? { q } : {}),
      });
      return normalizePaginatedResult(raw, mapRideDto);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextSkip = lastPage.skip + lastPage.items.length;
      if (nextSkip >= lastPage.total || lastPage.items.length === 0) return undefined;
      return nextSkip;
    },
    enabled: h.length > 0,
  });
}
