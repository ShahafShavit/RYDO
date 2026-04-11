import { useDeferredValue, useMemo } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { normalizePaginatedResult } from '@/shared/api/api-helpers';
import { ridesApi } from '@/features/rides/api/rides-api';
import { historyApi } from '@/features/history/api/history-api';

const PAGE_SIZE = 20;

export function useMyRidesPanel(search) {
  const q = useDeferredValue(search.trim());
  const queryArg = q || undefined;

  const upcoming = useQuery({
    queryKey: ['rides', 'me', 'upcoming', queryArg],
    queryFn: () => ridesApi.getMyRides({ when: 'upcoming', q: queryArg }),
  });

  const historyInfinite = useInfiniteQuery({
    queryKey: ['history', 'me', queryArg],
    queryFn: async ({ pageParam = 0 }) =>
      normalizePaginatedResult(await historyApi.getHistory({ skip: pageParam, take: PAGE_SIZE, q: queryArg })),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextSkip = lastPage.skip + lastPage.items.length;
      if (nextSkip >= lastPage.total || lastPage.items.length === 0) return undefined;
      return nextSkip;
    },
  });

  const pastInfinite = useInfiniteQuery({
    queryKey: ['rides', 'me', 'past', 'paged', queryArg],
    queryFn: async ({ pageParam = 0 }) =>
      normalizePaginatedResult(
        await ridesApi.getMyRides({ when: 'past', q: queryArg, skip: pageParam, take: PAGE_SIZE }),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextSkip = lastPage.skip + lastPage.items.length;
      if (nextSkip >= lastPage.total || lastPage.items.length === 0) return undefined;
      return nextSkip;
    },
  });

  const historyRows = useMemo(
    () => historyInfinite.data?.pages.flatMap((p) => p.items) ?? [],
    [historyInfinite.data],
  );

  const pastScheduled = useMemo(
    () => pastInfinite.data?.pages.flatMap((p) => p.items) ?? [],
    [pastInfinite.data],
  );

  const hasNextPage = Boolean(historyInfinite.hasNextPage || pastInfinite.hasNextPage);
  const isFetchingNextPage = historyInfinite.isFetchingNextPage || pastInfinite.isFetchingNextPage;

  function fetchNextPage() {
    if (historyInfinite.hasNextPage && !historyInfinite.isFetchingNextPage) {
      historyInfinite.fetchNextPage();
      return;
    }
    if (pastInfinite.hasNextPage && !pastInfinite.isFetchingNextPage) {
      pastInfinite.fetchNextPage();
    }
  }

  return {
    upcoming: Array.isArray(upcoming.data) ? upcoming.data : [],
    pastScheduled,
    historyRows,
    isLoading: upcoming.isPending || historyInfinite.isPending || pastInfinite.isPending,
    isError: upcoming.isError || historyInfinite.isError || pastInfinite.isError,
    error: upcoming.error || historyInfinite.error || pastInfinite.error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  };
}
