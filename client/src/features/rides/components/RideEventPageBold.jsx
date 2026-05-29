import { useMemo } from 'react';
import { Link, generatePath, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bike,
  Calendar,
  ChevronRight,
  Clock,
  Mountain,
  Pencil,
  Route as RouteIcon,
  Users,
} from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import RideWeatherSummary from '@/features/weather/RideWeatherSummary';
import { formatRideDateTime } from '@/features/rides/utils/formatRideDateTime';
import { formatTrailMetaLabel } from '@/features/routes/utils/route-formatters';
import { buildElevationProfileFromGeoJson } from '@/features/routes/utils/gpxAnalysis';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import StatRibbon from '@/shared/components/bold/StatRibbon';
import GradientCTA from '@/shared/components/bold/GradientCTA';
import IconButton from '@/shared/components/bold/IconButton';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { cn } from '@/shared/lib/cn';

import BoldRouteMapElevation from '@/features/routes/components/BoldRouteMapElevation';

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatWhenShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

function formatTimeShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

function SecondaryAction({ children, className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-border bg-black/25 px-4 text-sm font-semibold text-fg transition hover:border-border-strong',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default function RideEventPageBold({
  ride,
  geoJson,
  linkedRoute,
  routeLoading = false,
  upcoming,
  showEdit,
  onEditClick,
  user,
  amParticipant,
  onJoin,
  onLeave,
  isJoining,
  isLeaving,
  onLiveRide,
  isNavigatingToLive,
  onPrefetchLive,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}) {
  const navigate = useNavigate();
  const { formatKm, formatElevation } = useFormatDistance();

  const profile = useMemo(() => buildElevationProfileFromGeoJson(geoJson), [geoJson]);

  const hasRoute = ride?.routeId != null;
  const hasClub = ride?.clubId != null && ride?.clubName?.trim();
  const organizer = ride?.createdBy;
  const notes = String(ride?.notes || '').trim();
  const members = ride?.participantDetails ?? [];
  const participantCount = ride?.participantCount ?? members.length;
  const whenIso = ride?.scheduledDate || ride?.time;
  const isSoloLog = ride?.rideKind === 'soloLog';
  const showAttendance = Boolean(user && !isSoloLog && upcoming);

  const routePath =
    linkedRoute?.id != null
      ? generatePath(ROUTES.routeDetails, { routeId: String(linkedRoute.id) })
      : null;

  if (isLoading && !ride) {
    return (
      <BoldScreen className="min-h-[60dvh] animate-pulse">
        <div className="h-[42%] bg-surface-strong" />
        <div className="mx-5 mt-6 h-8 w-3/4 rounded bg-surface-strong" />
        <div className="mx-5 mt-4 h-24 rounded-2xl bg-surface-strong" />
      </BoldScreen>
    );
  }

  if (isError || !ride) {
    return (
      <BoldScreen className="min-h-[60dvh] p-5">
        <IconButton icon={ArrowLeft} size="lg" aria-label="Back" onClick={() => navigate(-1)} />
        <p className="mt-6 text-red-400">{errorMessage || 'Could not load this ride.'}</p>
        {onRetry ? (
          <SecondaryAction className="mt-4" onClick={onRetry}>
            Retry
          </SecondaryAction>
        ) : null}
      </BoldScreen>
    );
  }

  const statItems = [
    {
      key: 'when',
      icon: Calendar,
      value: formatWhenShort(whenIso),
      label: formatTimeShort(whenIso),
      size: 17,
    },
  ];

  if (linkedRoute?.distanceKm != null) {
    statItems.push({
      key: 'km',
      icon: RouteIcon,
      value: formatKm(linkedRoute.distanceKm),
      label: 'Route',
      size: 17,
    });
  } else if (participantCount > 0) {
    statItems.push({
      key: 'riders',
      icon: Users,
      value: participantCount,
      label: participantCount === 1 ? 'Rider' : 'Riders',
      size: 17,
    });
  }

  if (linkedRoute?.elevationGainM != null) {
    statItems.push({
      key: 'up',
      icon: Mountain,
      value: formatElevation(linkedRoute.elevationGainM, 0),
      label: 'Climb',
      size: 17,
    });
  } else if (linkedRoute?.estimatedDurationMinutes != null) {
    statItems.push({
      key: 'time',
      icon: Clock,
      value: formatDuration(linkedRoute.estimatedDurationMinutes),
      label: 'Est. time',
      size: 17,
    });
  }

  return (
    <BoldScreen className="min-h-[100dvh] md:min-h-0">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-5 pb-1 pt-1">
          <IconButton icon={ArrowLeft} size="lg" aria-label="Back" onClick={() => navigate(-1)} />
          <div className="flex-1" />
          {showEdit ? (
            <IconButton icon={Pencil} size="lg" aria-label="Edit ride" onClick={onEditClick} />
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-3 pt-0">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              {upcoming ? (
                <span className="rydo-pill rydo-pill-green px-2.5 py-0.5 text-[11px] font-bold">
                  Upcoming
                </span>
              ) : isSoloLog ? (
                <span className="rydo-pill rydo-pill-accent px-2.5 py-0.5 text-[11px] font-bold">
                  Logged
                </span>
              ) : (
                <span className="rydo-pill px-2.5 py-0.5 text-[11px] font-bold">Past event</span>
              )}
              {hasClub ? (
                <span className="rydo-pill rydo-pill-green px-2.5 py-0.5 text-[11px] font-semibold">
                  {ride.clubName}
                </span>
              ) : !isSoloLog ? (
                <span className="rydo-pill px-2.5 py-0.5 text-[11px] font-semibold">Personal</span>
              ) : null}
              {linkedRoute?.difficulty ? (
                <span className="rydo-pill rydo-pill-amber px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                  {formatTrailMetaLabel(linkedRoute.difficulty)}
                </span>
              ) : null}
            </div>
            <DisplayTitle size="lg">{ride.name}</DisplayTitle>
            <p className="rydo-subtle mt-1.5 text-[13px]">{formatRideDateTime(whenIso)}</p>
          </div>

          {organizer?.fullName ? (
            <div className="rydo-panel flex items-center gap-3 px-3.5 py-3">
              <div className="flex shrink-0 items-center -space-x-2">
                {organizer?.id != null ? (
                  <Link
                    to={generatePath(ROUTES.userProfile, { userId: String(organizer.id) })}
                    className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple"
                  >
                    <UserAvatar
                      avatarUrl={organizer.avatarUrl}
                      displayName={organizer.fullName}
                      sizeClass="h-10 w-10"
                      textClass="text-xs"
                      className="ring-2 ring-[#141414]"
                    />
                  </Link>
                ) : (
                  <UserAvatar
                    avatarUrl={organizer.avatarUrl}
                    displayName={organizer.fullName}
                    sizeClass="h-10 w-10"
                    textClass="text-xs"
                  />
                )}
                {hasClub ? (
                  <Link
                    to={generatePath(ROUTES.clubDetails, { clubId: String(ride.clubId) })}
                    className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple"
                  >
                    <UserAvatar
                      avatarUrl={ride.clubAvatarUrl}
                      displayName={ride.clubName}
                      sizeClass="h-10 w-10"
                      textClass="text-xs"
                      className="ring-2 ring-[#141414]"
                    />
                  </Link>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <Eyebrow className="text-[10px]">Organized by</Eyebrow>
                {organizer?.id != null ? (
                  <Link
                    to={generatePath(ROUTES.userProfile, { userId: String(organizer.id) })}
                    className="mt-0.5 block truncate text-sm font-semibold text-fg no-underline"
                  >
                    {organizer.fullName}
                  </Link>
                ) : (
                  <p className="mt-0.5 truncate text-sm font-semibold text-fg">{organizer.fullName}</p>
                )}
                {hasClub ? (
                  <Link
                    to={generatePath(ROUTES.clubDetails, { clubId: String(ride.clubId) })}
                    className="rydo-subtle mt-0.5 block truncate text-xs no-underline"
                  >
                    {ride.clubName}
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="rydo-panel px-1 py-2">
            <StatRibbon items={statItems} paddingClass="px-3 py-2" />
          </div>

          {hasRoute && geoJson?.features?.length ? (
            <div className="rydo-panel overflow-hidden px-3 py-3">
              <BoldRouteMapElevation
                geoJson={geoJson}
                profile={profile}
                eyebrow="Route profile"
              />
            </div>
          ) : null}

          {routePath ? (
            <Link
              to={routePath}
              className="rydo-bold-glass-row flex items-center gap-3 p-3 no-underline transition hover:border-border-strong"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <Eyebrow className="text-[10px]">Linked route</Eyebrow>
                <DisplayTitle as="div" size="sm" className="mt-1 truncate text-base">
                  {linkedRoute?.title || `Route #${ride.routeId}`}
                </DisplayTitle>
                {linkedRoute?.terrain ? (
                  <p className="rydo-subtle mt-0.5 text-xs">
                    {formatTrailMetaLabel(linkedRoute.terrain)}
                    {linkedRoute.region ? ` · ${linkedRoute.region}` : ''}
                  </p>
                ) : null}
              </div>
              <ChevronRight className="h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden />
            </Link>
          ) : !hasRoute ? (
            <p className="rydo-subtle px-1 text-sm">No route is linked to this event yet.</p>
          ) : null}

          {upcoming && hasRoute ? (
            <RideWeatherSummary
              key={`${ride.id}-ride-weather-bold`}
              ride={ride}
              linkedRoute={linkedRoute}
              routeLoading={routeLoading}
              layout="split"
            />
          ) : null}

          {notes ? (
            <div className="rydo-panel px-4 py-3.5">
              <Eyebrow className="mb-2 block">Details</Eyebrow>
              <p className="text-sm leading-relaxed text-fg-muted">{notes}</p>
            </div>
          ) : null}

          <div className="rydo-panel px-4 py-3.5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <Eyebrow>Riders</Eyebrow>
              {participantCount > 0 ? (
                <span className="rydo-pill px-2 py-0.5 text-[11px] font-bold">{participantCount}</span>
              ) : null}
            </div>
            {members.length === 0 && participantCount > 0 ? (
              <p className="text-sm text-fg-muted">
                {participantCount} {participantCount === 1 ? 'person has' : 'people have'} signed up.
                Full roster is visible to club members.
              </p>
            ) : null}
            {members.length === 0 && participantCount === 0 ? (
              <p className="text-sm text-fg-muted">No participants yet.</p>
            ) : null}
            {members.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {members.map((member) => (
                  <Link
                    key={member.userId}
                    to={generatePath(ROUTES.userProfile, { userId: String(member.userId) })}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-black/20 px-3 py-1.5 text-sm text-fg-muted no-underline transition hover:border-border-strong hover:text-fg"
                  >
                    <UserAvatar
                      avatarUrl={member.avatarUrl}
                      displayName={member.displayName?.trim() || `Rider #${member.userId}`}
                      sizeClass="h-7 w-7"
                      textClass="text-[10px]"
                    />
                    <span className="max-w-[8rem] truncate">
                      {member.displayName?.trim() || `Rider #${member.userId}`}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {!user && !isSoloLog && upcoming ? (
            <p className="rydo-subtle px-1 text-sm">Sign in to join this ride.</p>
          ) : null}
        </div>

        {showAttendance ? (
          <div className="flex shrink-0 items-center gap-2 border-t border-border/60 px-5 py-3.5">
            {amParticipant && hasRoute && onLiveRide ? (
              <GradientCTA
                className="flex-1 whitespace-nowrap"
                icon={Bike}
                heightClass="h-12"
                disabled={isNavigatingToLive}
                onMouseEnter={onPrefetchLive}
                onFocus={onPrefetchLive}
                onClick={onLiveRide}
              >
                {isNavigatingToLive ? 'Starting…' : 'Live ride'}
              </GradientCTA>
            ) : null}
            {amParticipant ? (
              <SecondaryAction
                className={cn(!hasRoute || !onLiveRide ? 'flex-1' : '')}
                onClick={onLeave}
                disabled={isLeaving}
              >
                {isLeaving ? 'Leaving…' : 'Leave'}
              </SecondaryAction>
            ) : (
              <GradientCTA
                className="flex-1"
                heightClass="h-12"
                onClick={onJoin}
                disabled={isJoining}
              >
                {isJoining ? 'Joining…' : 'Join ride'}
              </GradientCTA>
            )}
          </div>
        ) : null}
      </div>
    </BoldScreen>
  );
}
