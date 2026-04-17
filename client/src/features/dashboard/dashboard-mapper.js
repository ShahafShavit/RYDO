import { formatDistanceFromKm } from '@/shared/utils/distance';

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

function userInGroup(group, userId) {
  if (userId == null) return false;
  const uid = Number(userId);
  const parts = group?.participants;
  if (Array.isArray(parts) && parts.map(Number).includes(uid)) return true;
  const details = group?.participantDetails;
  if (Array.isArray(details) && details.some((p) => Number(p.userId) === uid)) return true;
  return false;
}

/**
 * @param {{
 *   userId: number | null,
 *   historyRaw: unknown,
 *   rideGroupsRaw: unknown,
 *   clubsRaw: unknown,
 *   challengesRaw: unknown,
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
  userId,
  historyRaw,
  rideGroupsRaw,
  clubsRaw,
  challengesRaw,
  distanceUnit = 'km',
}) {
  const unit = distanceUnit === 'mi' ? 'mi' : 'km';
  const { history, total: historyTotal } = normalizeHistoryRaw(historyRaw);
  const last = history[0];

  const rides = Array.isArray(rideGroupsRaw) ? rideGroupsRaw : [];
  const now = Date.now();

  const futureMine = rides
    .filter((g) => userInGroup(g, userId) && new Date(g.scheduledDate).getTime() >= now)
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

  const upcomingPreview = futureMine.slice(0, 2);
  const upcomingMoreCount = Math.max(0, futureMine.length - 2);

  const clubs = Array.isArray(clubsRaw) ? clubsRaw : [];
  const myClubs = clubs
    .filter((c) => c.myRole === 'member' || c.myRole === 'admin')
    .slice(0, 6);

  const groups = myClubs.map((c) => ({
    id: String(c.id),
    name: c.name || 'Club',
    detail: c.region?.trim() || c.description?.trim()?.slice(0, 72) || '—',
    visibility: c.visibility === 'private' ? 'private' : 'public',
    avatarUrl: typeof c.avatarUrl === 'string' && c.avatarUrl.trim() ? c.avatarUrl.trim() : null,
  }));

  const chList = Array.isArray(challengesRaw) ? challengesRaw : [];
  const challenge = chList.find((c) => c.isActive !== false) || chList[0];

  let awards = {
    title: 'Challenges',
    description: 'Complete rides to earn awards',
    percentage: 0,
  };
  if (challenge) {
    const target = Number(challenge.targetValue);
    const current = Number(challenge.currentValue);
    const pct =
      target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    awards = {
      title: 'Challenge',
      description: challenge.title || challenge.description || 'Active challenge',
      percentage: pct,
    };
  }

  const RIDES_PER_LEVEL = 5;
  const count = historyTotal;
  const currentLevel = Math.max(1, 1 + Math.floor(count / RIDES_PER_LEVEL));
  const within = count % RIDES_PER_LEVEL;
  const progress = count === 0 ? 0 : Math.round((within / RIDES_PER_LEVEL) * 100);
  const ridesToNext = within === 0 && count > 0 ? RIDES_PER_LEVEL : RIDES_PER_LEVEL - within;
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
    elevation:
      weeklyElevationM > 0
        ? `${Math.round(weeklyElevationM)} m`
        : '0 m',
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
            ? `${Math.round(Number(last.elevationGainM))} m`
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

  const upcomingRides = upcomingPreview.map((g) => {
    const clubId = g.clubId ?? null;
    const clubName =
      typeof g.clubName === 'string' && g.clubName.trim() ? g.clubName.trim() : null;
    const clubAvatarUrlRaw =
      typeof g.clubAvatarUrl === 'string' && g.clubAvatarUrl.trim() ? g.clubAvatarUrl.trim() : null;
    return {
      id: g.id,
      routeName: g.routeTitle || 'Route',
      dateTime: formatLongDateTime(g.scheduledDate),
      clubName,
      clubAvatarUrl: clubId != null ? clubAvatarUrlRaw : null,
      isPersonal: clubId == null,
    };
  });

  return {
    awards,
    level: {
      title: 'RYDO level',
      currentLevel,
      progress,
      nextLevelLabel:
        count === 0
          ? `Complete ${RIDES_PER_LEVEL} rides to reach level 2`
          : `${ridesToNext} more ride${ridesToNext === 1 ? '' : 's'} to level ${currentLevel + 1}`,
    },
    lastRide,
    weeklySnapshot,
    streakSnapshot,
    groups,
    upcomingRides,
    upcomingMoreCount,
  };
}
