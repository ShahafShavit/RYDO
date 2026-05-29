import { Link } from 'react-router-dom';
import { Bell, Bike, ChevronRight, Flame, Mountain, Route as RouteIcon } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';
import { useInboxSummary } from '@/features/social/hooks/useInboxSummary';
import CompactRouteMapPreview from '@/features/routes/components/CompactRouteMapPreview';
import { ROUTES } from '@/app/router/route-paths';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import StatRibbon from '@/shared/components/bold/StatRibbon';
import ProgressRing from '@/shared/components/bold/viz/ProgressRing';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import UserAvatar from '@/shared/components/user/UserAvatar';
import TruncatedText from '@/shared/components/ui/TruncatedText';

function greetingForHour(h) {
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function formatToday() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

export default function DashboardHomeCardsBold() {
  const { user } = useAuth();
  const { home, homeLoading, homeError } = useDashboardData();
  const { data: inboxSummary } = useInboxSummary();
  const unreadInbox = inboxSummary?.unreadCount ?? 0;
  const firstName = user?.firstName?.trim() || user?.fullName?.split(/\s+/)[0] || 'Rider';

  if (homeLoading) {
    return (
      <BoldScreen className="animate-pulse px-5">
        <div className="mt-8 h-6 w-32 rounded bg-surface-strong" />
        <div className="mt-3 h-10 w-48 rounded bg-surface-strong" />
        <div className="mt-6 h-24 rounded-[28px] bg-surface-strong" />
      </BoldScreen>
    );
  }

  const levelProgress = (home.level.progress ?? 0) / 100;
  const upcoming = home.upcomingRides?.[0];

  return (
    <BoldScreen>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-start justify-between gap-3 px-5 pt-2">
          <div className="min-w-0">
            <Eyebrow>{formatToday()}</Eyebrow>
            <DisplayTitle size="sm" className="mt-1.5">
              {greetingForHour(new Date().getHours())}
              <br />
              {firstName}
            </DisplayTitle>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to={ROUTES.inbox}
              className="rydo-iconbtn relative"
              aria-label={
                unreadInbox > 0
                  ? `Notifications, ${unreadInbox > 99 ? '99+' : unreadInbox} unread`
                  : 'Notifications'
              }
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
              {unreadInbox > 0 ? (
                <span
                  className="absolute -right-1 -top-1 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-rydo-purple px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-[var(--rydo-bg)]"
                  aria-hidden
                >
                  {unreadInbox > 99 ? '99+' : unreadInbox}
                </span>
              ) : null}
            </Link>
            <Link
              to={ROUTES.userProfile.replace(':userId', String(user?.id ?? ''))}
              aria-label="Your profile"
            >
              <UserAvatar
                avatarUrl={user?.avatarUrl}
                displayName={user?.fullName}
                sizeClass="h-10 w-10"
                textClass="text-sm"
                className="ring-2 ring-rydo-purple/50"
              />
            </Link>
          </div>
        </header>

        {homeError ? (
          <p className="mx-4 mt-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Some dashboard data could not be loaded.
          </p>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-4 pt-3">
          {/* Level hero */}
          <div className="rydo-bold-glass-row flex items-center gap-3.5 p-3.5">
            <ProgressRing value={levelProgress} size={60} strokeWidth={5.5}>
              <span className="rydo-stat-hero text-2xl text-fg">{home.level.currentLevel}</span>
              <Eyebrow className="mt-0.5 text-[8px]">Level</Eyebrow>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <Eyebrow>{home.awards.title}</Eyebrow>
              <p className="mt-1 text-[15px] font-bold leading-snug">
                <TruncatedText lineClamp={2}>{home.level.nextLevelLabel}</TruncatedText>
              </p>
              <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--rydo-green-bright)] to-rydo-purple"
                  style={{ width: `${home.level.progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Weekly ribbon */}
          <div className="rydo-panel px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <Eyebrow>This week</Eyebrow>
              <span className="rydo-subtle text-[11px]">{home.weeklySnapshot.duration} riding</span>
            </div>
            <StatRibbon
              paddingClass="px-0 py-0"
              items={[
                { key: 'rides', icon: Bike, value: home.weeklySnapshot.ridesCount, label: 'Rides', size: 20 },
                { key: 'dist', icon: RouteIcon, value: home.weeklySnapshot.distance, label: 'Distance', size: 20 },
                { key: 'elev', icon: Mountain, value: home.weeklySnapshot.elevation, label: 'Climbed', size: 20 },
              ]}
            />
          </div>

          {/* Last ride */}
          {home.lastRide.rideId != null ? (
            <Link
              to={ROUTES.rideEvent.replace(':rideId', String(home.lastRide.rideId))}
              className="rydo-bold-glass-row flex items-stretch gap-3 p-2.5 transition hover:border-border-strong"
            >
              <div className="w-[72px] min-h-14 shrink-0 self-stretch overflow-hidden rounded-[13px] border border-border">
                <CompactRouteMapPreview
                  preview={home.lastRide.preview}
                  compactPlaceholder
                  className="h-full w-full overflow-hidden rounded-none border-0 bg-surface"
                />
              </div>
              <div className="min-w-0 flex-1">
                <Eyebrow>Last ride · {home.lastRide.completedLabel || 'Recent'}</Eyebrow>
                <DisplayTitle as="div" size="sm" className="mt-1 truncate text-lg">
                  {home.lastRide.routeName}
                </DisplayTitle>
                <div className="mt-2 flex gap-3.5">
                  <span className="rydo-tnum rydo-subtle text-xs">
                    <b className="text-fg">{home.lastRide.distance}</b>
                  </span>
                  <span className="rydo-tnum rydo-subtle text-xs">
                    <b className="text-fg">{home.lastRide.duration}</b>
                  </span>
                  <span className="rydo-tnum rydo-subtle text-xs">
                    <b className="text-fg">{home.lastRide.elevation}</b>
                  </span>
                </div>
              </div>
              <ChevronRight className="h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden />
            </Link>
          ) : null}

          {/* Streak + upcoming */}
          <div className="flex gap-2.5">
            <div className="rydo-panel w-[106px] shrink-0 px-3.5 py-3">
              <Flame className="h-[18px] w-[18px] text-[var(--rydo-amber)]" fill="rgba(240,178,74,0.25)" aria-hidden />
              <div className="rydo-stat-hero mt-2 text-[26px] text-fg">
                {home.streakSnapshot.currentStreak}
                <span className="rydo-subtle ml-0.5 text-[13px] font-bold">wk</span>
              </div>
              <Eyebrow className="mt-1 text-[9px]">
                Streak · best {home.streakSnapshot.longestStreak}
              </Eyebrow>
            </div>
            <div className="rydo-panel flex min-w-0 flex-1 flex-col px-3.5 py-3">
              <Eyebrow>Next group RYDO</Eyebrow>
              {upcoming ? (
                <>
                  <p className="mt-1.5 flex-1 text-sm font-bold leading-snug">{upcoming.routeName}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <UserAvatar
                      avatarUrl={upcoming.clubAvatarUrl}
                      displayName={upcoming.clubName}
                      sizeClass="h-[22px] w-[22px]"
                      textClass="text-[9px]"
                    />
                    <span className="rydo-subtle truncate text-[11px]">{upcoming.dateTime}</span>
                  </div>
                </>
              ) : (
                <p className="rydo-subtle mt-2 text-sm">No upcoming rides</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </BoldScreen>
  );
}
