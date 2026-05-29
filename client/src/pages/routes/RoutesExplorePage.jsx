import { useDeferredValue, useMemo, useCallback, useState } from 'react';
import { Link, generatePath, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import RouteCard from '@/features/routes/components/RouteCard';
import RouteCardBold from '@/features/routes/components/RouteCardBold';
import RouteFilters from '@/features/routes/components/RouteFilters';
import { useRoutesExploreInfinite } from '@/features/routes/hooks/useRoutesExploreInfinite';
import { useNearMeGeo } from '@/features/routes/hooks/useNearMeGeo';
import { useUserSearch } from '@/features/users/hooks/useUserSearch';
import { useIntersectionSentinel } from '@/shared/hooks/useIntersectionSentinel';
import { ROUTES } from '@/app/router/route-paths';
import UserAvatar from '@/shared/components/user/UserAvatar';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import { cn } from '@/shared/lib/cn';

const defaultExploreFilters = () => ({
  search: '',
  terrain: 'all',
  difficulty: 'all',
  distance: 'all',
  sort: 'newest',
  nearLat: null,
  nearLng: null,
  nearMaxKm: null,
  createdByUserId: null,
});

function parseCreatedByUserIdFromSearchParams(searchParams) {
  const raw = searchParams.get('createdBy');
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const FILTER_CHIPS = [
  { label: 'All', value: null },
  { label: 'Near me', value: 'near' },
  { label: 'Gravel', value: 'terrain:gravel' },
  { label: 'Trail', value: 'terrain:trail' },
  { label: 'Road', value: 'terrain:road' },
  { label: 'Casual', value: 'difficulty:casual' },
  { label: 'Hard', value: 'difficulty:hard' },
];

function ExploreMobileHeader({ routeCount, filtersOpen, onToggleFilters }) {
  return (
    <header className="px-5 pt-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Eyebrow>Repository · {routeCount != null ? `${routeCount}+ routes` : 'routes'}</Eyebrow>
          <DisplayTitle size="lg" className="mt-1.5">
            Explore
          </DisplayTitle>
        </div>
        <button
          type="button"
          className="rydo-iconbtn rydo-iconbtn-lg"
          aria-label="Filters"
          aria-expanded={filtersOpen}
          onClick={onToggleFilters}
        >
          <SlidersHorizontal className="h-[19px] w-[19px]" strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}

export default function RoutesExplorePage() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(defaultExploreFilters);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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
  const totalCount = data?.pages?.[0]?.totalCount;

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
      setFilters((f) => ({ ...f, nearLat: lat, nearLng: lng, sort: 'newest' }));
    });
  }, [clearError, requestPosition]);

  const handleClearNearMe = useCallback(() => {
    clearError();
    setFilters((f) => ({ ...f, nearLat: null, nearLng: null, nearMaxKm: null }));
  }, [clearError]);

  const handleChipClick = (chip) => {
    if (chip.value === null) {
      setFilters(defaultExploreFilters());
      return;
    }
    if (chip.value === 'near') {
      handleUseNearMe();
      return;
    }
    const [type, v] = chip.value.split(':');
    setFilters((f) => {
      const next = { ...f };
      if (type === 'terrain') next.terrain = v;
      if (type === 'difficulty') next.difficulty = v;
      return next;
    });
  };

  const activeChip = nearActive
    ? 'near'
    : filters.terrain !== 'all'
      ? `terrain:${filters.terrain}`
      : filters.difficulty !== 'all'
        ? `difficulty:${filters.difficulty}`
        : null;

  const routeListDesktop = (
    <>
      {isLoading ? (
        <p className="text-fg-muted">Loading routes…</p>
      ) : routes?.length === 0 ? (
        <div className="rounded-[28px] border border-border bg-surface py-12 text-center">
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
    </>
  );

  const routeListMobile = (
    <>
      {isLoading ? (
        <p className="px-5 text-fg-muted">Loading routes…</p>
      ) : routes?.length === 0 ? (
        <div className="mx-5 rounded-[28px] border border-border bg-surface py-12 text-center">
          <p className="text-fg-muted">No routes found.</p>
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
          <div className="flex flex-col gap-2.5 px-5">
            {(routes || []).map((route) => (
              <RouteCardBold key={route.id} route={route} />
            ))}
          </div>
          <div ref={sentinelRef} className="flex min-h-10 justify-center py-4" aria-hidden="true" />
          {isFetchingNextPage ? (
            <p className="text-center text-sm text-fg-subtle">Loading more…</p>
          ) : null}
        </>
      )}
    </>
  );

  return (
    <>
      {/* Desktop */}
      <section className="hidden min-w-0 space-y-6 md:block">
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
        {routeListDesktop}
      </section>

      {/* Mobile Bold */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <BoldScreen>
        <ExploreMobileHeader
          routeCount={totalCount}
          filtersOpen={mobileFiltersOpen}
          onToggleFilters={() => setMobileFiltersOpen((o) => !o)}
        />

        <div className="relative z-[2] flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="space-y-3 px-5 pt-3">
            <div className="flex h-12 items-center gap-2.5 rounded-full border border-border bg-black/25 px-4">
              <Search className="h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Search routes or riders…"
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none"
                aria-label="Search routes"
              />
            </div>

            {mobileFiltersOpen ? (
              <div className="md:hidden">
                <RouteFilters
                  filters={filters}
                  onFilterChange={setFilters}
                  nearActive={nearActive}
                  geoLoading={geoLoading}
                  geoError={geoError}
                  onUseNearMe={handleUseNearMe}
                  onClearNearMe={handleClearNearMe}
                />
              </div>
            ) : (
              <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex items-center gap-2">
                  {FILTER_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      className={cn(
                        'rydo-chip inline-flex h-9 shrink-0 items-center justify-center',
                        (chip.value === null && !activeChip) || activeChip === chip.value ? 'rydo-chip-on' : '',
                      )}
                      onClick={() => handleChipClick(chip)}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-4 pt-3.5">
            <div className="mb-2.5 flex items-center justify-between px-5">
              <Eyebrow>Sorted by {filters.sort === 'favorites' ? 'favorites' : 'newest'}</Eyebrow>
            </div>
            {isError ? (
              <p className="mx-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Could not load routes.
              </p>
            ) : null}
            {routeListMobile}
          </div>
        </div>
        </BoldScreen>
      </div>
    </>
  );
}
