import { useQuery } from '@tanstack/react-query';
import { friendsApi } from '../api/friends-api';

export const inboxKeys = {
  all: ['social', 'inbox'],
  list: (params) => [...inboxKeys.all, 'list', params],
};

export function useInbox(params = {}) {
  return useQuery({
    queryKey: inboxKeys.list(params),
    queryFn: () => friendsApi.getInbox(params),
  });
}
