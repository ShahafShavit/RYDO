import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/usersApi';
import { normalizeUserProfileView } from '@/features/account/account-mapper';

export const userProfileKeys = {
  all: ['account', 'userProfile'],
  detail: (id) => [...userProfileKeys.all, Number(id)],
};

export function useUserProfile(userId) {
  const id = Number(userId);
  return useQuery({
    queryKey: userProfileKeys.detail(id),
    queryFn: async () => normalizeUserProfileView(await usersApi.getProfile(id)),
    enabled: Number.isFinite(id) && id > 0,
  });
}
