import { normalizeUser } from '@/features/auth/auth-mapper';
import { normalizeHazard } from '@/features/hazards/hazard-mapper';
import { normalizeRoute } from '@/features/routes/route-mapper';

export function normalizeAdminUserRow(rawUser = {}) {
  const user = normalizeUser(rawUser);

  return {
    ...user,
    status: user.isActive ? 'active' : 'inactive',
    routeCount: Number(rawUser.routeCount || 0),
    rideCount: Number(rawUser.rideCount || 0),
  };
}

export function normalizeAdminRouteRow(rawRoute = {}) {
  const route = normalizeRoute(rawRoute);

  return {
    ...route,
    ownerName: route.createdBy.fullName,
    status: rawRoute.status || route.status || 'published',
  };
}

export function normalizeAdminHazardRow(rawHazard = {}) {
  const hazard = normalizeHazard(rawHazard);
  const votesRaw = rawHazard.votes || {};

  return {
    ...hazard,
    routeTitle: rawHazard.routeTitle || null,
    userVisible: Boolean(rawHazard.userVisible),
    votes: {
      up: Number(votesRaw.up ?? 0),
      down: Number(votesRaw.down ?? 0),
      total: Number(votesRaw.total ?? 0),
      voters: Array.isArray(votesRaw.voters)
        ? votesRaw.voters.map((v) => ({
            id: Number(v.id || 0),
            fullName: v.fullName || 'Unknown',
            value: Number(v.value || 0),
            updatedAt: v.updatedAt || null,
          }))
        : [],
    },
  };
}
