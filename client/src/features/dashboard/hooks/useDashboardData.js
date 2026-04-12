import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePreferences } from '@/features/account/hooks/useAccount';
import { buildDashboardHome } from '@/features/dashboard/dashboard-mapper';
import { dashboardApi } from '@/features/dashboard/api/dashboard-api';
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

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', scopedKey],
    queryFn: () => dashboardApi.getSummary(),
    enabled: userId != null,
  });

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

  const summary = summaryQuery.data || {};

  const homeLoading = homeQueries.some((q) => q.isPending);
  const homeError = homeQueries.find((q) => q.isError)?.error ?? null;

  return {
    greeting: 'Everything you need for your next ride is in one place.',
    stats: [
      { label: 'Rides logged', value: String(summary.completedRides ?? '0') },
      { label: 'Saved routes', value: String(summary.savedRoutes ?? '0') },
      { label: 'Group rides joined', value: String(summary.groupRidesJoined ?? '0') },
    ],
    home,
    isLoading: summaryQuery.isPending || homeLoading,
    statsLoading: summaryQuery.isPending,
    homeLoading,
    isError: summaryQuery.isError || homeQueries.some((q) => q.isError),
    error: summaryQuery.error || homeError,
    homeError,
    statsError: summaryQuery.isError,
  };
}
