import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePreferences } from '@/features/account/hooks/useAccount';
import { buildDashboardHome } from '@/features/dashboard/dashboard-mapper';
import { historyApi } from '@/features/history/api/history-api';
import { ridesApi } from '@/features/rides/api/rides-api';
import { challengesApi } from '@/features/challenges/api/challenges-api';
import { clubsApi } from '@/features/clubs/api/clubs-api';

export function useDashboardData() {
  const { user } = useAuth();
  const userId = user?.id != null ? Number(user.id) : null;
  const scopedKey = userId ?? 'guest';
  const { data: preferences } = usePreferences();
  const distanceUnit = preferences?.distanceUnit === 'mi' ? 'mi' : 'km';

  const homeQueries = useQueries({
    queries: [
      {
        queryKey: ['history', scopedKey],
        queryFn: () => historyApi.getHistory({ skip: 0, take: 500 }),
        enabled: userId != null,
      },
      {
        queryKey: ['rides', 'me', scopedKey],
        queryFn: () => ridesApi.getMyRides(),
        enabled: userId != null,
      },
      {
        queryKey: ['clubs', 'list', scopedKey],
        queryFn: () => clubsApi.list(),
        enabled: userId != null,
      },
      {
        queryKey: ['challenges', scopedKey],
        queryFn: () => challengesApi.getChallenges(),
        enabled: userId != null,
      },
    ],
  });

  const [historyQuery, ridesQuery, clubsQuery, challengesQuery] = homeQueries;

  const home = useMemo(
    () =>
      buildDashboardHome({
        userId,
        historyRaw: historyQuery.data,
        rideGroupsRaw: ridesQuery.data,
        clubsRaw: clubsQuery.data,
        challengesRaw: challengesQuery.data,
        distanceUnit,
      }),
    [userId, historyQuery.data, ridesQuery.data, clubsQuery.data, challengesQuery.data, distanceUnit],
  );

  const homeLoading = homeQueries.some((q) => q.isPending);
  const homeError = homeQueries.find((q) => q.isError)?.error ?? null;

  return {
    home,
    homeLoading,
    homeError,
  };
}
