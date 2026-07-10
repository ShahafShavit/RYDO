export const HAZARD_INITIAL_SCORE = 5;
export const HAZARD_VOTE_RADIUS_M = 200;
/** Max distance from route polyline to plot a hazard on the elevation chart. */
export const HAZARD_ROUTE_CHART_PROXIMITY_M = 1000;
export const HAZARD_DESCRIPTION_MAX = 140;
export const HAZARD_MARKER_OVERLAP_M = 8;
export const HAZARD_SPIDERFY_RADIUS_PX = 28;
/** Hazards fan out only at this zoom and above; below it clustered markers collapse to centroid. */
export const HAZARD_SPIDERFY_MIN_ZOOM = 15;

export const HAZARD_TYPES = [
  { id: 'pothole', label: 'Pothole' },
  { id: 'construction', label: 'Construction' },
  { id: 'debris', label: 'Debris' },
  { id: 'flooding', label: 'Flooding' },
  { id: 'poor_lighting', label: 'Poor lighting' },
  { id: 'road_damage', label: 'Road damage' },
  { id: 'glass', label: 'Glass' },
  { id: 'animals', label: 'Animals' },
  { id: 'gate', label: 'Gate' },
  { id: 'other', label: 'Other' },
];

export const HAZARD_TYPE_ICONS = {
  pothole: '🕳️',
  construction: '🚧',
  debris: '💥',
  flooding: '💧',
  poor_lighting: '🌑',
  road_damage: '〰️',
  glass: '🔶',
  animals: '🐕',
  gate: '🚪',
  other: '⚠️',
};

export function hazardTypeLabel(type) {
  const found = HAZARD_TYPES.find((t) => t.id === type);
  return found?.label ?? String(type || 'Hazard');
}

export function hazardTypeIcon(type) {
  return HAZARD_TYPE_ICONS[type] ?? HAZARD_TYPE_ICONS.other;
}
