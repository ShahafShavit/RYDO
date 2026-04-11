import { useDeferredValue, useMemo, useCallback, useState } from 'react';
import RouteCard from '@/features/routes/components/RouteCard';
import RouteFilters from '@/features/routes/components/RouteFilters';
import { useRoutesExploreInfinite } from '@/features/routes/hooks/useRoutesExploreInfinite';
import { useIntersectionSentinel } from '@/shared/hooks/useIntersectionSentinel';

export default function RoutesExplorePage() {
  const [filters, setFilters] = useState({
    search: '',
    terrain: 'all',
    difficulty: 'all',
    distance: 'all',
    sort: 'newest',
  });

  const deferredSearch = useDeferredValue(filters.search);
  const filtersForQuery = useMemo(
    () => ({ ...filters, search: deferredSearch }),
    [filters, deferredSearch],
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useRoutesExploreInfinite(filtersForQuery);

  const routes = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sentinelRef = useIntersectionSentinel(loadMore, Boolean(hasNextPage && !isLoading));

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-white/42">Repository</p>
        <h1 className="mt-2 text-3xl font-semibold">Explore routes</h1>
        <p className="mt-3 max-w-2xl text-white/64">
          The website version should feel broader, cleaner and more decision-friendly than the mobile screens.
        </p>
      </div>
      <RouteFilters filters={filters} onFilterChange={setFilters} />
      {isError ? (
        <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Could not load routes. Try again later.
        </p>
      ) : null}
      {isLoading ? (
        <p className="text-white/60">Loading routes…</p>
      ) : routes?.length === 0 ? (
        <div className="py-12 text-center rounded-[28px] border border-white/5 bg-white/5">
          <p className="text-white/60">No routes found matching your filters.</p>
          <button
            type="button"
            onClick={() =>
              setFilters({ search: '', terrain: 'all', difficulty: 'all', distance: 'all', sort: 'newest' })
            }
            className="mt-4 text-sm text-[#7B5CFF] hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {(routes || []).map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
          <div ref={sentinelRef} className="flex min-h-10 justify-center py-4" aria-hidden="true" />
          {isFetchingNextPage ? (
            <p className="text-center text-sm text-white/48">Loading more…</p>
          ) : null}
        </>
      )}
    </section>
  );
}
