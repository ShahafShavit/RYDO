/** Dicebear avatar seeded from the user's handle (matches server default). */
export function userAvatarDefaultUrl(handle) {
  const seed = String(handle ?? '')
    .trim()
    .replace(/^@/, '');
  if (!seed) return null;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

/** Dicebear shapes avatar for clubs (matches server default). */
export function clubAvatarDefaultUrl(seed) {
  const trimmed = String(seed ?? '').trim();
  if (!trimmed) return null;
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(trimmed)}`;
}

/** Default club avatar seed from display name (matches server). */
export function clubDefaultSeedFromName(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'club';
  return parts
    .map((part, index) => {
      const lower = part.toLowerCase();
      if (index === 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

/** True when the URL points at an uploaded user avatar blob. */
export function isUserUploadedAvatarUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/api/media/users/')) return true;
  try {
    const path = new URL(trimmed, 'http://local').pathname;
    return /^\/api\/media\/users\/[^/]+\/avatar$/i.test(path);
  } catch {
    return false;
  }
}

/** True when the URL points at an uploaded club avatar blob. */
export function isClubUploadedAvatarUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/api/media/clubs/')) return true;
  try {
    const path = new URL(trimmed, 'http://local').pathname;
    return /^\/api\/media\/clubs\/\d+\/avatar$/i.test(path);
  } catch {
    return false;
  }
}

/** Display URL for user settings preview: uploaded blob or handle-seeded default. */
export function resolveUserAvatarDisplayUrl(handle, avatarUrl) {
  if (isUserUploadedAvatarUrl(avatarUrl)) return avatarUrl.trim();
  return userAvatarDefaultUrl(handle);
}

/** Resolved club avatar seed (stored seed or name-derived default). */
export function resolveClubAvatarSeed(avatarSeed, clubName, clubId) {
  const trimmed = String(avatarSeed ?? '').trim();
  if (trimmed) return trimmed;
  const fromName = clubDefaultSeedFromName(clubName);
  if (fromName) return fromName;
  return clubId != null ? `club${clubId}` : 'club';
}

/** Display URL for club settings preview: uploaded blob or seed-generated default. */
export function resolveClubAvatarDisplayUrl({ clubId, clubName, avatarSeed, avatarUrl }) {
  if (isClubUploadedAvatarUrl(avatarUrl)) return avatarUrl.trim();
  const seed = resolveClubAvatarSeed(avatarSeed, clubName, clubId);
  return clubAvatarDefaultUrl(seed);
}
