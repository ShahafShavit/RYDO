import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import { ROUTES } from '@/app/router/route-paths';
import CompactRouteMapPreview from '@/features/routes/components/CompactRouteMapPreview';
import CompactRouteMapPlaceholder from '@/features/routes/components/CompactRouteMapPlaceholder';
import { formatDurationMinutes } from '@/features/dashboard/dashboard-mapper';
import { useMyRidesPanel } from '@/features/rides/hooks/useMyRidesPanel';
import { useMemberParticipatedRidesInfinite } from '@/features/rides/hooks/useMemberParticipatedRidesInfinite';
import { isRideUpcoming, mapRideDto } from '@/features/rides/hooks/useRideEvent';
import { useUserProfile } from '@/features/users/hooks/useUserProfile';
import CreatePersonalRideModal from '@/features/rides/components/CreatePersonalRideModal';
import { useIntersectionSentinel } from '@/shared/hooks/useIntersectionSentinel';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';
import { PAGE_HEADER_PRIMARY_CTA_CLASSNAME } from '@/shared/lib/pageHeaderPrimaryCta';

/** First screenful of upcoming cards before "Show more". */
const UPCOMING_PREVIEW_COUNT = 3;

/** Map / placeholder sizing for ride list cards (full width below badges). */
const RIDE_CARD_MAP_CLASS =
  'h-28 w-full overflow-hidden rounded-2xl border border-border bg-surface';

/** Stacked badge rows above the map. */
const RIDE_CARD_INFO_COL_CLASS = 'flex w-full min-w-0 flex-col gap-2';
const RIDE_CARD_INFO_ROW_BASE =
  'flex min-h-10 w-full min-w-0 items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-semibold leading-tight';

function RideInfoRow({ tone = 'neutral', children, title }) {
  const tones = {
    neutral: 'border-border bg-surface text-fg',
    route: 'border-cyan-400/50 bg-cyan-500/10 text-cyan-100',
    club: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100',
    personal: 'border-violet-400/50 bg-violet-500/15 text-violet-100',
    upcoming: 'border-amber-400/50 bg-amber-500/10 text-amber-100',
    past: 'border-border/70 bg-surface-strong/40 text-fg-subtle',
  };
  return (
    <div className={`${RIDE_CARD_INFO_ROW_BASE} ${tones[tone] || tones.neutral}`} title={title}>
      {children}
    </div>
  );
}

function clubDetailsPath(clubId) {
  return ROUTES.clubDetails.replace(':clubId', String(clubId));
}

/** Keeps up to `maxWords` words; adds an ellipsis when the name is longer. */
function truncateAtWords(text, maxWords) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}…`;
}

function ClubInfoRow({ clubId, clubName }) {
  const namePart = truncateAtWords((clubName || 'Club').trim(), 5);
  const row = <RideInfoRow tone="club">{namePart}</RideInfoRow>;
  if (clubId == null) {
    return row;
  }
  return (
    <Link
      to={clubDetailsPath(clubId)}
      className="block min-w-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple"
    >
      {row}
    </Link>
  );
}

function formatWhen(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

function rideKindFromScheduled(ride) {
  if (ride?.clubId != null) return 'club';
  return 'personal';
}

function ScheduledRideCard({ ride }) {
  const kind = rideKindFromScheduled(ride);
  const hasRoute = ride.routeId != null;
  const ridePath = ROUTES.rideEvent.replace(':rideId', String(ride.id));
  return (
    <Card className="relative p-4 sm:p-6">
      <Link
        to={ridePath}
        className="absolute inset-0 z-0 rounded-[28px] focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple focus-visible:ring-inset"
        aria-label={`View ride: ${ride.name}`}
      />
      <div className="relative z-10 flex flex-col gap-4 pointer-events-none">
        <div className={`${RIDE_CARD_INFO_COL_CLASS} pointer-events-auto`}>
          <RideInfoRow tone="upcoming">Scheduled</RideInfoRow>
          {kind === 'club' ? (
            <div className="w-full min-w-0">
              <ClubInfoRow clubId={ride.clubId} clubName={ride.clubName} />
            </div>
          ) : (
            <RideInfoRow tone="personal">Personal</RideInfoRow>
          )}
        </div>
        <div className="pointer-events-none w-full min-w-0">
          {hasRoute ? (
            <CompactRouteMapPreview preview={ride.preview} className={RIDE_CARD_MAP_CLASS} />
          ) : (
            <CompactRouteMapPlaceholder className="min-w-0" />
          )}
        </div>
      </div>
      <div className="relative z-10 mt-4 text-center pointer-events-none">
        <h3 className="w-full min-w-0 text-lg font-semibold">
          <span className="inline-block max-w-full truncate align-top" title={ride.name} dir="auto">
            {ride.name}
          </span>
        </h3>
        <p className="mt-2 text-sm text-fg-muted">{formatWhen(ride.scheduledDate)}</p>
      </div>
    </Card>
  );
}

function UpcomingRidesSection({ rides }) {
  const [searchParams] = useSearchParams();
  const [expanded, setExpanded] = useState(() => searchParams.get('upcoming') === 'all');
  const visible = useMemo(() => {
    if (expanded || rides.length <= UPCOMING_PREVIEW_COUNT) return rides;
    return rides.slice(0, UPCOMING_PREVIEW_COUNT);
  }, [rides, expanded]);
  const hiddenCount = rides.length - UPCOMING_PREVIEW_COUNT;
  return (
    <div>
      <h2 className="text-lg font-semibold">Upcoming</h2>
      {rides.length === 0 ? (
        <p className="mt-3 text-sm text-fg-muted">No upcoming rides.</p>
      ) : (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((ride) => (
              <ScheduledRideCard key={ride.id} ride={ride} />
            ))}
          </div>
          {!expanded && hiddenCount > 0 ? (
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                className="text-sm"
                onClick={() => setExpanded(true)}
              >
                Show more ({hiddenCount} more)…
              </Button>
            </div>
          ) : null}
          {expanded && rides.length > UPCOMING_PREVIEW_COUNT ? (
            <div className="mt-3">
              <Button type="button" variant="secondary" className="text-sm" onClick={() => setExpanded(false)}>
                Show less
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function PastScheduledCard({ ride }) {
  const kind = rideKindFromScheduled(ride);
  const hasRoute = ride.routeId != null;
  const ridePath = ROUTES.rideEvent.replace(':rideId', String(ride.id));
  return (
    <Card className="relative p-4 sm:p-6">
      <Link
        to={ridePath}
        className="absolute inset-0 z-0 rounded-[28px] focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple focus-visible:ring-inset"
        aria-label={`View ride: ${ride.name}`}
      />
      <div className="relative z-10 flex flex-col gap-4 pointer-events-none">
        <div className={`${RIDE_CARD_INFO_COL_CLASS} pointer-events-auto`}>
          <RideInfoRow tone="past">Past event</RideInfoRow>
          {kind === 'club' ? (
            <div className="w-full min-w-0">
              <ClubInfoRow clubId={ride.clubId} clubName={ride.clubName} />
            </div>
          ) : (
            <RideInfoRow tone="personal">Personal</RideInfoRow>
          )}
        </div>
        <div className="pointer-events-none w-full min-w-0">
          {hasRoute ? (
            <CompactRouteMapPreview preview={ride.preview} className={RIDE_CARD_MAP_CLASS} />
          ) : (
            <CompactRouteMapPlaceholder className="min-w-0" />
          )}
        </div>
      </div>
      <div className="relative z-10 mt-4 text-center pointer-events-none">
        <h3 className="w-full min-w-0 text-lg font-semibold">
          <span className="inline-block max-w-full truncate align-top" title={ride.name} dir="auto">
            {ride.name}
          </span>
        </h3>
        <p className="mt-2 text-sm text-fg-muted">{formatWhen(ride.scheduledDate)}</p>
        <p className="mt-2 text-sm text-fg-subtle">No logged stats for this event yet.</p>
      </div>
    </Card>
  );
}

function HistoryRideCard({ entry }) {
  const { formatKm } = useFormatDistance();
  const kind =
    entry.clubId != null
      ? 'club'
      : entry.rideKind === 'soloLog' || entry.rideKind === 'personal'
        ? 'personal'
        : null;
  const dist = entry.distanceKm != null ? formatKm(Number(entry.distanceKm)) : '—';
  const elev = entry.elevationGainM != null ? `${Math.round(Number(entry.elevationGainM))} m` : '—';
  const est = entry.estimatedDurationMinutes;
  const dur = entry.durationMinutes;
  let paceNote = '';
  if (est != null && dur != null) {
    const delta = dur - est;
    if (delta > 5) paceNote = `About ${delta} min slower than route estimate`;
    else if (delta < -5) paceNote = `About ${Math.abs(delta)} min faster than route estimate`;
    else paceNote = 'Close to route time estimate';
  }

  const ridePath =
    entry.rideId != null ? ROUTES.rideEvent.replace(':rideId', String(entry.rideId)) : null;
  const rideLabel =
    entry.routeTitle || entry.routeName || (entry.routeId != null ? `Route #${entry.routeId}` : 'Ride');

  return (
    <Card className="relative p-4 sm:p-6">
      {ridePath != null ? (
        <Link
          to={ridePath}
          className="absolute inset-0 z-0 rounded-[28px] focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple focus-visible:ring-inset"
          aria-label={`View ride: ${rideLabel}`}
        />
      ) : null}
      <div className="relative z-10 flex flex-col gap-4 pointer-events-none">
        <div className={`${RIDE_CARD_INFO_COL_CLASS} pointer-events-auto`}>
          {kind === 'club' ? (
            <div className="w-full min-w-0">
              <ClubInfoRow clubId={entry.clubId} clubName={entry.clubName} />
            </div>
          ) : kind === 'personal' ? (
            <RideInfoRow tone="personal">Personal</RideInfoRow>
          ) : null}
        </div>
        <div className="pointer-events-none w-full min-w-0">
          <CompactRouteMapPreview preview={entry.preview} className={RIDE_CARD_MAP_CLASS} />
        </div>
      </div>
      <div className="relative z-10 mt-3 text-center pointer-events-none">
        <h3 className="w-full min-w-0 text-lg font-semibold">
          <span className="inline-block max-w-full truncate align-top" title={rideLabel} dir="auto">
            {rideLabel}
          </span>
        </h3>
        <p className="text-sm text-fg-muted">{formatWhen(entry.completedAt)}</p>
      </div>
      <div className="relative z-10 mt-2.5 flex min-w-0 gap-0 pointer-events-none text-center">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle sm:text-xs sm:tracking-[0.14em]">
            Distance
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold tabular-nums">{dist}</p>
        </div>
        <div className="min-w-0 flex-1 border-l border-border/50 px-2 sm:px-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle sm:text-xs sm:tracking-[0.14em]">
            Duration
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold tabular-nums">
            {formatDurationMinutes(entry.durationMinutes)}
          </p>
        </div>
        <div className="min-w-0 flex-1 border-l border-border/50 pl-2 sm:pl-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle sm:text-xs sm:tracking-[0.14em]">
            Elevation
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold tabular-nums">{elev}</p>
        </div>
      </div>
      {paceNote ? (
        <p className="relative z-10 mt-2 text-center text-sm text-fg-muted pointer-events-none">{paceNote}</p>
      ) : null}
    </Card>
  );
}

export default function MyRidesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const memberRaw = searchParams.get('member');
  const memberUserId = useMemo(() => {
    if (memberRaw == null || memberRaw === '') return null;
    const n = Number(memberRaw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [memberRaw]);

  const qFromUrl = searchParams.get('q') || '';
  const [localSearch, setLocalSearch] = useState(() => searchParams.get('q') || '');
  const search = memberUserId != null ? qFromUrl : localSearch;
  const [modalOpen, setModalOpen] = useState(false);

  const { data: memberProfile } = useUserProfile(memberUserId != null ? String(memberUserId) : undefined);

  const myPanel = useMyRidesPanel(memberUserId == null ? search : '', {
    enabled: memberUserId == null,
  });
  const memberInfinite = useMemberParticipatedRidesInfinite(
    memberUserId != null ? memberUserId : 0,
    memberUserId != null ? search : '',
  );

  const useMember = memberUserId != null;
  const {
    upcoming: upcomingRaw,
    pastScheduled: pastRaw,
    historyRows,
    isLoading: myLoading,
    isError: myError,
    hasNextPage: myHasNext,
    fetchNextPage: myFetchNext,
    isFetchingNextPage: myFetchingNext,
  } = myPanel;

  const {
    data: memberData,
    fetchNextPage: memberFetchNext,
    hasNextPage: memberHasNext,
    isFetchingNextPage: memberFetchingNext,
    isLoading: memberLoading,
    isError: memberError,
  } = memberInfinite;

  const isLoading = useMember ? memberLoading : myLoading;
  const isError = useMember ? memberError : myError;
  const hasNextPage = useMember ? memberHasNext : myHasNext;
  const fetchNextPage = useMember ? memberFetchNext : myFetchNext;
  const isFetchingNextPage = useMember ? memberFetchingNext : myFetchingNext;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const pastLoggedSentinelRef = useIntersectionSentinel(loadMore, Boolean(hasNextPage && !isLoading));

  const memberAllRides = useMemo(
    () => memberData?.pages.flatMap((p) => p.items).filter(Boolean) ?? [],
    [memberData],
  );
  const memberUpcoming = useMemo(() => memberAllRides.filter((r) => isRideUpcoming(r)), [memberAllRides]);
  const memberPast = useMemo(() => memberAllRides.filter((r) => !isRideUpcoming(r)), [memberAllRides]);

  const upcoming = useMemo(() => {
    if (useMember) return memberUpcoming;
    return Array.isArray(upcomingRaw) ? upcomingRaw.map(mapRideDto) : [];
  }, [useMember, memberUpcoming, upcomingRaw]);
  const pastScheduled = useMemo(() => {
    if (useMember) return memberPast;
    return Array.isArray(pastRaw) ? pastRaw.map(mapRideDto) : [];
  }, [useMember, memberPast, pastRaw]);

  const pageTitle = useMember
    ? memberProfile?.fullName
      ? `Rides with ${memberProfile.fullName}`
      : 'Member rides'
    : 'My Rides';

  return (
    <section className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Rides</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="min-w-0 flex-1 text-3xl font-semibold leading-tight">{pageTitle}</h1>
          {!useMember ? (
            <Button
              variant="primary"
              type="button"
              size="sm"
              className={PAGE_HEADER_PRIMARY_CTA_CLASSNAME}
              onClick={() => setModalOpen(true)}
            >
              Ride!
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="my-rides-search">
          Search rides
        </label>
        <input
          id="my-rides-search"
          type="search"
          placeholder="Search by name, route, or club…"
          value={search}
          onChange={(e) => {
            const v = e.target.value;
            if (memberUserId != null) {
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  if (v) next.set('q', v);
                  else next.delete('q');
                  return next;
                },
                { replace: true },
              );
            } else {
              setLocalSearch(v);
            }
          }}
          className="w-full max-w-md rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-rydo-purple"
        />
      </div>

      {isError ? (
        <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Some data could not be loaded. Try refreshing.
        </p>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="h-36 animate-pulse rounded-3xl bg-surface-strong" />
          <div className="h-36 animate-pulse rounded-3xl bg-surface-strong" />
          <div className="hidden h-36 animate-pulse rounded-3xl bg-surface-strong xl:block" />
        </div>
      ) : null}

      {!isLoading && (
        <>
          <UpcomingRidesSection
            key={`${useMember ? 'm' : 'my'}-${search}-${searchParams.get('upcoming') ?? ''}`}
            rides={upcoming}
          />

          <div>
            <h2 className="text-lg font-semibold">{useMember ? 'Past rides' : 'Past & logged'}</h2>
            {useMember ? (
              <>
                {pastScheduled.length === 0 ? (
                  <p className="mt-4 text-sm text-fg-muted">No past rides yet.</p>
                ) : (
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {pastScheduled.map((ride) => (
                      <PastScheduledCard key={`p-${ride.id}`} ride={ride} />
                    ))}
                  </div>
                )}
                <div
                  ref={pastLoggedSentinelRef}
                  className="mt-8 flex min-h-10 justify-center"
                  aria-hidden="true"
                />
                {isFetchingNextPage ? (
                  <p className="mt-2 text-center text-sm text-fg-subtle">Loading more…</p>
                ) : null}
              </>
            ) : historyRows.length === 0 && pastScheduled.length === 0 ? (
              <p className="mt-4 text-sm text-fg-muted">Nothing in the past yet.</p>
            ) : (
              <>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {historyRows.map((entry) => (
                    <HistoryRideCard key={`h-${entry.id}`} entry={entry} />
                  ))}
                  {pastScheduled.map((ride) => (
                    <PastScheduledCard key={`p-${ride.id}`} ride={ride} />
                  ))}
                </div>
                <div
                  ref={pastLoggedSentinelRef}
                  className="mt-8 flex min-h-10 justify-center"
                  aria-hidden="true"
                />
                {isFetchingNextPage ? (
                  <p className="mt-2 text-center text-sm text-fg-subtle">Loading more…</p>
                ) : null}
              </>
            )}
          </div>
        </>
      )}

      {!useMember ? <CreatePersonalRideModal open={modalOpen} onClose={() => setModalOpen(false)} /> : null}
    </section>
  );
}
