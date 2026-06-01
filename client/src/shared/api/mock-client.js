import { ApiError } from '@/shared/api/api-errors';
import { env } from '@/shared/config/env';
import {
  clubAvatarDefaultUrl,
  clubDefaultSeedFromName,
  isClubUploadedAvatarUrl,
  isUserUploadedAvatarUrl,
  resolveClubAvatarSeed,
  userAvatarDefaultUrl,
} from '@/shared/lib/avatar-url';
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
  if (c.myRole === 'organizer') return 'organizer';
  if (c.myRole === 'member') return 'member';
  return 'none';
}

function mockIsActiveClubMember(c) {
  const m = mockClubCurrentMembership(c);
  return m === 'admin' || m === 'organizer' || m === 'member';
}

function mockRideCreationPolicyApi(c) {
  const p = c?.rideCreationPolicy;
  if (p === 'organizersAndAdmins' || p === 'adminsOnly') return p;
  return 'everyone';
}

function mockViewerCanCreateRide(c) {
  const membership = mockClubCurrentMembership(c);
  if (membership === 'pending' || membership === 'none') return false;
  const policy = mockRideCreationPolicyApi(c);
  if (policy === 'everyone') return true;
  if (policy === 'organizersAndAdmins') return membership === 'admin' || membership === 'organizer';
  if (policy === 'adminsOnly') return membership === 'admin';
  return false;
}

function mockRideCreationPolicyFromPatchValue(value) {
  if (value === 1) return 'organizersAndAdmins';
  if (value === 2) return 'adminsOnly';
  return 'everyone';
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
  const top10 = (map, unit) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, 10)
      .map(([userId, value], i) => {
        const u = userById.get(userId);
        const displayName = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : `User #${userId}`;
        return {
          rank: i + 1,
          userId,
          handle: mockHandle(u),
          displayName: displayName || `User #${userId}`,
          avatarUrl: u?.avatarUrl ?? null,
          value,
          unit,
        };
      });
  return {
    horizonChasers: top10(dist, 'km'),
    saddleJunkies: top10(rideCount, 'rides'),
    summitSeekers: top10(elev, 'm'),
    trailblazers: top10(pubRoutes, 'routes'),
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
    publicLifetimeStatsOnProfile: true,
    publicFriendsListOnProfile: true,
    publicInOthersFriendsLists: true,
  };
}

function mergeMockPrivacy(p) {
  return { ...mockDefaultPrivacy(), ...p };
}

function mockLifetimeStatsForUser(userId) {
  const entries = historyEntries.filter((h) => Number(h.userId) === Number(userId));
  return {
    totalKm: entries.reduce((sum, h) => sum + (Number(h.distanceKm) || 0), 0),
    totalElevationGainM: entries.reduce((sum, h) => sum + (Number(h.elevationGainM) || 0), 0),
    completedRides: entries.length,
  };
}

function mockResolveUserDisplay(u) {
  if (!u) return null;
  if (isUserUploadedAvatarUrl(u.avatarUrl)) return String(u.avatarUrl).trim();
  return userAvatarDefaultUrl(mockHandle(u));
}

function mockResolveClubDisplay(c) {
  if (!c) return null;
  if (isClubUploadedAvatarUrl(c.avatarUploadPath)) return String(c.avatarUploadPath).trim();
  const seed = resolveClubAvatarSeed(c.avatarSeed, c.name, c.id);
  return clubAvatarDefaultUrl(seed);
}

function mockClubToApiRow(c, overrides = {}) {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    region: c.region,
    visibility: c.visibility,
    membershipPending: c.membershipPending ?? false,
    myRole: c.myRole ?? null,
    rideCreationPolicy: c.rideCreationPolicy ?? 'everyone',
    createdAt: c.createdAt,
    avatarUrl: mockResolveClubDisplay(c),
    avatarSeed: resolveClubAvatarSeed(c.avatarSeed, c.name, c.id),
    ...overrides,
  };
}

function toFullProfile(p) {
  const privacy = {
    ...mergeMockPrivacy(p.privacy),
    publicUploadedRoutesOnProfile: preferences.publicUploadedRoutesOnProfile !== false,
    publicParticipatedRidesOnProfile: preferences.publicParticipatedRidesOnProfile !== false,
    publicLifetimeStatsOnProfile: preferences.publicLifetimeStatsOnProfile !== false,
    publicFriendsListOnProfile: preferences.publicFriendsListOnProfile !== false,
    publicInOthersFriendsLists: preferences.publicInOthersFriendsLists !== false,
  };
  return {
    id: p.id,
    handle: mockHandle(p),
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    bio: p.bio ?? null,
    location: p.location ?? null,
    avatarUrl: mockResolveUserDisplay(p),
    defaultBikeType: preferences.defaultBikeType ?? 'road',
    role: (p.role || 'user').toLowerCase(),
    isActive: p.isActive ?? true,
    createdAt: p.createdAt,
    privacy,
    leaderboardBadges: mockLeaderboardBadgesForUser(p.id),
    lifetimeStats: mockLifetimeStatsForUser(p.id),
  };
}

function toPublicProfileView(u) {
  const privacy = mergeMockPrivacy(u.privacy);
  const showLifetimeStats = privacy.publicLifetimeStatsOnProfile !== false;
  return {
    id: u.id,
    handle: mockHandle(u),
    isSelf: false,
    firstName: privacy.publicFirstName ? u.firstName : null,
    lastName: privacy.publicLastName ? u.lastName : null,
    email: privacy.publicEmail ? u.email : null,
    createdAt: privacy.publicCreatedAt ? u.createdAt : null,
    bio: privacy.publicBio ? u.bio : null,
    location: privacy.publicLocation ? u.location : null,
    avatarUrl: privacy.publicAvatarUrl ? mockResolveUserDisplay(u) : null,
    defaultBikeType: privacy.publicDefaultBikeType ? (u.defaultBikeType ?? 'road') : null,
    publicUploadedRoutesOnProfile: privacy.publicUploadedRoutesOnProfile !== false,
    publicParticipatedRidesOnProfile: privacy.publicParticipatedRidesOnProfile !== false,
    publicLifetimeStatsOnProfile: privacy.publicLifetimeStatsOnProfile !== false,
    publicFriendsListOnProfile: privacy.publicFriendsListOnProfile !== false,
    leaderboardBadges: mockLeaderboardBadgesForUser(u.id),
    lifetimeStats: showLifetimeStats ? mockLifetimeStatsForUser(u.id) : null,
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
  publicLifetimeStatsOnProfile: true,
  publicFriendsListOnProfile: true,
  publicInOthersFriendsLists: true,
  colorScheme: 'midnight',
};

/** Inbox rows for mock API (e.g. club join request to private club 2 admin). */
let mockInboxSeq = 1;
const mockInboxStore = [];
let mockRideInviteSeq = 1;
const mockRideInviteStore = [];
let mockRideChatSeq = 1;
const mockRideChatStore = [];

const INBOX_TAB_KINDS = {
  friends: ['friend_request'],
  rides: ['ride_invite', 'club_ride_announced'],
  club: ['club_join_request'],
  activity: ['quest_complete', 'level_up'],
};

function mockPushClubRideAnnounced(ride, creatorId) {
  const club = clubs.find((c) => c.id === ride.clubId);
  if (!club) return;
  const now = new Date().toISOString();
  const recipients = users
    .map((u) => u.id)
    .filter((id) => id !== creatorId);
  for (const recipientUserId of recipients) {
    mockInboxStore.push({
      id: mockInboxSeq++,
      recipientUserId,
      kind: 'club_ride_announced',
      createdAt: now,
      readAt: null,
      resolvedAt: null,
      clubRideAnnounced: {
        ride: {
          id: ride.id,
          name: ride.name,
          scheduledDate: ride.scheduledDate,
          routeTitle: ride.routeTitle || '',
          clubId: ride.clubId,
        },
        club: { id: club.id, name: club.name },
        createdBy: {
          id: creatorId,
          handle: mockHandle(users.find((u) => u.id === creatorId)),
          fullName: users.find((u) => u.id === creatorId)?.firstName
            ? `${users.find((u) => u.id === creatorId).firstName} ${users.find((u) => u.id === creatorId).lastName || ''}`.trim()
            : 'Organizer',
          avatarUrl: users.find((u) => u.id === creatorId)?.avatarUrl ?? null,
        },
      },
    });
  }
}

function mockMapInboxRow(r) {
  return {
    id: r.id,
    kind: r.kind,
    createdAt: r.createdAt,
    readAt: r.readAt,
    resolvedAt: r.resolvedAt,
    friendRequest: r.kind === 'friend_request' ? r.friendRequest ?? null : null,
    clubJoinRequest: r.kind === 'club_join_request' ? r.clubJoinRequest ?? null : null,
    rideInvite: r.kind === 'ride_invite' ? r.rideInvite ?? null : null,
    clubRideAnnounced: r.kind === 'club_ride_announced' ? r.clubRideAnnounced ?? null : null,
    gamification:
      r.kind === 'quest_complete' || r.kind === 'level_up' ? r.gamification ?? null : null,
  };
}

function mockHandle(u) {
  return String(u?.handle || u?.username || '')
    .replace(/^@/, '')
    .trim()
    .toLowerCase();
}

function findUserByHandle(handle) {
  const h = String(handle || '')
    .replace(/^@/, '')
    .trim()
    .toLowerCase();
  if (!h) return undefined;
  return users.find((u) => mockHandle(u) === h);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toAuthUser(user) {
  return {
    id: user.id,
    handle: mockHandle(user),
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
      handle: mockHandle(profile),
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
    physicsDifficultyScore: 6.3,
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
      handle: mockHandle(u),
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
          handle: mockHandle(match),
          fullName: [match.firstName, match.lastName].filter(Boolean).join(' '),
          avatarUrl: mockRosterAvatarUrl(match),
        }
      : { id: null, fullName: createdBy, avatarUrl: null };
  } else if (createdBy && typeof createdBy === 'object' && createdBy.id != null) {
    const u = users.find((x) => x.id === Number(createdBy.id));
    createdBy = { ...createdBy, handle: mockHandle(u), avatarUrl: mockRosterAvatarUrl(u) };
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

/** Same as API roster rules: uploaded photo or handle-seeded default. */
function mockRosterAvatarUrl(u) {
  return mockResolveUserDisplay(u) ?? undefined;
}

function participantDetailsFromIds(ids) {
  const list = Array.isArray(ids) ? ids : [];
  return list.map((uid) => {
    const u = users.find((x) => x.id === Number(uid));
    const displayName = u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : `User ${uid}`;
    return { userId: Number(uid), handle: mockHandle(u), displayName, avatarUrl: u ? mockRosterAvatarUrl(u) : undefined };
  });
}

function mockRideEventWindow(ride) {
  const start = new Date(ride.scheduledDate).getTime();
  if (Number.isNaN(start)) {
    return {
      closesAt: null,
      hasStarted: false,
      liveAvailable: Boolean(ride.routeId) && ride.rideKind !== 'soloLog',
      chatReadOnly: false,
      canEditScheduledDate: true,
    };
  }
  const closesAt = new Date(start + 48 * 60 * 60 * 1000);
  const now = Date.now();
  const hasStarted = now >= start;
  const isOpen = now < closesAt.getTime();
  const isScheduled = ride.rideKind !== 'soloLog';
  return {
    closesAt: closesAt.toISOString(),
    hasStarted,
    liveAvailable: isOpen && isScheduled && Boolean(ride.routeId),
    chatReadOnly: !isOpen || !isScheduled,
    canEditScheduledDate: !hasStarted,
  };
}

function mockViewerCanEditRide(ride) {
  if (ride.rideKind === 'soloLog') return false;
  const w = mockRideEventWindow(ride);
  if (w.chatReadOnly) return false;
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
    handle: mockHandle(u),
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
  const clubAvatarUrl = club ? mockResolveClubDisplay(club) : null;
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
    rideEventWindow: ride.rideKind === 'soloLog' ? null : mockRideEventWindow(ride),
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

    const handle = String(body.handle || '')
      .replace(/^@/, '')
      .trim()
      .toLowerCase();
    if (users.some((item) => mockHandle(item) === handle)) {
      throw new ApiError({ message: 'That handle is already taken.', status: 409, code: 'handle_taken' });
    }

    const nextId = Math.max(...users.map((item) => item.id), 0) + 1;
    const firstName = (body.firstName || '').trim();
    const lastName = (body.lastName || '').trim();
    const user = {
      id: nextId,
      handle,
      username: handle,
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
    const createdByHandle = (searchParams.get('createdByHandle') || searchParams.get('createdBy') || '')
      .replace(/^@/, '')
      .trim()
      .toLowerCase();

    let list = [...routes];
    if (createdByHandle) {
      const creator = findUserByHandle(createdByHandle);
      list = creator
        ? list.filter((r) => Number(r.createdBy?.id) === creator.id)
        : [];
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

  if (pathname === '/api/routes/gpx-preview' && method === 'POST') {
    return { physicsDifficultyScore: 6.3 };
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
      activeQuests: 0,
      activeModifiers: 0,
      questCompletionsThisWeek: 0,
    };
  }

  if (pathname === '/api/admin/users' && method === 'GET') {
    let items = users.map(toAuthUser);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const role = (searchParams.get('role') || '').trim().toLowerCase();
    if (search) {
      items = items.filter(
        (u) =>
          (u.email || '').toLowerCase().includes(search)
          || (u.handle || '').toLowerCase().includes(search)
          || (u.fullName || '').toLowerCase().includes(search),
      );
    }
    if (role) {
      items = items.filter((u) => (u.role || 'user').toLowerCase() === role);
    }
    return paginate(items, searchParams);
  }

  if (/^\/api\/admin\/users\/\d+\/role$/.test(pathname) && method === 'PATCH') {
    const userId = Number(pathname.split('/')[4]);
    const updates = parseJsonBody(options.body);
    const user = users.find((u) => u.id === userId);
    if (!user) throw new ApiError({ message: 'User not found', status: 404, code: 'user_not_found' });
    user.role = updates.role === 'admin' ? 'admin' : 'user';
    return null;
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
        const h = mockHandle(u);
        return tokens.every(
          (tok) => fn.includes(tok) || ln.includes(tok) || em.includes(tok) || h.includes(tok.replace(/^@/, '')),
        );
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
        handle: mockHandle(u),
        fullName: [u.firstName, u.lastName].filter(Boolean).join(' ').trim(),
        avatarUrl: mockRosterAvatarUrl(u) ?? null,
      })),
    };
  }

  if (pathname === '/api/users/handle-available' && method === 'GET') {
    const handle = (searchParams.get('handle') || '').replace(/^@/, '').trim().toLowerCase();
    if (!handle || handle.length < 3) {
      return { available: false, reason: 'Handle must be at least 3 characters.' };
    }
    const taken = users.some((u) => mockHandle(u) === handle);
    return { available: !taken, reason: taken ? 'That handle is already taken.' : null };
  }

  const userRoutesMatch = pathname.match(/^\/api\/users\/([a-z0-9_]+)\/routes$/);
  if (userRoutesMatch && method === 'GET') {
    const subject = findUserByHandle(userRoutesMatch[1]);
    if (!subject) {
      throw new ApiError({ message: 'User not found', status: 404, code: 'user_not_found' });
    }
    const uid = subject.id;
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

  const userRidesMatch = pathname.match(/^\/api\/users\/([a-z0-9_]+)\/rides$/);
  if (userRidesMatch && method === 'GET') {
    const subject = findUserByHandle(userRidesMatch[1]);
    if (!subject) {
      throw new ApiError({ message: 'User not found', status: 404, code: 'user_not_found' });
    }
    const subjectUid = subject.id;
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

  const userProfileMatch = pathname.match(/^\/api\/users\/([a-z0-9_]+)\/profile$/);
  if (userProfileMatch && method === 'GET') {
    const subject = findUserByHandle(userProfileMatch[1]);
    if (!subject) {
      throw new ApiError({ message: 'User not found', status: 404, code: 'user_not_found' });
    }
    if (subject.id === profile.id) {
      return toFullProfile(profile);
    }
    return toPublicProfileView(subject);
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
    if ('avatarUrl' in body) {
      const t = body.avatarUrl == null ? '' : String(body.avatarUrl).trim();
      if (!t) {
        profile.avatarUrl = null;
      } else if (isUserUploadedAvatarUrl(t)) {
        profile.avatarUrl = t;
      } else {
        throw new ApiError({
          message: 'Avatar can only be cleared or left unchanged. Upload a photo to set your avatar.',
          status: 400,
          code: 'invalid_avatar',
        });
      }
    }
    profile = {
      ...profile,
      handle: body.handle != null ? String(body.handle).replace(/^@/, '').trim().toLowerCase() : mockHandle(profile),
      firstName: body.firstName ?? profile.firstName,
      lastName: body.lastName ?? profile.lastName,
      email: body.email ?? profile.email,
      bio: 'bio' in body ? body.bio : profile.bio,
      location: 'location' in body ? body.location : profile.location,
      privacy: nextPrivacy,
    };
    profile.fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
    const idx = users.findIndex((u) => u.id === profile.id);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...profile };
    }
    return toFullProfile(profile);
  }

  if (pathname === '/api/account/avatar/upload' && method === 'POST') {
    const handle = mockHandle(profile);
    const avatarUrl = `/api/media/users/${handle}/avatar`;
    profile = { ...profile, avatarUrl };
    const uidx = users.findIndex((u) => u.id === profile.id);
    if (uidx >= 0) users[uidx] = { ...users[uidx], avatarUrl };
    return { avatarUrl };
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
    const club = clubs.find((c) => c.id === clubId);
    if (!club) throw new ApiError({ message: 'Club not found', status: 404, code: 'club_not_found' });
    if (!mockViewerCanCreateRide(club)) {
      throw new ApiError({ message: 'Forbidden', status: 403, code: 'forbidden' });
    }
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
    mockPushClubRideAnnounced(ride, profile.id);
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
    const now = Date.now();
    return clubs.map((c) => {
      const isActive = mockIsActiveClubMember(c);
      const hidePrivateFields = c.visibility === 'private' && !isActive;
      const clubRides = rides.filter((r) => r.clubId === c.id);
      const upcomingRideCount = clubRides.filter(
        (r) => new Date(r.scheduledDate).getTime() >= now,
      ).length;
      return {
        ...mockClubToApiRow(c),
        rideCreationPolicy: mockRideCreationPolicyApi(c),
        viewerCanCreateRide: mockViewerCanCreateRide(c),
        memberCount: hidePrivateFields ? null : 4,
        upcomingRideCount,
      };
    });
  }

  if (pathname === '/api/clubs' && method === 'POST') {
    const body = parseJsonBody(options.body);
    const nextId = Math.max(...clubs.map((c) => c.id), 0) + 1;
    const name = String(body.name).trim();
    const row = {
      id: nextId,
      name,
      description: body.description || '',
      region: body.region || null,
      visibility: body.visibility === 1 ? 'private' : 'public',
      avatarSeed: clubDefaultSeedFromName(name),
      avatarUploadPath: null,
      membershipPending: false,
      myRole: 'admin',
      rideCreationPolicy: 'everyone',
      viewerCanCreateRide: true,
      createdAt: new Date().toISOString(),
    };
    clubs.push(row);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      region: row.region,
      avatarUrl: mockResolveClubDisplay(row),
      avatarSeed: row.avatarSeed,
      visibility: row.visibility,
      createdAt: row.createdAt,
    };
  }

  if (/^\/api\/clubs\/\d+\/avatar\/upload$/.test(pathname) && method === 'POST') {
    const cid = Number(pathname.split('/')[3]);
    const c = clubs.find((x) => x.id === cid);
    if (!c) throw new ApiError({ message: 'Club not found', status: 404, code: 'club_not_found' });
    const avatarUrl = `/api/media/clubs/${cid}/avatar`;
    c.avatarUploadPath = avatarUrl;
    return { avatarUrl };
  }

  if (/^\/api\/clubs\/\d+$/.test(pathname) && method === 'PATCH') {
    const cid = Number(pathname.split('/')[3]);
    const c = clubs.find((x) => x.id === cid);
    if (!c) throw new ApiError({ message: 'Club not found', status: 404, code: 'club_not_found' });
    const body = parseJsonBody(options.body);
    if (body.name != null) c.name = String(body.name).trim();
    if (body.description != null) c.description = String(body.description).trim();
    if (body.region !== undefined) c.region = body.region ? String(body.region).trim() : null;
    if (body.visibility != null) c.visibility = body.visibility === 1 ? 'private' : 'public';
    if (body.rideCreationPolicy != null) {
      c.rideCreationPolicy = mockRideCreationPolicyFromPatchValue(body.rideCreationPolicy);
    }
    if ('avatarSeed' in body) {
      const seed = body.avatarSeed == null ? '' : String(body.avatarSeed).trim();
      c.avatarSeed = seed || clubDefaultSeedFromName(c.name);
      c.avatarUploadPath = null;
    }
    return {
      ...mockClubToApiRow(c),
      rideCreationPolicy: mockRideCreationPolicyApi(c),
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
    let avatarUrl = mockResolveClubDisplay(c);
    let avatarSeed = resolveClubAvatarSeed(c.avatarSeed, c.name, c.id);
    let memberCount = 4;
    if (c.visibility === 'private' && !isActive) {
      description = null;
      region = null;
      memberCount = null;
      avatarUrl = null;
      avatarSeed = null;
    }
    return {
      id: c.id,
      name: c.name,
      description,
      region,
      avatarUrl,
      avatarSeed,
      visibility: c.visibility,
      rideCreationPolicy: mockRideCreationPolicyApi(c),
      viewerCanCreateRide: mockViewerCanCreateRide(c),
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
    const cid = Number(pathname.split('/')[3]);
    const c = clubs.find((x) => x.id === cid);
    if (!c) throw new ApiError({ message: 'Club not found', status: 404, code: 'club_not_found' });
    if ((c.visibility || 'public') === 'public') {
      return { status: 'active' };
    }
    // Private club 2: mock admin is user id 2 — create inbox notification when someone else requests.
    if (cid === 2 && profile.id !== 2) {
      const now = new Date().toISOString();
      mockInboxStore.push({
        id: mockInboxSeq++,
        recipientUserId: 2,
        kind: 'club_join_request',
        createdAt: now,
        readAt: null,
        resolvedAt: null,
        clubJoinRequest: {
          club: { id: cid, name: c.name },
          requester: {
            id: profile.id,
            fullName: profile.fullName,
            avatarUrl: profile.avatarUrl ?? null,
          },
        },
      });
    }
    return { status: 'pending' };
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
    const parts = pathname.split('/');
    const cid = Number(parts[3]);
    const uid = Number(parts[5]);
    const now = new Date().toISOString();
    for (const row of mockInboxStore) {
      if (
        row.kind === 'club_join_request' &&
        row.clubJoinRequest?.club?.id === cid &&
        row.clubJoinRequest?.requester?.id === uid
      ) {
        row.resolvedAt = now;
      }
    }
    return null;
  }

  if (/^\/api\/clubs\/\d+\/join-requests\/\d+\/reject$/.test(pathname) && method === 'POST') {
    const parts = pathname.split('/');
    const cid = Number(parts[3]);
    const uid = Number(parts[5]);
    const now = new Date().toISOString();
    for (const row of mockInboxStore) {
      if (
        row.kind === 'club_join_request' &&
        row.clubJoinRequest?.club?.id === cid &&
        row.clubJoinRequest?.requester?.id === uid
      ) {
        row.resolvedAt = now;
      }
    }
    return null;
  }

  if (/^\/api\/clubs\/\d+\/members\/\d+\/promote-organizer$/.test(pathname) && method === 'POST') {
    return null;
  }

  if (/^\/api\/clubs\/\d+\/members\/\d+\/demote-organizer$/.test(pathname) && method === 'POST') {
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
    const w = mockRideEventWindow(ride);
    if (w.hasStarted && payload.scheduledDate) {
      const next = new Date(payload.scheduledDate).getTime();
      const cur = new Date(ride.scheduledDate).getTime();
      if (next !== cur) {
        throw new ApiError({
          message: 'Cannot change scheduled start after the ride has started',
          status: 400,
          code: 'bad_request',
        });
      }
    }
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

  if (pathname === '/api/users/me/inbox/summary' && method === 'GET') {
    const unread = mockInboxStore.filter(
      (r) => r.recipientUserId === profile.id && r.readAt == null && r.resolvedAt == null,
    );
    return {
      unreadCount: unread.length,
      friendUnread: unread.filter((r) => r.kind === 'friend_request').length,
      rideUnread: unread.filter((r) => r.kind === 'ride_invite' || r.kind === 'club_ride_announced').length,
      clubUnread: unread.filter((r) => r.kind === 'club_join_request').length,
      activityUnread: unread.filter((r) => r.kind === 'quest_complete' || r.kind === 'level_up').length,
    };
  }

  if (pathname === '/api/users/me/inbox' && method === 'GET') {
    const tab = searchParams.get('tab');
    const kinds = tab ? INBOX_TAB_KINDS[tab] : null;
    if (tab && !kinds) {
      throw new ApiError({
        message: 'tab must be friends, rides, club, or activity.',
        status: 400,
        code: 'bad_request',
      });
    }
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    let rows = mockInboxStore.filter((r) => r.recipientUserId === profile.id);
    if (kinds) rows = rows.filter((r) => kinds.includes(r.kind));
    if (unreadOnly) rows = rows.filter((r) => r.readAt == null && r.resolvedAt == null);
    const items = rows
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(mockMapInboxRow);
    return { items };
  }

  if (/^\/api\/rides\/\d+\/invites$/.test(pathname) && method === 'POST') {
    const rideId = Number(pathname.split('/')[3]);
    const ride = rides.find((r) => r.id === rideId);
    if (!ride) throw new ApiError({ message: 'Ride not found', status: 404, code: 'ride_not_found' });
    if (ride.clubId != null) {
      throw new ApiError({ message: 'Only personal rides support friend invites.', status: 400, code: 'bad_request' });
    }
    if (ride.createdBy?.id !== profile.id) {
      throw new ApiError({ message: 'Forbidden', status: 403, code: 'forbidden' });
    }
    const payload = parseJsonBody(options.body);
    const userIds = [...new Set((payload.userIds || []).map(Number).filter((id) => id && id !== profile.id))];
    const now = new Date().toISOString();
    const inviteIds = [];
    for (const toUserId of userIds) {
      if ((ride.participants || []).includes(toUserId)) continue;
      const invite = {
        id: mockRideInviteSeq++,
        rideId,
        fromUserId: profile.id,
        toUserId,
        status: 'pending',
      };
      mockRideInviteStore.push(invite);
      mockInboxStore.push({
        id: mockInboxSeq++,
        recipientUserId: toUserId,
        kind: 'ride_invite',
        createdAt: now,
        readAt: null,
        resolvedAt: null,
        rideInvite: {
          id: invite.id,
          status: 'pending',
          fromUser: {
            id: profile.id,
            handle: mockHandle(profile),
            fullName: profile.fullName,
            avatarUrl: profile.avatarUrl ?? null,
          },
          ride: {
            id: ride.id,
            name: ride.name,
            scheduledDate: ride.scheduledDate,
            routeTitle: ride.routeTitle || '',
            clubId: null,
          },
        },
      });
      inviteIds.push(invite.id);
    }
    return { sent: inviteIds.length, inviteIds };
  }

  if (/^\/api\/rides\/\d+\/invites\/\d+\/accept$/.test(pathname) && method === 'POST') {
    const parts = pathname.split('/');
    const rideId = Number(parts[3]);
    const inviteId = Number(parts[5]);
    const invite = mockRideInviteStore.find((i) => i.id === inviteId && i.rideId === rideId);
    if (!invite || invite.toUserId !== profile.id) {
      throw new ApiError({ message: 'Not found', status: 404, code: 'not_found' });
    }
    const ride = rides.find((r) => r.id === rideId);
    if (!ride) throw new ApiError({ message: 'Ride not found', status: 404, code: 'ride_not_found' });
    invite.status = 'accepted';
    const now = new Date().toISOString();
    if (!ride.participants.includes(profile.id)) ride.participants.push(profile.id);
    ride.participantDetails = participantDetailsFromIds(ride.participants);
    for (const row of mockInboxStore) {
      if (row.kind === 'ride_invite' && row.rideInvite?.id === inviteId && row.recipientUserId === profile.id) {
        row.resolvedAt = now;
        row.rideInvite.status = 'accepted';
      }
    }
    return { status: 'joined' };
  }

  if (/^\/api\/rides\/\d+\/invites\/\d+\/decline$/.test(pathname) && method === 'POST') {
    const parts = pathname.split('/');
    const rideId = Number(parts[3]);
    const inviteId = Number(parts[5]);
    const invite = mockRideInviteStore.find((i) => i.id === inviteId && i.rideId === rideId);
    if (!invite || invite.toUserId !== profile.id) {
      throw new ApiError({ message: 'Not found', status: 404, code: 'not_found' });
    }
    invite.status = 'declined';
    const now = new Date().toISOString();
    for (const row of mockInboxStore) {
      if (row.kind === 'ride_invite' && row.rideInvite?.id === inviteId && row.recipientUserId === profile.id) {
        row.resolvedAt = now;
        row.rideInvite.status = 'declined';
      }
    }
    return null;
  }

  if (/^\/api\/users\/me\/inbox\/\d+\/read$/.test(pathname) && method === 'POST') {
    const inboxItemId = Number(pathname.split('/')[5]);
    const row = mockInboxStore.find((r) => r.id === inboxItemId && r.recipientUserId === profile.id);
    if (row && row.readAt == null) {
      row.readAt = new Date().toISOString();
    }
    return null;
  }

  if (pathname === '/api/users/me/club-chat/summary' && method === 'GET') {
    return [];
  }

  if (pathname === '/api/users/me/ride-chat/summary' && method === 'GET') {
    const uid = profile.id;
    const rows = rides
      .filter(
        (r) =>
          r.rideKind !== 'soloLog' &&
          Array.isArray(r.participants) &&
          r.participants.includes(uid),
      )
      .map((r) => {
        const msgs = mockRideChatStore
          .filter((m) => m.rideId === r.id)
          .sort((a, b) => a.id - b.id);
        const last = msgs.length ? msgs[msgs.length - 1] : null;
        const lastReadId = null;
        const unread = msgs.filter(
          (m) => m.authorUserId !== uid && (lastReadId == null || m.id > lastReadId),
        ).length;
        const w = mockRideEventWindow(r);
        const preview = last
          ? (last.body.length > 120 ? `${last.body.slice(0, 120)}…` : last.body)
          : null;
        return {
          rideId: r.id,
          rideName: r.name,
          clubId: r.clubId ?? null,
          clubName: r.clubName ?? null,
          unreadCount: unread,
          lastMessagePreview: preview,
          lastMessageAt: last?.sentAt ?? null,
          scheduledDate: r.scheduledDate ?? null,
          readOnly: w.chatReadOnly,
          sortAt: last?.sentAt ?? r.scheduledDate,
        };
      })
      .sort((a, b) => new Date(b.sortAt) - new Date(a.sortAt))
      .map(({ sortAt: _sortAt, ...row }) => row);
    return rows;
  }

  {
    const m = pathname.match(/^\/api\/rides\/(\d+)\/chat\/(messages|read)$/);
    if (m) {
      const rideId = Number(m[1]);
      const sub = m[2];
      const ride = rides.find((r) => r.id === rideId);
      if (!ride) throw new ApiError({ message: 'Ride not found', status: 404, code: 'ride_not_found' });
      const isParticipant = Array.isArray(ride.participants) && ride.participants.includes(profile.id);
      if (!isParticipant) throw new ApiError({ message: 'Forbidden', status: 403, code: 'forbidden' });
      const w = mockRideEventWindow(ride);
      if (sub === 'messages' && method === 'GET') {
        const msgs = mockRideChatStore
          .filter((row) => row.rideId === rideId)
          .sort((a, b) => a.id - b.id)
          .map((row) => ({
            id: row.id,
            rideId: row.rideId,
            authorUserId: row.authorUserId,
            authorHandle: row.authorHandle,
            authorDisplayName: row.authorDisplayName,
            authorAvatarUrl: row.authorAvatarUrl,
            body: row.body,
            sentAt: row.sentAt,
          }));
        return {
          messages: msgs,
          readOnly: w.chatReadOnly,
          closesAt: w.closesAt,
        };
      }
      if (sub === 'messages' && method === 'POST') {
        if (w.chatReadOnly) {
          throw new ApiError({ message: 'Ride chat is read-only', status: 403, code: 'forbidden' });
        }
        const payload = parseJsonBody(options.body);
        const row = {
          id: mockRideChatSeq++,
          rideId,
          authorUserId: profile.id,
          authorHandle: mockHandle(profile),
          authorDisplayName: profile.fullName,
          authorAvatarUrl: profile.avatarUrl ?? null,
          body: payload.body ?? '',
          sentAt: new Date().toISOString(),
        };
        mockRideChatStore.push(row);
        return {
          id: row.id,
          rideId: row.rideId,
          authorUserId: row.authorUserId,
          authorHandle: row.authorHandle,
          authorDisplayName: row.authorDisplayName,
          authorAvatarUrl: row.authorAvatarUrl,
          body: row.body,
          sentAt: row.sentAt,
        };
      }
      if (sub === 'read' && method === 'POST') return null;
    }
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
