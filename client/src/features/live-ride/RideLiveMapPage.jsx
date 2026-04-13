import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, NavigationControl, Source } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { featureCollection, point } from '@turf/helpers';
import length from '@turf/length';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { isRideUpcoming, useRideEvent } from '@/features/rides/hooks/useRideEvent';
import { buildRoutePreviewFeatureCollection } from '@/features/routes/utils/routePreviewGeoJson';
import { normalizeTrackToLineString } from '@/features/live-ride/utils/normalizeTrackToLineString';
import { useRideLiveHub } from '@/features/live-ride/hooks/useRideLiveHub';
import { useDesktopSimulator } from '@/features/live-ride/hooks/useDesktopSimulator';
import {
  enableRideLiveDebugFromQuery,
  isRideLiveLogEnabled,
  rideLiveLog,
  rideLiveWarn,
} from '@/features/live-ride/utils/rideLiveLog';

const MAP_PITCH = 55;
const MAP_ZOOM = 15.5;

const routeLineLayer = {
  id: 'ride-live-route-line',
  type: 'line',
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: {
    'line-color': '#6366f1',
    'line-width': 5,
    'line-opacity': 0.88,
  },
};

const peerLayer = {
  id: 'ride-live-peer-circles',
  type: 'circle',
  paint: {
    'circle-radius': 10,
    'circle-color': '#f59e0b',
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
  },
};

function ensurePeersSourceAndLayer(map) {
  if (map.getSource('ride-live-peers')) return;
  map.addSource('ride-live-peers', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });
  map.addLayer({
    id: peerLayer.id,
    type: peerLayer.type,
    source: 'ride-live-peers',
    paint: peerLayer.paint,
  });
}

function ensureSelfPuckSource(map) {
  if (map.getSource('ride-live-self')) return;
  map.addSource('ride-live-self', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [0, 0] },
    },
  });
  map.addLayer({
    id: 'ride-live-self-circle',
    type: 'circle',
    source: 'ride-live-self',
    paint: {
      'circle-radius': 11,
      'circle-color': '#3ecfb9',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });
}

export default function RideLiveMapPage() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapRef = useRef(null);
  const syncPeersStyleWaitLogRef = useRef(0);
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const posRef = useRef({ lat: null, lng: null, heading: null, accuracy: null });

  const { ride, isLoading, isError, error } = useRideEvent(rideId);
  const myUserId = user?.id != null ? Number(user.id) : null;

  const amParticipant = useMemo(() => {
    if (myUserId == null || !ride) return false;
    if (Array.isArray(ride.participants) && ride.participants.length > 0) {
      return ride.participants.map(Number).includes(myUserId);
    }
    if (Array.isArray(ride.participantDetails)) {
      return ride.participantDetails.some((p) => Number(p.userId) === myUserId);
    }
    return false;
  }, [myUserId, ride]);

  const upcoming = ride ? isRideUpcoming(ride) : false;
  const hubEnabled = Boolean(user && amParticipant && upcoming && ride?.routeId);

  const { peersById, status: hubStatus, hubError, sendPose } = useRideLiveHub(rideId, hubEnabled, myUserId);

  const trackGeoJson = useMemo(
    () => buildRoutePreviewFeatureCollection(ride?.preview ?? null),
    [ride?.preview],
  );
  const line = useMemo(() => normalizeTrackToLineString(trackGeoJson), [trackGeoJson]);
  const routeFc = useMemo(() => (line ? featureCollection([line]) : null), [line]);

  const [simMode, setSimMode] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [resetEpoch, setResetEpoch] = useState(0);
  const [speedMps, setSpeedMps] = useState(8);
  const [geoError, setGeoError] = useState(null);

  const peerFc = useMemo(() => {
    const features = [...peersById.values()].map((p) => ({
      type: 'Feature',
      properties: { userId: p.userId },
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    }));
    return featureCollection(features);
  }, [peersById]);

  const peerFcRef = useRef(peerFc);
  useLayoutEffect(() => {
    peerFcRef.current = peerFc;
  }, [peerFc]);

  const syncPeersToMap = useCallback((fc) => {
    const map = mapRef.current?.getMap?.();
    const featureCount = fc?.features?.length ?? 0;
    if (!map) {
      rideLiveWarn('syncPeersToMap: no map ref yet', { featureCount });
      return;
    }
    if (!map.isStyleLoaded?.()) {
      if (isRideLiveLogEnabled() && syncPeersStyleWaitLogRef.current < 8) {
        syncPeersStyleWaitLogRef.current += 1;
        rideLiveLog('syncPeersToMap: style not loaded yet (retry when map ready)', {
          n: syncPeersStyleWaitLogRef.current,
          featureCount,
        });
      }
      return;
    }
    syncPeersStyleWaitLogRef.current = 0;
    ensurePeersSourceAndLayer(map);
    const src = map.getSource('ride-live-peers');
    if (src && typeof src.setData === 'function') {
      src.setData(fc);
      rideLiveLog('syncPeersToMap: setData', {
        featureCount,
        featureIds: (fc?.features ?? []).map((f) => f?.properties?.userId),
      });
    } else {
      rideLiveWarn('syncPeersToMap: missing ride-live-peers source or setData', {
        hasSource: Boolean(src),
      });
    }
  }, []);

  useEffect(() => {
    if (enableRideLiveDebugFromQuery()) {
      rideLiveLog('debugRideLive query → map page saw flag');
    }
  }, []);

  useEffect(() => {
    syncPeersToMap(peerFc);
  }, [peerFc, syncPeersToMap]);

  const initialViewState = useMemo(() => {
    if (!line?.geometry?.coordinates?.[0]) {
      return { longitude: 34.8, latitude: 32.1, zoom: MAP_ZOOM, pitch: MAP_PITCH, bearing: 0 };
    }
    const [lng, lat] = line.geometry.coordinates[0];
    return { longitude: lng, latitude: lat, zoom: MAP_ZOOM, pitch: MAP_PITCH, bearing: 0 };
  }, [line]);

  const applySelfToMap = useCallback((lng, lat, bearing) => {
    const map = mapRef.current?.getMap?.();
    if (map?.isStyleLoaded?.()) {
      map.jumpTo({
        center: [lng, lat],
        bearing: bearing ?? map.getBearing(),
        pitch: MAP_PITCH,
        zoom: MAP_ZOOM,
      });
      const src = map.getSource('ride-live-self');
      if (src && typeof src.setData === 'function') {
        src.setData(point([lng, lat]));
      }
    }
    posRef.current = { lat, lng, heading: bearing, accuracy: simMode ? 5 : posRef.current.accuracy };
  }, [simMode]);

  const onSimFrame = useCallback(
    ({ lng, lat, bearing }) => {
      applySelfToMap(lng, lat, bearing);
      sendPose(lat, lng, bearing, 5);
    },
    [applySelfToMap, sendPose],
  );

  const { handleMapLoad: simHandleMapLoad } = useDesktopSimulator({
    line,
    speedMps,
    playing: simMode && playing,
    resetEpoch,
    onFrame: onSimFrame,
  });

  const onMapLoad = useCallback(
    (e) => {
      const map = e.target;
      rideLiveLog('Map onLoad', {
        styleLoaded: map.isStyleLoaded?.() ?? null,
        peerFeatureCount: peerFcRef.current?.features?.length ?? 0,
      });
      syncPeersToMap(peerFcRef.current);
      ensureSelfPuckSource(map);
      if (line?.geometry?.coordinates?.[0]) {
        const [lng, lat] = line.geometry.coordinates[0];
        applySelfToMap(lng, lat, 0);
      }
      simHandleMapLoad(e);
    },
    [line, applySelfToMap, simHandleMapLoad, syncPeersToMap],
  );

  useEffect(() => {
    if (simMode || !hubEnabled) return undefined;
    if (!navigator.geolocation) {
      const t = window.setTimeout(() => setGeoError('Geolocation is not available in this browser.'), 0);
      return () => clearTimeout(t);
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError(null);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        let heading = pos.coords.heading;
        if (heading != null && Number.isNaN(heading)) heading = null;
        posRef.current = { lat, lng, heading, accuracy };
        applySelfToMap(lng, lat, heading ?? undefined);
        sendPose(lat, lng, heading ?? null, accuracy ?? null);
      },
      (err) => {
        setGeoError(err.message || 'Could not read GPS');
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [simMode, hubEnabled, applySelfToMap, sendPose]);

  useEffect(() => {
    if (!ride || isLoading) return;
    if (!user) {
      navigate(ROUTES.login, { replace: true, state: { from: `/ride/${rideId}/live` } });
      return;
    }
    if (!ride.routeId) {
      navigate(ROUTES.rideEvent.replace(':rideId', String(rideId)), { replace: true });
      return;
    }
    if (!amParticipant || !upcoming) {
      navigate(ROUTES.rideEvent.replace(':rideId', String(rideId)), { replace: true });
    }
  }, [ride, isLoading, user, rideId, navigate, amParticipant, upcoming]);

  if (!token) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#0a0908] px-6 text-center text-fg">
        <h1 className="text-xl font-semibold tracking-tight">Live ride</h1>
        <p className="max-w-md text-sm text-fg-muted">
          Add <code className="rounded bg-surface px-1.5 py-0.5 text-fg">VITE_MAPBOX_ACCESS_TOKEN</code> to{' '}
          <code className="rounded bg-surface px-1.5 py-0.5 text-fg">client/.env.local</code>.
        </p>
        <Link to={ROUTES.rideEvent.replace(':rideId', String(rideId))} className="text-sm text-rydo-purple underline-offset-4 hover:underline">
          Back to ride
        </Link>
      </div>
    );
  }

  if (isLoading || !ride) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#0a0908] text-fg">
        <div className="h-8 w-8 shrink-0 rounded-full border-2 border-border-strong border-t-rydo-purple animate-spin" />
        <p className="text-sm text-fg-muted">Loading ride…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#0a0908] px-6 text-center text-fg">
        <p className="text-sm text-red-400">{error?.message || 'Could not load ride.'}</p>
        <Link to={ROUTES.myRides} className="text-sm text-rydo-purple underline-offset-4 hover:underline">
          My rides
        </Link>
      </div>
    );
  }

  if (!line || !routeFc) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#0a0908] px-6 text-center text-fg">
        <p className="text-sm text-fg-muted">This ride has no usable route line for live view.</p>
        <Link to={ROUTES.rideEvent.replace(':rideId', String(rideId))} className="text-sm text-rydo-purple underline-offset-4 hover:underline">
          Back to ride
        </Link>
      </div>
    );
  }

  const totalLenM = length(line, { units: 'meters' });

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
        <Source id="ride-live-route" type="geojson" data={routeFc}>
          <Layer {...routeLineLayer} />
        </Source>
        <NavigationControl position="top-right" showCompass visualizePitch />
      </Map>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between gap-2 p-3">
        <div className="pointer-events-auto">
          <Link
            to={ROUTES.rideEvent.replace(':rideId', String(rideId))}
            className="inline-flex rounded-2xl border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-3 py-2 text-sm font-medium text-fg shadow backdrop-blur-md"
          >
            Back
          </Link>
        </div>
        <div className="pointer-events-auto rounded-2xl border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-3 py-2 text-xs text-fg-muted shadow backdrop-blur-md">
          Hub: {hubStatus}
          {hubError ? ` · ${hubError.message}` : ''}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
        <div className="pointer-events-auto flex max-w-lg flex-col gap-3 rounded-3xl border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-4 py-3 shadow-lg backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-fg-subtle">Live</span>
            <span className="text-xs text-fg-muted">{ride.name}</span>
          </div>
          <p className="text-xs text-fg-muted">
            {(totalLenM / 1000).toFixed(1)} km route · {peersById.size} other rider
            {peersById.size === 1 ? '' : 's'} with live position
          </p>
          {geoError && !simMode ? <p className="text-xs text-amber-200/90">{geoError}</p> : null}
          <label className="flex cursor-pointer items-center gap-2 text-xs text-fg-muted">
            <input
              type="checkbox"
              checked={simMode}
              onChange={(e) => {
                const on = e.target.checked;
                setSimMode(on);
                if (!on) setPlaying(false);
                setResetEpoch((n) => n + 1);
              }}
            />
            Desktop simulator (fake GPS along route)
          </label>
          {simMode ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (playing) {
                    setPlaying(false);
                    return;
                  }
                  setPlaying(true);
                }}
                className="rounded-2xl bg-rydo-purple px-4 py-2 text-sm font-medium text-white"
              >
                {playing ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setResetEpoch((n) => n + 1);
                }}
                className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium text-fg"
              >
                Reset
              </button>
              <label className="flex items-center gap-2 text-xs text-fg-muted">
                <span>m/s</span>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={speedMps}
                  onChange={(ev) => setSpeedMps(Number(ev.target.value))}
                />
                <span className="tabular-nums">{speedMps}</span>
              </label>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
