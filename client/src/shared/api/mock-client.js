import { ApiError } from '@/shared/api/api-errors';
import { env } from '@/shared/config/env';
import { MOCK_CHALLENGES } from '@/shared/mocks/challenges';
import { MOCK_HAZARDS } from '@/shared/mocks/hazards';
import { MOCK_HISTORY } from '@/shared/mocks/history';
import { MOCK_CLUBS } from '@/shared/mocks/clubs';
import { MOCK_RIDE_GROUPS } from '@/shared/mocks/rides';
import { MOCK_ROUTES, MOCK_SAVED_ROUTES } from '@/shared/mocks/routes';
import { MOCK_USERS } from '@/shared/mocks/users';

/** Baseline saved route ids per mock user (session `savedRouteIds` resets on login/register). */
const DEFAULT_SAVED_ROUTE_IDS_BY_USER_ID = {
  1: [...MOCK_SAVED_ROUTES],
  2: [1],
  3: [],
};

let users = [...MOCK_USERS];
let routes = [...MOCK_ROUTES];
let savedRouteIds = [...DEFAULT_SAVED_ROUTE_IDS_BY_USER_ID[1]];
let hazards = [...MOCK_HAZARDS];
let rides = MOCK_RIDE_GROUPS.map((r) => ({ ...r }));
let clubs = [...MOCK_CLUBS];
let challenges = [...MOCK_CHALLENGES];

/** Mirrors server: pending / none are not active members. */
function mockClubCurrentMembership(c) {
  if (!c) return 'none';
  if (c.membershipPending) return 'pending';
  if (c.myRole === 'admin') return 'admin';
  if (c.myRole === 'member') return 'member';
  return 'none';
}

function mockIsActiveClubMember(c) {
  const m = mockClubCurrentMembership(c);
  return m === 'admin' || m === 'member';
}
let historyEntries = [...MOCK_HISTORY];

const MOCK_LEADERBOARD_KEYS = ['horizonChasers', 'saddleJunkies', 'summitSeekers', 'trailblazers'];

function buildMockLeaderboardsResponse() {
  const routeById = new Map(routes.map((r) => [r.id, r]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const dist = new Map();
  const elev = new Map();
  const rideCount = new Map();
  for (const h of historyEntries) {
    const rt = routeById.get(h.routeId);
    const d = Number(h.distanceKm ?? rt?.distanceKm ?? 0);
    const e = Number(h.elevationGainM ?? rt?.elevationGainM ?? 0);
    const uid = h.userId;
    dist.set(uid, (dist.get(uid) ?? 0) + d);
    elev.set(uid, (elev.get(uid) ?? 0) + e);
    rideCount.set(uid, (rideCount.get(uid) ?? 0) + 1);
  }
  const pubRoutes = new Map();
  for (const r of routes) {
    if ((r.status || 'published') !== 'published') continue;
    const uid = r.createdBy?.id;
    if (uid == null) continue;
    pubRoutes.set(uid, (pubRoutes.get(uid) ?? 0) + 1);
  }
  const top5 = (map, unit) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, 5)
      .map(([userId, value], i) => {
        const u = userById.get(userId);
        const displayName = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : `User #${userId}`;
        return {
          rank: i + 1,
          userId,
          displayName: displayName || `User #${userId}`,
          avatarUrl: u?.avatarUrl ?? null,
          value,
          unit,
        };
      });
  return {
    horizonChasers: top5(dist, 'km'),
    saddleJunkies: top5(rideCount, 'rides'),
    summitSeekers: top5(elev, 'm'),
    trailblazers: top5(pubRoutes, 'routes'),
  };
}

function mockLeaderboardBadgesForUser(userId) {
  const lb = buildMockLeaderboardsResponse();
  const badges = [];
  for (const k of MOCK_LEADERBOARD_KEYS) {
    const row = lb[k].find((r) => r.userId === userId);
    if (row && row.rank <= 3) badges.push({ boardId: k, rank: row.rank });
  }
  return badges;
}

function mockDefaultPrivacy() {
  return {
    publicFirstName: true,
    publicLastName: true,
    publicEmail: false,
    publicCreatedAt: true,
    publicBio: true,
    publicLocation: true,
    publicAvatarUrl: true,
    publicDefaultBikeType: true,
    publicUploadedRoutesOnProfile: true,
    publicParticipatedRidesOnProfile: true,
    publicFriendsListOnProfile: true,
    publicInOthersFriendsLists: true,
  };
}

function mergeMockPrivacy(p) {
  return { ...mockDefaultPrivacy(), ...p };
}

function toFullProfile(p) {
  const privacy = {
    ...mergeMockPrivacy(p.privacy),
    publicUploadedRoutesOnProfile: preferences.publicUploadedRoutesOnProfile !== false,
    publicParticipatedRidesOnProfile: preferences.publicParticipatedRidesOnProfile !== false,
    publicFriendsListOnProfile: preferences.publicFriendsListOnProfile !== false,
    publicInOthersFriendsLists: preferences.publicInOthersFriendsLists !== false,
  };
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    bio: p.bio ?? null,
    location: p.location ?? null,
    avatarUrl: p.avatarUrl ?? null,
    defaultBikeType: preferences.defaultBikeType ?? 'road',
    role: (p.role || 'user').toLowerCase(),
    isActive: p.isActive ?? true,
    createdAt: p.createdAt,
    privacy,
    leaderboardBadges: mockLeaderboardBadgesForUser(p.id),
  };
}

function toPublicProfileView(u) {
  const privacy = mergeMockPrivacy(u.privacy);
  return {
    id: u.id,
    isSelf: false,
    firstName: privacy.publicFirstName ? u.firstName : null,
    lastName: privacy.publicLastName ? u.lastName : null,
    email: privacy.publicEmail ? u.email : null,
    createdAt: privacy.publicCreatedAt ? u.createdAt : null,
    bio: privacy.publicBio ? u.bio : null,
    location: privacy.publicLocation ? u.location : null,
    avatarUrl: privacy.publicAvatarUrl ? u.avatarUrl : null,
    defaultBikeType: privacy.publicDefaultBikeType ? (u.defaultBikeType ?? 'road') : null,
    publicUploadedRoutesOnProfile: privacy.publicUploadedRoutesOnProfile !== false,
    publicParticipatedRidesOnProfile: privacy.publicParticipatedRidesOnProfile !== false,
    publicFriendsListOnProfile: privacy.publicFriendsListOnProfile !== false,
    leaderboardBadges: mockLeaderboardBadgesForUser(u.id),
  };
}

let profile = {
  ...users[0],
  fullName: `${users[0].firstName} ${users[0].lastName}`,
};
let preferences = {
  defaultBikeType: 'road',
  distanceUnit: 'km',
  notificationsEnabled: true,
  publicInRouteRiderLists: true,
  publicUploadedRoutesOnProfile: true,
  publicParticipatedRidesOnProfile: true,
  publicFriendsListOnProfile: true,
  publicInOthersFriendsLists: true,
  colorScheme: 'midnight',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toAuthUser(user) {
  return {
    id: user.id,
    fullName: user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Unknown user',
    email: user.email,
    avatarUrl: user.avatarUrl?.trim() || null,
    role: (user.role || 'user').toLowerCase(),
    isActive: user.isActive ?? true,
    createdAt: user.createdAt || null,
  };
}

function paginate(items, searchParams) {
  const skip = Number(searchParams.get('skip') || 0);
  const take = Number(searchParams.get('take') || items.length || 0);
  return {
    items: items.slice(skip, skip + take),
    total: items.length,
    skip,
    take,
  };
}

/** WGS84 great-circle distance (km), aligned with server GeoDistance.HaversineKm. */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Start point for mock routes: explicit fields or first preview coordinate [lng, lat]. */
function getRouteStartLatLng(route) {
  if (route.startLatitude != null && route.startLongitude != null) {
    return { lat: Number(route.startLatitude), lng: Number(route.startLongitude) };
  }
  const c = route.coordinates?.[0] || route.preview?.coordinates?.[0];
  if (!c || c.length < 2) return null;
  return { lng: Number(c[0]), lat: Number(c[1]) };
}

function parseJsonBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

function createRouteFromUpload(data) {
  const nextId = Math.max(...routes.map((route) => route.id), 0) + 1;

  return {
    id: nextId,
    title: data.title,
    description: data.description || '',
    distanceKm: Number(data.distanceKm || 25),
    elevationGainM: Number(data.elevationGainM || 450),
    difficulty: data.difficulty || 'moderate',
    terrain: data.terrain || 'mixed',
    durationMinutes: Number(data.estimatedDurationMinutes || 120),
    estimatedDurationMinutes: Number(data.estimatedDurationMinutes || 120),
    estimatedDurationSource: data.estimatedDurationSource || 'gpx_timestamps',
    region: data.region || null,
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
    createdBy: {
      id: profile.id,
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl?.trim() || null,
    },
    createdAt: new Date().toISOString(),
    coordinates: [
      [35.2137, 31.7683],
      [35.214, 31.769],
    ],
    startLongitude: 35.2137,
    startLatitude: 31.7683,
    status: 'published',
    favoriteCount: 0,
  };
}

/** Distinct participants on past rides for this route (mock; server uses preferences). */
function buildMockRouteRiders(routeId) {
  const rid = Number(routeId);
  const now = Date.now();
  const pastRidesOnRoute = rides.filter(
    (rg) => rg.routeId === rid && new Date(rg.scheduledDate).getTime() < now,
  );
  const ids = new Set();
  pastRidesOnRoute.forEach((rg) => {
    (rg.participants || []).forEach((uid) => ids.add(Number(uid)));
  });
  const visibleRiders = Array.from(ids).map((uid) => {
    const u = users.find((x) => x.id === uid);
    return {
      userId: uid,
      fullName: u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : `User ${uid}`,
      avatarUrl: mockRosterAvatarUrl(u),
    };
  });
  const totalCount = visibleRiders.length;
  return { totalCount, visibleRiders };
}

/** Deterministic mock total “saved as favorite” counts (mirrors server `favoriteCount`). */
function mockFavoriteCountForRoute(routeId) {
  const id = Number(routeId);
  if (!Number.isFinite(id)) return 0;
  return (id * 17 + 5) % 47;
}

function findRoute(routeId) {
  const route = routes.find((item) => item.id === Number(routeId));
  if (!route) {
    throw new ApiError({ message: 'Route not found', status: 404, code: 'route_not_found' });
  }
  const rid = Number(routeId);
  const { totalCount, visibleRiders } = buildMockRouteRiders(rid);

  let createdBy = route.createdBy;
  if (typeof createdBy === 'string') {
    const match = users.find((u) => u.username === createdBy);
    createdBy = match
      ? {
          id: match.id,
          fullName: [match.firstName, match.lastName].filter(Boolean).join(' '),
          avatarUrl: mockRosterAvatarUrl(match),
        }
      : { id: null, fullName: createdBy, avatarUrl: null };
  } else if (createdBy && typeof createdBy === 'object' && createdBy.id != null) {
    const u = users.find((x) => x.id === Number(createdBy.id));
    createdBy = { ...createdBy, avatarUrl: mockRosterAvatarUrl(u) };
  }

  return {
    ...route,
    preview: { coordinates: route.coordinates },
    estimatedDurationMinutes: route.estimatedDurationMinutes ?? route.durationMinutes,
    createdBy,
    routeRiders: { totalCount, visibleRiders },
    favoriteCount: mockFavoriteCountForRoute(rid),
  };
}

function enrichListRouteRow(route) {
  const rr = buildMockRouteRiders(route.id);
  return {
    ...route,
    preview: { coordinates: route.coordinates },
    routeRiders: { totalCount: rr.totalCount, visibleRiders: [] },
    favoriteCount: mockFavoriteCountForRoute(route.id),
  };
}

/** Same as API roster rules: show stored avatar URL whenever set (signed-in lists). */
function mockRosterAvatarUrl(u) {
  if (!u?.avatarUrl || !String(u.avatarUrl).trim()) return undefined;
  return String(u.avatarUrl).trim();
}

function participantDetailsFromIds(ids) {
  const list = Array.isArray(ids) ? ids : [];
  return list.map((uid) => {
    const u = users.find((x) => x.id === Number(uid));
    const displayName = u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : `User ${uid}`;
    return { userId: Number(uid), displayName, avatarUrl: u ? mockRosterAvatarUrl(u) : undefined };
  });
}

function mockViewerCanEditRide(ride) {
  const t = new Date(ride.scheduledDate).getTime();
  if (Number.isNaN(t) || t < Date.now()) return false;
  const createdId = ride.createdBy?.id != null ? Number(ride.createdBy.id) : null;
  if (ride.clubId == null) return createdId === profile.id;
  if (createdId === profile.id) return true;
  const club = clubs.find((c) => c.id === ride.clubId);
  return club?.myRole === 'admin';
}

function enrichRideCreatedBy(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const id = raw.id != null ? Number(raw.id) : null;
  const u = id != null ? users.find((x) => x.id === id) : null;
  const fullName =
    String(raw.fullName || '').trim() ||
    (u ? [u.firstName, u.lastName].filter(Boolean).join(' ').trim() : '');
  return {
    id,
    fullName,
    avatarUrl: mockRosterAvatarUrl(u),
  };
}

function findRide(rideId) {
  const ride = rides.find((item) => item.id === Number(rideId));
  if (!ride) {
    throw new ApiError({ message: 'Ride not found', status: 404, code: 'ride_not_found' });
  }
  const route =
    ride.routeId != null ? routes.find((r) => r.id === Number(ride.routeId)) : null;
  const routeTitle = ride.routeTitle || route?.title || '';
  const participantDetails =
    ride.participantDetails || participantDetailsFromIds(ride.participants);
  const participantCount =
    ride.participantCount ?? participantDetails.length ?? (ride.participants?.length ?? 0);
  const routePreview =
    route?.coordinates?.length > 1 ? { coordinates: route.coordinates } : ride.routePreview ?? null;
  const club =
    ride.clubId != null ? clubs.find((c) => c.id === Number(ride.clubId)) : null;
  const clubAvatarUrl =
    club?.avatarUrl && String(club.avatarUrl).trim() ? String(club.avatarUrl).trim() : null;
  return {
    ...ride,
    routeTitle,
    participantDetails,
    participantCount,
    participants: ride.participants,
    routePreview,
    clubAvatarUrl,
    createdBy: enrichRideCreatedBy(ride.createdBy),
    viewerCanEdit: mockViewerCanEditRide(ride),
  };
}

export async function mockRequest(path, options = {}) {
  if (!env.isMockApi) {
    throw new ApiError({ message: 'Mock API mode is disabled', status: 500, code: 'mock_disabled' });
  }

  await sleep(150);

  const method = (options.method || 'GET').toUpperCase();
  const url = new URL(path, 'http://localhost');
  const { pathname, searchParams } = url;

  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = parseJsonBody(options.body);
    const user = users.find((item) => item.email === body.email);

    if (!user) {
      throw new ApiError({ message: 'Invalid credentials', status: 401, code: 'invalid_credentials' });
    }

    profile = { ...user, fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') };
    savedRouteIds = [...(DEFAULT_SAVED_ROUTE_IDS_BY_USER_ID[user.id] ?? [])];
    return { token: `mock-token-${user.id}`, user: toAuthUser(user) };
  }

  if (pathname === '/api/auth/register' && method === 'POST') {
    const body = parseJsonBody(options.body);

    if (users.some((item) => item.email === body.email)) {
      throw new ApiError({ message: 'User already exists', status: 409, code: 'user_exists' });
    }

    const nextId = Math.max(...users.map((item) => item.id), 0) + 1;
    const firstName = (body.firstName || '').trim();
    const lastName = (body.lastName || '').trim();
    const user = {
      id: nextId,
      username: body.email.split('@')[0],
      email: body.email,
      firstName,
      lastName,
      role: 'user',
      createdAt: new Date().toISOString(),
      isActive: true,
      fullName: [firstName, lastName].filter(Boolean).join(' '),
      bio: null,
      location: null,
      avatarUrl: null,
      privacy: mockDefaultPrivacy(),
    };

    users.push(user);
    profile = { ...user };
    savedRouteIds = [...(DEFAULT_SAVED_ROUTE_IDS_BY_USER_ID[user.id] ?? [])];
    return { token: `mock-token-${user.id}`, user: toAuthUser(user) };
  }

  if (pathname === '/api/dashboard/summary' && method === 'GET') {
    const uid = profile.id;
    const completedRides = historyEntries.filter((h) => h.userId === uid).length;
    const savedRoutes = savedRouteIds.filter((id) => routes.some((r) => r.id === id)).length;
    const groupRidesJoined = rides.filter((r) => Array.isArray(r.participants) && r.participants.includes(uid)).length;
    return {
      completedRides,
      savedRoutes,
      groupRidesJoined,
    };
  }

  if (pathname === '/api/leaderboards' && method === 'GET') {
    return buildMockLeaderboardsResponse();
  }

  if (pathname === '/api/routes' && method === 'GET') {
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const terrain = (searchParams.get('terrain') || '').toLowerCase();
    const difficulty = (searchParams.get('difficulty') || '').toLowerCase();
    const distance = (searchParams.get('distance') || '').toLowerCase();
    const nearLatRaw = searchParams.get('nearLat');
    const nearLngRaw = searchParams.get('nearLng');
    const maxKmRaw = searchParams.get('maxKm');
    const createdByRaw = searchParams.get('createdByUserId');
    const createdByUserId =
      createdByRaw != null && createdByRaw !== '' ? Number(createdByRaw) : NaN;

    let list = [...routes];
    if (!Number.isNaN(createdByUserId) && createdByUserId > 0) {
      list = list.filter((r) => Number(r.createdBy?.id) === createdByUserId);
    }
    if (q) {
      list = list.filter((r) => {
        const title = (r.title || '').toLowerCase();
        const by = r.createdBy;
        const uploader =
          by && typeof by === 'object'
            ? `${by.fullName || ''} ${by.firstName || ''} ${by.lastName || ''} ${by.userName || ''}`.toLowerCase()
            : '';
        return title.includes(q) || (uploader && uploader.includes(q));
      });
    }
    if (terrain && terrain !== 'all') list = list.filter((r) => (r.terrain || '') === terrain);
    if (difficulty && difficulty !== 'all') list = list.filter((r) => (r.difficulty || '') === difficulty);
    if (distance && distance !== 'all') {
      list = list.filter((r) => {
        const km = Number(r.distanceKm);
        if (distance === 'short') return km < 20;
        if (distance === 'medium') return km >= 20 && km <= 50;
        if (distance === 'long') return km > 50;
        return true;
      });
    }

    const nearLat = nearLatRaw != null && nearLatRaw !== '' ? Number(nearLatRaw) : NaN;
    const nearLng = nearLngRaw != null && nearLngRaw !== '' ? Number(nearLngRaw) : NaN;
    const useNear =
      !Number.isNaN(nearLat) &&
      !Number.isNaN(nearLng) &&
      nearLat >= -90 &&
      nearLat <= 90 &&
      nearLng >= -180 &&
      nearLng <= 180;

    if (useNear) {
      const maxKm = maxKmRaw != null && maxKmRaw !== '' ? Number(maxKmRaw) : NaN;
      const withCap = !Number.isNaN(maxKm) && maxKm > 0;
      const scored = list
        .map((r) => {
          const start = getRouteStartLatLng(r);
          if (!start) return null;
          const d = haversineKm(nearLat, nearLng, start.lat, start.lng);
          return { r, d };
        })
        .filter(Boolean);
      let nearList = withCap ? scored.filter((x) => x.d <= maxKm) : scored;
      nearList.sort((a, b) => a.d - b.d);
      list = nearList.map(({ r, d }) => ({
        ...r,
        distanceFromUserKm: Math.round(d * 100) / 100,
      }));
    } else {
      const sortParam = (searchParams.get('sort') || '').trim().toLowerCase();
      if (sortParam === 'favorites') {
        list.sort((a, b) => {
          const fav = mockFavoriteCountForRoute(b.id) - mockFavoriteCountForRoute(a.id);
          if (fav !== 0) return fav;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
      } else {
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      }
    }

    const paged = paginate(list, searchParams);
    return {
      items: paged.items.map((r) => enrichListRouteRow(r)),
      total: paged.total,
      skip: paged.skip,
      take: paged.take,
    };
  }

  if (pathname === '/api/routes/upload' && method === 'POST') {
    const formData = options.body;
    const payload = {
      title: formData.get('title'),
      description: formData.get('description'),
      terrain: formData.get('terrain'),
      difficulty: formData.get('difficulty'),
      estimatedDurationMinutes: formData.get('estimatedDurationMinutes'),
      estimatedDurationSource: formData.get('estimatedDurationSource'),
      region: formData.get('region'),
      warnings: JSON.parse(formData.get('warnings') || '[]'),
    };
    const route = createRouteFromUpload(payload);
    routes.unshift(route);
    return route;
  }

  if (pathname === '/api/routes/saved' && method === 'GET') {
    const savedRoutes = routes.filter((route) => savedRouteIds.includes(route.id));
    const pagedSaved = paginate(savedRoutes, searchParams);
    return {
      ...pagedSaved,
      items: pagedSaved.items.map((r) => enrichListRouteRow(r)),
    };
  }

  if (pathname === '/api/routes/my' && method === 'GET') {
    const myRoutes = routes.filter(
      (route) =>
        route.createdBy?.id === profile.id ||
        route.createdBy === profile.fullName ||
        route.createdBy?.fullName === profile.fullName,
    );
    const pagedMine = paginate(myRoutes, searchParams);
    return {
      ...pagedMine,
      items: pagedMine.items.map((r) => enrichListRouteRow(r)),
    };
  }

  if (/^\/api\/routes\/\d+\/save$/.test(pathname) && method === 'POST') {
    const routeId = Number(pathname.split('/')[3]);
    if (!savedRouteIds.includes(routeId)) savedRouteIds.push(routeId);
    return { routeId, saved: true };
  }

  if (/^\/api\/routes\/\d+\/save$/.test(pathname) && method === 'DELETE') {
    const routeId = Number(pathname.split('/')[3]);
    savedRouteIds = savedRouteIds.filter((id) => id !== routeId);
    return null;
  }

  if (/^\/api\/routes\/\d+\/rider-roster$/.test(pathname) && method === 'GET') {
    const routeId = Number(pathname.split('/')[3]);
    const rr = buildMockRouteRiders(routeId);
    return { totalCount: rr.totalCount, visibleRiders: rr.visibleRiders };
  }

  if (/^\/api\/routes\/\d+$/.test(pathname) && method === 'GET') {
    return findRoute(pathname.split('/')[3]);
  }

  if (pathname === '/api/admin/summary' && method === 'GET') {
    return {
      totalUsers: users.length,
      totalRoutes: routes.length,
      liveHazards: hazards.filter((h) => h.status === 'active').length,
    };
  }

  if (pathname === '/api/admin/users' && method === 'GET') {
    return paginate(users.map(toAuthUser), searchParams);
  }

  if (/^\/api\/admin\/users\/\d+$/.test(pathname) && method === 'DELETE') {
    const userId = Number(pathname.split('/')[4]);
    users = users.filter((user) => user.id !== userId);
    return null;
  }

  if (pathname === '/api/admin/routes' && method === 'GET') {
    return paginate(routes, searchParams);
  }

  if (/^\/api\/admin\/routes\/\d+$/.test(pathname) && method === 'DELETE') {
    const routeId = Number(pathname.split('/')[4]);
    routes = routes.filter((route) => route.id !== routeId);
    savedRouteIds = savedRouteIds.filter((id) => id !== routeId);
    return null;
  }

  if (/^\/api\/admin\/routes\/\d+\/moderation$/.test(pathname) && method === 'PATCH') {
    const routeId = Number(pathname.split('/')[4]);
    const updates = parseJsonBody(options.body);
    const route = findRoute(routeId);
    Object.assign(route, { status: updates.status || route.status || 'published' });
    return route;
  }

  if (pathname === '/api/admin/hazards' && method === 'GET') {
    return paginate(hazards, searchParams);
  }

  if (/^\/api\/admin\/hazards\/\d+\/status$/.test(pathname) && method === 'PATCH') {
    const hazardId = Number(pathname.split('/')[4]);
    const updates = parseJsonBody(options.body);
    const hazard = hazards.find((item) => item.id === hazardId);

    if (!hazard) {
      throw new ApiError({ message: 'Hazard not found', status: 404, code: 'hazard_not_found' });
    }

    Object.assign(hazard, { status: updates.status || hazard.status });
    return hazard;
  }

  if (pathname === '/api/users/search' && method === 'GET') {
    const rawQ = (searchParams.get('q') || '').trim();
    const take = Math.min(50, Math.max(1, Number(searchParams.get('take') || 15)));
    if (rawQ.length < 2) {
      return { items: [] };
    }
    const tokens = rawQ.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = users
      .filter((u) => {
        if (u.id === profile.id) return false;
        const fn = (u.firstName || '').toLowerCase();
        const ln = (u.lastName || '').toLowerCase();
        const em = (u.email || '').toLowerCase();
        return tokens.every((tok) => fn.includes(tok) || ln.includes(tok) || em.includes(tok));
      })
      .sort((a, b) => {
        const c = (a.lastName || '').localeCompare(b.lastName || '');
        if (c !== 0) return c;
        const c2 = (a.firstName || '').localeCompare(b.firstName || '');
        if (c2 !== 0) return c2;
        return a.id - b.id;
      })
      .slice(0, take);
    return {
      items: matches.map((u) => ({
        id: u.id,
        fullName: [u.firstName, u.lastName].filter(Boolean).join(' ').trim(),
        avatarUrl: mockRosterAvatarUrl(u) ?? null,
      })),
    };
  }

  const userRoutesMatch = pathname.match(/^\/api\/users\/(\d+)\/routes$/);
  if (userRoutesMatch && method === 'GET') {
    const uid = Number(userRoutesMatch[1]);
    if (!users.find((u) => u.id === uid)) {
      throw new ApiError({ message: 'User not found', status: 404, code: 'user_not_found' });
    }
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    let list = routes.filter((r) => Number(r.createdBy?.id) === uid);
    if (q) {
      list = list.filter((r) => {
        const title = (r.title || '').toLowerCase();
        const by = r.createdBy;
        const uploader =
          by && typeof by === 'object'
            ? `${by.fullName || ''} ${by.firstName || ''} ${by.lastName || ''}`.toLowerCase()
            : '';
        return title.includes(q) || (uploader && uploader.includes(q));
      });
    }
    list = [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const pagedUserRoutes = paginate(list, searchParams);
    return {
      items: pagedUserRoutes.items.map((r) => enrichListRouteRow(r)),
      total: pagedUserRoutes.total,
      skip: pagedUserRoutes.skip,
      take: pagedUserRoutes.take,
    };
  }

  const userRidesMatch = pathname.match(/^\/api\/users\/(\d+)\/rides$/);
  if (userRidesMatch && method === 'GET') {
    const subjectUid = Number(userRidesMatch[1]);
    if (!users.find((u) => u.id === subjectUid)) {
      throw new ApiError({ message: 'User not found', status: 404, code: 'user_not_found' });
    }
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const now = Date.now();
    let list = rides.filter((r) => Array.isArray(r.participants) && r.participants.includes(subjectUid));
    if (q) {
      list = list.filter((r) => {
        const name = (r.name || '').toLowerCase();
        const rt = (r.routeTitle || '').toLowerCase();
        const cn = (r.clubName || '').toLowerCase();
        return name.includes(q) || rt.includes(q) || cn.includes(q);
      });
    }
    list.sort((a, b) => {
      const ta = new Date(a.scheduledDate).getTime();
      const tb = new Date(b.scheduledDate).getTime();
      const aUp = ta >= now;
      const bUp = tb >= now;
      if (aUp !== bUp) return aUp ? -1 : 1;
      if (aUp) return ta - tb;
      return tb - ta;
    });
    const paged = paginate(list, searchParams);
    const items = paged.items.map((r) => ({
      ...findRide(String(r.id)),
      rideKind: 'scheduled',
    }));
    return { items, total: paged.total, skip: paged.skip, take: paged.take };
  }

  const userProfileMatch = pathname.match(/^\/api\/users\/(\d+)\/profile$/);
  if (userProfileMatch && method === 'GET') {
    const uid = Number(userProfileMatch[1]);
    if (uid === profile.id) {
      return toFullProfile(profile);
    }
    const other = users.find((u) => u.id === uid);
    if (!other) {
      throw new ApiError({ message: 'User not found', status: 404, code: 'user_not_found' });
    }
    return toPublicProfileView(other);
  }

  if (pathname === '/api/account/profile' && method === 'GET') {
    return toFullProfile(profile);
  }

  if (pathname === '/api/account/profile' && method === 'PUT') {
    const body = parseJsonBody(options.body);
    const privKeys = [
      'publicFirstName',
      'publicLastName',
      'publicEmail',
      'publicCreatedAt',
      'publicBio',
      'publicLocation',
      'publicAvatarUrl',
      'publicDefaultBikeType',
    ];
    const nextPrivacy = mergeMockPrivacy(profile.privacy);
    for (const k of privKeys) {
      if (body[k] !== undefined) nextPrivacy[k] = Boolean(body[k]);
    }
    profile = {
      ...profile,
      firstName: body.firstName ?? profile.firstName,
      lastName: body.lastName ?? profile.lastName,
      email: body.email ?? profile.email,
      bio: 'bio' in body ? body.bio : profile.bio,
      location: 'location' in body ? body.location : profile.location,
      avatarUrl: 'avatarUrl' in body ? body.avatarUrl : profile.avatarUrl,
      privacy: nextPrivacy,
    };
    profile.fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
    const idx = users.findIndex((u) => u.id === profile.id);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...profile };
    }
    return toFullProfile(profile);
  }

  if (pathname === '/api/account/preferences' && method === 'GET') {
    return preferences;
  }

  if (pathname === '/api/account/preferences' && method === 'PUT') {
    preferences = {
      ...preferences,
      ...parseJsonBody(options.body),
    };
    return preferences;
  }

  if (pathname === '/api/account/password' && method === 'PUT') {
    return null;
  }

  if (pathname === '/api/hazards' && method === 'GET') {
    return hazards;
  }

  if (pathname === '/api/hazards' && method === 'POST') {
    const payload = parseJsonBody(options.body);
    const hazard = {
      id: Math.max(...hazards.map((item) => item.id), 0) + 1,
      type: payload.type || 'other',
      severity: payload.severity || 'medium',
      description: payload.description || '',
      latitude: Number(payload.latitude || payload.location?.lat || 0),
      longitude: Number(payload.longitude || payload.location?.lng || 0),
      reportedBy: profile.id,
      reportedAt: new Date().toISOString(),
      status: 'active',
    };
    hazards.unshift(hazard);
    return hazard;
  }

  if (pathname === '/api/challenges' && method === 'GET') {
    return challenges;
  }

  if (pathname === '/api/history' && method === 'GET') {
    const uid = profile.id;
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    let list = historyEntries.filter((h) => h.userId === uid);
    if (q) {
      list = list.filter((h) => {
        const title = (h.routeTitle || '').toLowerCase();
        const diff = (h.routeDifficulty || '').toLowerCase();
        const club = (h.clubName || '').toLowerCase();
        return title.includes(q) || diff.includes(q) || club.includes(q);
      });
    }
    list = [...list].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    const mapped = list.map((h) => {
      const copy = { ...h };
      delete copy.userId;
      return copy;
    });
    return paginate(mapped, searchParams);
  }

  if (pathname === '/api/users/me/rides' && method === 'GET') {
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const when = (searchParams.get('when') || 'all').toLowerCase();
    const now = Date.now();
    let list = rides.filter((r) => Array.isArray(r.participants) && r.participants.includes(profile.id));
    if (when === 'upcoming') {
      list = list.filter((r) => new Date(r.scheduledDate).getTime() >= now);
    } else if (when === 'past') {
      list = list.filter((r) => new Date(r.scheduledDate).getTime() < now);
      const linkedGroupIds = new Set(
        historyEntries
          .filter((h) => h.userId === profile.id && h.rideId != null)
          .map((h) => h.rideId),
      );
      list = list.filter((r) => !linkedGroupIds.has(r.id));
    }
    if (q) {
      list = list.filter((r) => {
        const name = (r.name || '').toLowerCase();
        const rt = (r.routeTitle || '').toLowerCase();
        const cn = (r.clubName || '').toLowerCase();
        return name.includes(q) || rt.includes(q) || cn.includes(q);
      });
    }
    const sortDesc = (a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate);
    const sortAsc = (a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate);
    if (when === 'past') {
      list = [...list].sort(sortDesc);
      const paged = paginate(list, searchParams);
      const items = paged.items.map((r) => findRide(String(r.id)));
      return { items, total: paged.total, skip: paged.skip, take: paged.take };
    }
    if (when === 'upcoming') list = [...list].sort(sortAsc).slice(0, 4);
    else list = [...list].sort(sortDesc);
    return list.map((r) => findRide(String(r.id)));
  }

  if (pathname === '/api/users/me/rides' && method === 'POST') {
    const payload = parseJsonBody(options.body);
    const routeId =
      payload.routeId != null && payload.routeId !== '' ? Number(payload.routeId) : null;
    if (routeId != null && Number.isNaN(routeId)) {
      throw new ApiError({ message: 'Invalid route', status: 400, code: 'bad_request' });
    }
    const route = routeId != null ? routes.find((r) => r.id === routeId) : null;
    if (routeId != null && !route) throw new ApiError({ message: 'Route not found', status: 404, code: 'route_not_found' });
    const nextId = Math.max(...rides.map((item) => item.id), 0) + 1;
    const parts = [profile.id];
    const ride = {
      id: nextId,
      name: payload.name || 'Personal ride',
      description: payload.description || '',
      scheduledDate: payload.scheduledDate,
      routeId,
      routeTitle: route?.title || '',
      participants: parts,
      participantDetails: participantDetailsFromIds(parts),
      maxParticipants: Number(payload.maxParticipants || 20),
      clubId: null,
      clubName: null,
      createdBy: { id: profile.id, fullName: profile.fullName },
    };
    rides.unshift(ride);
    return findRide(String(ride.id));
  }

  if (/^\/api\/clubs\/\d+\/rides$/.test(pathname) && method === 'POST') {
    const payload = parseJsonBody(options.body);
    const clubId = Number(pathname.split('/')[3]);
    const routeId =
      payload.routeId != null && payload.routeId !== '' ? Number(payload.routeId) : null;
    if (routeId != null && Number.isNaN(routeId)) {
      throw new ApiError({ message: 'Invalid route', status: 400, code: 'bad_request' });
    }
    const route = routeId != null ? routes.find((r) => r.id === routeId) : null;
    const nextId = Math.max(...rides.map((item) => item.id), 0) + 1;
    const parts = [profile.id];
    const ride = {
      id: nextId,
      name: payload.name,
      description: payload.description || '',
      scheduledDate: payload.scheduledDate,
      routeId,
      routeTitle: route?.title || '',
      participants: parts,
      participantDetails: participantDetailsFromIds(parts),
      maxParticipants: Number(payload.maxParticipants || 10),
      clubId,
      clubName: clubs.find((c) => c.id === clubId)?.name ?? null,
      createdBy: { id: profile.id, fullName: profile.fullName },
    };
    rides.unshift(ride);
    return {
      id: ride.id,
      name: ride.name,
      description: ride.description,
      scheduledDate: ride.scheduledDate,
      routeId: ride.routeId,
      routeTitle: ride.routeTitle,
      participants: ride.participants,
      maxParticipants: ride.maxParticipants,
      clubId: ride.clubId,
    };
  }

  if (/^\/api\/rides\/\d+\/join$/.test(pathname) && method === 'POST') {
    const rideId = Number(pathname.split('/')[3]);
    const ride = rides.find((r) => r.id === rideId);
    if (!ride) throw new ApiError({ message: 'Ride not found', status: 404, code: 'ride_not_found' });
    if (!ride.participants.includes(profile.id)) ride.participants.push(profile.id);
    ride.participantDetails = participantDetailsFromIds(ride.participants);
    return { status: 'joined' };
  }

  if (/^\/api\/rides\/\d+\/leave$/.test(pathname) && method === 'POST') {
    const rideId = Number(pathname.split('/')[3]);
    const ride = rides.find((r) => r.id === rideId);
    if (!ride) throw new ApiError({ message: 'Ride not found', status: 404, code: 'ride_not_found' });
    ride.participants = ride.participants.filter((id) => id !== profile.id);
    ride.participantDetails = participantDetailsFromIds(ride.participants);
    return null;
  }

  if (pathname === '/api/clubs' && method === 'GET') {
    return clubs.map((c) => ({ ...c }));
  }

  if (pathname === '/api/clubs' && method === 'POST') {
    const body = parseJsonBody(options.body);
    const nextId = Math.max(...clubs.map((c) => c.id), 0) + 1;
    const row = {
      id: nextId,
      name: body.name,
      description: body.description || '',
      region: body.region || null,
      visibility: body.visibility === 1 ? 'private' : 'public',
      avatarUrl: null,
      membershipPending: false,
      myRole: 'admin',
      createdAt: new Date().toISOString(),
    };
    clubs.push(row);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      region: row.region,
      avatarUrl: row.avatarUrl,
      visibility: row.visibility,
      createdAt: row.createdAt,
    };
  }

  if (/^\/api\/clubs\/\d+$/.test(pathname) && method === 'GET') {
    const cid = Number(pathname.split('/')[3]);
    const c = clubs.find((x) => x.id === cid);
    if (!c) throw new ApiError({ message: 'Club not found', status: 404, code: 'club_not_found' });
    const currentUserMembership = mockClubCurrentMembership(c);
    const isActive = mockIsActiveClubMember(c);
    let description = c.description;
    let region = c.region;
    let avatarUrl = c.avatarUrl ?? null;
    let memberCount = 4;
    if (c.visibility === 'private' && !isActive) {
      description = null;
      region = null;
      memberCount = null;
      avatarUrl = null;
    }
    return {
      id: c.id,
      name: c.name,
      description,
      region,
      avatarUrl,
      visibility: c.visibility,
      createdAt: c.createdAt,
      memberCount,
      currentUserMembership,
    };
  }

  if (/^\/api\/clubs\/\d+\/members$/.test(pathname) && method === 'GET') {
    const cid = Number(pathname.split('/')[3]);
    const c = clubs.find((x) => x.id === cid);
    if (!c) throw new ApiError({ message: 'Club not found', status: 404, code: 'club_not_found' });
    const uOther = users.find((x) => x.id === 3);
    const name3 = uOther ? [uOther.firstName, uOther.lastName].filter(Boolean).join(' ') : 'Alex Cohen';
    const active = [
      {
        userId: profile.id,
        displayName: profile.fullName,
        avatarUrl: mockRosterAvatarUrl(profile),
        role: 'admin',
        membershipStatus: 'active',
      },
      {
        userId: 3,
        displayName: name3,
        avatarUrl: uOther ? mockRosterAvatarUrl(uOther) : undefined,
        role: 'member',
        membershipStatus: 'active',
      },
    ];
    const isAdminViewer = c.myRole === 'admin' && !c.membershipPending;
    if (isAdminViewer) {
      active.push({
        userId: 99,
        displayName: 'Awaiting Approval',
        avatarUrl: undefined,
        role: 'member',
        membershipStatus: 'pending',
      });
    }
    if (!isAdminViewer) {
      return active.filter((m) => m.membershipStatus === 'active');
    }
    return active;
  }

  if (/^\/api\/clubs\/\d+\/join-requests$/.test(pathname) && method === 'GET') {
    return [];
  }

  if (/^\/api\/clubs\/\d+\/rides$/.test(pathname) && method === 'GET') {
    const cid = Number(pathname.split('/')[3]);
    const c = clubs.find((x) => x.id === cid);
    if (!c) throw new ApiError({ message: 'Club not found', status: 404, code: 'club_not_found' });
    if (c.visibility === 'private' && !mockIsActiveClubMember(c)) {
      const now = Date.now();
      const clubRides = rides.filter((r) => r.clubId === cid);
      const upcomingCount = clubRides.filter((r) => new Date(r.scheduledDate).getTime() >= now).length;
      const pastCount = clubRides.filter((r) => new Date(r.scheduledDate).getTime() < now).length;
      return { summaryOnly: true, upcomingCount, pastCount };
    }
    return rides.filter((r) => r.clubId === cid).map((r) => findRide(String(r.id)));
  }

  if (/^\/api\/clubs\/\d+\/join$/.test(pathname) && method === 'POST') {
    return { status: 'active' };
  }

  if (/^\/api\/clubs\/\d+\/leave$/.test(pathname) && method === 'POST') {
    return null;
  }

  if (/^\/api\/clubs\/\d+\/invites$/.test(pathname) && method === 'POST') {
    return { inviteCode: `mock-invite-${Date.now()}`, clubId: Number(pathname.split('/')[3]) };
  }

  if (pathname === '/api/clubs/invites/redeem' && method === 'POST') {
    return { clubId: 1, status: 'active' };
  }

  if (/^\/api\/clubs\/\d+\/join-requests\/\d+\/approve$/.test(pathname) && method === 'POST') {
    return null;
  }

  if (/^\/api\/clubs\/\d+\/join-requests\/\d+\/reject$/.test(pathname) && method === 'POST') {
    return null;
  }

  if (/^\/api\/clubs\/\d+\/members\/\d+\/promote$/.test(pathname) && method === 'POST') {
    return null;
  }

  if (/^\/api\/clubs\/\d+\/members\/\d+\/demote$/.test(pathname) && method === 'POST') {
    return null;
  }

  if (/^\/api\/clubs\/\d+\/members\/\d+$/.test(pathname) && method === 'DELETE') {
    return null;
  }

  if (/^\/api\/rides\/\d+$/.test(pathname) && method === 'PATCH') {
    const rideId = Number(pathname.split('/')[3]);
    const ride = rides.find((r) => r.id === rideId);
    if (!ride) throw new ApiError({ message: 'Ride not found', status: 404, code: 'ride_not_found' });
    if (!mockViewerCanEditRide(ride)) {
      throw new ApiError({ message: 'Forbidden', status: 403, code: 'forbidden' });
    }
    const payload = parseJsonBody(options.body);
    const routeId =
      payload.routeId != null && payload.routeId !== '' ? Number(payload.routeId) : null;
    if (routeId != null && Number.isNaN(routeId)) {
      throw new ApiError({ message: 'Invalid route', status: 400, code: 'bad_request' });
    }
    const route = routeId != null ? routes.find((r) => r.id === routeId) : null;
    if (routeId != null && !route) throw new ApiError({ message: 'Route not found', status: 404, code: 'route_not_found' });
    const max = Number(payload.maxParticipants || 20);
    const roster = Array.isArray(ride.participants) ? ride.participants.length : 0;
    if (max < roster) {
      throw new ApiError({
        message: 'Cannot set max below current roster size.',
        status: 400,
        code: 'bad_request',
      });
    }
    ride.name = (payload.name || ride.name || '').trim();
    ride.description = (payload.description ?? ride.description ?? '').trim();
    ride.scheduledDate = payload.scheduledDate || ride.scheduledDate;
    ride.routeId = routeId;
    ride.routeTitle = route?.title || '';
    ride.maxParticipants = max > 0 ? max : 20;
    return findRide(String(rideId));
  }

  if (/^\/api\/rides\/\d+$/.test(pathname) && method === 'GET') {
    const rideId = Number(pathname.split('/')[3]);
    const ride = rides.find((r) => r.id === rideId);
    if (!ride) throw new ApiError({ message: 'Ride not found', status: 404, code: 'ride_not_found' });
    if (ride.clubId != null) {
      const c = clubs.find((x) => x.id === ride.clubId);
      if (c?.visibility === 'private' && !mockIsActiveClubMember(c)) {
        throw new ApiError({ message: 'Ride not found', status: 404, code: 'ride_not_found' });
      }
    }
    return findRide(String(rideId));
  }

  if (pathname === '/api/users/me/club-chat/summary' && method === 'GET') {
    return [];
  }

  {
    const m = pathname.match(/^\/api\/clubs\/(\d+)\/chat\/(messages|read|mentionables)$/);
    if (m) {
      const sub = m[2];
      if (sub === 'messages' && method === 'GET') return [];
      if (sub === 'messages' && method === 'POST') {
        const payload = parseJsonBody(options.body);
        return {
          id: Date.now(),
          clubId: Number(m[1]),
          clubNameHint: 'Club',
          authorUserId: profile.id,
          authorDisplayName: profile.fullName,
          authorAvatarUrl: profile.avatarUrl ?? null,
          body: payload.body ?? '',
          mentions: (payload.mentions || []).map((x) => ({
            kind: x.kind,
            id: x.id,
            label: String(x.id),
          })),
          sentAt: new Date().toISOString(),
        };
      }
      if (sub === 'read' && method === 'POST') return null;
      if (sub === 'mentionables' && method === 'GET') {
        return { users: [], routes: [], rides: [] };
      }
    }
  }

  throw new ApiError({
    message: `Mock route not implemented: ${method} ${pathname}`,
    status: 501,
    code: 'mock_not_implemented',
  });
}
