import { ApiError } from '@/shared/api/api-errors';
import { env } from '@/shared/config/env';
import { MOCK_CHAT_MESSAGES } from '@/shared/mocks/chat';
import { MOCK_CHALLENGES } from '@/shared/mocks/challenges';
import { MOCK_HAZARDS } from '@/shared/mocks/hazards';
import { MOCK_HISTORY } from '@/shared/mocks/history';
import { MOCK_RIDE_GROUPS } from '@/shared/mocks/rides';
import { MOCK_ROUTES, MOCK_SAVED_ROUTES } from '@/shared/mocks/routes';
import { MOCK_USERS } from '@/shared/mocks/users';

let users = [...MOCK_USERS];
let routes = [...MOCK_ROUTES];
let savedRouteIds = [...MOCK_SAVED_ROUTES];
let hazards = [...MOCK_HAZARDS];
let rides = [...MOCK_RIDE_GROUPS];
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

function findRide(rideId) {
  const ride = rides.find((item) => item.id === Number(rideId));
  if (!ride) {
    throw new ApiError({ message: 'Ride not found', status: 404, code: 'ride_not_found' });
  }
  const route = routes.find((r) => r.id === Number(ride.routeId));
  const routeTitle = ride.routeTitle || route?.title || '';
  return { ...ride, routeTitle };
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
    return {
      totalRoutes: routes.length,
      totalRides: rides.length,
      totalUsers: users.length,
      totalHazards: hazards.filter((hazard) => hazard.status === 'active').length,
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

  if (pathname === '/rides/groups' && method === 'GET') {
    return rides;
  }

  if (pathname === '/rides/groups' && method === 'POST') {
    const payload = parseJsonBody(options.body);
    const routeId = Number(payload.routeId || 0);
    const route = routes.find((r) => r.id === routeId);
    const ride = {
      id: Math.max(...rides.map((item) => item.id), 0) + 1,
      name: payload.name,
      description: payload.description || '',
      scheduledDate: payload.scheduledDate,
      routeId,
      routeTitle: route?.title || '',
      participants: [],
      maxParticipants: Number(payload.maxParticipants || 10),
    };
    rides.unshift(ride);
    return ride;
  }

  if (/^\/rides\/events\/\d+$/.test(pathname) && method === 'GET') {
    return findRide(pathname.split('/')[3]);
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
