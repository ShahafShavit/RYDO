import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, UsersRound } from 'lucide-react';
import Card from '@/shared/components/ui/card/Card';
import UserAvatar from '@/shared/components/user/UserAvatar';
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
        <p className="text-sm uppercase tracking-[0.16em] text-fg-subtle">YOUR RYDO CLUBS</p>
        <Link
          to={ROUTES.clubs}
          className="inline-flex shrink-0 items-center justify-center rounded-xl p-2 text-rydo-purple transition hover:bg-rydo-purple/10 hover:opacity-90"
          aria-label="Browse clubs"
          title="Browse clubs"
        >
          <UsersRound className="h-6 w-6" strokeWidth={2} aria-hidden />
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
              className="block rounded-3xl border border-border bg-surface p-4 transition hover:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple"
            >
              <div className="flex items-start gap-3">
                <UserAvatar
                  avatarUrl={group.avatarUrl}
                  displayName={group.name}
                  sizeClass="h-10 w-10"
                  textClass="text-sm"
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-fg">{group.name}</p>
                    {group.visibility === 'private' ? (
                      <span className="shrink-0 rounded-full border border-border-strong px-2 py-0.5 text-xs text-fg-muted">
                        Private
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-fg-muted">{group.detail}</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}

const UPCOMING_SECTION_TITLE = 'Upcoming Group RYDO';

function DashboardUpcomingRidesCard({ upcomingRides, upcomingMoreCount }) {
  const hasAny = upcomingRides.length > 0;

  return (
    <Card>
      <p className="text-sm uppercase tracking-[0.16em] text-fg-subtle">{UPCOMING_SECTION_TITLE}</p>

      {!hasAny ? (
        <>
          <h3 className="mt-3 text-xl font-semibold">No upcoming rides</h3>
          <p className="mt-2 text-sm text-fg-muted">
            You&apos;re not signed up for a future group ride.
          </p>
        </>
      ) : (
        <div className="mt-4 space-y-4">
          {upcomingRides.map((ride) => (
            <Link
              key={ride.id}
              to={ROUTES.rideEvent.replace(':rideId', String(ride.id))}
              className="block rounded-3xl border border-border bg-surface p-4 text-left transition hover:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple"
            >
              <h3 className="text-xl font-semibold text-fg">{ride.routeName}</h3>
              <p className="mt-2 text-sm text-fg-muted">{ride.dateTime}</p>
              {ride.clubName ? (
                <div className="mt-3 flex items-center gap-2">
                  <UserAvatar
                    avatarUrl={ride.clubAvatarUrl}
                    displayName={ride.clubName}
                    sizeClass="h-9 w-9"
                    textClass="text-xs"
                  />
                  <span className="font-semibold text-fg">{ride.clubName}</span>
                </div>
              ) : ride.isPersonal ? (
                <p className="mt-3 text-sm text-fg-muted">Personal</p>
              ) : null}
            </Link>
          ))}
          {upcomingMoreCount > 0 ? (
            <Link
              to={`${ROUTES.myRides}?upcoming=all`}
              className="block rounded-xl py-2 text-center text-sm text-rydo-purple transition hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple"
            >
              ({upcomingMoreCount} more)…
            </Link>
          ) : null}
        </div>
      )}
    </Card>
  );
}

function DashboardHomeSkeleton() {
  const bar = 'h-4 rounded bg-surface-strong animate-pulse';
  return (
    <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)] xl:gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:col-start-1 xl:row-start-1">
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
      <div className="xl:col-start-2 xl:row-start-2">
        <Card>
          <div className={`${bar} w-48`} />
          <div className={`${bar} mt-4 h-6 w-3/4`} />
          <div className="mt-4 space-y-3 rounded-3xl border border-border bg-surface p-4">
            <div className={`${bar} h-5 w-full`} />
            <div className={`${bar} h-4 w-2/3`} />
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 shrink-0 rounded-full bg-surface-strong" />
              <div className={`${bar} h-4 flex-1`} />
            </div>
          </div>
          <div className="mt-4 space-y-3 rounded-3xl border border-border bg-surface p-4">
            <div className={`${bar} h-5 w-4/5`} />
            <div className={`${bar} h-4 w-1/2`} />
          </div>
        </Card>
      </div>
      <div className="xl:col-start-1 xl:row-start-2">
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
      <div className="xl:col-start-2 xl:row-start-1">
        <Card>
          <div className={`${bar} w-40`} />
          <div className="mt-4 flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-surface-strong" />
            <div className="min-w-0 flex-1">
              <div className={`${bar} h-5 w-3/4`} />
              <div className={`${bar} mt-2 h-4 w-full`} />
            </div>
          </div>
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
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)] xl:gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:col-start-1 xl:row-start-1">
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
                className="inline-flex shrink-0 items-center justify-center rounded-xl p-2 text-rydo-purple transition hover:bg-rydo-purple/10 hover:opacity-90"
                aria-label="View leaderboards"
                title="View leaderboards"
              >
                <Trophy className="h-6 w-6" strokeWidth={2} aria-hidden />
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

        <div className="xl:col-start-2 xl:row-start-2">
          <DashboardUpcomingRidesCard
            upcomingRides={home.upcomingRides}
            upcomingMoreCount={home.upcomingMoreCount}
          />
        </div>

        <div className="xl:col-start-1 xl:row-start-2">
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

        <div className="xl:col-start-2 xl:row-start-1">
          <DashboardGroupsCard groups={home.groups} />
        </div>
      </div>
    </>
  );
}
