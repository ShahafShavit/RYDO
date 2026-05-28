import { useDeferredValue, useMemo, useCallback, useState } from 'react';
import { Link, generatePath, useSearchParams } from 'react-router-dom';
import RouteCard from '@/features/routes/components/RouteCard';
import RouteFilters from '@/features/routes/components/RouteFilters';
import { useRoutesExploreInfinite } from '@/features/routes/hooks/useRoutesExploreInfinite';
import { useNearMeGeo } from '@/features/routes/hooks/useNearMeGeo';
import { useUserSearch } from '@/features/users/hooks/useUserSearch';
import { useIntersectionSentinel } from '@/shared/hooks/useIntersectionSentinel';
import { ROUTES } from '@/app/router/route-paths';
import UserAvatar from '@/shared/components/user/UserAvatar';

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

  const urlSyncKey = `${searchParams.get('q') ?? ''}\x1f${searchParams.get('createdBy') ?? ''}`;
  const [appliedUrlSyncKey, setAppliedUrlSyncKey] = useState('');
  if (urlSyncKey !== appliedUrlSyncKey) {
    setAppliedUrlSyncKey(urlSyncKey);
    setFilters((f) => ({
      ...f,
      search: searchParams.get('q') ?? '',
      createdByUserId: parseCreatedByUserIdFromSearchParams(searchParams),
    }));
  }
  const { loading: geoLoading, error: geoError, requestPosition, clearError } = useNearMeGeo();

  const deferredSearch = useDeferredValue(filters.search);
  const peopleSearchQ = deferredSearch.trim();
  const showPeopleSearch = peopleSearchQ.length >= 2;
  const {
    data: peopleItems = [],
    isFetching: peopleFetching,
    isError: peopleError,
    error: peopleSearchError,
  } = useUserSearch(peopleSearchQ, 24);

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
      // Near-me list is always sorted by distance; clear favorite sort so UI matches API.
      setFilters((f) => ({ ...f, nearLat: lat, nearLng: lng, sort: 'newest' }));
    });
  }, [clearError, requestPosition]);

  const handleClearNearMe = useCallback(() => {
    clearError();
    setFilters((f) => ({ ...f, nearLat: null, nearLng: null, nearMaxKm: null }));
  }, [clearError]);

  return (
    <section className="min-w-0 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Repository</p>
        <h1 className="mt-2 text-3xl font-semibold text-fg">Explore</h1>
        <p className="mt-2 max-w-xl text-sm text-fg-muted">
          Search routes by title or members by name. People matches appear once you type at least two characters.
        </p>
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
      {showPeopleSearch ? (
        <section className="space-y-3 rounded-[28px] border border-border bg-surface px-4 py-4 sm:px-6" aria-label="People search results">
          <h2 className="text-sm font-medium text-fg/90">People</h2>
          {peopleFetching ? <p className="text-sm text-fg-muted">Searching…</p> : null}
          {peopleError ? (
            <p className="text-sm text-red-400/90">{peopleSearchError?.message || 'People search failed.'}</p>
          ) : null}
          {!peopleFetching && !peopleError ? (
            <ul className="space-y-2">
              {peopleItems.length === 0 ? (
                <li className="text-sm text-fg-subtle">No members match that search.</li>
              ) : (
                peopleItems.map((row) => (
                  <li key={row.id}>
                    <Link
                      to={generatePath(ROUTES.userProfile, { userId: String(row.id) })}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-surface-strong px-4 py-3 transition hover:border-border-strong"
                    >
                      <UserAvatar avatarUrl={row.avatarUrl} displayName={row.fullName} />
                      <span className="font-medium text-fg/90">{row.fullName || `User ${row.id}`}</span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </section>
      ) : null}
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
          <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[repeat(3,minmax(0,1fr))]">
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
