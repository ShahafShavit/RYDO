import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/usersApi';
import { normalizeUserProfileView } from '@/features/account/account-mapper';
import { normalizeHandle } from '@/shared/lib/user-paths';

export const userProfileKeys = {
  all: ['account', 'userProfile'],
  detail: (handle) => [...userProfileKeys.all, normalizeHandle(handle)],
};

export function useUserProfile(handle) {
  const h = normalizeHandle(handle);
  return useQuery({
    queryKey: userProfileKeys.detail(h),
    queryFn: async () => normalizeUserProfileView(await usersApi.getProfile(h)),
    enabled: h.length > 0,
  });
}
