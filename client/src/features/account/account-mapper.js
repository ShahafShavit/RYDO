import { normalizeUser } from '@/features/auth/auth-mapper';

/** @param {unknown} payload */
function normalizeLeaderboardBadges(payload) {
  const raw = payload?.leaderboardBadges;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b) => b && typeof b.boardId === 'string' && Number.isFinite(Number(b.rank)))
    .map((b) => ({ boardId: String(b.boardId), rank: Math.trunc(Number(b.rank)) }))
    .filter((b) => b.rank >= 1 && b.rank <= 3);
}

const defaultPrivacy = () => ({
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
      publicUploadedRoutesOnProfile: priv.publicUploadedRoutesOnProfile ?? defaultPrivacy().publicUploadedRoutesOnProfile,
      publicParticipatedRidesOnProfile:
        priv.publicParticipatedRidesOnProfile ?? defaultPrivacy().publicParticipatedRidesOnProfile,
    },
    leaderboardBadges: normalizeLeaderboardBadges(payload),
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
    publicUploadedRoutesOnProfile: payload.publicUploadedRoutesOnProfile !== false,
    publicParticipatedRidesOnProfile: payload.publicParticipatedRidesOnProfile !== false,
    leaderboardBadges: normalizeLeaderboardBadges(payload),
  };
}

/** Full (owner) or filtered public response from GET /api/users/:id/profile */
export function normalizeUserProfileView(payload = {}) {
  if (payload.privacy != null) {
    return { ...normalizeAccountProfile(payload), isSelf: true };
  }
  return normalizeUserPublicProfile(payload);
}

/**
 * Owner profile (with `privacy`) → fields and values visible on {@link UserProfilePublicCard} to other members.
 * Use for the settings preview so the card matches public visibility, not the full account record.
 */
export function projectProfileAsSeenByOthers(profile) {
  if (!profile?.privacy) {
    return profile;
  }
  const p = profile.privacy;
  const emptyToNull = (v) => {
    if (v == null) return null;
    const s = String(v).trim();
    return s === '' ? null : v;
  };
  return {
    ...profile,
    bio: p.publicBio ? emptyToNull(profile.bio) : null,
    location: p.publicLocation ? emptyToNull(profile.location) : null,
    email: p.publicEmail ? emptyToNull(profile.email) : null,
    createdAt: p.publicCreatedAt ? profile.createdAt : null,
    avatarUrl: p.publicAvatarUrl ? (profile.avatarUrl?.trim() ? profile.avatarUrl.trim() : null) : null,
    defaultBikeType: p.publicDefaultBikeType ? (profile.defaultBikeType || null) : null,
    isSelf: profile.isSelf ?? true,
  };
}

export function normalizePreferences(payload = {}) {
  const allowed = new Set(['midnight', 'evergreen', 'abyss', 'daylight', 'sage', 'dune']);
  const raw = payload.colorScheme;
  const colorScheme = typeof raw === 'string' && allowed.has(raw) ? raw : 'midnight';
  return {
    defaultBikeType: payload.defaultBikeType || 'road',
    distanceUnit: payload.distanceUnit === 'mi' ? 'mi' : 'km',
    notificationsEnabled: payload.notificationsEnabled ?? true,
    publicInRouteRiderLists: payload.publicInRouteRiderLists ?? true,
    publicUploadedRoutesOnProfile: payload.publicUploadedRoutesOnProfile !== false,
    publicParticipatedRidesOnProfile: payload.publicParticipatedRidesOnProfile !== false,
    colorScheme,
  };
}
