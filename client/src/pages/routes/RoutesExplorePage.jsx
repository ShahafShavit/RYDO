import { useDeferredValue, useMemo, useCallback, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  /** Filter explore list to routes uploaded by this user (from URL `?createdBy=`). */
  createdByUserId: null,
});

function parseCreatedByUserIdFromSearchParams(searchParams) {
  const raw = searchParams.get('createdBy');
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function RoutesExplorePage() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(defaultExploreFilters);

  useEffect(() => {
    const createdByUserId = parseCreatedByUserIdFromSearchParams(searchParams);
    const q = searchParams.get('q') ?? '';
    setFilters((f) => ({
      ...f,
      search: q,
      createdByUserId,
    }));
  }, [searchParams]);
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
        <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Repository</p>
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
        <p className="text-fg-muted">Loading routes…</p>
      ) : routes?.length === 0 ? (
        <div className="py-12 text-center rounded-[28px] border border-border bg-surface">
          <p className="text-fg-muted">No routes found matching your filters.</p>
          <button
            type="button"
            onClick={() => setFilters(defaultExploreFilters())}
            className="mt-4 text-sm text-rydo-purple hover:underline"
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
            <p className="text-center text-sm text-fg-subtle">Loading more…</p>
          ) : null}
        </>
      )}
    </section>
  );
}
