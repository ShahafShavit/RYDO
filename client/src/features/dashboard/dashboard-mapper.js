import { buildRoutePreviewFeatureCollection } from '@/features/routes/utils/routePreviewGeoJson';

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
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

function formatShortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d);
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
 * }} input
 */
export function buildDashboardHome({ userId, historyRaw, rideGroupsRaw, clubsRaw, challengesRaw }) {
  const history = Array.isArray(historyRaw)
    ? [...historyRaw].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    : [];
  const last = history[0];

  const rides = Array.isArray(rideGroupsRaw) ? rideGroupsRaw : [];
  const now = Date.now();

  const futureMine = rides
    .filter((g) => userInGroup(g, userId) && new Date(g.scheduledDate).getTime() >= now)
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

  const upcoming = futureMine[0];

  const clubs = Array.isArray(clubsRaw) ? clubsRaw : [];
  const myClubs = clubs
    .filter((c) => c.myRole === 'member' || c.myRole === 'admin')
    .slice(0, 6);

  const groups = myClubs.map((c) => ({
    id: String(c.id),
    name: c.name || 'Club',
    detail: c.region?.trim() || c.description?.trim()?.slice(0, 72) || '—',
    visibility: c.visibility === 'private' ? 'private' : 'public',
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
  const count = history.length;
  const currentLevel = Math.max(1, 1 + Math.floor(count / RIDES_PER_LEVEL));
  const within = count % RIDES_PER_LEVEL;
  const progress = count === 0 ? 0 : Math.round((within / RIDES_PER_LEVEL) * 100);
  const ridesToNext = within === 0 && count > 0 ? RIDES_PER_LEVEL : RIDES_PER_LEVEL - within;

  const lastRide = last
    ? {
        title: 'Last RYDO',
        routeName: last.routeTitle || 'Route',
        distance:
          last.distanceKm != null ? `${Number(last.distanceKm).toFixed(1)} km` : '—',
        duration: formatDurationMinutes(last.durationMinutes),
        difficulty: formatDifficulty(last.routeDifficulty),
        mapLabel: 'Trail summary',
        mapGeoJson: buildRoutePreviewFeatureCollection(last.preview ?? null),
      }
    : {
        title: 'Last RYDO',
        routeName: 'No rides logged yet',
        distance: '—',
        duration: '—',
        difficulty: '—',
        mapLabel: 'Your history will appear here',
        mapGeoJson: null,
      };

  const upcomingRide = upcoming
    ? {
        id: upcoming.id,
        title: 'Upcoming Group RYDO',
        dateTime: formatLongDateTime(upcoming.scheduledDate),
        routeName: upcoming.routeTitle || 'Route',
        chatGroup: upcoming.name || 'Group ride',
      }
    : {
        id: null,
        title: 'Upcoming Group RYDO',
        dateTime: '—',
        routeName: 'No upcoming rides',
        chatGroup: "You're not signed up for a future group ride",
      };

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
    groups,
    upcomingRide,
    hasUpcomingRide: Boolean(upcoming),
  };
}
