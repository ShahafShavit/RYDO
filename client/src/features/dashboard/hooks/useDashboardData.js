import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { buildDashboardHome } from '@/features/dashboard/dashboard-mapper';
import { dashboardApi } from '@/features/dashboard/api/dashboard-api';
import { historyApi } from '@/features/history/api/history-api';
import { ridesApi } from '@/features/rides/api/rides-api';
import { challengesApi } from '@/features/challenges/api/challenges-api';

export function useDashboardData() {
  const { user } = useAuth();
  const userId = user?.id != null ? Number(user.id) : null;

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary(),
  });

  const homeQueries = useQueries({
    queries: [
      {
        queryKey: ['history'],
        queryFn: () => historyApi.getHistory(),
      },
      {
        queryKey: ['rides', 'groups'],
        queryFn: () => ridesApi.getGroups(),
      },
      {
        queryKey: ['challenges'],
        queryFn: () => challengesApi.getChallenges(),
      },
    ],
  });

  const [historyQuery, ridesQuery, challengesQuery] = homeQueries;

  const home = useMemo(
    () =>
      buildDashboardHome({
        userId,
        historyRaw: historyQuery.data,
        rideGroupsRaw: ridesQuery.data,
        challengesRaw: challengesQuery.data,
      }),
    [userId, historyQuery.data, ridesQuery.data, challengesQuery.data],
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
  };
}
