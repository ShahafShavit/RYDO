import { Link } from 'react-router-dom';
import { Bell, Bike, ChevronRight, Flame, Mountain, Route as RouteIcon, Trophy } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';
import { useInboxSummary } from '@/features/social/hooks/useInboxSummary';
import CompactRouteMapPreview from '@/features/routes/components/CompactRouteMapPreview';
import { ROUTES } from '@/app/router/route-paths';
import { myProfilePath } from '@/shared/lib/user-paths';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import StatRibbon from '@/shared/components/bold/StatRibbon';
import ProgressRing from '@/shared/components/bold/viz/ProgressRing';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import BoldScrollArea from '@/shared/components/bold/BoldScrollArea';
import UserAvatar from '@/shared/components/user/UserAvatar';
import TruncatedText from '@/shared/components/ui/TruncatedText';
import DashboardClubsSection from '@/features/dashboard/components/DashboardClubsSection';
import LabelWithHelp from '@/shared/components/ui/info-tooltip/LabelWithHelp';
import InfoTooltip from '@/shared/components/ui/info-tooltip/InfoTooltip';
import { helpTooltip } from '@/shared/content/help-tooltips';

function greetingForHour(h) {
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
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
            <DisplayTitle size="sm">
              {greetingForHour(new Date().getHours())}
              <br />
              {firstName}
            </DisplayTitle>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to={ROUTES.leaderboards}
              className="rydo-iconbtn text-[var(--rydo-amber)]"
              aria-label="Leaderboards"
            >
              <Trophy className="h-[18px] w-[18px]" strokeWidth={2} />
            </Link>
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
              to={myProfilePath(user)}
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

        <BoldScrollArea className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pt-3">
          {/* Level hero — ring is the only level progress indicator */}
          <div className="rydo-bold-glass-row flex items-center gap-4 p-4">
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <ProgressRing value={levelProgress} size={84} strokeWidth={6}>
                <span className="rydo-stat-hero text-[32px] leading-none text-fg">
                  {home.level.currentLevel}
                </span>
              </ProgressRing>
              <LabelWithHelp hint={helpTooltip('level')} topic="Level">
                <Eyebrow className="text-[9px]">Level</Eyebrow>
              </LabelWithHelp>
            </div>
            <div className="min-w-0 flex-1">
              <LabelWithHelp hint={helpTooltip('challenge')} topic={home.awards.title}>
                <Eyebrow>{home.awards.title}</Eyebrow>
              </LabelWithHelp>
              <p className="mt-1.5 text-[15px] font-bold leading-snug">
                <TruncatedText lineClamp={2}>{home.level.nextLevelLabel}</TruncatedText>
              </p>
            </div>
          </div>

          {/* Weekly ribbon */}
          <div className="rydo-panel px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <LabelWithHelp hint={helpTooltip('weeklySnapshot')} topic="This week">
                <Eyebrow>This week</Eyebrow>
              </LabelWithHelp>
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

          {/* Streak + upcoming */}
          <div className="flex gap-2.5">
            <div className="rydo-panel w-[106px] shrink-0 px-3.5 py-3">
              <Flame className="h-[18px] w-[18px] text-[var(--rydo-amber)]" fill="rgba(240,178,74,0.25)" aria-hidden />
              <div className="rydo-stat-hero mt-2 text-[26px] text-fg">
                {home.streakSnapshot.currentStreak}
                <span className="rydo-subtle ml-0.5 text-[13px] font-bold">wk</span>
              </div>
              <Eyebrow className="mt-1 inline-flex items-center gap-0.5 text-[9px]">
                Streak · best {home.streakSnapshot.longestStreak}
                <InfoTooltip content={helpTooltip('streak')} topic="Streak" />
              </Eyebrow>
            </div>
            {upcoming ? (
              <Link
                to={ROUTES.rideEvent.replace(':rideId', String(upcoming.id))}
                className="rydo-panel flex min-w-0 flex-1 items-stretch gap-2.5 p-2.5 transition hover:border-border-strong"
              >
                <div className="w-[72px] min-h-14 shrink-0 self-stretch overflow-hidden rounded-[13px] border border-border">
                  <CompactRouteMapPreview
                    preview={upcoming.preview}
                    compactPlaceholder
                    className="h-full w-full overflow-hidden rounded-none border-0 bg-surface"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Eyebrow>Next RYDO</Eyebrow>
                  <TruncatedText className="mt-1.5 flex-1 text-sm font-bold leading-snug">
                    {upcoming.title}
                  </TruncatedText>
                  <div className="mt-2 flex items-center gap-2">
                    {upcoming.isPersonal ? (
                      <span className="rydo-subtle shrink-0 text-[10px] font-semibold uppercase tracking-wide">
                        Personal
                      </span>
                    ) : (
                      <UserAvatar
                        avatarUrl={upcoming.clubAvatarUrl}
                        displayName={upcoming.clubName}
                        sizeClass="h-[22px] w-[22px]"
                        textClass="text-[9px]"
                      />
                    )}
                    <span className="rydo-subtle truncate text-[11px]">{upcoming.dateTime}</span>
                  </div>
                </div>
                <ChevronRight className="h-[18px] w-[18px] shrink-0 self-center text-fg-subtle" aria-hidden />
              </Link>
            ) : (
              <div className="rydo-panel flex min-w-0 flex-1 flex-col px-3.5 py-3">
                <Eyebrow>Next RYDO</Eyebrow>
                <p className="rydo-subtle mt-2 text-sm">No upcoming rides</p>
              </div>
            )}
          </div>

          <DashboardClubsSection groups={home.groups} />

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
                <DisplayTitle as="div" size="sm" truncate title={home.lastRide.routeName} className="mt-1 text-lg">
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
        </BoldScrollArea>
      </div>
    </BoldScreen>
  );
}
