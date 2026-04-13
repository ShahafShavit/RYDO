import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { clubChatApi } from '@/features/club-chat/api/club-chat-api';
import { useClubChatUi } from '@/features/club-chat/club-chat-ui-context';
import LiveRideAvatarMarker from '@/features/live-ride/components/LiveRideAvatarMarker';
import { useRideLiveHub } from '@/features/live-ride/hooks/useRideLiveHub';
import { nearestPeersAheadBehind } from '@/features/live-ride/utils/liveRideNearbyPeers';
import { normalizeTrackToLineString } from '@/features/live-ride/utils/normalizeTrackToLineString';
import { enableRideLiveDebugFromQuery, rideLiveLog } from '@/features/live-ride/utils/rideLiveLog';
import { isRideUpcoming, useRideEvent } from '@/features/rides/hooks/useRideEvent';
import { buildRoutePreviewFeatureCollection } from '@/features/routes/utils/routePreviewGeoJson';
import { env } from '@/shared/config/env';
import { useQuery } from '@tanstack/react-query';
import { featureCollection } from '@turf/helpers';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Crosshair,
  Gauge,
  Loader2,
  MessageCircle,
  Users,
  XCircle,
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Marker, NavigationControl, Source } from 'react-map-gl/mapbox';
import { Link, useNavigate, useParams } from 'react-router-dom';

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

/** Clears Mapbox logo + attribution (~2.75rem) plus safe area. */
const LIVE_MAP_BOTTOM_INSET = 'max(1.25rem, calc(2.75rem + env(safe-area-inset-bottom)))';

function LiveHubStatusChip({ hubStatus, hubError }) {
  const connecting = hubStatus === 'connecting';
  const connected = hubStatus === 'connected' && !hubError;

  if (connected) {
    return (
      <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-3 py-2 text-xs font-medium text-fg shadow backdrop-blur-md">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
        <span>Connected</span>
      </div>
    );
  }

  if (connecting) {
    return (
      <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-3 py-2 text-xs font-medium text-fg-muted shadow backdrop-blur-md">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-fg-muted" aria-hidden />
        <span>Connecting…</span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-3 py-2 text-xs font-medium text-fg shadow backdrop-blur-md md:max-w-[min(100%,14rem)]"
      title={hubError?.message || undefined}
    >
      <XCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden />
      <span className="line-clamp-2 wrap-break-word md:line-clamp-1">No Connection</span>
    </div>
  );
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
  const { openChat } = useClubChatUi();

  const summaryQuery = useQuery({
    queryKey: ['clubChat', 'summary'],
    queryFn: () => clubChatApi.getSummary(),
    enabled: !!user?.id && !env.isMockApi,
    staleTime: 15_000,
  });

  const chatUnread = useMemo(() => {
    const rows = summaryQuery.data || [];
    if (ride?.clubId != null && String(ride.clubId) !== '') {
      const id = Number(ride.clubId);
      if (Number.isFinite(id)) {
        return rows.find((s) => s.clubId === id)?.unreadCount ?? 0;
      }
    }
    return rows.reduce((a, r) => a + (r.unreadCount || 0), 0);
  }, [summaryQuery.data, ride?.clubId]);

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
        const speed = Number.isFinite(rawSpeed) && rawSpeed >= 0 ? rawSpeed : 0;
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
      <div className="fixed inset-0 z-(--rydo-z-live-blocking) flex flex-col items-center justify-center gap-4 bg-[#0a0908] px-6 text-center text-fg">
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
      <div className="fixed inset-0 z-(--rydo-z-live-blocking) flex flex-col items-center justify-center gap-3 bg-[#0a0908] text-fg">
        <div className="h-8 w-8 shrink-0 rounded-full border-2 border-border-strong border-t-rydo-purple animate-spin" />
        <p className="text-sm text-fg-muted">Loading ride…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="fixed inset-0 z-(--rydo-z-live-blocking) flex flex-col items-center justify-center gap-4 bg-[#0a0908] px-6 text-center text-fg">
        <p className="text-sm text-red-400">{error?.message || 'Could not load ride.'}</p>
        <Link to={ROUTES.myRides} className="text-sm text-rydo-purple underline-offset-4 hover:underline">
          My rides
        </Link>
      </div>
    );
  }

  if (!line || !routeFc) {
    return (
      <div className="fixed inset-0 z-(--rydo-z-live-blocking) flex flex-col items-center justify-center gap-4 bg-[#0a0908] px-6 text-center text-fg">
        <p className="text-sm text-fg-muted">This ride has no usable route line for live view.</p>
        <Link to={ROUTES.rideEvent.replace(':rideId', String(rideId))} className="text-sm text-rydo-purple underline-offset-4 hover:underline">
          Back to ride
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-(--rydo-z-live-map) h-dvh w-full overflow-hidden bg-[#0a0908]">
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

      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex flex-row flex-wrap items-center gap-2 p-3 max-md:pr-[4.5rem] md:justify-between"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="pointer-events-auto flex min-w-0 flex-wrap items-center gap-2">
          <Link
            to={ROUTES.rideEvent.replace(':rideId', String(rideId))}
            className="inline-flex rounded-2xl border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-3 py-2 text-sm font-medium text-fg shadow backdrop-blur-md"
          >
            Back
          </Link>
          <LiveHubStatusChip hubStatus={hubStatus} hubError={hubError} />
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 pt-2"
        style={{ paddingBottom: LIVE_MAP_BOTTOM_INSET }}
      >
        {showRecenter || (user && !env.isMockApi) ? (
          <div className="pointer-events-auto relative h-14 w-full shrink-0">
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
            {user && !env.isMockApi ? (
              <button
                type="button"
                aria-label="Open club chat"
                onClick={() => openChat()}
                className="absolute top-1/2 z-[2] flex h-14 w-14 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-rydo-purple text-white shadow-lg shadow-rydo-purple/30 transition-[transform,box-shadow,background-color] duration-200 ease-out hover:scale-105 hover:border-white/25 hover:shadow-xl hover:shadow-rydo-purple/40 active:scale-95"
                style={{ right: 'max(1rem, env(safe-area-inset-right))' }}
              >
                <MessageCircle className="h-7 w-7" aria-hidden />
                {chatUnread > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                    {chatUnread > 99 ? '99+' : chatUnread}
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="pointer-events-auto mx-auto flex w-[min(92vw,32rem)] shrink-0 flex-col gap-3 rounded-3xl border border-white/12 bg-[color-mix(in_srgb,var(--rydo-bg-deep)_92%,transparent)] p-4 shadow-[0_-8px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
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
                    title="Ground speed from GPS"
                  >
                    {formatSpeedKmh(selfFix?.speed)}
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
    </div>
  );
}
