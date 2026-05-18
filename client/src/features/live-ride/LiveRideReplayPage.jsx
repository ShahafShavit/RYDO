import { ROUTES } from '@/app/router/route-paths';
import LiveRideAvatarMarker from '@/features/live-ride/components/LiveRideAvatarMarker';
import LiveRidePreviewTuningPanel from '@/features/live-ride/components/LiveRidePreviewTuningPanel';
import LiveRideReplayTimeline from '@/features/live-ride/components/LiveRideReplayTimeline';
import { useLiveRideMotionFromPositions } from '@/features/live-ride/hooks/useLiveRideMotionFromPositions';
import { nearestPeersAheadBehind } from '@/features/live-ride/utils/liveRideNearbyPeers';
import { buildReplayFixesForUpload } from '@/features/live-ride/utils/buildReplayFixesFromGeoJson';
import { normalizeTrackToLineString } from '@/features/live-ride/utils/normalizeTrackToLineString';
import {
  enableRideLiveDebugFromQuery,
  rideLiveLog,
} from '@/features/live-ride/utils/rideLiveLog';
import { subscribeDeviceCompass } from '@/features/live-ride/utils/liveRideCompass';
import { mergeLiveRideMotionTuning } from '@/features/live-ride/utils/liveRideMotionTuning';
import { buildUncertaintyFootprintPolygon } from '@/features/live-ride/utils/liveRideUncertaintyFootprint';
import { featureCollection } from '@turf/helpers';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Crosshair,
  Gauge,
  Users,
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { Layer, Marker, NavigationControl, Source } from 'react-map-gl/mapbox';
import { Link } from 'react-router-dom';

const MAP_PITCH = 55;
const MAP_ZOOM = 15.5;

const routeLineLayer = {
  id: 'live-replay-route-line',
  type: 'line',
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: {
    'line-color': '#6366f1',
    'line-width': 5,
    'line-opacity': 0.88,
  },
};

const uncertaintyFillLayer = {
  id: 'live-replay-uncertainty-fill',
  type: 'fill',
  paint: {
    'fill-color': '#f59e0b',
    'fill-opacity': 0.2,
  },
};

const uncertaintyLineLayer = {
  id: 'live-replay-uncertainty-line',
  type: 'line',
  paint: {
    'line-color': '#fbbf24',
    'line-width': 1.5,
    'line-opacity': 0.85,
  },
};

function formatHeadingDeg(d) {
  if (d == null || !Number.isFinite(d)) return '—';
  return `${d.toFixed(1)}°`;
}

function formatSpeedKmh(speedMps) {
  if (speedMps == null || !Number.isFinite(speedMps) || speedMps < 0) return '—';
  return `${(speedMps * 3.6).toFixed(1)} km/h`;
}

function formatDistanceM(m) {
  if (m == null || !Number.isFinite(m)) return '';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

const LIVE_MAP_BOTTOM_INSET = 'max(1.25rem, calc(2.75rem + env(safe-area-inset-bottom)))';

export default function LiveRideReplayPage() {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const mapRef = useRef(null);
  const followCameraRef = useRef(true);
  const programmaticMoveRef = useRef(false);
  const compassHeadingRef = useRef(null);

  const [parseError, setParseError] = useState(null);
  /** @type {null | { fixes: import('@/features/live-ride/utils/buildReplayFixesFromGeoJson').ReplayFix[], line: import('geojson').Feature<import('geojson').LineString>, routeFc: import('geojson').FeatureCollection, fileName: string }} */
  const [session, setSession] = useState(null);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replayEpoch, setReplayEpoch] = useState(0);
  const [showRecenter, setShowRecenter] = useState(false);
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [motionTuning, setMotionTuning] = useState(() => mergeLiveRideMotionTuning());
  const [showUncertaintyOverlay, setShowUncertaintyOverlay] = useState(false);
  const [showBearingHud, setShowBearingHud] = useState(false);
  /** @type {import('geojson').FeatureCollection | null} */
  const [uncertaintyData, setUncertaintyData] = useState(null);
  const [bearingHud, setBearingHud] = useState(null);

  const noopSendPose = useCallback(() => { }, []);

  useEffect(() => {
    if (enableRideLiveDebugFromQuery()) {
      rideLiveLog('debugRideLive query → live replay page');
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setClockTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const initialViewState = useMemo(() => {
    if (!session?.line?.geometry?.coordinates?.[0]) {
      return { longitude: 34.8, latitude: 32.1, zoom: MAP_ZOOM, pitch: MAP_PITCH, bearing: 0 };
    }
    const [lng, lat] = session.line.geometry.coordinates[0];
    return { longitude: lng, latitude: lat, zoom: MAP_ZOOM, pitch: MAP_PITCH, bearing: 0 };
  }, [session?.line]);

  const recenterCamera = useCallback((lng, lat, bearingOpt, { instant } = { instant: false }) => {
    const map = mapRef.current?.getMap?.();
    if (!map?.isStyleLoaded?.()) return;
    programmaticMoveRef.current = true;
    const zoom = map.getZoom();
    const next = {
      center: [lng, lat],
      bearing: bearingOpt ?? map.getBearing(),
      pitch: MAP_PITCH,
      zoom,
    };
    const release = () => {
      programmaticMoveRef.current = false;
      map.off('idle', release);
    };
    map.once('idle', release);
    if (instant) {
      map.jumpTo(next);
    } else {
      map.easeTo({ ...next, duration: 600 });
    }
  }, []);

  const applyFollowCamera = useCallback((lng, lat, bearingOpt) => {
    const map = mapRef.current?.getMap?.();
    if (!map?.isStyleLoaded?.()) return;
    programmaticMoveRef.current = true;
    try {
      map.jumpTo({
        center: [lng, lat],
        bearing: bearingOpt ?? map.getBearing(),
        pitch: MAP_PITCH,
        zoom: map.getZoom(),
      });
    } finally {
      programmaticMoveRef.current = false;
    }
  }, []);

  const motionLoopEnabled = Boolean(session?.fixes?.length && replayPlaying);

  const {
    geoError,
    selfFix,
    puckDisplay,
    deadReckonRef,
    puckDisplayRef,
    bearingTelemetryRef,
    replayElapsedMs,
    seekReplayToOffsetMs,
  } = useLiveRideMotionFromPositions({
    motionLoopEnabled,
    useDeviceGps: false,
    replayFixes: session?.fixes ?? null,
    replayPlaying,
    replayEpoch,
    sendPose: noopSendPose,
    applyFollowCamera,
    followCameraRef,
    compassHeadingRef,
    tuning: motionTuning,
  });

  const replayDurationMs = useMemo(
    () =>
      session?.fixes?.length
        ? session.fixes[session.fixes.length - 1].offsetMs
        : 0,
    [session?.fixes],
  );

  useEffect(() => {
    if (!session) {
      compassHeadingRef.current = null;
      return undefined;
    }
    return subscribeDeviceCompass((h) => {
      compassHeadingRef.current = h;
    });
  }, [session]);

  useEffect(() => {
    if (!session || !replayPlaying || (!showUncertaintyOverlay && !showBearingHud)) {
      setUncertaintyData(null);
      if (!showBearingHud) setBearingHud(null);
      return undefined;
    }
    const tick = () => {
      const tel = bearingTelemetryRef.current;
      if (showBearingHud) {
        setBearingHud(tel);
      } else {
        setBearingHud(null);
      }
      if (!showUncertaintyOverlay) {
        setUncertaintyData(null);
        return;
      }
      const p = puckDisplayRef.current;
      const lat = p?.lat ?? selfFix?.lat;
      const lng = p?.lng ?? selfFix?.lng;
      if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        setUncertaintyData(null);
        return;
      }
      const dr = deadReckonRef.current;
      const bearingDeg =
        p?.bearing ??
        tel?.displayHeadingDeg ??
        tel?.extrapolateHeadingDeg ??
        null;
      const feat = buildUncertaintyFootprintPolygon({
        lat,
        lng,
        bearingDeg,
        speedMps: dr?.speedMps != null && Number.isFinite(dr.speedMps) ? dr.speedMps : 0,
        tuning: motionTuning,
      });
      setUncertaintyData(
        feat
          ? featureCollection([feat])
          : null,
      );
    };
    tick();
    const id = window.setInterval(tick, 120);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs stable; interval reads fresh values
  }, [session, replayPlaying, showUncertaintyOverlay, showBearingHud, motionTuning, selfFix?.lat, selfFix?.lng]);

  const onUserAdjustedView = useCallback(() => {
    if (programmaticMoveRef.current) return;
    followCameraRef.current = false;
    setShowRecenter(true);
  }, []);

  const handleRecenterClick = useCallback(() => {
    followCameraRef.current = true;
    setShowRecenter(false);
    const p = puckDisplayRef.current;
    if (p?.lat != null && p?.lng != null) {
      recenterCamera(p.lng, p.lat, p.bearing ?? undefined, { instant: false });
    }
  }, [recenterCamera, puckDisplayRef]);

  const onMapLoad = useCallback(
    (e) => {
      const map = e.target;
      rideLiveLog('Live replay map onLoad', { styleLoaded: map.isStyleLoaded?.() ?? null });
      const line = session?.line;
      if (line?.geometry?.coordinates?.[0]) {
        const [routeLng, routeLat] = line.geometry.coordinates[0];
        const dr = deadReckonRef.current;
        const gpsAhead = dr.initialized && dr.synLat != null && dr.synLng != null;
        const centerLng = gpsAhead ? dr.synLng : routeLng;
        const centerLat = gpsAhead ? dr.synLat : routeLat;
        followCameraRef.current = true;
        programmaticMoveRef.current = true;
        try {
          map.jumpTo({
            center: [centerLng, centerLat],
            zoom: MAP_ZOOM,
            pitch: MAP_PITCH,
            bearing: 0,
          });
        } finally {
          programmaticMoveRef.current = false;
        }
      }
    },
    [session?.line, deadReckonRef],
  );

  const peersById = useMemo(() => new Map(), []);

  const nearbyInfo = useMemo(() => {
    const speedKmh = Number.isFinite(selfFix?.speedFiltered) ? selfFix.speedFiltered * 3.6 : 0;
    return nearestPeersAheadBehind({
      selfLat: selfFix?.lat,
      selfLng: selfFix?.lng,
      headingDeg: puckDisplay?.bearing ?? selfFix?.heading,
      speedKmh,
      coneMinSpeedKmh: motionTuning.CONE_MIN_SPEED_KMH,
      forceDisableCone: Boolean(selfFix?.lowSpeedBypassCone),
      previousFix: selfFix?.previousFix,
      peers: peersById.values(),
    });
  }, [selfFix, peersById, puckDisplay, motionTuning.CONE_MIN_SPEED_KMH]);

  const timeLabel = useMemo(
    () =>
      new Date(clockTick).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      }),
    [clockTick],
  );

  const peersList = useMemo(() => [...peersById.values()], [peersById]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setParseError(null);
    setReplayPlaying(false);
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.gpx') && !lower.endsWith('.kml')) {
      setParseError('Choose a .gpx or .kml file.');
      return;
    }
    try {
      const text = await file.text();
      const dom = new DOMParser().parseFromString(text, 'application/xml');
      if (dom.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Invalid XML');
      }
      // const toGeoJSON = await import('togeojson');
      const toGeoJSON = await import("@tmcw/togeojson");
      const geoJson = lower.endsWith('.kml') ? toGeoJSON.kml(dom) : toGeoJSON.gpx(dom);
      const line = normalizeTrackToLineString(geoJson);
      if (!line) {
        throw new Error('No line geometry found in file');
      }
      const fixes = buildReplayFixesForUpload(lower, text, geoJson, motionTuning);
      if (fixes.length < 2) {
        throw new Error('Need at least two track points to replay');
      }
      setSession({
        fixes,
        line,
        routeFc: featureCollection([line]),
        fileName: file.name,
      });
      setReplayEpoch((n) => n + 1);
      setReplayPlaying(true);
    } catch (err) {
      setSession(null);
      setParseError(err.message || 'Could not parse file');
    }
  };

  if (!token) {
    return (
      <div className="fixed inset-0 z-(--rydo-z-live-blocking) flex flex-col items-center justify-center gap-4 bg-[#0a0908] px-6 text-center text-fg">
        <h1 className="text-xl font-semibold tracking-tight">Live ride replay</h1>
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

  if (!session) {
    return (
      <div className="fixed inset-0 z-(--rydo-z-live-blocking) flex flex-col items-center justify-center gap-6 bg-[#0a0908] px-6 text-center text-fg">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Live ride replay</h1>
          <p className="mt-2 max-w-md text-sm text-fg-muted">
            Upload a GPX or KML track. Playback runs entirely in the browser (no API, no SignalR) using the same
            motion logic as the live ride map.
          </p>
        </div>
        {parseError ? <p className="max-w-md text-sm text-red-400">{parseError}</p> : null}
        <label className="cursor-pointer rounded-2xl bg-rydo-purple px-6 py-3 text-sm font-medium text-white shadow-[0_0_20px_color-mix(in_srgb,var(--rydo-purple)_35%,transparent)] transition hover:opacity-95">
          Choose GPX or KML
          <input
            type="file"
            accept=".gpx,.kml,application/gpx+xml,application/vnd.google-earth.kml+xml"
            className="sr-only"
            onChange={handleFile}
          />
        </label>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to={ROUTES.timelapse} className="text-sm text-rydo-purple underline-offset-4 hover:underline">
            GPX timelapse (9:16)
          </Link>
          <Link to={ROUTES.home} className="text-sm text-rydo-purple underline-offset-4 hover:underline">
            Back to home
          </Link>
        </div>
        <LiveRidePreviewTuningPanel tuning={motionTuning} onTuningChange={setMotionTuning} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-(--rydo-z-live-map) h-dvh w-full overflow-hidden bg-[#0a0908]">
      <MapGL
        key={`${session.fileName}-${replayEpoch}`}
        ref={mapRef}
        mapboxAccessToken={token}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        initialViewState={initialViewState}
        onLoad={onMapLoad}
        onDragStart={onUserAdjustedView}
        onRotateStart={onUserAdjustedView}
        onPitchStart={onUserAdjustedView}
        onZoomStart={onUserAdjustedView}
        style={{ width: '100%', height: '100%' }}
      >
        <Source id="live-replay-route" type="geojson" data={session.routeFc}>
          <Layer {...routeLineLayer} />
        </Source>
        {showUncertaintyOverlay && uncertaintyData ? (
          <Source id="live-replay-uncertainty" type="geojson" data={uncertaintyData}>
            <Layer {...uncertaintyFillLayer} />
            <Layer {...uncertaintyLineLayer} />
          </Source>
        ) : null}
        {(() => {
          const puck =
            puckDisplay?.lat != null && puckDisplay?.lng != null ? puckDisplay : selfFix;
          if (puck?.lat == null || puck?.lng == null) return null;
          return (
            <Marker longitude={puck.lng} latitude={puck.lat} anchor="center">
              <LiveRideAvatarMarker
                name="You (replay)"
                avatarUrl={null}
                isSelf
                headingDeg={puck?.bearing ?? null}
              />
            </Marker>
          );
        })()}
        {peersList.map((p) => (
          <Marker key={p.userId} longitude={p.lng} latitude={p.lat} anchor="center">
            <LiveRideAvatarMarker name={p.displayName || 'Rider'} avatarUrl={p.avatarUrl} />
          </Marker>
        ))}
        <NavigationControl position="top-right" showCompass visualizePitch />
      </MapGL>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex flex-row flex-wrap items-center gap-2 p-3 max-md:pr-[4.5rem] md:justify-between"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="pointer-events-auto flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSession(null);
              setReplayPlaying(false);
              setParseError(null);
            }}
            className="inline-flex rounded-2xl border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-3 py-2 text-sm font-medium text-fg shadow backdrop-blur-md"
          >
            Another file
          </button>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-3 py-2 text-xs font-medium text-fg-muted shadow backdrop-blur-md">
            <span className="text-fg-subtle">Local replay</span>
            <span className="max-w-[10rem] truncate text-fg" title={session.fileName}>
              {session.fileName}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowUncertaintyOverlay((v) => !v)}
            className={`rounded-2xl border px-3 py-2 text-xs font-medium shadow backdrop-blur-md ${showUncertaintyOverlay
                ? 'border-amber-400/50 bg-amber-500/20 text-amber-100'
                : 'border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] text-fg-muted'
              }`}
          >
            Uncertainty
          </button>
          <button
            type="button"
            onClick={() => setShowBearingHud((v) => !v)}
            className={`rounded-2xl border px-3 py-2 text-xs font-medium shadow backdrop-blur-md ${showBearingHud
                ? 'border-cyan-400/45 bg-cyan-500/15 text-cyan-100'
                : 'border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] text-fg-muted'
              }`}
          >
            Bearing HUD
          </button>
        </div>
      </div>

      {showBearingHud ? (
        <div
          className="pointer-events-none absolute left-3 z-[55] max-w-[min(calc(100vw-1.5rem),20rem)] rounded-2xl border border-white/10 bg-[color-mix(in_srgb,var(--rydo-bg-deep)_94%,transparent)] p-3 text-[11px] shadow-xl backdrop-blur-md"
          style={{ top: 'max(5.5rem, calc(env(safe-area-inset-top) + 4.5rem))' }}
        >
          <p className="pointer-events-auto mb-2 font-semibold uppercase tracking-[0.1em] text-fg-subtle">
            Bearing (preview)
          </p>
          {bearingHud ? (
            <dl className="pointer-events-auto space-y-1.5 font-mono tabular-nums text-fg">
              <div className="flex justify-between gap-3">
                <dt className="text-fg-muted">Speed</dt>
                <dd>{bearingHud.speedKmh.toFixed(1)} km/h</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fg-muted">w_GPS</dt>
                <dd>{bearingHud.blendWeight.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fg-muted">Compass</dt>
                <dd>{formatHeadingDeg(bearingHud.compassDeg)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fg-muted">GPS / COG</dt>
                <dd>{formatHeadingDeg(bearingHud.gpsDeg)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fg-muted">Target (extrap.)</dt>
                <dd>{formatHeadingDeg(bearingHud.extrapolateHeadingDeg)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fg-muted">Display (smooth)</dt>
                <dd>{formatHeadingDeg(bearingHud.displayHeadingDeg)}</dd>
              </div>
            </dl>
          ) : (
            <p className="pointer-events-auto text-fg-muted">Play track to stream telemetry…</p>
          )}
          <p className="pointer-events-auto mt-2 border-t border-white/10 pt-2 text-[10px] leading-snug text-fg-subtle">
            Blend: circular mix of compass & GPS unit vectors by w_GPS; display low-pass via HEADING_DISPLAY_SMOOTH
            each frame.
          </p>
        </div>
      ) : null}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 pt-2"
        style={{ paddingBottom: LIVE_MAP_BOTTOM_INSET }}
      >
        {showRecenter || replayPlaying ? (
          <div className="pointer-events-auto relative h-14 w-full shrink-0">
            {!showRecenter && puckDisplay && replayPlaying ? (
              <div
                className="pointer-events-none absolute left-[max(1rem,env(safe-area-inset-left))] top-1/2 z-[1] inline-flex max-w-[min(42%,11rem)] -translate-y-1/2 items-center gap-1.5 rounded-full border border-emerald-500/35 bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-2.5 py-1.5 text-[11px] font-medium text-emerald-100/90 shadow backdrop-blur-md sm:max-w-none sm:px-3 sm:text-xs"
                aria-live="polite"
              >
                <Crosshair className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
                Following
              </div>
            ) : null}
            {showRecenter ? (
              <button
                type="button"
                onClick={handleRecenterClick}
                className="absolute left-1/2 top-1/2 z-[1] inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_92%,transparent)] px-4 py-2 text-sm font-medium text-fg shadow-lg backdrop-blur-md"
              >
                <Crosshair className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                Center on me
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="pointer-events-auto mx-auto flex w-[min(92vw,32rem)] shrink-0 flex-col gap-3 rounded-3xl border border-white/12 bg-[color-mix(in_srgb,var(--rydo-bg-deep)_92%,transparent)] p-4 shadow-[0_-8px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <LiveRideReplayTimeline
            fixes={session.fixes}
            durationMs={replayDurationMs}
            elapsedMs={replayElapsedMs}
            onSeek={seekReplayToOffsetMs}
            onScrubStart={() => setReplayPlaying(false)}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                if (replayPlaying) {
                  setReplayPlaying(false);
                  return;
                }
                setReplayPlaying(true);
              }}
              className="rounded-2xl bg-rydo-purple px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_color-mix(in_srgb,var(--rydo-purple)_35%,transparent)] transition hover:opacity-95"
            >
              {replayPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              onClick={() => {
                setReplayPlaying(false);
                setReplayEpoch((n) => n + 1);
              }}
              className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium text-fg"
            >
              Restart
            </button>
            <Link
              to={ROUTES.home}
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:text-fg"
            >
              Home
            </Link>
          </div>
          <div className="flex w-full items-center gap-0 rounded-2xl border border-white/10 bg-black/28 px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <Gauge
                  className="mt-0.5 h-4 w-4 shrink-0 text-rydo-purple/85"
                  strokeWidth={2}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">Speed</p>
                  <p
                    className="mt-0.5 truncate text-base font-bold tabular-nums leading-tight text-fg sm:text-lg"
                    title="Speed from replay"
                  >
                    {formatSpeedKmh(selfFix?.speedFiltered)}
                  </p>
                </div>
              </div>
              <div className="hidden h-10 w-px shrink-0 bg-white/12 sm:block" aria-hidden />
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <Clock
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#3ecfb9]/90"
                  strokeWidth={2}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">Time</p>
                  <p className="mt-0.5 truncate text-sm font-semibold tabular-nums leading-tight text-fg sm:text-base">
                    {timeLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setNearbyOpen((o) => !o)}
            aria-expanded={nearbyOpen}
            aria-label={nearbyOpen ? 'Hide nearby riders' : 'Show nearby riders'}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-black/22 px-3 py-2.5 text-left transition hover:border-white/15 hover:bg-black/30 active:scale-[0.99]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rydo-purple/20 text-rydo-purple">
              <Users className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </span>
            <p className="min-w-0 flex-1 text-xs leading-snug text-fg-muted">
              <span className="font-semibold tabular-nums text-fg">{peersById.size}</span>
              {' · '}
              other rider{peersById.size === 1 ? '' : 's'} on the map
            </p>
            {nearbyOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
            )}
          </button>

          {geoError ? (
            <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-100/95">
              {geoError}
            </p>
          ) : null}

          {nearbyOpen ? (
            <div className="max-h-[min(40vh,16rem)] overflow-y-auto rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3 text-xs text-fg md:max-h-[min(50vh,20rem)]">
              {nearbyInfo.mode === 'empty' ? (
                <p className="text-fg-muted">No other riders to compare yet.</p>
              ) : null}
              {nearbyInfo.mode === 'unknown' ? (
                <div className="space-y-1">
                  <p className="text-fg-subtle">Direction unavailable — nearest by distance:</p>
                  <ul className="space-y-1">
                    {(nearbyInfo.nearest ?? []).map((p) => (
                      <li key={p.userId} className="flex justify-between gap-2">
                        <span className="truncate">{p.displayName || `Rider ${p.userId}`}</span>
                        <span className="shrink-0 tabular-nums text-fg-muted">{formatDistanceM(p.distanceM)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {nearbyInfo.mode === 'aheadBehind' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 font-medium uppercase tracking-[0.12em] text-fg-subtle">Ahead</p>
                    {nearbyInfo.aheadNearest ? (
                      <p className="text-fg">
                        {nearbyInfo.aheadNearest.displayName || `Rider ${nearbyInfo.aheadNearest.userId}`}
                        <span className="ml-2 tabular-nums text-fg-muted">
                          {formatDistanceM(nearbyInfo.aheadNearest.distanceM)}
                        </span>
                      </p>
                    ) : (
                      <p className="text-fg-muted">No one detected ahead</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 font-medium uppercase tracking-[0.12em] text-fg-subtle">Behind</p>
                    {nearbyInfo.behindNearest ? (
                      <p className="text-fg">
                        {nearbyInfo.behindNearest.displayName || `Rider ${nearbyInfo.behindNearest.userId}`}
                        <span className="ml-2 tabular-nums text-fg-muted">
                          {formatDistanceM(nearbyInfo.behindNearest.distanceM)}
                        </span>
                      </p>
                    ) : (
                      <p className="text-fg-muted">No one detected behind</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <LiveRidePreviewTuningPanel tuning={motionTuning} onTuningChange={setMotionTuning} />
    </div>
  );
}
