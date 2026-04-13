import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Marker, NavigationControl, Source } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { featureCollection } from '@turf/helpers';
import { Crosshair } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { isRideUpcoming, useRideEvent } from '@/features/rides/hooks/useRideEvent';
import { buildRoutePreviewFeatureCollection } from '@/features/routes/utils/routePreviewGeoJson';
import { normalizeTrackToLineString } from '@/features/live-ride/utils/normalizeTrackToLineString';
import { useRideLiveHub } from '@/features/live-ride/hooks/useRideLiveHub';
import LiveRideAvatarMarker from '@/features/live-ride/components/LiveRideAvatarMarker';
import { nearestPeersAheadBehind } from '@/features/live-ride/utils/liveRideNearbyPeers';
import { enableRideLiveDebugFromQuery, rideLiveLog } from '@/features/live-ride/utils/rideLiveLog';

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

function formatSpeedKmh(speedMps) {
  if (speedMps == null || !Number.isFinite(speedMps) || speedMps < 0) return '—';
  return `${(speedMps * 3.6).toFixed(1)} km/h`;
}

function formatDistanceM(m) {
  if (m == null || !Number.isFinite(m)) return '';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export default function RideLiveMapPage() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapRef = useRef(null);
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const followCameraRef = useRef(true);
  const programmaticMoveRef = useRef(false);

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

  const [geoError, setGeoError] = useState(null);
  const [showRecenter, setShowRecenter] = useState(false);
  const [selfFix, setSelfFix] = useState(null);
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [nearbyOpen, setNearbyOpen] = useState(false);

  const selfFixRef = useRef(null);
  useLayoutEffect(() => {
    selfFixRef.current = selfFix;
  }, [selfFix]);

  useEffect(() => {
    if (enableRideLiveDebugFromQuery()) {
      rideLiveLog('debugRideLive query → map page saw flag');
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setClockTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const initialViewState = useMemo(() => {
    if (!line?.geometry?.coordinates?.[0]) {
      return { longitude: 34.8, latitude: 32.1, zoom: MAP_ZOOM, pitch: MAP_PITCH, bearing: 0 };
    }
    const [lng, lat] = line.geometry.coordinates[0];
    return { longitude: lng, latitude: lat, zoom: MAP_ZOOM, pitch: MAP_PITCH, bearing: 0 };
  }, [line]);

  const recenterCamera = useCallback((lng, lat, bearingOpt, { instant } = { instant: false }) => {
    const map = mapRef.current?.getMap?.();
    if (!map?.isStyleLoaded?.()) return;
    programmaticMoveRef.current = true;
    const next = {
      center: [lng, lat],
      bearing: bearingOpt ?? map.getBearing(),
      pitch: MAP_PITCH,
      zoom: MAP_ZOOM,
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

  const onUserAdjustedView = useCallback(() => {
    if (programmaticMoveRef.current) return;
    followCameraRef.current = false;
    setShowRecenter(true);
  }, []);

  const handleRecenterClick = useCallback(() => {
    followCameraRef.current = true;
    setShowRecenter(false);
    const f = selfFixRef.current;
    if (f?.lat != null && f?.lng != null) {
      recenterCamera(f.lng, f.lat, f.heading ?? undefined, { instant: false });
    }
  }, [recenterCamera]);

  const onMapLoad = useCallback(
    (e) => {
      const map = e.target;
      rideLiveLog('Map onLoad', { styleLoaded: map.isStyleLoaded?.() ?? null });
      if (line?.geometry?.coordinates?.[0]) {
        const [lng, lat] = line.geometry.coordinates[0];
        followCameraRef.current = true;
        map.jumpTo({
          center: [lng, lat],
          zoom: MAP_ZOOM,
          pitch: MAP_PITCH,
          bearing: 0,
        });
        setSelfFix({
          lat,
          lng,
          heading: null,
          speed: null,
          accuracy: null,
          previousFix: null,
        });
      }
    },
    [line],
  );

  useEffect(() => {
    if (!hubEnabled) return undefined;
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
        const rawSpeed = pos.coords.speed;
        const speed = Number.isFinite(rawSpeed) && rawSpeed >= 0 ? rawSpeed : null;
        let heading = pos.coords.heading;
        if (heading != null && Number.isNaN(heading)) heading = null;

        setSelfFix((old) => ({
          lat,
          lng,
          heading,
          speed,
          accuracy,
          previousFix: old && old.lat != null && old.lng != null ? { lat: old.lat, lng: old.lng } : null,
        }));

        const map = mapRef.current?.getMap?.();
        if (map?.isStyleLoaded?.() && followCameraRef.current) {
          map.jumpTo({
            center: [lng, lat],
            bearing: heading ?? map.getBearing(),
            pitch: MAP_PITCH,
            zoom: MAP_ZOOM,
          });
        }

        sendPose(lat, lng, heading ?? null, accuracy ?? null);
      },
      (err) => {
        setGeoError(err.message || 'Could not read GPS');
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [hubEnabled, sendPose]);

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

  const nearbyInfo = useMemo(() => {
    return nearestPeersAheadBehind({
      selfLat: selfFix?.lat,
      selfLng: selfFix?.lng,
      headingDeg: selfFix?.heading,
      previousFix: selfFix?.previousFix,
      peers: peersById.values(),
    });
  }, [selfFix, peersById]);

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

  return (
    <div className="fixed inset-0 z-40 h-dvh w-full overflow-hidden bg-[#0a0908]">
      <Map
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
        <Source id="ride-live-route" type="geojson" data={routeFc}>
          <Layer {...routeLineLayer} />
        </Source>
        {selfFix?.lat != null && selfFix?.lng != null ? (
          <Marker longitude={selfFix.lng} latitude={selfFix.lat} anchor="center">
            <LiveRideAvatarMarker
              name={user?.fullName ?? 'You'}
              avatarUrl={user?.avatarUrl}
              isSelf
              headingDeg={showRecenter ? selfFix.heading : null}
            />
          </Marker>
        ) : null}
        {peersList.map((p) => (
          <Marker key={p.userId} longitude={p.lng} latitude={p.lat} anchor="center">
            <LiveRideAvatarMarker name={p.displayName || 'Rider'} avatarUrl={p.avatarUrl} />
          </Marker>
        ))}
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

      {showRecenter ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-30 flex justify-center px-4">
          <button
            type="button"
            onClick={handleRecenterClick}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_92%,transparent)] px-4 py-2 text-sm font-medium text-fg shadow-lg backdrop-blur-md"
          >
            <Crosshair className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            Center on me
          </button>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
        <div className="pointer-events-auto flex w-full max-w-lg flex-col gap-3 rounded-3xl border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-4 py-3 shadow-lg backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm tabular-nums text-fg">
              <span title="Ground speed from GPS">{formatSpeedKmh(selfFix?.speed)}</span>
              <span className="text-fg-muted">·</span>
              <span className="text-fg-muted">{timeLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => setNearbyOpen((o) => !o)}
              className="rounded-full border border-border bg-surface/80 px-3 py-1.5 text-xs font-medium text-fg"
            >
              {nearbyOpen ? 'Hide nearby' : 'Nearby riders'}
            </button>
          </div>
          <p className="text-xs text-fg-muted">
            {peersById.size} other rider{peersById.size === 1 ? '' : 's'} live
          </p>
          {geoError ? <p className="text-xs text-amber-200/90">{geoError}</p> : null}

          {nearbyOpen ? (
            <div className="border-t border-border pt-3 text-xs text-fg">
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
    </div>
  );
}
