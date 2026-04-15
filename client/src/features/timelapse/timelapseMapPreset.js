/** Keep defaults aligned with `server/timelapse-renderer/web/mapPreset.js`. */

export const TIMELAPSE_MAP = {
  /** Fallback style when no basemap id resolves (matches Standard default). */
  style: 'mapbox://styles/mapbox/standard',
  pitch: 65,
  /** Default follow zoom (preview slider can override). */
  zoom: 19.7,
};

/**
 * Mapbox GL styles. Outdoors ≈ topographic; Standard includes 3D buildings where available.
 * @type {ReadonlyArray<{ id: string; label: string; style: string; hint?: string }>}
 */
export const TIMELAPSE_BASEMAPS = [
  { id: 'streets', label: 'Streets', style: 'mapbox://styles/mapbox/streets-v12' },
  {
    id: 'outdoors',
    label: 'Outdoors (topo)',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    hint: 'Contours & hillshade',
  },
  {
    id: 'satellite',
    label: 'Satellite + labels',
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
  },
  {
    id: 'standard',
    label: 'Standard (3D)',
    style: 'mapbox://styles/mapbox/standard',
    hint: '3D buildings & lighting',
  },
  { id: 'light', label: 'Light', style: 'mapbox://styles/mapbox/light-v11' },
  { id: 'dark', label: 'Dark', style: 'mapbox://styles/mapbox/dark-v11' },
];

export const TIMELAPSE_DEFAULT_BASEMAP_ID = 'standard';

/** Camera pitch (tilt): 0 = top-down, higher = more horizon. */
export const TIMELAPSE_PITCH_RANGE = { min: 0, max: 78, step: 1 };

/** Extra rotation vs route heading (degrees). */
export const TIMELAPSE_BEARING_OFFSET_RANGE = { min: -180, max: 180, step: 1 };

/** Slider range for preview zoom (export video uses same default as {@link TIMELAPSE_MAP.zoom}). */
export const TIMELAPSE_ZOOM_RANGE = { min: 14, max: 20, step: 0.1 };

/** Portrait 9:16; must match server export resolution. */
export const TIMELAPSE_VIEWPORT = { width: 720, height: 1280 };

export const TIMELAPSE_LINE_WIDTH_RANGE = { min: 2, max: 16, step: 0.5 };

export const TIMELAPSE_PUCK_SIZE_RANGE = { min: 8, max: 48, step: 1 };

export const TIMELAPSE_TERRAIN_EXAGGERATION_RANGE = { min: 0.6, max: 2, step: 0.1 };

/** Default wall-clock route animation length (seconds) before a GPX is loaded. */
export const TIMELAPSE_DEFAULT_ROUTE_DURATION_SEC = 60;

/** Default visual payload (client preview + export); renderer merges the same keys. */
export function getDefaultTimelapseVisual() {
  const bm = TIMELAPSE_BASEMAPS.find((b) => b.id === TIMELAPSE_DEFAULT_BASEMAP_ID);
  return {
    mapStyle: bm?.style ?? TIMELAPSE_MAP.style,
    terrain3d: true,
    terrainExaggeration: 2,
    pitch: TIMELAPSE_MAP.pitch,
    bearingOffsetDeg: 0,
    zoom: TIMELAPSE_MAP.zoom,
    lineColor: '#D98C00',
    lineWidth: 12,
    lineOpacity: 0.9,
    puckColor: '#D98C00',
    puckSizePx: 36,
    useRecordingVelocity: true,
  };
}
