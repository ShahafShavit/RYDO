import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePreferences } from '@/features/account/hooks/useAccount';
import { buildDashboardHome } from '@/features/dashboard/dashboard-mapper';
import { historyApi } from '@/features/history/api/history-api';
import { ridesApi } from '@/features/rides/api/rides-api';
import { gamificationApi } from '@/features/gamification/api/gamification-api';
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
        queryKey: ['rides', 'me', 'upcoming', undefined],
        queryFn: () => ridesApi.getMyRides({ when: 'upcoming' }),
        enabled: userId != null,
      },
      {
        queryKey: ['clubs', 'list', scopedKey],
        queryFn: () => clubsApi.list(),
        enabled: userId != null,
      },
      {
        queryKey: ['gamification', 'me', scopedKey],
        queryFn: () => gamificationApi.getMe(),
        enabled: userId != null,
      },
    ],
  });

  const [historyQuery, ridesQuery, clubsQuery, gamificationQuery] = homeQueries;

  const home = useMemo(
    () =>
      buildDashboardHome({
        historyRaw: historyQuery.data,
        rideGroupsRaw: ridesQuery.data,
        clubsRaw: clubsQuery.data,
        gamificationRaw: gamificationQuery.data,
        distanceUnit,
      }),
    [historyQuery.data, ridesQuery.data, clubsQuery.data, gamificationQuery.data, distanceUnit],
  );

  const homeLoading = homeQueries.some((q) => q.isPending);
  const homeError = homeQueries.find((q) => q.isError)?.error ?? null;

  return {
    home,
    homeLoading,
    homeError,
  };
}
