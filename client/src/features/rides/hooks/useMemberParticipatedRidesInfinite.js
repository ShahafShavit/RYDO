import { useInfiniteQuery } from '@tanstack/react-query';
import { normalizePaginatedResult } from '@/shared/api/api-helpers';
import { usersApi } from '@/features/users/api/usersApi';
import { mapRideDto } from '@/features/rides/hooks/useRideEvent';
import { userProfileActivityKeys } from '@/features/users/hooks/useUserProfileActivity';

const PAGE_SIZE = 8;

/**
 * Paginated rides for {@link usersApi.getUserRides} (member’s public participated rides).
 */
export function useMemberParticipatedRidesInfinite(userId, search) {
  const q = (search || '').trim() || undefined;
  const id = Number(userId);

  return useInfiniteQuery({
    queryKey: [...userProfileActivityKeys.rides(id), 'infinite', q],
    queryFn: async ({ pageParam = 0 }) => {
      const raw = await usersApi.getUserRides(id, {
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
    enabled: Number.isFinite(id) && id > 0,
  });
}
