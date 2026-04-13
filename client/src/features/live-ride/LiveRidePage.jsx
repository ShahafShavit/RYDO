import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, NavigationControl, Source } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import length from '@turf/length';
import { featureCollection, point } from '@turf/helpers';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import { useRoutesList } from '@/features/routes/hooks/useRoutesList';
import { buildRoutePreviewFeatureCollection } from '@/features/routes/utils/routePreviewGeoJson';
import { useDesktopSimulator } from '@/features/live-ride/hooks/useDesktopSimulator';
import { normalizeTrackToLineString } from '@/features/live-ride/utils/normalizeTrackToLineString';
/** Offline fallback only; catalog tracks come from `GET /api/routes` preview (seeded from server `GpxSeed/*.gpx`). */
import sampleTrack from '@/features/live-ride/data/sample-track.json';

const MAP_PITCH = 60;
const MAP_ZOOM = 17.5;
const DEFAULT_SPEED_MPS = 8;

const routeLineLayer = {
  id: 'live-route-line',
  type: 'line',
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: {
    'line-color': '#6366f1',
    'line-width': 5,
    'line-opacity': 0.88,
  },
};

function ensurePuckSource(map) {
  if (map.getSource('live-puck')) return;
  map.addSource('live-puck', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [-122.41942, 37.77492] },
    },
  });
  map.addLayer({
    id: 'live-puck-circle',
    type: 'circle',
    source: 'live-puck',
    paint: {
      'circle-radius': 9,
      'circle-color': '#3ecfb9',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });
}

export default function LiveRidePage() {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const mapRef = useRef(null);

  const { routes, isLoading: routesLoading, isError: routesError } = useRoutesList({ take: 120 });

  const routable = useMemo(
    () =>
      routes.filter((r) => {
        const fc = buildRoutePreviewFeatureCollection(r.preview ?? null);
        return fc != null && normalizeTrackToLineString(fc) != null;
      }),
    [routes],
  );

  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [uploadedGeoJson, setUploadedGeoJson] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [resetEpoch, setResetEpoch] = useState(0);
  const [speedMps, setSpeedMps] = useState(DEFAULT_SPEED_MPS);
  const [hud, setHud] = useState({ distanceM: 0, totalM: 0 });
  const [gpxError, setGpxError] = useState(null);

  /** Stable pick for preview data without a one-frame gap before effects run. */
  const effectiveRouteId = useMemo(() => {
    if (uploadedGeoJson || routable.length === 0) return null;
    const valid = selectedRouteId != null && routable.some((r) => r.id === selectedRouteId);
    return valid ? selectedRouteId : routable[0].id;
  }, [uploadedGeoJson, routable, selectedRouteId]);

  const apiTrackGeoJson = useMemo(() => {
    if (effectiveRouteId == null) return null;
    const r = routable.find((x) => x.id === effectiveRouteId);
    if (!r) return null;
    return buildRoutePreviewFeatureCollection(r.preview ?? null);
  }, [effectiveRouteId, routable]);

  const catalogReady = !routesLoading;
  const usingFallbackTrack =
    catalogReady && !uploadedGeoJson && (routesError || routable.length === 0 || !apiTrackGeoJson);

  const trackGeoJson =
    uploadedGeoJson ??
    apiTrackGeoJson ??
    (catalogReady && (routesError || routable.length === 0) ? sampleTrack : null);

  const line = useMemo(() => normalizeTrackToLineString(trackGeoJson), [trackGeoJson]);
  const routeFc = useMemo(() => (line ? featureCollection([line]) : null), [line]);
  const totalLenM = useMemo(
    () => (line ? length(line, { units: 'meters' }) : 0),
    [line],
  );

  const initialViewState = useMemo(() => {
    if (!line?.geometry?.coordinates?.[0]) {
      return { longitude: -122.4194, latitude: 37.7749, zoom: MAP_ZOOM, pitch: MAP_PITCH, bearing: 0 };
    }
    const [lng, lat] = line.geometry.coordinates[0];
    return { longitude: lng, latitude: lat, zoom: MAP_ZOOM, pitch: MAP_PITCH, bearing: 0 };
  }, [line]);

  useEffect(() => {
    setHud({ distanceM: 0, totalM: totalLenM });
  }, [line, resetEpoch, totalLenM]);

  useEffect(() => {
    if (!line?.geometry?.coordinates?.[0]) return;
    const map = mapRef.current?.getMap?.();
    if (!map?.isStyleLoaded?.()) return;
    const [lng, lat] = line.geometry.coordinates[0];
    map.jumpTo({ center: [lng, lat], zoom: MAP_ZOOM, pitch: MAP_PITCH, bearing: 0 });
    const src = map.getSource('live-puck');
    if (src && typeof src.setData === 'function') {
      src.setData(point([lng, lat]));
    }
  }, [line, resetEpoch]);

  const onFinished = useCallback(() => {
    setPlaying(false);
  }, []);

  const onFrame = useCallback(({ lng, lat, bearing, distanceM, totalM: t }) => {
    const map = mapRef.current?.getMap?.();
    if (map) {
      map.jumpTo({ center: [lng, lat], bearing, pitch: MAP_PITCH, zoom: MAP_ZOOM });
      const src = map.getSource('live-puck');
      if (src && typeof src.setData === 'function') {
        src.setData(point([lng, lat]));
      }
    }
    setHud({ distanceM, totalM: t });
  }, []);

  const { handleMapLoad } = useDesktopSimulator({
    line,
    speedMps,
    playing,
    resetEpoch,
    onFinished,
    onFrame,
  });

  const onMapLoad = useCallback(
    (e) => {
      const map = e.target;
      ensurePuckSource(map);
      if (line?.geometry?.coordinates?.[0]) {
        const [lng, lat] = line.geometry.coordinates[0];
        map.jumpTo({
          center: [lng, lat],
          zoom: MAP_ZOOM,
          pitch: MAP_PITCH,
          bearing: 0,
        });
        const src = map.getSource('live-puck');
        if (src && typeof src.setData === 'function') {
          src.setData(point([lng, lat]));
        }
      }
      handleMapLoad(e);
    },
    [handleMapLoad, line],
  );

  const handleGpxSelected = async (e) => {
    const selected = e.target.files?.[0];
    e.target.value = '';
    if (!selected) return;
    setGpxError(null);
    setPlaying(false);
    try {
      const text = await selected.text();
      const gpxDom = new DOMParser().parseFromString(text, 'application/xml');
      if (gpxDom.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Invalid GPX file');
      }
      const toGeoJSON = await import('togeojson');
      const geojson = toGeoJSON.gpx(gpxDom);
      const normalized = normalizeTrackToLineString(geojson);
      if (!normalized) {
        throw new Error('No line geometry found in GPX');
      }
      setUploadedGeoJson(geojson);
      setResetEpoch((n) => n + 1);
    } catch (err) {
      setGpxError(err.message || 'Failed to parse GPX');
    }
  };

  const handleReset = () => {
    setPlaying(false);
    setResetEpoch((n) => n + 1);
  };

  if (!token) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#0a0908] px-6 text-center text-fg">
        <h1 className="text-xl font-semibold tracking-tight">Live Ride simulator</h1>
        <p className="max-w-md text-sm text-fg-muted">
          Add <code className="rounded bg-surface px-1.5 py-0.5 text-fg">VITE_MAPBOX_ACCESS_TOKEN</code> to{' '}
          <code className="rounded bg-surface px-1.5 py-0.5 text-fg">client/.env.local</code> (see{' '}
          <code className="rounded bg-surface px-1.5 py-0.5 text-fg">client/.env.example</code>), then restart
          the dev server.
        </p>
        <Link
          to={ROUTES.home}
          className="text-sm text-rydo-purple underline-offset-4 hover:underline"
        >
          Back to home
        </Link>
      </div>
    );
  }

  if (!catalogReady && !uploadedGeoJson) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#0a0908] px-6 text-center text-fg">
        <div className="h-8 w-8 shrink-0 rounded-full border-2 border-border-strong border-t-rydo-purple animate-spin" />
        <p className="text-sm text-fg-muted">Loading routes from the API…</p>
        <Link to={ROUTES.home} className="text-sm text-rydo-purple underline-offset-4 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (!line || !routeFc) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#0a0908] px-6 text-center text-fg">
        <p className="text-sm text-fg-muted">No valid track line in the current data.</p>
        <Link to={ROUTES.home} className="text-sm text-rydo-purple underline-offset-4 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const progressPct = totalLenM > 0 ? Math.min(100, (hud.distanceM / totalLenM) * 100) : 0;

  return (
    <div className="fixed inset-0 z-40 h-dvh w-full overflow-hidden bg-[#0a0908]">
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        initialViewState={initialViewState}
        onLoad={onMapLoad}
        style={{ width: '100%', height: '100%' }}
      >
        <Source id="live-route" type="geojson" data={routeFc}>
          <Layer {...routeLineLayer} />
        </Source>
        <NavigationControl position="top-right" showCompass visualizePitch />
      </Map>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
        <div className="pointer-events-auto flex max-w-lg flex-col gap-3 rounded-3xl border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-4 py-3 shadow-lg backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-fg-subtle">Live Ride</span>
            <span className="text-xs text-fg-muted">desktop simulator</span>
          </div>
          {gpxError ? <p className="text-xs text-red-400">{gpxError}</p> : null}
          {usingFallbackTrack ? (
            <p className="text-xs text-amber-200/90">
              No route catalog available (API error or empty). Using built-in sample line — start the API or pick
              &quot;Load GPX&quot;.
            </p>
          ) : null}
          {uploadedGeoJson ? (
            <p className="text-xs text-fg-muted">
              Using GPX from your device.{' '}
              <button
                type="button"
                className="text-rydo-purple underline-offset-2 hover:underline"
                onClick={() => {
                  setUploadedGeoJson(null);
                  setPlaying(false);
                  setResetEpoch((n) => n + 1);
                }}
              >
                Back to app routes
              </button>
            </p>
          ) : routable.length > 0 ? (
            <label className="flex flex-col gap-1 text-xs text-fg-muted">
              <span className="font-medium text-fg-subtle">Route from app (GPX-backed preview)</span>
              <select
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg"
                value={effectiveRouteId ?? ''}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v)) return;
                  setSelectedRouteId(v);
                  setPlaying(false);
                  setResetEpoch((n) => n + 1);
                }}
              >
                {routable.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="h-1.5 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-rydo-purple transition-[width] duration-150 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-fg-muted">
            {(hud.distanceM / 1000).toFixed(2)} km /{' '}
            {totalLenM > 0 ? (totalLenM / 1000).toFixed(2) : '—'} km
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (playing) {
                  setPlaying(false);
                  return;
                }
                if (totalLenM > 0 && hud.distanceM >= totalLenM - 0.05) {
                  setResetEpoch((n) => n + 1);
                }
                setPlaying(true);
              }}
              className="rounded-2xl bg-rydo-purple px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_color-mix(in_srgb,var(--rydo-purple)_35%,transparent)] transition hover:opacity-95"
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium text-fg"
            >
              Reset
            </button>
            <label className="cursor-pointer rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium text-fg">
              Load GPX
              <input type="file" accept=".gpx,application/gpx+xml" className="sr-only" onChange={handleGpxSelected} />
            </label>
            <Link
              to={ROUTES.home}
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:text-fg"
            >
              Home
            </Link>
          </div>
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            <span className="shrink-0">Speed</span>
            <input
              type="range"
              min={1}
              max={25}
              step={1}
              value={speedMps}
              onChange={(ev) => setSpeedMps(Number(ev.target.value))}
              className="min-w-0 flex-1"
            />
            <span className="w-16 shrink-0 tabular-nums">{speedMps} m/s</span>
          </label>
        </div>
      </div>
    </div>
  );
}
