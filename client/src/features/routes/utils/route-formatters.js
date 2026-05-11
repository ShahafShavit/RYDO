/**
 * Title-case display for route difficulty / terrain (split on spaces and underscores).
 */
export function formatTrailMetaLabel(value) {
  if (value == null) return '—';
  const raw = String(value).trim();
  if (!raw) return '—';
  return raw
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      return lower.length ? lower.charAt(0).toUpperCase() + lower.slice(1) : '';
    })
    .filter(Boolean)
    .join(' ');
}

export function routeMeta(route) {
  return [
    route.difficulty ? formatTrailMetaLabel(route.difficulty) : null,
    route.terrain ? formatTrailMetaLabel(route.terrain) : null,
    route.estimatedDurationMinutes ? `${route.estimatedDurationMinutes}m` : null,
  ]
    .filter(Boolean)
    .join(' • ');
}
