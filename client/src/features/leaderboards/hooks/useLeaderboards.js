import { useQuery } from '@tanstack/react-query';
import { leaderboardsApi } from '@/features/leaderboards/api/leaderboards-api';

export const leaderboardsQueryKey = ['leaderboards'];

export function useLeaderboards() {
  return useQuery({
    queryKey: leaderboardsQueryKey,
    queryFn: () => leaderboardsApi.getLeaderboards(),
  });
}
