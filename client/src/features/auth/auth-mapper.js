import { ROLES } from '@/shared/constants/roles';

export function normalizeUser(rawUser = {}) {
  const role = String(rawUser.role || ROLES.USER).toLowerCase() === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USER;
  const fullName =
    rawUser.fullName ||
    [rawUser.firstName, rawUser.lastName].filter(Boolean).join(' ') ||
    rawUser.name ||
    rawUser.username ||
    'Unknown user';

  return {
    id: Number(rawUser.id ?? rawUser.userId ?? 0),
    fullName,
    email: rawUser.email || '',
    role,
    isActive: rawUser.isActive ?? true,
    createdAt: rawUser.createdAt || null,
  };
}

export function normalizeAuthResponse(payload = {}) {
  const user = normalizeUser(payload.user || payload);

  return {
    token: payload.token || null,
    user,
  };
}
