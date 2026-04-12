import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import Badge from '@/shared/components/ui/badge/Badge';
import Button from '@/shared/components/ui/button/Button';
import { ROUTES } from '@/app/router/route-paths';
import CompactRouteMapPreview from '@/features/routes/components/CompactRouteMapPreview';
import CompactRouteMapPlaceholder from '@/features/routes/components/CompactRouteMapPlaceholder';
import { formatDurationMinutes } from '@/features/dashboard/dashboard-mapper';
import { useMyRidesPanel } from '@/features/rides/hooks/useMyRidesPanel';
import { mapRideDto } from '@/features/rides/hooks/useRideEvent';
import CreatePersonalRideModal from '@/features/rides/components/CreatePersonalRideModal';
import { useIntersectionSentinel } from '@/shared/hooks/useIntersectionSentinel';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';

/** First screenful of upcoming cards before "Show more". */
const UPCOMING_PREVIEW_COUNT = 2;

function routeDetailsPath(routeId) {
  return ROUTES.routeDetails.replace(':routeId', String(routeId));
}

function formatWhen(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
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
  return (
    <Card>
      {hasRoute ? <CompactRouteMapPreview preview={ride.preview} /> : <CompactRouteMapPlaceholder />}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="neon">Scheduled</Badge>
        <Badge variant={ride.routeId != null ? 'default' : 'warning'}>
          {ride.routeTitle || ride.routeName || 'No route yet'}
        </Badge>
        {kind === 'club' ? (
          <Badge variant="success">Club: {ride.clubName || 'Club'}</Badge>
        ) : (
          <Badge>Personal</Badge>
        )}
      </div>
      <h3 className="mt-3 text-lg font-semibold">{ride.name}</h3>
      <p className="mt-2 text-sm text-fg-muted">{formatWhen(ride.scheduledDate)}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {ride.routeId != null ? (
          <Link to={routeDetailsPath(ride.routeId)}>
            <Button variant="secondary" type="button" className="text-sm">
              View route
            </Button>
          </Link>
        ) : null}
        <Link to={ROUTES.rideEvent.replace(':rideId', String(ride.id))}>
          <Button variant="secondary" type="button" className="text-sm">
            View ride
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function UpcomingRidesSection({ rides }) {
  const [expanded, setExpanded] = useState(false);
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
          <div className="mt-4 grid gap-4 md:grid-cols-2">
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
  return (
    <Card>
      {hasRoute ? <CompactRouteMapPreview preview={ride.preview} /> : <CompactRouteMapPlaceholder />}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge>Past event</Badge>
        <Badge variant={ride.routeId != null ? 'default' : 'warning'}>
          {ride.routeTitle || ride.routeName || 'No route yet'}
        </Badge>
        {kind === 'club' ? (
          <Badge variant="success">Club: {ride.clubName || 'Club'}</Badge>
        ) : (
          <Badge>Personal</Badge>
        )}
      </div>
      <h3 className="mt-3 text-lg font-semibold">{ride.name}</h3>
      <p className="mt-2 text-sm text-fg-muted">{formatWhen(ride.scheduledDate)}</p>
      <p className="mt-2 text-sm text-fg-subtle">No logged stats for this event yet.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {ride.routeId != null ? (
          <Link to={routeDetailsPath(ride.routeId)}>
            <Button variant="secondary" type="button" className="text-sm">
              View route
            </Button>
          </Link>
        ) : null}
        <Link to={ROUTES.rideEvent.replace(':rideId', String(ride.id))}>
          <Button variant="secondary" type="button" className="text-sm">
            Open ride
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function HistoryRideCard({ entry }) {
  const { formatKm } = useFormatDistance();
  const kind = entry.rideKind || (entry.clubId != null ? 'club' : entry.rideGroupId ? 'personal' : null);
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

  return (
    <Card>
      <CompactRouteMapPreview preview={entry.preview} />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="neon">Logged</Badge>
        {entry.routeDifficulty ? <Badge>{String(entry.routeDifficulty).replace(/_/g, ' ')}</Badge> : null}
        {kind === 'club' ? (
          <Badge variant="success">Club: {entry.clubName || 'Club'}</Badge>
        ) : kind === 'personal' ? (
          <Badge>Personal</Badge>
        ) : null}
      </div>
      <h3 className="mt-3 text-lg font-semibold">{entry.routeTitle || 'Ride'}</h3>
      <p className="mt-2 text-sm text-fg-muted">{formatWhen(entry.completedAt)}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-fg-subtle">Distance</p>
          <p className="mt-1 font-semibold">{dist}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-fg-subtle">Duration</p>
          <p className="mt-1 font-semibold">{formatDurationMinutes(entry.durationMinutes)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-fg-subtle">Elevation</p>
          <p className="mt-1 font-semibold">{elev}</p>
        </div>
      </div>
      {paceNote ? <p className="mt-3 text-sm text-fg-muted">{paceNote}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        {entry.routeId != null ? (
          <Link to={routeDetailsPath(entry.routeId)}>
            <Button variant="secondary" type="button" className="text-sm">
              View route
            </Button>
          </Link>
        ) : null}
        {entry.rideGroupId ? (
          <Link to={ROUTES.rideEvent.replace(':rideId', String(entry.rideGroupId))}>
            <Button variant="secondary" type="button" className="text-sm">
              Linked ride event
            </Button>
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

export default function MyRidesPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const {
    upcoming: upcomingRaw,
    pastScheduled: pastRaw,
    historyRows,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useMyRidesPanel(search);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const pastLoggedSentinelRef = useIntersectionSentinel(loadMore, Boolean(hasNextPage && !isLoading));

  const upcoming = useMemo(() => (Array.isArray(upcomingRaw) ? upcomingRaw.map(mapRideDto) : []), [upcomingRaw]);
  const pastScheduled = useMemo(() => (Array.isArray(pastRaw) ? pastRaw.map(mapRideDto) : []), [pastRaw]);

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Rides</p>
          <h1 className="mt-2 text-3xl font-semibold">My Rides</h1>
        </div>
        <Button variant="primary" type="button" onClick={() => setModalOpen(true)}>
          Schedule personal ride
        </Button>
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
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-rydo-purple"
        />
      </div>

      {isError ? (
        <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Some data could not be loaded. Try refreshing.
        </p>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-36 animate-pulse rounded-3xl bg-surface-strong" />
          <div className="h-36 animate-pulse rounded-3xl bg-surface-strong" />
        </div>
      ) : null}

      {!isLoading && (
        <>
          <UpcomingRidesSection key={search} rides={upcoming} />

          <div>
            <h2 className="text-lg font-semibold">Past &amp; logged</h2>
            {historyRows.length === 0 && pastScheduled.length === 0 ? (
              <p className="mt-4 text-sm text-fg-muted">Nothing in the past yet.</p>
            ) : (
              <>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {historyRows.map((entry) => (
                    <HistoryRideCard key={`h-${entry.id}`} entry={entry} />
                  ))}
                  {pastScheduled.map((ride) => (
                    <PastScheduledCard key={`p-${ride.id}`} ride={ride} />
                  ))}
                </div>
                <div
                  ref={pastLoggedSentinelRef}
                  className="mt-4 flex min-h-8 justify-center"
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

      <CreatePersonalRideModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
