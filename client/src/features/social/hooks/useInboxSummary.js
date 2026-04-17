import { useQuery } from '@tanstack/react-query';
import { friendsApi } from '../api/friends-api';

export const inboxSummaryKeys = {
  all: ['social', 'inboxSummary'],
};

export function useInboxSummary() {
  return useQuery({
    queryKey: inboxSummaryKeys.all,
    queryFn: () => friendsApi.getInboxSummary(),
    staleTime: 30_000,
  });
}
