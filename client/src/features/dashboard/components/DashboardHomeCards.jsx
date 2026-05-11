import { Link } from 'react-router-dom';
import { Trophy, UsersRound } from 'lucide-react';
import Card from '@/shared/components/ui/card/Card';
import UserAvatar from '@/shared/components/user/UserAvatar';
import CompactRouteMapPreview from '@/features/routes/components/CompactRouteMapPreview';
import { ROUTES } from '@/app/router/route-paths';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';

const LAST_RYDO_INFO_COL_CLASS = 'flex w-full min-w-0 flex-col gap-2';
const LAST_RYDO_MAP_CLASS =
  'h-24 w-full overflow-hidden rounded-2xl border border-border bg-surface sm:h-28 lg:h-32 xl:h-36';
const LAST_RYDO_INFO_ROW_BASE =
  'min-h-10 w-full min-w-0 rounded-xl border px-3 py-2 text-center text-sm font-semibold leading-tight';

function LastRideInfoRow({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'border-border bg-surface text-fg',
    route: 'border-cyan-400/50 bg-cyan-500/10 text-cyan-100',
    club: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100',
    personal: 'border-violet-400/50 bg-violet-500/15 text-violet-100',
  };
  return <div className={`${LAST_RYDO_INFO_ROW_BASE} ${tones[tone] || tones.neutral}`}>{children}</div>;
}

function clubDetailsPath(clubId) {
  return ROUTES.clubDetails.replace(':clubId', String(clubId));
}

function truncateAtWords(text, maxWords) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}…`;
}

function DashboardClubBadge({ clubId, clubName }) {
  const namePart = truncateAtWords((clubName || 'Club').trim(), 5);
  const row = (
    <LastRideInfoRow tone="club">
      {namePart}
    </LastRideInfoRow>
  );
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

function lastRideKindFromEntry(rideKind) {
  if (rideKind === 'club') return 'club';
  if (rideKind === 'soloLog' || rideKind === 'personal') return 'personal';
  return null;
}

function DashboardLastRideCard({ lastRide, className = '' }) {
  const hasRide = lastRide.rideId != null;
  const ridePath = hasRide ? ROUTES.rideEvent.replace(':rideId', String(lastRide.rideId)) : null;
  const rideLabel = lastRide.routeName || 'Ride';

  if (!hasRide) {
    return (
      <Card className={`p-4 sm:p-5 ${className}`}>
        <p className="text-sm uppercase tracking-[0.16em] text-fg-subtle">{lastRide.title}</p>
        <h3 className="mt-3 w-full min-w-0 text-center text-xl font-semibold">
          <span className="inline-block max-w-full truncate align-top" title={lastRide.routeName} dir="auto">
            {lastRide.routeName}
          </span>
        </h3>
        <p className="mt-2 text-sm text-fg-muted">
          Your trail preview will appear here after you complete a ride with a saved route.
        </p>
      </Card>
    );
  }

  const kind = lastRideKindFromEntry(lastRide.rideKind);

  return (
    <Card className={`relative p-4 sm:p-5 ${className}`}>
      <Link
        to={ridePath}
        className="absolute inset-0 z-0 rounded-[28px] focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple focus-visible:ring-inset"
        aria-label={`View ride: ${rideLabel}`}
      />
      <p className="relative z-10 text-sm uppercase tracking-[0.16em] text-fg-subtle pointer-events-none">
        {lastRide.title}
      </p>
      <div className="relative z-10 mt-4 flex flex-col gap-4 pointer-events-none">
        <div className={`${LAST_RYDO_INFO_COL_CLASS} pointer-events-auto`}>
          {kind === 'club' ? (
            <div className="w-full min-w-0">
              <DashboardClubBadge clubId={lastRide.clubId} clubName={lastRide.clubName} />
            </div>
          ) : kind === 'personal' ? (
            <LastRideInfoRow tone="personal">Personal</LastRideInfoRow>
          ) : null}
        </div>
        <div className="pointer-events-none w-full min-w-0">
          <CompactRouteMapPreview preview={lastRide.preview} className={LAST_RYDO_MAP_CLASS} />
        </div>
      </div>
      <div className="relative z-10 mt-4 text-center pointer-events-none">
        <h3 className="w-full min-w-0 text-lg font-semibold text-fg">
          <span className="inline-block max-w-full truncate align-top" title={lastRide.routeName} dir="auto">
            {lastRide.routeName}
          </span>
        </h3>
        {lastRide.completedLabel ? (
          <p className="mt-1.5 text-sm text-fg-muted">{lastRide.completedLabel}</p>
        ) : null}
      </div>
      <div className="relative z-10 mt-4 flex min-w-0 gap-0 border-t border-border/40 pt-3 text-center pointer-events-none">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle sm:text-xs sm:tracking-[0.14em]">
            Distance
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold tabular-nums">{lastRide.distance}</p>
        </div>
        <div className="min-w-0 flex-1 border-l border-border/50 px-2 sm:px-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle sm:text-xs sm:tracking-[0.14em]">
            Duration
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold tabular-nums">{lastRide.duration}</p>
        </div>
        <div className="min-w-0 flex-1 border-l border-border/50 pl-2 sm:pl-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle sm:text-xs sm:tracking-[0.14em]">
            Elevation
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold tabular-nums">{lastRide.elevation}</p>
        </div>
      </div>
    </Card>
  );
}

function DashboardWeeklySnapshotCard({ weeklySnapshot, className = '' }) {
  return (
    <Card className={`p-4 sm:p-5 ${className}`}>
      <p className="text-sm uppercase tracking-[0.16em] text-fg-subtle">{weeklySnapshot.title}</p>
      <h3 className="mt-3 text-xl font-semibold text-fg">{weeklySnapshot.ridesCount} rides this week</h3>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/40 pt-3 text-center">
        <div className="min-w-0 rounded-xl border border-border/40 bg-surface px-2 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle sm:text-xs sm:tracking-[0.14em]">
            Distance
          </p>
          <p className="mt-1 truncate text-sm font-semibold tabular-nums">{weeklySnapshot.distance}</p>
        </div>
        <div className="min-w-0 rounded-xl border border-border/40 bg-surface px-2 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle sm:text-xs sm:tracking-[0.14em]">
            Duration
          </p>
          <p className="mt-1 truncate text-sm font-semibold tabular-nums">{weeklySnapshot.duration}</p>
        </div>
        <div className="min-w-0 rounded-xl border border-border/40 bg-surface px-2 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle sm:text-xs sm:tracking-[0.14em]">
            Elevation
          </p>
          <p className="mt-1 truncate text-sm font-semibold tabular-nums">{weeklySnapshot.elevation}</p>
        </div>
      </div>
    </Card>
  );
}

function DashboardStreakCard({ streakSnapshot, className = '' }) {
  return (
    <Card className={`p-4 sm:p-5 ${className}`}>
      <p className="text-sm uppercase tracking-[0.16em] text-fg-subtle">{streakSnapshot.title}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold tabular-nums text-fg">{streakSnapshot.currentStreak}</p>
          <p className="text-sm text-fg-muted">week current streak</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-surface px-3 py-2 text-right">
          <p className="text-[10px] uppercase tracking-[0.14em] text-fg-subtle">Longest</p>
          <p className="text-sm font-semibold tabular-nums text-fg">{streakSnapshot.longestStreak} weeks</p>
        </div>
      </div>
      <p className="mt-4 border-t border-border/40 pt-3 text-sm text-fg-muted">{streakSnapshot.nextRideByLabel}</p>
    </Card>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-strong">
      <div className="h-full rounded-full bg-rydo-purple transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

function DashboardGroupsCard({ groups, className = '' }) {
  return (
    <Card className={className}>
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
                  <p className="font-semibold text-fg">{group.name}</p>
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

function DashboardUpcomingRidesCard({ upcomingRides, upcomingMoreCount, className = '' }) {
  const hasAny = upcomingRides.length > 0;

  return (
    <Card className={className}>
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
              className="block min-w-0 rounded-3xl border border-border bg-surface p-4 text-left transition hover:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple"
            >
              <h3 className="w-full min-w-0 text-center text-xl font-semibold text-fg">
                <span className="inline-block max-w-full truncate align-top" title={ride.routeName} dir="auto">
                  {ride.routeName}
                </span>
              </h3>
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
    <div className="grid gap-4 xl:grid-cols-12 xl:auto-rows-fr xl:items-stretch 2xl:gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:col-span-4 xl:grid-cols-1 xl:grid-rows-2">
        <Card className="h-full">
          <div className={`${bar} w-24`} />
          <div className={`${bar} mt-4 h-8 w-full`} />
          <div className={`${bar} mt-4 w-20`} />
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-strong">
            <div className="h-full w-1/2 rounded-full bg-surface-strong" />
          </div>
        </Card>
        <Card className="h-full">
          <div className={`${bar} w-24`} />
          <div className={`${bar} mt-4 h-12 w-16`} />
          <div className={`${bar} mt-4 w-full`} />
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-strong" />
        </Card>
      </div>
      <div className="xl:col-span-4">
        <Card className="h-full">
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
      <div className="xl:col-span-4">
        <Card className="h-full">
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
      <div className="grid gap-4 xl:col-span-12 xl:grid-cols-12 xl:items-stretch">
        <div className="xl:col-span-8">
          <Card className="h-full p-4 sm:p-5">
            <div className={`${bar} w-28`} />
            <div className="mt-3 flex gap-3">
              <div className="flex w-1/2 flex-col items-center gap-2">
                <div className={`${bar} h-6 w-16 rounded-full`} />
                <div className={`${bar} h-6 w-20 rounded-full`} />
              </div>
              <div className="h-24 w-1/2 shrink-0 rounded-2xl bg-surface-strong sm:h-28" />
            </div>
            <div className={`${bar} mx-auto mt-3 h-5 w-2/3`} />
            <div className={`${bar} mx-auto mt-2 h-4 w-1/2`} />
            <div className="mt-3 flex gap-0">
              <div className={`${bar} h-10 flex-1`} />
              <div className={`${bar} h-10 flex-1`} />
              <div className={`${bar} h-10 flex-1`} />
            </div>
          </Card>
        </div>
        <div className="grid gap-4 xl:col-span-4 xl:h-full xl:grid-rows-2">
          <Card className="h-full p-4 sm:p-5">
            <div className={`${bar} w-36`} />
            <div className={`${bar} mt-3 h-8 w-1/2`} />
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/40 pt-3">
              <div className="rounded-xl border border-border/40 bg-surface p-2">
                <div className={`${bar} h-3 w-12`} />
                <div className={`${bar} mt-2 h-4 w-full`} />
              </div>
              <div className="rounded-xl border border-border/40 bg-surface p-2">
                <div className={`${bar} h-3 w-12`} />
                <div className={`${bar} mt-2 h-4 w-full`} />
              </div>
              <div className="rounded-xl border border-border/40 bg-surface p-2">
                <div className={`${bar} h-3 w-12`} />
                <div className={`${bar} mt-2 h-4 w-full`} />
              </div>
            </div>
          </Card>
          <Card className="h-full p-4 sm:p-5">
            <div className={`${bar} w-20`} />
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <div className={`${bar} h-9 w-12`} />
                <div className={`${bar} mt-2 h-4 w-24`} />
              </div>
              <div className="rounded-xl border border-border/40 bg-surface px-3 py-2">
                <div className={`${bar} h-3 w-12`} />
                <div className={`${bar} mt-2 h-4 w-16`} />
              </div>
            </div>
            <div className={`${bar} mt-4 h-4 w-full border-t border-border/40 pt-3`} />
          </Card>
        </div>
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
      <div className="grid gap-4 xl:grid-cols-12 xl:auto-rows-fr xl:items-stretch 2xl:gap-5">
        <div className="grid gap-4 md:grid-cols-2 xl:col-span-4 xl:grid-cols-1 xl:grid-rows-2">
          <Card className="h-full">
            <p className="text-sm uppercase tracking-[0.16em] text-fg-subtle">{home.awards.title}</p>
            <h3 className="mt-4 text-2xl font-semibold">{home.awards.description}</h3>
            <p className="mt-3 text-sm text-fg-muted">{home.awards.percentage}% complete</p>
            <ProgressBar value={home.awards.percentage} />
          </Card>

          <Card className="h-full">
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

        <div className="xl:col-span-4">
          <DashboardGroupsCard groups={home.groups} className="h-full" />
        </div>

        <div className="xl:col-span-4">
          <DashboardUpcomingRidesCard
            upcomingRides={home.upcomingRides}
            upcomingMoreCount={home.upcomingMoreCount}
            className="h-full"
          />
        </div>
        <div className="grid gap-4 xl:col-span-12 xl:grid-cols-12 xl:items-stretch">
          <div className="xl:col-span-8">
            <DashboardLastRideCard lastRide={home.lastRide} className="h-full" />
          </div>
          <div className="grid gap-4 xl:col-span-4 xl:h-full xl:grid-rows-2">
            <DashboardWeeklySnapshotCard weeklySnapshot={home.weeklySnapshot} className="h-full" />
            <DashboardStreakCard streakSnapshot={home.streakSnapshot} className="h-full" />
          </div>
        </div>
      </div>
    </>
  );
}
