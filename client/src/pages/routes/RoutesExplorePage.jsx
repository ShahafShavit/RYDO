import { useDeferredValue, useMemo, useCallback, useState } from 'react';
import RouteCard from '@/features/routes/components/RouteCard';
import RouteFilters from '@/features/routes/components/RouteFilters';
import { useRoutesExploreInfinite } from '@/features/routes/hooks/useRoutesExploreInfinite';
import { useNearMeGeo } from '@/features/routes/hooks/useNearMeGeo';
import { useIntersectionSentinel } from '@/shared/hooks/useIntersectionSentinel';

const defaultExploreFilters = () => ({
  search: '',
  terrain: 'all',
  difficulty: 'all',
  distance: 'all',
  sort: 'newest',
  nearLat: null,
  nearLng: null,
  /** When set with near-me, API filters to routes within this radius (km). Null = no radius cap. */
  nearMaxKm: null,
});

export default function RoutesExplorePage() {
  const [filters, setFilters] = useState(defaultExploreFilters);
  const { loading: geoLoading, error: geoError, requestPosition, clearError } = useNearMeGeo();

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

  const nearActive =
    typeof filters.nearLat === 'number' &&
    typeof filters.nearLng === 'number' &&
    !Number.isNaN(filters.nearLat) &&
    !Number.isNaN(filters.nearLng);

  const handleUseNearMe = useCallback(() => {
    clearError();
    requestPosition(({ lat, lng }) => {
      setFilters((f) => ({ ...f, nearLat: lat, nearLng: lng }));
    });
  }, [clearError, requestPosition]);

  const handleClearNearMe = useCallback(() => {
    clearError();
    setFilters((f) => ({ ...f, nearLat: null, nearLng: null, nearMaxKm: null }));
  }, [clearError]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-white/42">Repository</p>
        <h1 className="mt-2 text-3xl font-semibold">Explore routes</h1>
      </div>
      <RouteFilters
        filters={filters}
        onFilterChange={setFilters}
        nearActive={nearActive}
        geoLoading={geoLoading}
        geoError={geoError}
        onUseNearMe={handleUseNearMe}
        onClearNearMe={handleClearNearMe}
      />
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
            onClick={() => setFilters(defaultExploreFilters())}
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
