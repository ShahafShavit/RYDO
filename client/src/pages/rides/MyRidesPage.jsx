import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import Badge from '@/shared/components/ui/badge/Badge';
import Button from '@/shared/components/ui/button/Button';
import { ROUTES } from '@/app/router/route-paths';
import CompactRouteMapPreview from '@/features/routes/components/CompactRouteMapPreview';
import { formatDurationMinutes } from '@/features/dashboard/dashboard-mapper';
import { useMyRidesPanel } from '@/features/rides/hooks/useMyRidesPanel';
import { mapRideDto } from '@/features/rides/hooks/useRideEvent';
import CreatePersonalRideModal from '@/features/rides/components/CreatePersonalRideModal';

/** First screenful of upcoming cards before "Show more". */
const UPCOMING_PREVIEW_COUNT = 2;

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
  return (
    <Card>
      <CompactRouteMapPreview preview={ride.preview} />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="neon">Scheduled</Badge>
        <Badge>{ride.routeTitle || ride.routeName || 'No route yet'}</Badge>
        {kind === 'club' ? (
          <Badge variant="success">Club: {ride.clubName || 'Club'}</Badge>
        ) : (
          <Badge>Personal</Badge>
        )}
      </div>
      <h3 className="mt-3 text-lg font-semibold">{ride.name}</h3>
      <p className="mt-2 text-sm text-white/64">{formatWhen(ride.scheduledDate)}</p>
      <div className="mt-4">
        <Link to={ROUTES.rideEvent.replace(':rideId', String(ride.id))}>
          <Button variant="secondary" type="button" className="text-sm">
            View ride
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function PastScheduledCard({ ride }) {
  const kind = rideKindFromScheduled(ride);
  return (
    <Card>
      <CompactRouteMapPreview preview={ride.preview} />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge>Past event</Badge>
        <Badge>{ride.routeTitle || ride.routeName || 'No route yet'}</Badge>
        {kind === 'club' ? (
          <Badge variant="success">Club: {ride.clubName || 'Club'}</Badge>
        ) : (
          <Badge>Personal</Badge>
        )}
      </div>
      <h3 className="mt-3 text-lg font-semibold">{ride.name}</h3>
      <p className="mt-2 text-sm text-white/64">{formatWhen(ride.scheduledDate)}</p>
      <p className="mt-2 text-sm text-white/48">No logged stats for this event yet.</p>
      <div className="mt-4">
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
  const kind = entry.rideKind || (entry.clubId != null ? 'club' : entry.rideGroupId ? 'personal' : null);
  const dist = entry.distanceKm != null ? `${Number(entry.distanceKm).toFixed(1)} km` : '—';
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
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neon">Logged</Badge>
        {entry.routeDifficulty ? <Badge>{String(entry.routeDifficulty).replace(/_/g, ' ')}</Badge> : null}
        {kind === 'club' ? (
          <Badge variant="success">Club: {entry.clubName || 'Club'}</Badge>
        ) : kind === 'personal' ? (
          <Badge>Personal</Badge>
        ) : null}
      </div>
      <h3 className="mt-3 text-lg font-semibold">{entry.routeTitle || 'Ride'}</h3>
      <p className="mt-2 text-sm text-white/64">{formatWhen(entry.completedAt)}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-white/42">Distance</p>
          <p className="mt-1 font-semibold">{dist}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-white/42">Duration</p>
          <p className="mt-1 font-semibold">{formatDurationMinutes(entry.durationMinutes)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-white/42">Elevation</p>
          <p className="mt-1 font-semibold">{elev}</p>
        </div>
      </div>
      {paceNote ? <p className="mt-3 text-sm text-white/56">{paceNote}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
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
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  const { upcoming: upcomingRaw, pastScheduled: pastRaw, historyRows, isLoading, isError } =
    useMyRidesPanel(search);

  const upcoming = useMemo(() => (Array.isArray(upcomingRaw) ? upcomingRaw.map(mapRideDto) : []), [upcomingRaw]);
  const upcomingVisible = useMemo(() => {
    if (upcomingExpanded || upcoming.length <= UPCOMING_PREVIEW_COUNT) return upcoming;
    return upcoming.slice(0, UPCOMING_PREVIEW_COUNT);
  }, [upcoming, upcomingExpanded]);
  const upcomingHiddenCount = upcoming.length - UPCOMING_PREVIEW_COUNT;
  const pastScheduled = useMemo(() => (Array.isArray(pastRaw) ? pastRaw.map(mapRideDto) : []), [pastRaw]);

  useEffect(() => {
    setUpcomingExpanded(false);
  }, [search]);

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-white/42">Rides</p>
          <h1 className="mt-2 text-3xl font-semibold">My rides</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/64">
            Upcoming and past scheduled rides (club or personal), plus your logged performance. Search by route, ride
            name, or club.
          </p>
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
          className="w-full max-w-md rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/36 focus:border-[#7B5CFF]"
        />
      </div>

      {isError ? (
        <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Some data could not be loaded. Try refreshing.
        </p>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-36 animate-pulse rounded-3xl bg-white/10" />
          <div className="h-36 animate-pulse rounded-3xl bg-white/10" />
        </div>
      ) : null}

      {!isLoading && (
        <>
          <div>
            <h2 className="text-lg font-semibold">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-white/56">No upcoming rides. Schedule a personal ride or join a club event.</p>
            ) : (
              <>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {upcomingVisible.map((ride) => (
                    <ScheduledRideCard key={ride.id} ride={ride} />
                  ))}
                </div>
                {!upcomingExpanded && upcomingHiddenCount > 0 ? (
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-sm"
                      onClick={() => setUpcomingExpanded(true)}
                    >
                      Show more ({upcomingHiddenCount} more)…
                    </Button>
                  </div>
                ) : null}
                {upcomingExpanded && upcoming.length > UPCOMING_PREVIEW_COUNT ? (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-sm"
                      onClick={() => setUpcomingExpanded(false)}
                    >
                      Show less
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold">Past &amp; logged</h2>
            <p className="mt-2 text-sm text-white/56">
              Logged rides include your stats. Past scheduled events without a log stay as reminders.
            </p>
            {historyRows.length === 0 && pastScheduled.length === 0 ? (
              <p className="mt-4 text-sm text-white/56">Nothing in the past yet.</p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {historyRows.map((entry) => (
                  <HistoryRideCard key={`h-${entry.id}`} entry={entry} />
                ))}
                {pastScheduled.map((ride) => (
                  <PastScheduledCard key={`p-${ride.id}`} ride={ride} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <CreatePersonalRideModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
