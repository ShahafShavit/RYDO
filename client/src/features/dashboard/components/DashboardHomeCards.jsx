import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import { ROUTES } from '@/app/router/route-paths';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';
import { formatTrailMetaLabel } from '@/features/routes/utils/route-formatters';

const RouteMapWithElevation = lazy(() => import('@/features/routes/components/RouteMapWithElevation'));

function ProgressBar({ value }) {
  return (
    <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-strong">
      <div className="h-full rounded-full bg-rydo-purple transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

function DashboardGroupsCard({ groups }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-fg-subtle">RYDO Groups</p>
          <h3 className="mt-3 text-xl font-semibold">Your cycling clubs</h3>
        </div>
        <Link to={ROUTES.clubs} className="text-sm text-rydo-purple hover:underline">
          Browse clubs
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {groups.length === 0 ? (
          <p className="text-sm text-fg-muted">Join a club to see it listed here.</p>
        ) : (
          groups.map((group) => (
            <Link
              key={group.id}
              to={ROUTES.clubDetails.replace(':clubId', group.id)}
              className="block rounded-3xl border border-border bg-surface p-4 transition hover:border-border-strong"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-fg">{group.name}</p>
                  <p className="mt-1 text-sm text-fg-muted">{group.detail}</p>
                </div>
                {group.visibility === 'private' ? (
                  <span className="shrink-0 rounded-full border border-border-strong px-2 py-0.5 text-xs text-fg-muted">Private</span>
                ) : null}
              </div>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}

function DashboardUpcomingRideCard({ ride, hasUpcomingRide }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-fg-subtle">{ride.title}</p>
          <h3 className="mt-3 text-xl font-semibold">{ride.routeName}</h3>
        </div>
      </div>

      <div className="mt-6 space-y-4 text-fg-muted">
        <div className="rounded-3xl border border-border bg-surface p-4">
          <p className="text-sm">{ride.dateTime}</p>
          <p className="mt-2 text-sm">
            Group: <span className="font-semibold text-fg">{ride.chatGroup}</span>
          </p>
        </div>
      </div>

      <div className="mt-6">
        {hasUpcomingRide && ride.id != null ? (
          <Link to={ROUTES.rideEvent.replace(':rideId', String(ride.id))} className="block">
            <Button variant="secondary" className="w-full">
              View ride
            </Button>
          </Link>
        ) : (
          <Button variant="secondary" className="w-full" disabled>
            No upcoming ride
          </Button>
        )}
      </div>
    </Card>
  );
}

function DashboardHomeSkeleton() {
  const bar = 'h-4 rounded bg-surface-strong animate-pulse';
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <div className={`${bar} w-24`} />
            <div className={`${bar} mt-4 h-8 w-full`} />
            <div className={`${bar} mt-4 w-20`} />
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-strong">
              <div className="h-full w-1/2 rounded-full bg-surface-strong" />
            </div>
          </Card>
          <Card>
            <div className={`${bar} w-24`} />
            <div className={`${bar} mt-4 h-12 w-16`} />
            <div className={`${bar} mt-4 w-full`} />
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-strong" />
          </Card>
        </div>
        <Card>
          <div className={`${bar} w-32`} />
          <div className={`${bar} mt-4 h-10 w-3/4`} />
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className={`${bar} h-16`} />
            <div className={`${bar} h-16`} />
            <div className={`${bar} h-16`} />
          </div>
          <div className="mt-6 h-40 rounded-3xl bg-surface" />
        </Card>
      </div>
      <div className="grid gap-6">
        <Card>
          <div className={`${bar} w-40`} />
          <div className={`${bar} mt-4 h-24 w-full`} />
        </Card>
        <Card>
          <div className={`${bar} w-48`} />
          <div className={`${bar} mt-4 h-20 w-full`} />
        </Card>
      </div>
    </div>
  );
}

export default function DashboardHomeCards() {
  const { home, homeLoading, homeError } = useDashboardData();

  if (homeLoading) {
    return <DashboardHomeSkeleton />;
  }

  return (
    <>
      {homeError ? (
        <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Some dashboard data could not be loaded. Showing what is available.
        </p>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <p className="text-sm uppercase tracking-[0.16em] text-fg-subtle">{home.awards.title}</p>
              <h3 className="mt-4 text-2xl font-semibold">{home.awards.description}</h3>
              <p className="mt-3 text-sm text-fg-muted">{home.awards.percentage}% complete</p>
              <ProgressBar value={home.awards.percentage} />
            </Card>

            <Card>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm uppercase tracking-[0.16em] text-fg-subtle">{home.level.title}</p>
                <Link
                  to={ROUTES.leaderboards}
                  className="shrink-0 text-sm font-medium text-rydo-purple hover:underline"
                >
                  View leaderboards
                </Link>
              </div>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-5xl font-semibold">{home.level.currentLevel}</span>
                <span className="text-sm text-fg-muted">level</span>
              </div>
              <p className="mt-3 text-sm text-fg-muted">{home.level.nextLevelLabel}</p>
              <ProgressBar value={home.level.progress} />
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.16em] text-fg-subtle">{home.lastRide.title}</p>
                <h3 className="mt-3 text-2xl font-semibold">{home.lastRide.routeName}</h3>
              </div>
              <span className="rounded-full bg-surface px-4 py-2 text-sm text-fg-muted">
                {formatTrailMetaLabel(home.lastRide.difficulty)}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Distance</p>
                <p className="mt-2 text-lg font-semibold">{home.lastRide.distance}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Duration</p>
                <p className="mt-2 text-lg font-semibold">{home.lastRide.duration}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Trail</p>
                <p className="mt-2 text-lg font-semibold">{home.lastRide.mapLabel}</p>
              </div>
            </div>

            <div className="mt-6 rounded-4xl border border-border bg-surface p-4 text-fg-muted">
              {home.lastRide.mapGeoJson ? (
                <Suspense
                  fallback={
                    <div className="h-40 rounded-3xl bg-surface animate-pulse" aria-hidden />
                  }
                >
                  <RouteMapWithElevation
                    geoJson={home.lastRide.mapGeoJson}
                    mapClassName="h-40 rounded-3xl border border-border bg-surface overflow-hidden"
                  />
                </Suspense>
              ) : (
                <>
                  <div className="h-40 rounded-3xl bg-surface" />
                  <p className="mt-3 text-sm">
                    {home.lastRide.routeName === 'No rides logged yet'
                      ? 'Your trail preview will appear here after you complete a ride with a saved route.'
                      : 'No trail preview available for this ride.'}
                  </p>
                </>
              )}
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          <DashboardGroupsCard groups={home.groups} />
          <DashboardUpcomingRideCard ride={home.upcomingRide} hasUpcomingRide={home.hasUpcomingRide} />
        </div>
      </div>
    </>
  );
}
