import { useDeferredValue, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ridesApi } from '@/features/rides/api/rides-api';
import { historyApi } from '@/features/history/api/history-api';

export function useMyRidesPanel(search) {
  const q = useDeferredValue(search.trim());
  const queryArg = q || undefined;

  const upcoming = useQuery({
    queryKey: ['rides', 'me', 'upcoming', queryArg],
    queryFn: () => ridesApi.getMyRides({ when: 'upcoming', q: queryArg }),
  });

  const pastScheduled = useQuery({
    queryKey: ['rides', 'me', 'past', queryArg],
    queryFn: () => ridesApi.getMyRides({ when: 'past', q: queryArg }),
  });

  const history = useQuery({
    queryKey: ['history'],
    queryFn: () => historyApi.getHistory(),
  });

  const linkedRideGroupIds = useMemo(() => {
    const raw = Array.isArray(history.data) ? history.data : [];
    return new Set(raw.map((h) => h.rideGroupId).filter(Boolean));
  }, [history.data]);

  const historyRows = useMemo(() => {
    const raw = Array.isArray(history.data) ? history.data : [];
    if (!q) return raw;
    const t = q.toLowerCase();
    return raw.filter(
      (h) =>
        (h.routeTitle || '').toLowerCase().includes(t) ||
        (h.routeDifficulty || '').toLowerCase().includes(t) ||
        (h.clubName || '').toLowerCase().includes(t),
    );
  }, [history.data, q]);

  const pastScheduledDeduped = useMemo(() => {
    const list = Array.isArray(pastScheduled.data) ? pastScheduled.data : [];
    return list.filter((r) => !linkedRideGroupIds.has(r.id));
  }, [pastScheduled.data, linkedRideGroupIds]);

  return {
    upcoming: Array.isArray(upcoming.data) ? upcoming.data : [],
    pastScheduled: pastScheduledDeduped,
    historyRows,
    isLoading: upcoming.isPending || pastScheduled.isPending || history.isPending,
    isError: upcoming.isError || pastScheduled.isError || history.isError,
    error: upcoming.error || pastScheduled.error || history.error,
  };
}
