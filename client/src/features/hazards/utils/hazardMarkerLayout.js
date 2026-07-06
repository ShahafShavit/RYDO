import {
  HAZARD_MARKER_OVERLAP_M,
  HAZARD_SPIDERFY_MIN_ZOOM,
  HAZARD_SPIDERFY_RADIUS_PX,
} from '@/features/hazards/hazard-constants';
import { haversineDistanceM } from '@/shared/lib/geoDistance';

/**
 * @param {number | null | undefined} zoom
 * @returns {boolean}
 */
export function isHazardSpiderfyZoom(zoom) {
  return zoom == null || zoom >= HAZARD_SPIDERFY_MIN_ZOOM;
}

/**
 * @param {Array<{ id: number }>} cluster
 * @returns {string}
 */
export function getHazardClusterKey(cluster) {
  return [...cluster]
    .sort((a, b) => a.id - b.id)
    .map((h) => h.id)
    .join('-');
}

/**
 * @param {Array<{ id: number, location?: { lat?: number, lng?: number } }>} hazards
 * @param {number} thresholdM
 * @returns {Array<typeof hazards>}
 */
export function clusterHazardsByProximity(hazards, thresholdM = HAZARD_MARKER_OVERLAP_M) {
  const withLoc = hazards.filter(
    (h) => h.location?.lat != null && h.location?.lng != null,
  );
  const assigned = new Set();
  const clusters = [];

  for (const hazard of withLoc) {
    if (assigned.has(hazard.id)) continue;

    const cluster = [hazard];
    assigned.add(hazard.id);

    let changed = true;
    while (changed) {
      changed = false;
      for (const other of withLoc) {
        if (assigned.has(other.id)) continue;
        const near = cluster.some((member) => {
          const d = haversineDistanceM(
            member.location.lat,
            member.location.lng,
            other.location.lat,
            other.location.lng,
          );
          return d <= thresholdM;
        });
        if (near) {
          cluster.push(other);
          assigned.add(other.id);
          changed = true;
        }
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * @param {number} count
 * @param {{ radiusPx?: number }} [options]
 * @returns {Array<{ x: number, y: number }>}
 */
export function spiderfyOffsetsForCluster(count, { radiusPx = HAZARD_SPIDERFY_RADIUS_PX } = {}) {
  if (count <= 1) return [{ x: 0, y: 0 }];

  const radius = count >= 4 ? radiusPx + 8 : radiusPx;
  const offsets = [];

  for (let i = 0; i < count; i += 1) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    offsets.push({
      x: Math.round(Math.cos(angle) * radius),
      y: Math.round(Math.sin(angle) * radius),
    });
  }

  return offsets;
}

/**
 * @param {Array<{ id: number, location: { lat: number, lng: number } }>} cluster
 */
function clusterCentroid(cluster) {
  const lat = cluster.reduce((sum, h) => sum + h.location.lat, 0) / cluster.length;
  const lng = cluster.reduce((sum, h) => sum + h.location.lng, 0) / cluster.length;
  return { lat, lng };
}

/**
 * @param {Array<{ id: number, location?: { lat?: number, lng?: number } }>} hazards
 * @param {{
 *   thresholdM?: number,
 *   radiusPx?: number,
 *   zoom?: number | null,
 *   expandedClusterKeys?: Set<string>,
 * }} [options]
 * @returns {Map<number, {
 *   anchorLat: number,
 *   anchorLng: number,
 *   offsetPx: { x: number, y: number },
 *   clusterSize: number,
 *   collapsed: boolean,
 *   clusterKey: string,
 *   clusterIndex: number,
 *   clusterRepresentative: boolean,
 *   hidden: boolean,
 * }>}
 */
export function buildHazardMarkerLayout(hazards, options = {}) {
  const thresholdM = options.thresholdM ?? HAZARD_MARKER_OVERLAP_M;
  const radiusPx = options.radiusPx ?? HAZARD_SPIDERFY_RADIUS_PX;
  const tapExpand = options.expandedClusterKeys != null;
  const expandedKeys = options.expandedClusterKeys ?? new Set();
  const spiderfyByZoom = !tapExpand && isHazardSpiderfyZoom(options.zoom);
  const clusters = clusterHazardsByProximity(hazards, thresholdM);
  const layout = new Map();

  for (const cluster of clusters) {
    const size = cluster.length;
    const centroid = clusterCentroid(cluster);
    const sorted = [...cluster].sort((a, b) => a.id - b.id);
    const clusterKey = getHazardClusterKey(sorted);
    const expanded = tapExpand ? expandedKeys.has(clusterKey) : spiderfyByZoom;
    const offsets = spiderfyOffsetsForCluster(size, { radiusPx });

    sorted.forEach((hazard, index) => {
      const collapsed = !expanded && size > 1;
      layout.set(hazard.id, {
        anchorLat: centroid.lat,
        anchorLng: centroid.lng,
        offsetPx: expanded ? offsets[index] : { x: 0, y: 0 },
        clusterSize: size,
        collapsed,
        clusterKey,
        clusterIndex: index,
        clusterRepresentative: index === 0,
        hidden: collapsed && index > 0,
      });
    });
  }

  return layout;
}
