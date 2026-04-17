import { useQuery } from '@tanstack/react-query';
import { friendsApi } from '../api/friends-api';

export const friendsListKeys = {
  all: ['social', 'friends'],
  list: (userId) => [...friendsListKeys.all, Number(userId)],
};

export function useFriendsList(userId, options = {}) {
  const { enabled = true } = options;
  const id = Number(userId);
  return useQuery({
    queryKey: friendsListKeys.list(id),
    queryFn: () => friendsApi.getFriends(id),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}
