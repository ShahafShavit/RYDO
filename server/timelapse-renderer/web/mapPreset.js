/** Defaults aligned with client `src/features/timelapse/timelapseMapPreset.js`. */
export const TIMELAPSE_MAP = {
  style: 'mapbox://styles/mapbox/standard',
  pitch: 65,
  zoom: 19.7,
};

export function defaultTimelapseVisualFromOptions(opts) {
  const o = opts && typeof opts === 'object' ? opts : {};
  return {
    mapStyle: typeof o.mapStyle === 'string' ? o.mapStyle : TIMELAPSE_MAP.style,
    terrain3d: o.terrain3d !== undefined ? Boolean(o.terrain3d) : true,
    terrainExaggeration:
      typeof o.terrainExaggeration === 'number' && Number.isFinite(o.terrainExaggeration)
        ? o.terrainExaggeration
        : 2,
    pitch: typeof o.pitch === 'number' && Number.isFinite(o.pitch) ? o.pitch : TIMELAPSE_MAP.pitch,
    bearingOffsetDeg:
      typeof o.bearingOffsetDeg === 'number' && Number.isFinite(o.bearingOffsetDeg)
        ? o.bearingOffsetDeg
        : 0,
    zoom: typeof o.zoom === 'number' && Number.isFinite(o.zoom) ? o.zoom : TIMELAPSE_MAP.zoom,
    lineColor: typeof o.lineColor === 'string' ? o.lineColor : '#D98C00',
    lineWidth: typeof o.lineWidth === 'number' && Number.isFinite(o.lineWidth) ? o.lineWidth : 12,
    lineOpacity:
      typeof o.lineOpacity === 'number' && Number.isFinite(o.lineOpacity) ? o.lineOpacity : 0.9,
    puckColor: typeof o.puckColor === 'string' ? o.puckColor : '#D98C00',
    puckSizePx:
      typeof o.puckSizePx === 'number' && Number.isFinite(o.puckSizePx) ? o.puckSizePx : 36,
    useRecordingVelocity: o.useRecordingVelocity !== undefined ? Boolean(o.useRecordingVelocity) : true,
  };
}
