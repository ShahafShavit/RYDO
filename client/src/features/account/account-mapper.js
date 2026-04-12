import { normalizeUser } from '@/features/auth/auth-mapper';

const defaultPrivacy = () => ({
  publicFirstName: true,
  publicLastName: true,
  publicEmail: false,
  publicCreatedAt: true,
  publicBio: true,
  publicLocation: true,
  publicAvatarUrl: true,
  publicDefaultBikeType: true,
});

export function normalizeAccountProfile(payload = {}) {
  const base = normalizeUser(payload);
  const priv = payload.privacy || {};
  return {
    ...base,
    bio: payload.bio ?? '',
    location: payload.location ?? '',
    avatarUrl: payload.avatarUrl ?? '',
    defaultBikeType: payload.defaultBikeType || 'road',
    privacy: {
      publicFirstName: priv.publicFirstName ?? defaultPrivacy().publicFirstName,
      publicLastName: priv.publicLastName ?? defaultPrivacy().publicLastName,
      publicEmail: priv.publicEmail ?? defaultPrivacy().publicEmail,
      publicCreatedAt: priv.publicCreatedAt ?? defaultPrivacy().publicCreatedAt,
      publicBio: priv.publicBio ?? defaultPrivacy().publicBio,
      publicLocation: priv.publicLocation ?? defaultPrivacy().publicLocation,
      publicAvatarUrl: priv.publicAvatarUrl ?? defaultPrivacy().publicAvatarUrl,
      publicDefaultBikeType: priv.publicDefaultBikeType ?? defaultPrivacy().publicDefaultBikeType,
    },
  };
}

export function normalizeUserPublicProfile(payload = {}) {
  const fn = payload.firstName;
  const ln = payload.lastName;
  const nameParts = [fn, ln].filter((x) => x != null && String(x).trim() !== '');
  return {
    id: Number(payload.id ?? 0),
    fullName: nameParts.length ? nameParts.join(' ') : 'Member',
    firstName: fn ?? '',
    lastName: ln ?? '',
    email: payload.email ?? '',
    bio: payload.bio == null ? null : payload.bio,
    location: payload.location == null ? null : payload.location,
    avatarUrl: payload.avatarUrl == null ? null : payload.avatarUrl,
    defaultBikeType: payload.defaultBikeType == null || payload.defaultBikeType === '' ? null : payload.defaultBikeType,
    role: null,
    isActive: true,
    createdAt: payload.createdAt ?? null,
    isSelf: false,
    privacy: null,
  };
}

/** Full (owner) or filtered public response from GET /api/users/:id/profile */
export function normalizeUserProfileView(payload = {}) {
  if (payload.privacy != null) {
    return { ...normalizeAccountProfile(payload), isSelf: true };
  }
  return normalizeUserPublicProfile(payload);
}

export function normalizePreferences(payload = {}) {
  return {
    defaultBikeType: payload.defaultBikeType || 'road',
    distanceUnit: payload.distanceUnit === 'mi' ? 'mi' : 'km',
    notificationsEnabled: payload.notificationsEnabled ?? true,
  };
}
