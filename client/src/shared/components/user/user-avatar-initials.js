/** Initials (up to 2 chars) from a display name for avatar fallback. */
export function getUserAvatarInitials(displayName) {
  if (!displayName || typeof displayName !== 'string') return '?';
  const t = displayName.trim();
  if (!t) return '?';
  return t
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}
