import { ApiError } from '@/shared/api/api-errors';
import { env } from '@/shared/config/env';
import { MOCK_CHAT_MESSAGES } from '@/shared/mocks/chat';
import { MOCK_CHALLENGES } from '@/shared/mocks/challenges';
import { MOCK_HAZARDS } from '@/shared/mocks/hazards';
import { MOCK_HISTORY } from '@/shared/mocks/history';
import { MOCK_CLUBS } from '@/shared/mocks/clubs';
import { MOCK_RIDE_GROUPS } from '@/shared/mocks/rides';
import { MOCK_ROUTES, MOCK_SAVED_ROUTES } from '@/shared/mocks/routes';
import { MOCK_USERS } from '@/shared/mocks/users';

let users = [...MOCK_USERS];
let routes = [...MOCK_ROUTES];
let savedRouteIds = [...MOCK_SAVED_ROUTES];
let hazards = [...MOCK_HAZARDS];
let rides = MOCK_RIDE_GROUPS.map((r) => ({ ...r }));
let clubs = [...MOCK_CLUBS];
let challenges = [...MOCK_CHALLENGES];
let historyEntries = [...MOCK_HISTORY];
let chatMessages = structuredClone(MOCK_CHAT_MESSAGES);
let profile = {
  ...users[0],
  fullName: `${users[0].firstName} ${users[0].lastName}`,
};
let preferences = {
  defaultBikeType: 'road',
  distanceUnit: 'km',
  notificationsEnabled: true,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toAuthUser(user) {
  return {
    id: user.id,
    fullName: user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Unknown user',
    email: user.email,
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
    region: data.region || null,
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
    createdBy: profile.fullName,
    createdAt: new Date().toISOString(),
    coordinates: [
      [35.2137, 31.7683],
      [35.214, 31.769],
    ],
    status: 'published',
  };
}

function findRoute(routeId) {
  const route = routes.find((item) => item.id === Number(routeId));
  if (!route) {
    throw new ApiError({ message: 'Route not found', status: 404, code: 'route_not_found' });
  }
  return route;
}

function participantDetailsFromIds(ids) {
  const list = Array.isArray(ids) ? ids : [];
  return list.map((uid) => {
    const u = users.find((x) => x.id === Number(uid));
    const displayName = u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : `User ${uid}`;
    return { userId: Number(uid), displayName };
  });
}

function findRide(rideId) {
  const ride = rides.find((item) => item.id === Number(rideId));
  if (!ride) {
    throw new ApiError({ message: 'Ride not found', status: 404, code: 'ride_not_found' });
  }
  const route = routes.find((r) => r.id === Number(ride.routeId));
  const routeTitle = ride.routeTitle || route?.title || '';
  const participantDetails =
    ride.participantDetails || participantDetailsFromIds(ride.participants);
  const participantCount =
    ride.participantCount ?? participantDetails.length ?? (ride.participants?.length ?? 0);
  return { ...ride, routeTitle, participantDetails, participantCount, participants: ride.participants };
}

export async function mockRequest(path, options = {}) {
  if (!env.isMockApi) {
    throw new ApiError({ message: 'Mock API mode is disabled', status: 500, code: 'mock_disabled' });
  }

  await sleep(150);

  const method = (options.method || 'GET').toUpperCase();
  const url = new URL(path, 'http://localhost');
  const { pathname, searchParams } = url;

  if (pathname === '/auth/login' && method === 'POST') {
    const body = parseJsonBody(options.body);
    const user = users.find((item) => item.email === body.email);

    if (!user) {
      throw new ApiError({ message: 'Invalid credentials', status: 401, code: 'invalid_credentials' });
    }

    profile = { ...profile, ...toAuthUser(user) };
    return { token: `mock-token-${user.id}`, user: toAuthUser(user) };
  }

  if (pathname === '/auth/register' && method === 'POST') {
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
    };

    users.push(user);
    profile = toAuthUser(user);
    return { token: `mock-token-${user.id}`, user: toAuthUser(user) };
  }

  if (pathname === '/dashboard/summary' && method === 'GET') {
    const uid = profile.id;
    const completedRides = historyEntries.filter((h) => h.userId === uid).length;
    const savedRoutes = savedRouteIds.length;
    const groupRidesJoined = rides.filter((r) => Array.isArray(r.participants) && r.participants.includes(uid)).length;
    return {
      completedRides,
      savedRoutes,
      groupRidesJoined,
    };
  }

  if (pathname === '/routes' && method === 'GET') {
    return paginate(routes, searchParams);
  }

  if (pathname === '/routes/upload' && method === 'POST') {
    const formData = options.body;
    const payload = {
      title: formData.get('title'),
      description: formData.get('description'),
      terrain: formData.get('terrain'),
      difficulty: formData.get('difficulty'),
      estimatedDurationMinutes: formData.get('estimatedDurationMinutes'),
      region: formData.get('region'),
      warnings: JSON.parse(formData.get('warnings') || '[]'),
    };
    const route = createRouteFromUpload(payload);
    routes.unshift(route);
    return route;
  }

  if (pathname === '/routes/saved' && method === 'GET') {
    const savedRoutes = routes.filter((route) => savedRouteIds.includes(route.id));
    return paginate(savedRoutes, searchParams);
  }

  if (pathname === '/routes/my' && method === 'GET') {
    const myRoutes = routes.filter((route) => route.createdBy === profile.fullName || route.createdBy?.fullName === profile.fullName);
    return paginate(myRoutes, searchParams);
  }

  if (/^\/routes\/\d+\/save$/.test(pathname) && method === 'POST') {
    const routeId = Number(pathname.split('/')[2]);
    if (!savedRouteIds.includes(routeId)) savedRouteIds.push(routeId);
    return { routeId, saved: true };
  }

  if (/^\/routes\/\d+\/save$/.test(pathname) && method === 'DELETE') {
    const routeId = Number(pathname.split('/')[2]);
    savedRouteIds = savedRouteIds.filter((id) => id !== routeId);
    return null;
  }

  if (/^\/routes\/\d+$/.test(pathname) && method === 'GET') {
    return findRoute(pathname.split('/')[2]);
  }

  if (pathname === '/admin/summary' && method === 'GET') {
    return {
      totalUsers: users.length,
      totalRoutes: routes.length,
      liveHazards: hazards.filter((h) => h.status === 'active').length,
    };
  }

  if (pathname === '/admin/users' && method === 'GET') {
    return paginate(users.map(toAuthUser), searchParams);
  }

  if (/^\/admin\/users\/\d+$/.test(pathname) && method === 'DELETE') {
    const userId = Number(pathname.split('/')[3]);
    users = users.filter((user) => user.id !== userId);
    return null;
  }

  if (pathname === '/admin/routes' && method === 'GET') {
    return paginate(routes, searchParams);
  }

  if (/^\/admin\/routes\/\d+$/.test(pathname) && method === 'DELETE') {
    const routeId = Number(pathname.split('/')[3]);
    routes = routes.filter((route) => route.id !== routeId);
    savedRouteIds = savedRouteIds.filter((id) => id !== routeId);
    return null;
  }

  if (/^\/admin\/routes\/\d+\/moderation$/.test(pathname) && method === 'PATCH') {
    const routeId = Number(pathname.split('/')[3]);
    const updates = parseJsonBody(options.body);
    const route = findRoute(routeId);
    Object.assign(route, { status: updates.status || route.status || 'published' });
    return route;
  }

  if (pathname === '/admin/hazards' && method === 'GET') {
    return paginate(hazards, searchParams);
  }

  if (/^\/admin\/hazards\/\d+\/status$/.test(pathname) && method === 'PATCH') {
    const hazardId = Number(pathname.split('/')[3]);
    const updates = parseJsonBody(options.body);
    const hazard = hazards.find((item) => item.id === hazardId);

    if (!hazard) {
      throw new ApiError({ message: 'Hazard not found', status: 404, code: 'hazard_not_found' });
    }

    Object.assign(hazard, { status: updates.status || hazard.status });
    return hazard;
  }

  if (pathname === '/account/profile' && method === 'GET') {
    return toAuthUser(profile);
  }

  if (pathname === '/account/profile' && method === 'PUT') {
    const updates = parseJsonBody(options.body);
    profile = {
      ...profile,
      ...updates,
    };
    return toAuthUser(profile);
  }

  if (pathname === '/account/preferences' && method === 'GET') {
    return preferences;
  }

  if (pathname === '/account/preferences' && method === 'PUT') {
    preferences = {
      ...preferences,
      ...parseJsonBody(options.body),
    };
    return preferences;
  }

  if (pathname === '/account/password' && method === 'PUT') {
    return null;
  }

  if (pathname === '/hazards' && method === 'GET') {
    return hazards;
  }

  if (pathname === '/hazards' && method === 'POST') {
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

  if (pathname === '/challenges' && method === 'GET') {
    return challenges;
  }

  if (pathname === '/history' && method === 'GET') {
    return historyEntries;
  }

  if (pathname === '/users/me/rides' && method === 'GET') {
    return rides
      .filter((r) => Array.isArray(r.participants) && r.participants.includes(profile.id))
      .map((r) => findRide(String(r.id)));
  }

  if (/^\/clubs\/\d+\/rides$/.test(pathname) && method === 'POST') {
    const payload = parseJsonBody(options.body);
    const clubId = Number(pathname.split('/')[2]);
    const routeId = Number(payload.routeId || 0);
    const route = routes.find((r) => r.id === routeId);
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

  if (/^\/rides\/\d+\/join$/.test(pathname) && method === 'POST') {
    const rideId = Number(pathname.split('/')[2]);
    const ride = rides.find((r) => r.id === rideId);
    if (!ride) throw new ApiError({ message: 'Ride not found', status: 404, code: 'ride_not_found' });
    if (!ride.participants.includes(profile.id)) ride.participants.push(profile.id);
    ride.participantDetails = participantDetailsFromIds(ride.participants);
    return { status: 'joined' };
  }

  if (/^\/rides\/\d+\/leave$/.test(pathname) && method === 'POST') {
    const rideId = Number(pathname.split('/')[2]);
    const ride = rides.find((r) => r.id === rideId);
    if (!ride) throw new ApiError({ message: 'Ride not found', status: 404, code: 'ride_not_found' });
    ride.participants = ride.participants.filter((id) => id !== profile.id);
    ride.participantDetails = participantDetailsFromIds(ride.participants);
    return null;
  }

  if (pathname === '/clubs' && method === 'GET') {
    return clubs.map((c) => ({
      ...c,
      membershipPending: false,
    }));
  }

  if (pathname === '/clubs' && method === 'POST') {
    const body = parseJsonBody(options.body);
    const nextId = Math.max(...clubs.map((c) => c.id), 0) + 1;
    const row = {
      id: nextId,
      name: body.name,
      description: body.description || '',
      region: body.region || null,
      visibility: body.visibility === 1 ? 'private' : 'public',
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
      visibility: row.visibility,
      createdAt: row.createdAt,
    };
  }

  if (/^\/clubs\/\d+$/.test(pathname) && method === 'GET') {
    const cid = Number(pathname.split('/')[2]);
    const c = clubs.find((x) => x.id === cid);
    if (!c) throw new ApiError({ message: 'Club not found', status: 404, code: 'club_not_found' });
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      region: c.region,
      visibility: c.visibility,
      createdAt: c.createdAt,
      memberCount: 4,
      currentUserMembership: c.myRole === 'admin' ? 'admin' : c.myRole === 'member' ? 'member' : 'none',
    };
  }

  if (/^\/clubs\/\d+\/members$/.test(pathname) && method === 'GET') {
    return [
      { userId: profile.id, displayName: profile.fullName, role: 'admin', membershipStatus: 'active' },
      { userId: 3, displayName: 'Alex Cohen', role: 'member', membershipStatus: 'active' },
    ];
  }

  if (/^\/clubs\/\d+\/join-requests$/.test(pathname) && method === 'GET') {
    return [];
  }

  if (/^\/clubs\/\d+\/rides$/.test(pathname) && method === 'GET') {
    const cid = Number(pathname.split('/')[2]);
    return rides.filter((r) => r.clubId === cid).map((r) => findRide(String(r.id)));
  }

  if (/^\/clubs\/\d+\/join$/.test(pathname) && method === 'POST') {
    return { status: 'active' };
  }

  if (/^\/clubs\/\d+\/leave$/.test(pathname) && method === 'POST') {
    return null;
  }

  if (/^\/clubs\/\d+\/invites$/.test(pathname) && method === 'POST') {
    return { inviteCode: `mock-invite-${Date.now()}`, clubId: Number(pathname.split('/')[2]) };
  }

  if (pathname === '/clubs/invites/redeem' && method === 'POST') {
    return { clubId: 1, status: 'active' };
  }

  if (/^\/rides\/\d+$/.test(pathname) && method === 'GET') {
    return findRide(pathname.split('/')[2]);
  }

  if (/^\/chat\/\d+$/.test(pathname) && method === 'GET') {
    return chatMessages[pathname.split('/')[2]] || [];
  }

  if (/^\/chat\/\d+$/.test(pathname) && method === 'POST') {
    const rideId = pathname.split('/')[2];
    const payload = parseJsonBody(options.body);
    const messages = chatMessages[rideId] || [];
    const message = {
      id: Math.max(...messages.map((item) => item.id), 0) + 1,
      userId: profile.id,
      username: profile.fullName,
      message: payload.message,
      timestamp: new Date().toISOString(),
    };
    chatMessages[rideId] = [...messages, message];
    return message;
  }

  throw new ApiError({
    message: `Mock route not implemented: ${method} ${pathname}`,
    status: 501,
    code: 'mock_not_implemented',
  });
}
