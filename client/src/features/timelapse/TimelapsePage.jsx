import { API_ENDPOINTS } from '@/shared/api/api-endpoints';
import { apiClient } from '@/shared/api/api-client';
import { env } from '@/shared/config/env';
import { parseGpxTextForTimelapse } from '@/features/timelapse/parseGpxToLineString';
import {
  buildRecordingSchedule,
  distanceKmAtPlaybackU,
} from '@/features/timelapse/timelapseRecordingSchedule';
import {
  TIMELAPSE_BASEMAPS,
  TIMELAPSE_BEARING_OFFSET_RANGE,
  TIMELAPSE_DEFAULT_BASEMAP_ID,
  TIMELAPSE_DEFAULT_ROUTE_DURATION_SEC,
  TIMELAPSE_LINE_WIDTH_RANGE,
  TIMELAPSE_MAP,
  TIMELAPSE_PITCH_RANGE,
  TIMELAPSE_PUCK_SIZE_RANGE,
  TIMELAPSE_TERRAIN_EXAGGERATION_RANGE,
  TIMELAPSE_VIEWPORT,
  TIMELAPSE_ZOOM_RANGE,
  getDefaultTimelapseVisual,
} from '@/features/timelapse/timelapseMapPreset';
import { applyMapboxTerrain, normalizeMapboxBearing } from '@/features/timelapse/timelapseTerrain';
import {
  PREVIEW_SPEED_OPTIONS,
  suggestTimelapseDurationSec,
  TIMELAPSE_ROUTE_DURATION_RANGE,
} from '@/features/timelapse/timelapseDuration';
import { estimateTimelapseRenderSeconds } from '@/features/timelapse/timelapseRenderEstimate';
import along from '@turf/along';
import bearing from '@turf/bearing';
import lineSlice from '@turf/line-slice';
import { featureCollection, point } from '@turf/helpers';
import length from '@turf/length';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Source } from 'react-map-gl/mapbox';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';

/** Preview panel size (same aspect as export). Do not use CSS `scale()` here — it breaks overflow clipping and shows only the top-left quadrant of the map, so the rider looks off-center. */
const TIMELAPSE_PREVIEW_DISPLAY = {
  width: 360,
  height: (360 * TIMELAPSE_VIEWPORT.height) / TIMELAPSE_VIEWPORT.width,
};

function defaultViewState(zoom, pitch) {
  return {
    longitude: 34.8,
    latitude: 32.1,
    zoom,
    pitch,
    bearing: 0,
    width: TIMELAPSE_PREVIEW_DISPLAY.width,
    height: TIMELAPSE_PREVIEW_DISPLAY.height,
  };
}

/**
 * @param {import('geojson').Feature<import('geojson').LineString>} line
 * @param {number} lineLengthKm
 * @param {number} distKm distance along route
 */
function cameraAtDistanceKm(line, lineLengthKm, distKm, bearingOffsetDeg = 0) {
  const d = Math.min(lineLengthKm, Math.max(0, distKm));
  const alongPt = along(line, d, { units: 'kilometers' });
  const c = alongPt.geometry.coordinates;
  const lookAheadKm = Math.min(0.05, lineLengthKm * 0.02);
  const along2 = along(line, Math.min(d + lookAheadKm, lineLengthKm), { units: 'kilometers' });
  const c2 = along2.geometry.coordinates;
  let brg = bearing(point(c), point(c2));
  if (!Number.isFinite(brg)) brg = 0;
  brg = normalizeMapboxBearing(brg + bearingOffsetDeg);
  return { center: c, bearing: brg };
}

export default function TimelapsePage() {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const mapRef = useRef(null);
  const [parseError, setParseError] = useState(null);
  /** @type {{ line: import('geojson').Feature<import('geojson').LineString>; fileName: string; pointCount: number; gpxText: string; timesMs: number[] } | null} */
  const [session, setSession] = useState(null);
  const [file, setFile] = useState(null);
  const [previewT, setPreviewT] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  /** @type {null | { phase?: string; frame?: number; totalFrames?: number; message?: string }} */
  const [genProgress, setGenProgress] = useState(null);
  const genPollRef = useRef(0);
  const [videoKey, setVideoKey] = useState(0);
  const rafRef = useRef(0);
  /** Latest scrub/play position — warm-up must finish here or camera desyncs from trail/marker. */
  const previewTRef = useRef(0);
  const [mapWarm, setMapWarm] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(TIMELAPSE_MAP.zoom);
  const defaults = useMemo(() => getDefaultTimelapseVisual(), []);
  const [basemapId, setBasemapId] = useState(TIMELAPSE_DEFAULT_BASEMAP_ID);
  const [terrain3d, setTerrain3d] = useState(defaults.terrain3d);
  const [terrainExaggeration, setTerrainExaggeration] = useState(defaults.terrainExaggeration);
  const [cameraPitch, setCameraPitch] = useState(defaults.pitch);
  const [bearingOffsetDeg, setBearingOffsetDeg] = useState(defaults.bearingOffsetDeg);
  const [lineColor, setLineColor] = useState(defaults.lineColor);
  const [lineWidth, setLineWidth] = useState(defaults.lineWidth);
  const [lineOpacity, setLineOpacity] = useState(defaults.lineOpacity);
  const [puckColor, setPuckColor] = useState(defaults.puckColor);
  const [puckSizePx, setPuckSizePx] = useState(defaults.puckSizePx);
  const [viewState, setViewState] = useState(() =>
    defaultViewState(TIMELAPSE_MAP.zoom, defaults.pitch)
  );

  const mapStyleUrl = useMemo(() => {
    const b = TIMELAPSE_BASEMAPS.find((x) => x.id === basemapId);
    return b?.style ?? TIMELAPSE_MAP.style;
  }, [basemapId]);

  const trailLineLayer = useMemo(
    () => ({
      id: 'timelapse-trail-line',
      type: 'line',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': lineColor,
        'line-width': lineWidth,
        'line-opacity': lineOpacity,
      },
    }),
    [lineColor, lineWidth, lineOpacity]
  );

  /** One `along()` + slice drives trail + puck so nothing lags the rider; circle layer matches GL line (no DOM marker drift). */
  const riderCircleLayer = useMemo(
    () => ({
      id: 'timelapse-rider-circle',
      type: 'circle',
      paint: {
        'circle-radius': Math.max(4, puckSizePx / 2),
        'circle-color': puckColor,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    }),
    [puckSizePx, puckColor]
  );

  /** Wall-clock length of the full-route animation (preview + export default). */
  const [playbackDurationSec, setPlaybackDurationSec] = useState(TIMELAPSE_DEFAULT_ROUTE_DURATION_SEC);
  /** Preview only: higher = faster scrub through the same duration window. */
  const [previewSpeed, setPreviewSpeed] = useState(1);
  const [exportFps, setExportFps] = useState(30);
  /** When true (and GPX has valid timestamps), animation follows recorded clock; otherwise constant speed along the path. */
  const [useRecordingVelocity, setUseRecordingVelocity] = useState(true);

  const lineLengthKm = useMemo(() => {
    if (!session?.line) return 0;
    return length(session.line, { units: 'kilometers' });
  }, [session?.line]);

  const recordingSchedule = useMemo(() => {
    if (!session?.line || !session?.timesMs) return { ok: false };
    return buildRecordingSchedule(session.line, session.timesMs);
  }, [session?.line, session?.timesMs]);

  const useRecordingPlayback = useRecordingVelocity && recordingSchedule.ok;

  const distKm = useMemo(
    () => distanceKmAtPlaybackU(previewT, lineLengthKm, useRecordingPlayback, recordingSchedule),
    [previewT, lineLengthKm, useRecordingPlayback, recordingSchedule]
  );

  const playbackGeometry = useMemo(() => {
    if (!session?.line || lineLengthKm <= 0) return null;
    const line = session.line;
    const d = Math.min(lineLengthKm, Math.max(0, distKm));
    const endAlong = along(line, d, { units: 'kilometers' });
    const c = endAlong.geometry.coordinates;
    const lookAheadKm = Math.min(0.05, lineLengthKm * 0.02);
    const along2 = along(line, Math.min(d + lookAheadKm, lineLengthKm), { units: 'kilometers' });
    const c2 = along2.geometry.coordinates;
    let brg = bearing(point(c), point(c2));
    if (!Number.isFinite(brg)) brg = 0;
    brg = normalizeMapboxBearing(brg + bearingOffsetDeg);

    const coords = line.geometry.coordinates;
    const startPt = point(coords[0]);
    let trailData;
    if (d <= 0) trailData = featureCollection([]);
    else if (d >= lineLengthKm - 1e-9) trailData = featureCollection([line]);
    else {
      try {
        const sliced = lineSlice(startPt, endAlong, line);
        const sc = sliced.geometry?.coordinates;
        trailData =
          sc && sc.length >= 2 ? featureCollection([sliced]) : featureCollection([]);
      } catch {
        trailData = featureCollection([]);
      }
    }

    return {
      trailData,
      center: c,
      bearing: brg,
      riderPoint: featureCollection([endAlong]),
    };
  }, [session?.line, lineLengthKm, distKm, bearingOffsetDeg]);

  useEffect(() => {
    if (!recordingSchedule.ok && useRecordingVelocity) {
      setUseRecordingVelocity(false);
    }
  }, [recordingSchedule.ok, useRecordingVelocity]);

  // Follow camera: controlled viewState (Mapbox + react-map-gl sync reliably).
  useEffect(() => {
    if (!playbackGeometry) return;
    const { center, bearing: brg } = playbackGeometry;
    setViewState((vs) => ({
      ...vs,
      longitude: center[0],
      latitude: center[1],
      zoom: previewZoom,
      pitch: cameraPitch,
      bearing: brg,
    }));
  }, [playbackGeometry, previewZoom, cameraPitch]);

  useEffect(() => {
    const m = mapRef.current?.getMap?.();
    if (!m?.isStyleLoaded?.()) return;
    applyMapboxTerrain(m, terrain3d, terrainExaggeration);
  }, [terrain3d, terrainExaggeration, basemapId, session?.fileName]);

  useEffect(() => {
    previewTRef.current = previewT;
  }, [previewT]);

  useEffect(() => {
    if (!previewPlaying) return undefined;
    const wallMs = (playbackDurationSec * 1000) / Math.max(0.05, previewSpeed);
    const start = performance.now();
    const tick = (now) => {
      const u = Math.min(1, (now - start) / wallMs);
      setPreviewT(u);
      if (u < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setPreviewPlaying(false);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [previewPlaying, playbackDurationSec, previewSpeed]);

  const onMapLoad = useCallback(
    async (e) => {
      const map = e.target;
      const line = session?.line;
      setMapWarm(false);
      if (!line?.geometry || lineLengthKm <= 0) return;

      /** Preload tiles along the route; do not end on a fixed t or camera drifts from scrub/playback. */
      const warmSteps = [0, 0.25, 0.5, 0.75, 1];
      const sched = recordingSchedule;
      const rec = useRecordingVelocity && sched.ok;
      for (const step of warmSteps) {
        const dk = distanceKmAtPlaybackU(step, lineLengthKm, rec, sched);
        const { center, bearing: brg } = cameraAtDistanceKm(line, lineLengthKm, dk, bearingOffsetDeg);
        setViewState((vs) => ({
          ...vs,
          longitude: center[0],
          latitude: center[1],
          zoom: previewZoom,
          pitch: cameraPitch,
          bearing: brg,
        }));
        await new Promise((r) => setTimeout(r, 200));
        await new Promise((r) => {
          if (map.loaded()) map.once('idle', r);
          else r();
          setTimeout(r, 350);
        });
      }
      const t = previewTRef.current;
      const dk = distanceKmAtPlaybackU(t, lineLengthKm, rec, sched);
      const { center, bearing: brg } = cameraAtDistanceKm(line, lineLengthKm, dk, bearingOffsetDeg);
      setViewState((vs) => ({
        ...vs,
        longitude: center[0],
        latitude: center[1],
        zoom: previewZoom,
        pitch: cameraPitch,
        bearing: brg,
      }));
      await new Promise((r) => {
        if (map.loaded()) map.once('idle', r);
        else r();
        setTimeout(r, 200);
      });
      applyMapboxTerrain(map, terrain3d, terrainExaggeration);
      setMapWarm(true);
    },
    [
      session?.line,
      lineLengthKm,
      previewZoom,
      cameraPitch,
      bearingOffsetDeg,
      terrain3d,
      terrainExaggeration,
      recordingSchedule,
      useRecordingVelocity,
    ]
  );

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setParseError(null);
    setGenError(null);
    setFile(f);
    setPreviewT(0);
    setMapWarm(false);
    const lower = f.name.toLowerCase();
    if (!lower.endsWith('.gpx')) {
      setParseError('Choose a .gpx file.');
      setSession(null);
      return;
    }
    try {
      const text = await f.text();
      const parsed = parseGpxTextForTimelapse(text);
      if (!parsed?.line) throw new Error('No line geometry found in file');
      const { line, timesMs } = parsed;
      const lenKm = length(line, { units: 'kilometers' });
      const suggested = suggestTimelapseDurationSec(lenKm, text);
      setPlaybackDurationSec(suggested);
      const [lng, lat] = line.geometry.coordinates[0];
      setViewState({
        ...defaultViewState(previewZoom, cameraPitch),
        longitude: lng,
        latitude: lat,
      });
      setUseRecordingVelocity(buildRecordingSchedule(line, timesMs).ok);
      setSession({
        line,
        fileName: f.name,
        pointCount: line.geometry.coordinates.length,
        gpxText: text,
        timesMs,
      });
    } catch (err) {
      setSession(null);
      setFile(null);
      setParseError(err.message || 'Could not parse file');
    }
  };

  const handleGenerate = async () => {
    if (!file) return;
    setGenerating(true);
    setGenError(null);
    setGenProgress(null);
    genPollRef.current = window.setInterval(async () => {
      try {
        const data = await apiClient.get(API_ENDPOINTS.timelapse.renderProgress);
        setGenProgress(data);
      } catch {
        /* ignore transient poll errors */
      }
    }, 400);
    try {
      const visualPayload = {
        mapStyle: mapStyleUrl,
        terrain3d,
        terrainExaggeration,
        pitch: cameraPitch,
        bearingOffsetDeg,
        zoom: previewZoom,
        lineColor,
        lineWidth,
        lineOpacity,
        puckColor,
        puckSizePx,
        useRecordingVelocity: useRecordingVelocity && recordingSchedule.ok,
      };
      await apiClient.uploadFile(API_ENDPOINTS.timelapse.generate, file, {
        targetDurationSeconds: String(playbackDurationSec),
        fps: String(exportFps),
        visualJson: JSON.stringify(visualPayload),
      });
      setVideoKey((k) => k + 1);
    } catch (err) {
      setGenError(err?.message || 'Generate failed');
    } finally {
      window.clearInterval(genPollRef.current);
      genPollRef.current = 0;
      setGenerating(false);
      setGenProgress(null);
    }
  };

  const videoSrc = `${env.apiBaseUrl || ''}${API_ENDPOINTS.timelapse.video}?v=${videoKey}`;

  if (!token) {
    return (
      <div className="fixed inset-0 z-(--rydo-z-live-blocking) flex flex-col items-center justify-center gap-4 bg-[#0a0908] px-6 text-center text-fg">
        <h1 className="text-xl font-semibold tracking-tight">Timelapse preview</h1>
        <p className="max-w-md text-sm text-fg-muted">
          Add <code className="rounded bg-surface px-1.5 py-0.5 text-fg">VITE_MAPBOX_ACCESS_TOKEN</code> to{' '}
          <code className="rounded bg-surface px-1.5 py-0.5 text-fg">client/.env.local</code>, then restart the dev
          server.
        </p>
        <Link to={ROUTES.home} className="text-sm text-rydo-purple underline-offset-4 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0a0908] px-4 py-8 text-fg">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">GPX timelapse</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Follow cam + trail behind rider. Preview matches export for map style, terrain, camera, zoom, trail/puck, and
            velocity mode. Route duration and export FPS control the MP4 length and frame rate; preview speed only changes
            how fast the browser preview plays.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-xl bg-rydo-purple px-4 py-2 text-sm font-medium text-white hover:opacity-95">
            Upload GPX
            <input type="file" accept=".gpx,application/gpx+xml" className="sr-only" onChange={handleFile} />
          </label>
          {session ? (
            <>
              <button
                type="button"
                className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/5"
                onClick={() => {
                  setPreviewT(0);
                  setPreviewPlaying(true);
                }}
              >
                Play preview
              </button>
              <button
                type="button"
                disabled={generating}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={handleGenerate}
              >
                {generating ? 'Generating…' : 'Generate MP4'}
              </button>
            </>
          ) : null}
          <Link to={ROUTES.home} className="text-sm text-rydo-purple underline-offset-4 hover:underline">
            Home
          </Link>
        </div>

        {parseError ? <p className="text-sm text-red-400">{parseError}</p> : null}
        {genError ? <p className="text-sm text-red-400">{genError}</p> : null}

        {generating ? (
          <div className="rounded-xl border border-white/15 bg-black/40 p-4 text-sm">
            <p className="font-medium text-fg">Export in progress</p>
            <div className="mt-2 h-2 w-full max-w-md overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                style={{
                  width: `${(() => {
                    const p = genProgress?.phase;
                    const tf = genProgress?.totalFrames;
                    const fr = genProgress?.frame ?? 0;
                    if (p === 'encoding') return 100;
                    if (tf && tf > 0) return Math.min(99, Math.round((100 * fr) / tf));
                    return 5;
                  })()}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-fg-muted">{genProgress?.message || 'Starting renderer…'}</p>
            <p className="mt-2 text-xs text-fg-muted">
              Rough total time for {playbackDurationSec}s @ {exportFps}fps is often around{' '}
              {estimateTimelapseRenderSeconds(playbackDurationSec, exportFps)}s on a typical dev machine (Mapbox GL +
              Chromium capture is CPU-heavy).
            </p>
          </div>
        ) : null}

        {session ? (
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="grid gap-3 text-xs text-fg-muted sm:grid-cols-2">
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span>Basemap</span>
                  <select
                    value={basemapId}
                    onChange={(ev) => setBasemapId(ev.target.value)}
                    className="w-full max-w-md rounded-lg border border-white/15 bg-[#0a0908] px-2 py-1.5 text-fg"
                  >
                    {TIMELAPSE_BASEMAPS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                        {b.hint ? ` — ${b.hint}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={terrain3d}
                    onChange={(ev) => setTerrain3d(ev.target.checked)}
                    className="rounded border-white/30"
                  />
                  <span>3D terrain (elevation mesh; uses Mapbox DEM)</span>
                </label>
                <label className="flex flex-col gap-1">
                  <span>Terrain exaggeration {terrainExaggeration.toFixed(1)}×</span>
                  <input
                    type="range"
                    min={TIMELAPSE_TERRAIN_EXAGGERATION_RANGE.min}
                    max={TIMELAPSE_TERRAIN_EXAGGERATION_RANGE.max}
                    step={TIMELAPSE_TERRAIN_EXAGGERATION_RANGE.step}
                    value={terrainExaggeration}
                    onChange={(ev) => setTerrainExaggeration(Number(ev.target.value))}
                    disabled={!terrain3d}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>
                    Camera pitch (tilt) {cameraPitch}° — 0° = top-down, higher = more horizon
                  </span>
                  <input
                    type="range"
                    min={TIMELAPSE_PITCH_RANGE.min}
                    max={TIMELAPSE_PITCH_RANGE.max}
                    step={TIMELAPSE_PITCH_RANGE.step}
                    value={cameraPitch}
                    onChange={(ev) => setCameraPitch(Number(ev.target.value))}
                  />
                  <span className="flex flex-wrap gap-1">
                    {[
                      { label: 'Top', v: 0 },
                      { label: '45°', v: 45 },
                      { label: '55°', v: 55 },
                      { label: '65°', v: 65 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        className="rounded-md border border-white/15 px-2 py-0.5 text-[11px] hover:bg-white/5"
                        onClick={() => setCameraPitch(p.v)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </span>
                </label>
                <label className="flex flex-col gap-1">
                  <span>
                    Heading offset {bearingOffsetDeg}° (twist vs route direction)
                  </span>
                  <input
                    type="range"
                    min={TIMELAPSE_BEARING_OFFSET_RANGE.min}
                    max={TIMELAPSE_BEARING_OFFSET_RANGE.max}
                    step={TIMELAPSE_BEARING_OFFSET_RANGE.step}
                    value={bearingOffsetDeg}
                    onChange={(ev) => setBearingOffsetDeg(Number(ev.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>Trail color</span>
                  <input
                    type="color"
                    value={lineColor}
                    onChange={(ev) => setLineColor(ev.target.value)}
                    className="h-9 w-full max-w-[120px] cursor-pointer rounded border border-white/15 bg-transparent"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>Trail width {lineWidth}px</span>
                  <input
                    type="range"
                    min={TIMELAPSE_LINE_WIDTH_RANGE.min}
                    max={TIMELAPSE_LINE_WIDTH_RANGE.max}
                    step={TIMELAPSE_LINE_WIDTH_RANGE.step}
                    value={lineWidth}
                    onChange={(ev) => setLineWidth(Number(ev.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>Trail opacity {lineOpacity.toFixed(2)}</span>
                  <input
                    type="range"
                    min={0.35}
                    max={1}
                    step={0.05}
                    value={lineOpacity}
                    onChange={(ev) => setLineOpacity(Number(ev.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>Puck color</span>
                  <input
                    type="color"
                    value={puckColor}
                    onChange={(ev) => setPuckColor(ev.target.value)}
                    className="h-9 w-full max-w-[120px] cursor-pointer rounded border border-white/15 bg-transparent"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>Puck size {puckSizePx}px</span>
                  <input
                    type="range"
                    min={TIMELAPSE_PUCK_SIZE_RANGE.min}
                    max={TIMELAPSE_PUCK_SIZE_RANGE.max}
                    step={TIMELAPSE_PUCK_SIZE_RANGE.step}
                    value={puckSizePx}
                    onChange={(ev) => setPuckSizePx(Number(ev.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>
                    Map zoom {previewZoom.toFixed(1)} (preview + export)
                  </span>
                  <input
                    type="range"
                    min={TIMELAPSE_ZOOM_RANGE.min}
                    max={TIMELAPSE_ZOOM_RANGE.max}
                    step={TIMELAPSE_ZOOM_RANGE.step}
                    value={previewZoom}
                    onChange={(ev) => setPreviewZoom(Number(ev.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>
                    Route duration {playbackDurationSec}s (wall time for full animation)
                  </span>
                  <input
                    type="range"
                    min={TIMELAPSE_ROUTE_DURATION_RANGE.min}
                    max={TIMELAPSE_ROUTE_DURATION_RANGE.max}
                    step={TIMELAPSE_ROUTE_DURATION_RANGE.step}
                    value={playbackDurationSec}
                    onChange={(ev) => setPlaybackDurationSec(Number(ev.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useRecordingVelocity && recordingSchedule.ok}
                      disabled={!recordingSchedule.ok}
                      onChange={(ev) => setUseRecordingVelocity(ev.target.checked)}
                      className="rounded border-white/30 accent-emerald-600"
                    />
                    <span>Recording velocity (GPX timestamps)</span>
                  </span>
                  <span className="text-[11px] leading-snug text-fg-muted">
                    {recordingSchedule.ok
                      ? 'On: position follows the recording clock (speed varies). Off: constant speed along the path for the route duration above.'
                      : 'Needs a track where every point has a valid timestamp and times strictly increase (typical device exports). Routes without times only support constant speed.'}
                  </span>
                </label>
                <label className="flex flex-col gap-1">
                  <span>Preview speed (higher = shorter wall time)</span>
                  <select
                    value={String(previewSpeed)}
                    onChange={(ev) => setPreviewSpeed(Number(ev.target.value))}
                    className="rounded-lg border border-white/15 bg-[#0a0908] px-2 py-1.5 text-fg"
                  >
                    {PREVIEW_SPEED_OPTIONS.map((o) => (
                      <option key={o.value} value={String(o.value)}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span>Export FPS {exportFps}</span>
                  <input
                    type="range"
                    min={12}
                    max={30}
                    step={1}
                    value={exportFps}
                    onChange={(ev) => setExportFps(Number(ev.target.value))}
                  />
                </label>
              </div>

              <p className="text-xs text-fg-muted">
                Preview ({TIMELAPSE_VIEWPORT.width}×{TIMELAPSE_VIEWPORT.height})
              </p>
              <div
                className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-lg"
                style={{
                  width: TIMELAPSE_PREVIEW_DISPLAY.width,
                  height: TIMELAPSE_PREVIEW_DISPLAY.height,
                }}
              >
                <Map
                  key={`${session.fileName}-${basemapId}`}
                  ref={mapRef}
                  mapboxAccessToken={token}
                  mapStyle={mapStyleUrl}
                  longitude={viewState.longitude}
                  latitude={viewState.latitude}
                  zoom={viewState.zoom}
                  pitch={viewState.pitch}
                  bearing={viewState.bearing}
                  onLoad={onMapLoad}
                  reuseMaps={false}
                  width={TIMELAPSE_PREVIEW_DISPLAY.width}
                  height={TIMELAPSE_PREVIEW_DISPLAY.height}
                >
                  <Source
                    id="timelapse-trail"
                    type="geojson"
                    data={playbackGeometry?.trailData ?? featureCollection([])}
                  >
                    <Layer {...trailLineLayer} />
                  </Source>
                  {mapWarm && playbackGeometry ? (
                    <Source id="timelapse-rider" type="geojson" data={playbackGeometry.riderPoint}>
                      <Layer {...riderCircleLayer} />
                    </Source>
                  ) : null}
                </Map>
              </div>
              <p className="text-xs text-fg-muted">
                Scrub: {Math.round(previewT * 100)}% · {session.pointCount.toLocaleString()} pts ·{' '}
                {lineLengthKm.toFixed(1)} km · {session.fileName}
                {!mapWarm ? ' · loading map…' : ''}
              </p>
              <p className="text-xs text-fg-muted">
                Generate writes your visual settings next to the GPX for the headless renderer; the MP4 uses the same look
                as this preview (plus duration & FPS above).
              </p>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(previewT * 100)}
                onChange={(ev) => setPreviewT(Number(ev.target.value) / 100)}
                className="w-full max-w-sm"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="mb-2 text-xs text-fg-muted">Last generated video</p>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                <video
                  key={videoKey}
                  className="aspect-[9/16] max-h-[70vh] w-full max-w-md bg-black"
                  controls
                  src={videoSrc}
                >
                  <track kind="captions" />
                </video>
              </div>
              <p className="mt-2 text-xs text-fg-muted">
                If empty, run Generate (requires API + timelapse workers in Docker).
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-fg-muted">Upload a GPX to see the map preview.</p>
        )}
      </div>
    </div>
  );
}
