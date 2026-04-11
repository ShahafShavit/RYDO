import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import { ROUTES } from '@/app/router/route-paths';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';

const RouteMapPreview = lazy(() => import('@/features/routes/components/RouteMapPreview'));

function ProgressBar({ value }) {
  return (
    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-[#7B5CFF] transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

function DashboardGroupsCard({ groups }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-white/42">RYDO Groups</p>
          <h3 className="mt-3 text-xl font-semibold">Your cycling clubs</h3>
        </div>
        <Link to={ROUTES.clubs} className="text-sm text-[#7B5CFF] hover:underline">
          Browse clubs
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {groups.length === 0 ? (
          <p className="text-sm text-white/64">Join a club to see it listed here.</p>
        ) : (
          groups.map((group) => (
            <Link
              key={group.id}
              to={ROUTES.clubDetails.replace(':clubId', group.id)}
              className="block rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{group.name}</p>
                  <p className="mt-1 text-sm text-white/64">{group.detail}</p>
                </div>
                {group.visibility === 'private' ? (
                  <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-xs text-white/56">Private</span>
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
          <p className="text-sm uppercase tracking-[0.16em] text-white/42">{ride.title}</p>
          <h3 className="mt-3 text-xl font-semibold">{ride.routeName}</h3>
        </div>
      </div>

      <div className="mt-6 space-y-4 text-white/64">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm">{ride.dateTime}</p>
          <p className="mt-2 text-sm">
            Group: <span className="font-semibold text-white">{ride.chatGroup}</span>
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
  const bar = 'h-4 rounded bg-white/10 animate-pulse';
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <div className={`${bar} w-24`} />
            <div className={`${bar} mt-4 h-8 w-full`} />
            <div className={`${bar} mt-4 w-20`} />
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/2 rounded-full bg-white/10" />
            </div>
          </Card>
          <Card>
            <div className={`${bar} w-24`} />
            <div className={`${bar} mt-4 h-12 w-16`} />
            <div className={`${bar} mt-4 w-full`} />
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10" />
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
          <div className="mt-6 h-40 rounded-3xl bg-white/5" />
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
    return (
      <>
        <DashboardHomeSkeleton />
        <div className="mt-8 flex gap-3">
          <Link to="?upload=true">
            <Button variant="primary">Upload New GPX Route</Button>
          </Link>
        </div>
      </>
    );
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
              <p className="text-sm uppercase tracking-[0.16em] text-white/42">{home.awards.title}</p>
              <h3 className="mt-4 text-2xl font-semibold">{home.awards.description}</h3>
              <p className="mt-3 text-sm text-white/64">{home.awards.percentage}% complete</p>
              <ProgressBar value={home.awards.percentage} />
            </Card>

            <Card>
              <p className="text-sm uppercase tracking-[0.16em] text-white/42">{home.level.title}</p>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-5xl font-semibold">{home.level.currentLevel}</span>
                <span className="text-sm text-white/64">level</span>
              </div>
              <p className="mt-3 text-sm text-white/64">{home.level.nextLevelLabel}</p>
              <ProgressBar value={home.level.progress} />
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.16em] text-white/42">{home.lastRide.title}</p>
                <h3 className="mt-3 text-2xl font-semibold">{home.lastRide.routeName}</h3>
              </div>
              <span className="rounded-full bg-white/5 px-4 py-2 text-sm text-white/64">
                {home.lastRide.difficulty}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/42">Distance</p>
                <p className="mt-2 text-lg font-semibold">{home.lastRide.distance}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/42">Duration</p>
                <p className="mt-2 text-lg font-semibold">{home.lastRide.duration}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/42">Trail</p>
                <p className="mt-2 text-lg font-semibold">{home.lastRide.mapLabel}</p>
              </div>
            </div>

            <div className="mt-6 rounded-4xl border border-white/10 bg-white/5 p-4 text-white/64">
              {home.lastRide.mapGeoJson ? (
                <Suspense
                  fallback={
                    <div className="h-40 rounded-3xl bg-white/5 animate-pulse" aria-hidden />
                  }
                >
                  <RouteMapPreview
                    geoJson={home.lastRide.mapGeoJson}
                    className="h-40 rounded-3xl border border-white/10 bg-white/5 overflow-hidden"
                  />
                </Suspense>
              ) : (
                <>
                  <div className="h-40 rounded-3xl bg-white/5" />
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
      <div className="mt-8 flex gap-3">
        <Link to="?upload=true">
          <Button variant="primary">Upload New GPX Route</Button>
        </Link>
      </div>
    </>
  );
}
