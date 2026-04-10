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
  return normalizeHazard(rawHazard);
}
