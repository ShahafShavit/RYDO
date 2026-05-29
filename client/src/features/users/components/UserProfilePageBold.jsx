import { useMemo, useCallback, useState } from 'react';
import { generatePath, Link, NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Share2, SlidersHorizontal, Bike, Route as RouteIcon, Mountain, Flag, Check } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import { boldMeOverflowItems, isBoldMeNavActive } from '@/shared/config/bold-navigation';
import {
  LEADERBOARD_BOARD_CONFIG,
  leaderboardBadgeChipClass,
} from '@/features/leaderboards/leaderboard-boards';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import StatRibbon from '@/shared/components/bold/StatRibbon';
import IconButton from '@/shared/components/bold/IconButton';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import CompactRouteMapPreview from '@/features/routes/components/CompactRouteMapPreview';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';
import { historyApi } from '@/features/history/api/history-api';
import { useFriendsList } from '@/features/social/hooks/useFriendsList';
import {
  useUserParticipatedRidesPreview,
  useUserUploadedRoutesPreview,
} from '@/features/users/hooks/useUserProfileActivity';
import { formatProfileWhen } from '@/features/users/utils/profile-formatters';
import { buildQueryString } from '@/shared/api/api-helpers';
import { cn } from '@/shared/lib/cn';

const RIDES_PER_LEVEL = 5;

function formatMemberSince(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.getFullYear();
  } catch {
    return null;
  }
}

function activityVisibility(profile, isOwn, key) {
  if (isOwn) return true;
  if (key === 'routes') {
    return profile?.privacy?.publicUploadedRoutesOnProfile ?? profile?.publicUploadedRoutesOnProfile ?? true;
  }
  return profile?.privacy?.publicParticipatedRidesOnProfile ?? profile?.publicParticipatedRidesOnProfile ?? true;
}

function statValue(value, formatter) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return formatter ? formatter(value) : String(value);
}

export default function UserProfilePageBold({ profile, userId, isOwn }) {
  const { formatKm, formatElevation } = useFormatDistance();
  const { pathname } = useLocation();
  const id = Number(userId);
  const [copied, setCopied] = useState(false);

  const name = profile?.fullName?.trim() || 'Member';
  const handle = profile?.email ? `@${String(profile.email).split('@')[0]}` : '';
  const memberSince = formatMemberSince(profile?.createdAt);
  const badges = profile?.leaderboardBadges ?? [];

  const showRoutes = activityVisibility(profile, isOwn, 'routes');
  const showRides = activityVisibility(profile, isOwn, 'rides');
  const publicFriendsListOnProfile = isOwn
    ? (profile?.privacy?.publicFriendsListOnProfile ?? true)
    : (profile?.publicFriendsListOnProfile ?? true);

  const { data: routesPage, isLoading: routesLoading } = useUserUploadedRoutesPreview(userId, {
    enabled: showRoutes,
  });
  const { data: ridesPage, isLoading: ridesLoading } = useUserParticipatedRidesPreview(userId, {
    enabled: showRides,
  });
  const { data: friendsData } = useFriendsList(userId, {
    enabled: isOwn || publicFriendsListOnProfile !== false,
  });
  const { data: historyRaw, isLoading: historyLoading } = useQuery({
    queryKey: ['history', 'profile-lifetime', id],
    queryFn: () => historyApi.getHistory({ skip: 0, take: 100 }),
    enabled: isOwn && Number.isFinite(id) && id > 0,
  });

  const friendCount = friendsData?.items?.length ?? 0;
  const routeItems = routesPage?.items ?? [];
  const rideItems = ridesPage?.items?.filter(Boolean) ?? [];
  const routesTotal = routesPage?.total ?? 0;
  const ridesTotal = ridesPage?.total ?? 0;

  const lifetime = useMemo(() => {
    const routesCount = routesTotal;
    if (isOwn && historyRaw) {
      const items = Array.isArray(historyRaw.items) ? historyRaw.items : [];
      const completedRides = typeof historyRaw.total === 'number' ? historyRaw.total : items.length;
      const totalKm = items.reduce(
        (sum, item) => sum + (Number.isFinite(Number(item.distanceKm)) ? Number(item.distanceKm) : 0),
        0,
      );
      const totalElev = items.reduce(
        (sum, item) => sum + (Number.isFinite(Number(item.elevationGainM)) ? Number(item.elevationGainM) : 0),
        0,
      );
      return {
        totalKm,
        totalElev,
        totalRides: completedRides,
        totalRoutes: routesCount,
        level: Math.max(1, 1 + Math.floor(completedRides / RIDES_PER_LEVEL)),
      };
    }
    return {
      totalKm: null,
      totalElev: null,
      totalRides: ridesTotal,
      totalRoutes: routesCount,
      level: null,
    };
  }, [isOwn, historyRaw, routesTotal, ridesTotal]);

  const statsLoading = (isOwn && historyLoading) || routesLoading || (showRides && ridesLoading);

  const shareUrl = useMemo(() => {
    const path = generatePath(ROUTES.userProfile, { userId: String(userId ?? '') });
    if (typeof window === 'undefined') return path;
    try {
      return new URL(path, window.location.origin).href;
    } catch {
      return path;
    }
  }, [userId]);

  const copyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [shareUrl]);

  const routesMoreHref = `${ROUTES.routes}${buildQueryString({ createdBy: id })}`;
  const ridesMoreHref = `${ROUTES.myRides}${buildQueryString({ member: id })}`;

  return (
    <BoldScreen>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="px-5 pt-2">
          <div className="mb-3 flex justify-end gap-2">
            <IconButton
              icon={copied ? Check : Share2}
              aria-label={copied ? 'Link copied' : 'Share profile'}
              onClick={copyShareLink}
            />
            {isOwn ? (
              <Link to={`${ROUTES.settings}?tab=profile`} aria-label="Settings">
                <IconButton icon={SlidersHorizontal} aria-label="Settings" />
              </Link>
            ) : null}
          </div>

          <div className="flex items-center gap-3.5">
            <UserAvatar
              avatarUrl={profile?.avatarUrl}
              displayName={name}
              sizeClass="h-[68px] w-[68px]"
              textClass="text-2xl"
              className="ring-2 ring-rydo-purple/55 shadow-[0_0_30px_rgba(123,92,255,0.3)]"
            />
            <div className="min-w-0 flex-1">
              <DisplayTitle size="sm">{name}</DisplayTitle>
              <p className="rydo-subtle mt-1 text-[13px]">
                {handle}
                {lifetime.level != null ? ` · Lvl ${lifetime.level}` : ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rydo-pill px-2.5 py-1 text-xs">
                  <b className="text-fg">{friendCount}</b>&nbsp;friends
                </span>
                {memberSince ? (
                  <span className="rydo-pill px-2.5 py-1 text-xs">Since {memberSince}</span>
                ) : null}
              </div>
            </div>
          </div>

          {isOwn ? (
            <nav className="rydo-chiprow mt-4 w-full" aria-label="Profile shortcuts">
              {boldMeOverflowItems.map((item) => {
                const active = isBoldMeNavActive(pathname, item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'rydo-chip min-w-0 flex-1 justify-center px-2 py-2 text-center text-[12px] leading-tight no-underline sm:px-3 sm:text-[13px]',
                      active
                        ? 'border-rydo-purple/35 bg-rydo-purple/10 text-fg shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--rydo-text)_10%,transparent)]'
                        : 'text-fg-muted hover:border-border-strong hover:bg-surface-strong hover:text-fg',
                    )}
                  >
                    <span className="block truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          ) : null}
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4 pt-3">
          <div className="rydo-panel px-4 py-3">
            <Eyebrow className="mb-2.5 block">Lifetime</Eyebrow>
            {statsLoading ? (
              <div className="h-14 animate-pulse rounded-xl bg-surface-strong/60" aria-hidden />
            ) : (
              <StatRibbon
                paddingClass="px-0 py-0"
                items={[
                  {
                    key: 'km',
                    icon: RouteIcon,
                    value: statValue(lifetime.totalKm, (v) => formatKm(v, 0)),
                    label: 'Distance',
                    size: 19,
                  },
                  {
                    key: 'elev',
                    icon: Mountain,
                    value: statValue(lifetime.totalElev, (v) => formatElevation(v, 0)),
                    label: 'Climbed',
                    size: 19,
                  },
                  {
                    key: 'rides',
                    icon: Bike,
                    value: statValue(lifetime.totalRides, null),
                    label: 'Rides',
                    size: 19,
                  },
                  {
                    key: 'routes',
                    icon: Flag,
                    value: statValue(lifetime.totalRoutes, null),
                    label: 'Routes',
                    size: 19,
                  },
                ]}
              />
            )}
          </div>

          {badges.length > 0 ? (
            <div>
              <Eyebrow className="ml-0.5">Standings</Eyebrow>
              <div className="-mx-5 mt-2 overflow-x-auto px-5">
                <div className="flex gap-2">
                  {badges.map((b) => {
                    const cfg = LEADERBOARD_BOARD_CONFIG[b.boardId];
                    const chipClass = leaderboardBadgeChipClass(b.rank);
                    return (
                      <Link
                        key={`${b.boardId}-${b.rank}`}
                        to={`${ROUTES.leaderboards}?board=${b.boardId}`}
                        className={cn('rydo-chip min-w-0 text-fg no-underline', chipClass)}
                      >
                        <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-black/25 text-xs font-extrabold">
                          {b.rank}
                        </span>
                        <span className="flex min-w-0 flex-col leading-tight">
                          <b className="truncate text-xs">{cfg?.subtitle ?? b.boardId}</b>
                          <span className="rydo-subtle text-[10px] font-medium">{cfg?.title}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {showRoutes ? (
            <section className="flex flex-col gap-2">
              <div className="flex items-end justify-between gap-3">
                <Eyebrow className="ml-0.5">Uploaded routes</Eyebrow>
                {routesTotal > 2 ? (
                  <Link to={routesMoreHref} className="text-xs font-semibold text-rydo-purple no-underline">
                    Show more
                  </Link>
                ) : null}
              </div>
              {routesLoading ? (
                <div className="h-16 animate-pulse rounded-2xl bg-surface-strong/60" aria-hidden />
              ) : routeItems.length === 0 ? (
                <p className="rydo-subtle px-1 text-sm">No routes uploaded yet.</p>
              ) : (
                routeItems.map((route, i) => (
                  <Link
                    key={route.id}
                    to={ROUTES.routeDetails.replace(':routeId', String(route.id))}
                    className="rydo-panel flex items-stretch gap-2.5 p-1.5 no-underline"
                  >
                    <div className="w-[72px] min-h-14 shrink-0 self-stretch overflow-hidden rounded-[10px] border border-border">
                      <CompactRouteMapPreview
                        preview={route.preview}
                        compactPlaceholder
                        className="h-full w-full overflow-hidden rounded-none border-0 bg-surface"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">{route.title || 'Route'}</p>
                      <p className="rydo-subtle text-[11px]">
                        {route.distanceKm != null ? formatKm(route.distanceKm) : '—'}
                        {route.elevationGainM != null ? ` · ${formatElevation(route.elevationGainM, 0)}` : ''}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </section>
          ) : (
            <p className="rydo-subtle px-1 text-sm">This member hides uploaded routes on their profile.</p>
          )}

          {showRides ? (
            <section className="flex flex-col gap-2">
              <div className="flex items-end justify-between gap-3">
                <Eyebrow className="ml-0.5">Rides</Eyebrow>
                {ridesTotal > 2 ? (
                  <Link to={ridesMoreHref} className="text-xs font-semibold text-rydo-purple no-underline">
                    Show more
                  </Link>
                ) : null}
              </div>
              {ridesLoading ? (
                <div className="h-16 animate-pulse rounded-2xl bg-surface-strong/60" aria-hidden />
              ) : rideItems.length === 0 ? (
                <p className="rydo-subtle px-1 text-sm">No rides to show yet.</p>
              ) : (
                rideItems.map((ride, i) => (
                  <Link
                    key={ride.id}
                    to={ROUTES.rideEvent.replace(':rideId', String(ride.id))}
                    className="rydo-panel flex items-stretch gap-2.5 p-1.5 no-underline"
                  >
                    <div className="w-[72px] min-h-14 shrink-0 self-stretch overflow-hidden rounded-[10px] border border-border">
                      <CompactRouteMapPreview
                        preview={ride.preview}
                        compactPlaceholder
                        className="h-full w-full overflow-hidden rounded-none border-0 bg-surface"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">
                        {ride.name || ride.routeName || 'Ride'}
                      </p>
                      <p className="rydo-subtle text-[11px]">{formatProfileWhen(ride.scheduledDate)}</p>
                    </div>
                  </Link>
                ))
              )}
            </section>
          ) : (
            <p className="rydo-subtle px-1 text-sm">This member hides rides they join on their profile.</p>
          )}
        </div>
      </div>
    </BoldScreen>
  );
}
