import { normalizeUser } from '@/features/auth/auth-mapper';

export function normalizeAccountProfile(payload = {}) {
  return normalizeUser(payload);
}

export function normalizePreferences(payload = {}) {
  return {
    defaultBikeType: payload.defaultBikeType || 'road',
    distanceUnit: payload.distanceUnit === 'mi' ? 'mi' : 'km',
    notificationsEnabled: payload.notificationsEnabled ?? true,
  };
}
