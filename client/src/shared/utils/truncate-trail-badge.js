/** Max characters shown in route/trail badges (including ellipsis when truncated). */
export const TRAIL_BADGE_MAX_CHARS = 20;

/**
 * Trims and truncates trail/route titles for pill badges.
 * @param {string | null | undefined} text
 * @param {number} [maxLength=TRAIL_BADGE_MAX_CHARS]
 */
export function truncateTrailBadgeText(text, maxLength = TRAIL_BADGE_MAX_CHARS) {
  const s = String(text ?? '').trim();
  if (s.length <= maxLength) return s;
  const ell = '…';
  const take = Math.max(0, maxLength - ell.length);
  return `${s.slice(0, take)}${ell}`;
}
