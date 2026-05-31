import { useQuery } from '@tanstack/react-query';
import { friendsApi } from '../api/friends-api';
import { normalizeHandle } from '@/shared/lib/user-paths';

export const friendsListKeys = {
  all: ['social', 'friends'],
  list: (handle) => [...friendsListKeys.all, normalizeHandle(handle)],
};

export function useFriendsList(handle, options = {}) {
  const { enabled = true } = options;
  const h = normalizeHandle(handle);
  return useQuery({
    queryKey: friendsListKeys.list(h),
    queryFn: () => friendsApi.getFriends(h),
    enabled: enabled && h.length > 0,
  });
}
