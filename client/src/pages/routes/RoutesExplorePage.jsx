import { useDeferredValue, useMemo, useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import RouteCard from '@/features/routes/components/RouteCard';
import RouteCardBold from '@/features/routes/components/RouteCardBold';
import ExploreRoutesFloatingActions from '@/features/routes/components/ExploreRoutesFloatingActions';
import UploadRouteModal from '@/features/routes/components/UploadRouteModal';
import RouteAdvancedFilters from '@/features/routes/components/RouteAdvancedFilters';
import ExploreScopeTabs from '@/features/routes/components/ExploreScopeTabs';
import ExploreClubsSection from '@/features/routes/components/ExploreClubsSection';
import ExplorePeopleSection from '@/features/routes/components/ExplorePeopleSection';
import { ExploreSearchBarDesktop, ExploreSearchBarMobile } from '@/features/routes/components/ExploreSearchBar';
import Button from '@/shared/components/ui/button/Button';
import { PAGE_HEADER_PRIMARY_CTA_CLASSNAME } from '@/shared/lib/pageHeaderPrimaryCta';
import { useRoutesExploreInfinite } from '@/features/routes/hooks/useRoutesExploreInfinite';
import { useNearMeGeo } from '@/features/routes/hooks/useNearMeGeo';
import { useUserSearch } from '@/features/users/hooks/useUserSearch';
import { useIntersectionSentinel } from '@/shared/hooks/useIntersectionSentinel';
import { ROUTES } from '@/app/router/route-paths';
import { clubsApi } from '@/features/clubs/api/clubs-api';
import CreateClubModal from '@/features/clubs/components/CreateClubModal';
import RedeemClubInviteModal from '@/features/clubs/components/RedeemClubInviteModal';
import { clubMatchesSearch, splitMemberAndDiscoverClubs } from '@/features/clubs/club-list-search';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import BoldScrollArea from '@/shared/components/bold/BoldScrollArea';
import { cn } from '@/shared/lib/cn';
import {
  clearRouteAdvancedFilters,
  defaultExploreFilters,
  parseCreatedByUserIdFromSearchParams,
  parseScopeFromSearchParams,
  scopeShowsPeopleQuery,
  scopeShowsRouteFilters,
  scopeShowsRoutesQuery,
} from '@/features/routes/explore/explore-scope';

function ExploreMobileHeader({
  filtersOpen,
  onToggleFilters,
  onCreateOpen,
  onInviteOpen,
  showFaders,
}) {
  return (
    <header className="px-5 pt-2">
      <div className="flex items-end justify-between gap-3">
        <DisplayTitle size="lg" className="min-w-0 flex-1">
          Explore
        </DisplayTitle>
        {showFaders ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="rydo-iconbtn rydo-iconbtn-lg"
              aria-label="Route filters"
              aria-expanded={filtersOpen}
              onClick={onToggleFilters}
            >
              <SlidersHorizontal className="h-[19px] w-[19px]" strokeWidth={2} />
            </button>
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
        <button type="button" className="text-rydo-purple" onClick={onCreateOpen}>
          Create club
        </button>
        <span className="text-fg-subtle" aria-hidden>
          ·
        </span>
        <button type="button" className="text-rydo-purple" onClick={onInviteOpen}>
          Have an invite code?
        </button>
      </div>
    </header>
  );
}

function RouteListEmpty({ onClearRouteFilters, className, message = 'No routes found matching your filters.' }) {
  return (
    <div className={cn('rounded-[28px] border border-border bg-surface py-12 text-center', className)}>
      <p className="text-fg-muted">{message}</p>
      <button
        type="button"
        onClick={onClearRouteFilters}
        className="mt-4 text-sm text-rydo-purple hover:underline"
      >
        Clear route filters
      </button>
    </div>
  );
}

export default function RoutesExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(defaultExploreFilters);
  const [scope, setScope] = useState(() => parseScopeFromSearchParams(searchParams));
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [createClubOpen, setCreateClubOpen] = useState(false);
  const [inviteClubOpen, setInviteClubOpen] = useState(false);

  const uploadModalOpen = searchParams.get('upload') === 'true';

  const syncExploreUrl = useCallback(
    (nextScope, nextSearch) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        const scopeValue = nextScope ?? scope;
        const q = (nextSearch ?? filters.search).trim();
        if (scopeValue && scopeValue !== 'all') next.set('scope', scopeValue);
        else next.delete('scope');
        if (q) next.set('q', q);
        else next.delete('q');
        return next;
      });
    },
    [filters.search, scope, setSearchParams],
  );

  const openUploadModal = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('upload', 'true');
      return next;
    });
  }, [setSearchParams]);

  const closeUploadModal = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('upload');
      return next;
    });
  }, [setSearchParams]);

  const urlSyncKey = `${searchParams.get('scope') ?? ''}\x1f${searchParams.get('q') ?? ''}\x1f${searchParams.get('createdBy') ?? ''}`;
  const [appliedUrlSyncKey, setAppliedUrlSyncKey] = useState('');
  if (urlSyncKey !== appliedUrlSyncKey) {
    setAppliedUrlSyncKey(urlSyncKey);
    const createdByUserId = parseCreatedByUserIdFromSearchParams(searchParams);
    const urlScope = parseScopeFromSearchParams(searchParams);
    setScope(createdByUserId != null ? 'routes' : urlScope);
    setFilters((f) => ({
      ...f,
      search: searchParams.get('q') ?? '',
      createdByUserId,
    }));
  }

  const handleScopeChange = useCallback(
    (nextScope) => {
      setScope(nextScope);
      if (nextScope === 'clubs' || nextScope === 'people') {
        setMobileFiltersOpen(false);
      }
      syncExploreUrl(nextScope, filters.search);
    },
    [filters.search, syncExploreUrl],
  );

  const handleSearchChange = useCallback(
    (value) => {
      setFilters((f) => ({ ...f, search: value }));
      syncExploreUrl(scope, value);
    },
    [scope, syncExploreUrl],
  );

  const handleClearRouteFilters = useCallback(() => {
    setFilters((f) => clearRouteAdvancedFilters(f));
  }, []);

  const { loading: geoLoading, error: geoError, requestPosition, clearError } = useNearMeGeo();

  const deferredSearch = useDeferredValue(filters.search);
  const peopleSearchQ = deferredSearch.trim();
  const hasSearchQuery = peopleSearchQ.length > 0;
  const showRouteFilters = scopeShowsRouteFilters(scope);
  const showRoutesQuery = scopeShowsRoutesQuery(scope);
  const showPeopleQuery = scopeShowsPeopleQuery(scope, peopleSearchQ);
  const showClubsQuery = scope === 'clubs' || (scope === 'all' && hasSearchQuery);

  const {
    data: peopleItems = [],
    isFetching: peopleFetching,
    isError: peopleError,
    error: peopleSearchError,
  } = useUserSearch(peopleSearchQ, 24, { enabled: showPeopleQuery });

  const { data: clubs = [], isLoading: clubsLoading } = useQuery({
    queryKey: ['clubs', 'list'],
    queryFn: () => clubsApi.list(),
    enabled: showClubsQuery,
  });

  const clubResults = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const filtered = q.length > 0 ? clubs.filter((c) => clubMatchesSearch(c, q)) : clubs;
    const split = splitMemberAndDiscoverClubs(filtered);
    return {
      ...split,
      totalMatches: filtered.length,
    };
  }, [clubs, deferredSearch]);

  const routesSearchForQuery =
    scope === 'routes' || (scope === 'all' && hasSearchQuery) ? deferredSearch : '';

  const filtersForQuery = useMemo(
    () => ({ ...filters, search: routesSearchForQuery }),
    [filters, routesSearchForQuery],
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useRoutesExploreInfinite(filtersForQuery, { enabled: showRoutesQuery });

  const routes = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const routesLoadEnabled = showRoutesQuery && (scope === 'routes' || scope === 'all');
  const sentinelRef = useIntersectionSentinel(
    loadMore,
    Boolean(routesLoadEnabled && hasNextPage && !isLoading),
  );

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

  const clubEmptySearch =
    hasSearchQuery &&
    clubResults.totalMatches === 0 &&
    !clubsLoading &&
    clubs.length > 0;

  const routeAdvancedFiltersProps = {
    filters,
    onFilterChange: setFilters,
    nearActive,
    geoLoading,
    geoError,
    onUseNearMe: handleUseNearMe,
    onClearNearMe: handleClearNearMe,
  };

  const renderRouteListDesktop = (options = {}) => {
    const { showSortEyebrow = true, className } = options;
    return (
      <div className={className}>
        {showSortEyebrow ? (
          <div className="mb-4">
            <Eyebrow className="text-fg-subtle">
              Sorted by {filters.sort === 'favorites' ? 'favorites' : nearActive ? 'distance' : 'newest'}
            </Eyebrow>
          </div>
        ) : null}
        {isError ? (
          <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Could not load routes. Try again later.
          </p>
        ) : null}
        {isLoading ? (
          <p className="text-fg-muted">Loading routes…</p>
        ) : routes.length === 0 ? (
          <RouteListEmpty onClearRouteFilters={handleClearRouteFilters} />
        ) : (
          <>
            <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[repeat(3,minmax(0,1fr))]">
              {routes.map((route) => (
                <RouteCard key={route.id} route={route} />
              ))}
            </div>
            <div ref={sentinelRef} className="flex min-h-10 justify-center py-4" aria-hidden="true" />
            {isFetchingNextPage ? (
              <p className="text-center text-sm text-fg-subtle">Loading more…</p>
            ) : null}
          </>
        )}
      </div>
    );
  };

  const renderRouteListMobile = (options = {}) => {
    const { showSortEyebrow = true, sectionEyebrow, className } = options;
    return (
      <div className={className}>
        {sectionEyebrow ? (
          <div className="mb-2.5 px-5">
            <Eyebrow>{sectionEyebrow}</Eyebrow>
          </div>
        ) : showSortEyebrow ? (
          <div className="mb-2.5 px-5">
            <Eyebrow>
              Sorted by {filters.sort === 'favorites' ? 'favorites' : nearActive ? 'distance' : 'newest'}
            </Eyebrow>
          </div>
        ) : null}
        {isError ? (
          <p className="mx-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Could not load routes.
          </p>
        ) : null}
        {isLoading ? (
          <p className="px-5 text-fg-muted">Loading routes…</p>
        ) : routes.length === 0 ? (
          <RouteListEmpty onClearRouteFilters={handleClearRouteFilters} className="mx-5" message="No routes found." />
        ) : (
          <>
            <div className="flex flex-col gap-2.5 px-5">
              {routes.map((route) => (
                <RouteCardBold key={route.id} route={route} />
              ))}
            </div>
            <div ref={sentinelRef} className="flex min-h-10 justify-center py-4" aria-hidden="true" />
            {isFetchingNextPage ? (
              <p className="text-center text-sm text-fg-subtle">Loading more…</p>
            ) : null}
          </>
        )}
      </div>
    );
  };

  const renderDesktopContent = () => {
    if (scope === 'clubs') {
      return (
        <ExploreClubsSection
          variant="desktop"
          memberClubs={clubResults.memberClubs}
          otherPublicClubs={clubResults.otherPublicClubs}
          otherPrivateClubs={clubResults.otherPrivateClubs}
          totalMatches={clubResults.totalMatches}
          searchQuery={deferredSearch}
          showEmptySearch={clubEmptySearch}
          isLoading={clubsLoading}
          clubsCount={clubs.length}
        />
      );
    }

    if (scope === 'people') {
      return (
        <ExplorePeopleSection
          variant="desktop"
          searchQuery={deferredSearch}
          peopleItems={peopleItems}
          isFetching={peopleFetching}
          isError={peopleError}
          errorMessage={peopleSearchError?.message}
          showPrompt={peopleSearchQ.length === 0}
        />
      );
    }

    if (scope === 'routes') {
      return renderRouteListDesktop();
    }

    // scope === 'all'
    if (hasSearchQuery) {
      return (
        <div className="space-y-8">
          {peopleSearchQ.length === 1 ? (
            <ExplorePeopleSection variant="desktop" searchQuery={deferredSearch} showKeepTyping />
          ) : null}
          {peopleSearchQ.length >= 2 ? (
            <ExplorePeopleSection
              variant="desktop"
              searchQuery={deferredSearch}
              peopleItems={peopleItems}
              isFetching={peopleFetching}
              isError={peopleError}
              errorMessage={peopleSearchError?.message}
              compact
            />
          ) : null}
          <ExploreClubsSection
            variant="desktop"
            memberClubs={clubResults.memberClubs}
            otherPublicClubs={clubResults.otherPublicClubs}
            otherPrivateClubs={clubResults.otherPrivateClubs}
            totalMatches={clubResults.totalMatches}
            searchQuery={deferredSearch}
            showEmptySearch={clubEmptySearch}
            isLoading={clubsLoading}
            clubsCount={clubs.length}
            compact
          />
          <div>
            <Eyebrow className="mb-4">Routes · {routes.length}{hasNextPage ? '+' : ''}</Eyebrow>
            {renderRouteListDesktop({ showSortEyebrow: false })}
          </div>
        </div>
      );
    }

    return renderRouteListDesktop();
  };

  const renderMobileContent = () => {
    if (scope === 'clubs') {
      return (
        <ExploreClubsSection
          variant="mobile"
          className="px-5"
          memberClubs={clubResults.memberClubs}
          otherPublicClubs={clubResults.otherPublicClubs}
          otherPrivateClubs={clubResults.otherPrivateClubs}
          totalMatches={clubResults.totalMatches}
          searchQuery={deferredSearch}
          showEmptySearch={clubEmptySearch}
          isLoading={clubsLoading}
          clubsCount={clubs.length}
        />
      );
    }

    if (scope === 'people') {
      return (
        <ExplorePeopleSection
          variant="mobile"
          className="px-5"
          searchQuery={deferredSearch}
          peopleItems={peopleItems}
          isFetching={peopleFetching}
          isError={peopleError}
          errorMessage={peopleSearchError?.message}
          showPrompt={peopleSearchQ.length === 0}
        />
      );
    }

    if (scope === 'routes') {
      return renderRouteListMobile();
    }

    // scope === 'all'
    if (hasSearchQuery) {
      return (
        <>
          {peopleSearchQ.length === 1 ? (
            <ExplorePeopleSection variant="mobile" className="px-5" searchQuery={deferredSearch} showKeepTyping />
          ) : null}
          {peopleSearchQ.length >= 2 ? (
            <ExplorePeopleSection
              variant="mobile"
              className="px-5"
              searchQuery={deferredSearch}
              peopleItems={peopleItems}
              isFetching={peopleFetching}
              isError={peopleError}
              errorMessage={peopleSearchError?.message}
              compact
            />
          ) : null}
          <ExploreClubsSection
            variant="mobile"
            className="mb-4 px-5"
            memberClubs={clubResults.memberClubs}
            otherPublicClubs={clubResults.otherPublicClubs}
            otherPrivateClubs={clubResults.otherPrivateClubs}
            totalMatches={clubResults.totalMatches}
            searchQuery={deferredSearch}
            showEmptySearch={clubEmptySearch}
            isLoading={clubsLoading}
            clubsCount={clubs.length}
            compact
          />
          {renderRouteListMobile({
            showSortEyebrow: false,
            sectionEyebrow: `Routes · ${routes.length}${hasNextPage ? '+' : ''}`,
          })}
        </>
      );
    }

    return renderRouteListMobile();
  };

  return (
    <>
      {/* Desktop */}
      <section className="hidden min-w-0 space-y-6 md:block">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Repository</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold text-fg">Explore</h1>
              <p className="mt-2 max-w-xl text-sm text-fg-muted">
                Browse routes, clubs, and people. Search or pick a tab to focus — routes show by default.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                to={ROUTES.myRoutes}
                className="inline-flex h-8 items-center rounded-2xl border border-border bg-surface px-4 text-sm font-semibold text-fg transition hover:border-border-strong hover:bg-surface-strong"
              >
                My Routes
              </Link>
              <Button
                variant="primary"
                type="button"
                size="sm"
                className={PAGE_HEADER_PRIMARY_CTA_CLASSNAME}
                onClick={openUploadModal}
              >
                Add route
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <ExploreSearchBarDesktop scope={scope} value={filters.search} onChange={handleSearchChange} />
          <ExploreScopeTabs scope={scope} onScopeChange={handleScopeChange} />
          {showRouteFilters ? <RouteAdvancedFilters {...routeAdvancedFiltersProps} /> : null}
        </div>

        {renderDesktopContent()}
      </section>

      {/* Mobile Bold */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <BoldScreen>
          <ExploreMobileHeader
            filtersOpen={mobileFiltersOpen}
            onToggleFilters={() => setMobileFiltersOpen((o) => !o)}
            onCreateOpen={() => setCreateClubOpen(true)}
            onInviteOpen={() => setInviteClubOpen(true)}
            showFaders={showRouteFilters}
          />

          <div className="relative z-[2] flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="space-y-3 px-5 pt-3">
              <ExploreSearchBarMobile scope={scope} value={filters.search} onChange={handleSearchChange} />
              <ExploreScopeTabs scope={scope} onScopeChange={handleScopeChange} />
              {showRouteFilters && mobileFiltersOpen ? (
                <RouteAdvancedFilters {...routeAdvancedFiltersProps} />
              ) : null}
            </div>

            <BoldScrollArea className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-[calc(var(--rydo-tabbar-h)+5rem)] pt-3.5 md:pb-4">
              {renderMobileContent()}
            </BoldScrollArea>
          </div>
        </BoldScreen>

        <ExploreRoutesFloatingActions onAddRoute={openUploadModal} />
      </div>

      <UploadRouteModal isOpen={uploadModalOpen} onClose={closeUploadModal} />
      <CreateClubModal isOpen={createClubOpen} onClose={() => setCreateClubOpen(false)} />
      <RedeemClubInviteModal isOpen={inviteClubOpen} onClose={() => setInviteClubOpen(false)} />
    </>
  );
}
