import { mapRideDto } from '@/features/rides/hooks/useRideEvent';
import { formatDistanceFromKm, formatElevationFromMeters } from '@/shared/utils/distance';

function formatDifficulty(raw) {
  if (raw == null || raw === '') return '—';
  const s = String(raw).replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function formatDurationMinutes(totalMinutes) {
  if (totalMinutes == null || Number.isNaN(Number(totalMinutes))) return '—';
  const n = Number(totalMinutes);
  const h = Math.floor(n / 60);
  const m = Math.round(n % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatLongDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

/**
 * @param {{
 *   historyRaw: unknown,
 *   rideGroupsRaw: unknown,
 *   clubsRaw: unknown,
 *   gamificationRaw: unknown,
 *   distanceUnit?: 'km' | 'mi',
 * }} input
 */
function normalizeHistoryRaw(historyRaw) {
  const items = Array.isArray(historyRaw?.items)
    ? historyRaw.items
    : Array.isArray(historyRaw)
      ? historyRaw
      : [];
  const total =
    typeof historyRaw?.total === 'number' ? historyRaw.total : items.length;
  const history = [...items].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  return { history, total };
}

function startOfCurrentWeekMs() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - diffToMonday);
  return monday.getTime();
}

function startOfWeekMs(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return NaN;
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diffToMonday);
  return d.getTime();
}

function formatShortDate(dateMs) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateMs));
}

function buildStreakSnapshot(history) {
  const uniqueWeekKeys = [...new Set(history.map((item) => startOfWeekMs(item.completedAt)).filter(Number.isFinite))].sort(
    (a, b) => b - a
  );
  if (uniqueWeekKeys.length === 0) {
    return {
      title: 'Streak',
      currentStreak: 0,
      longestStreak: 0,
      nextRideByLabel: 'Start a streak with a ride this week',
    };
  }

  let currentStreak = 1;
  for (let i = 1; i < uniqueWeekKeys.length; i += 1) {
    const prev = uniqueWeekKeys[i - 1];
    const curr = uniqueWeekKeys[i];
    const weekDiff = Math.round((prev - curr) / (86400000 * 7));
    if (weekDiff === 1) {
      currentStreak += 1;
      continue;
    }
    break;
  }

  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < uniqueWeekKeys.length; i += 1) {
    const prev = uniqueWeekKeys[i - 1];
    const curr = uniqueWeekKeys[i];
    const weekDiff = Math.round((prev - curr) / (86400000 * 7));
    if (weekDiff === 1) {
      run += 1;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 1;
    }
  }

  const currentWeekKey = startOfCurrentWeekMs();
  const previousWeekKey = currentWeekKey - 86400000 * 7;
  const latestWeekKey = uniqueWeekKeys[0];
  let nextRideByLabel = 'Start a streak with a ride this week';
  if (latestWeekKey === currentWeekKey) {
    nextRideByLabel = `Great week. Ride again after ${formatShortDate(currentWeekKey + 86400000 * 7)} to extend it`;
  } else if (latestWeekKey === previousWeekKey) {
    nextRideByLabel = 'Ride this week to keep your streak alive';
  }

  return {
    title: 'Streak',
    currentStreak,
    longestStreak,
    nextRideByLabel,
  };
}

export function buildDashboardHome({
  historyRaw,
  rideGroupsRaw,
  clubsRaw,
  gamificationRaw,
  distanceUnit = 'km',
}) {
  const unit = distanceUnit === 'mi' ? 'mi' : 'km';
  const { history } = normalizeHistoryRaw(historyRaw);
  const last = history[0];

  const rides = Array.isArray(rideGroupsRaw) ? rideGroupsRaw : [];
  const mappedUpcoming = rides.map(mapRideDto).filter(Boolean);
  const upcomingPreview = mappedUpcoming.slice(0, 2);
  const upcomingMoreCount = Math.max(0, mappedUpcoming.length - 2);

  const clubs = Array.isArray(clubsRaw) ? clubsRaw : [];
  const myClubs = clubs
    .filter((c) => c.myRole === 'member' || c.myRole === 'organizer' || c.myRole === 'admin');

  const groups = myClubs.map((c) => ({
    id: String(c.id),
    name: c.name || 'Club',
    detail: c.region?.trim() || c.description?.trim()?.slice(0, 72) || '—',
    visibility: c.visibility === 'private' ? 'private' : 'public',
    avatarUrl: typeof c.avatarUrl === 'string' && c.avatarUrl.trim() ? c.avatarUrl.trim() : null,
    isAdmin: c.myRole === 'admin',
    memberCount: typeof c.memberCount === 'number' ? c.memberCount : null,
    upcomingRideCount:
      typeof c.upcomingRideCount === 'number' ? c.upcomingRideCount : 0,
  }));

  const g = gamificationRaw && typeof gamificationRaw === 'object' ? gamificationRaw : {};
  const events =
    g.activeEvents && typeof g.activeEvents === 'object' ? g.activeEvents : {};
  const currentLevel = Math.max(1, Number(g.level) || 1);
  const progress = Number(g.levelProgressPercent) || 0;
  const xpToNext = Number(g.xpToNextLevel) || 0;
  const featuredCard =
    events.defaultFeaturedCard ?? events.pinned ?? g.defaultFeaturedCard ?? null;
  let awards = {
    title: 'Challenges',
    description: 'Complete rides to earn awards',
    percentage: progress,
  };
  if (featuredCard?.kind === 'quest') {
    awards = {
      title: 'Quest',
      description: featuredCard.title || 'Active quest',
      percentage: featuredCard.progressPercent ?? 0,
    };
  }

  const weekStartMs = startOfCurrentWeekMs();
  const weeklyHistory = history.filter((item) => {
    const ts = new Date(item.completedAt).getTime();
    return Number.isFinite(ts) && ts >= weekStartMs;
  });
  const weeklyDistanceKm = weeklyHistory.reduce(
    (sum, item) => sum + (Number.isFinite(Number(item.distanceKm)) ? Number(item.distanceKm) : 0),
    0
  );
  const weeklyDurationMinutes = weeklyHistory.reduce(
    (sum, item) =>
      sum + (Number.isFinite(Number(item.durationMinutes)) ? Number(item.durationMinutes) : 0),
    0
  );
  const weeklyElevationM = weeklyHistory.reduce(
    (sum, item) =>
      sum + (Number.isFinite(Number(item.elevationGainM)) ? Number(item.elevationGainM) : 0),
    0
  );
  const weeklySnapshot = {
    title: 'Weekly Snapshot',
    ridesCount: weeklyHistory.length,
    distance: formatDistanceFromKm(weeklyDistanceKm, unit),
    duration: formatDurationMinutes(weeklyDurationMinutes),
    elevation: formatElevationFromMeters(weeklyElevationM, unit),
  };
  const streakSnapshot = buildStreakSnapshot(history);

  const lastRide = last
    ? {
        title: 'Last RYDO',
        routeName: last.routeTitle || 'Route',
        distance:
          last.distanceKm != null ? formatDistanceFromKm(last.distanceKm, unit) : '—',
        duration: formatDurationMinutes(last.durationMinutes),
        difficulty: formatDifficulty(last.routeDifficulty),
        elevation:
          last.elevationGainM != null && Number.isFinite(Number(last.elevationGainM))
            ? formatElevationFromMeters(Number(last.elevationGainM), unit)
            : '—',
        completedLabel: formatLongDateTime(last.completedAt),
        rideId: last.rideId ?? null,
        routeId: last.routeId ?? null,
        preview: last.preview ?? null,
        clubId: last.clubId ?? null,
        clubName: last.clubName ?? null,
        rideKind: last.rideKind ?? null,
      }
    : {
        title: 'Last RYDO',
        routeName: 'No rides logged yet',
        distance: '—',
        duration: '—',
        difficulty: '—',
        elevation: '—',
        completedLabel: null,
        rideId: null,
        routeId: null,
        preview: null,
        clubId: null,
        clubName: null,
        rideKind: null,
      };

  const upcomingRides = upcomingPreview.map((ride) => {
    const clubId = ride.clubId ?? null;
    const clubName =
      typeof ride.clubName === 'string' && ride.clubName.trim() ? ride.clubName.trim() : null;
    const clubAvatarUrlRaw =
      typeof ride.clubAvatarUrl === 'string' && ride.clubAvatarUrl.trim()
        ? ride.clubAvatarUrl.trim()
        : null;
    return {
      id: ride.id,
      title: ride.name || ride.routeTitle || 'Ride',
      dateTime: formatLongDateTime(ride.scheduledDate),
      clubName,
      clubAvatarUrl: clubId != null ? clubAvatarUrlRaw : null,
      isPersonal: clubId == null,
      preview: ride.preview ?? null,
    };
  });

  return {
    awards,
    level: {
      title: 'RYDO level',
      currentLevel,
      progress,
      nextLevelLabel:
        xpToNext > 0
          ? `${xpToNext} XP to level ${currentLevel + 1}`
          : `Level ${currentLevel}`,
    },
    featuredCard,
    pinnedChallengeInstanceId:
      g.pinnedChallengeInstanceId != null ? Number(g.pinnedChallengeInstanceId) : null,
    lastRide,
    weeklySnapshot,
    streakSnapshot,
    groups,
    upcomingRides,
    upcomingMoreCount,
  };
}
