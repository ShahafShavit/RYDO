import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { clubChatApi } from '@/features/club-chat/api/club-chat-api';
import { useClubChatUi } from '@/features/club-chat/club-chat-ui-context';
import LiveRideAvatarMarker from '@/features/live-ride/components/LiveRideAvatarMarker';
import LiveRideBootOverlay from '@/features/live-ride/components/LiveRideBootOverlay';
import LiveRideMapAttribution from '@/features/live-ride/components/LiveRideMapAttribution';
import { hubChipLabel, peersSnapshotUncertain } from '@/features/live-ride/connectivity/rideLiveConnectivity';
import { useLiveRideBootGate, useLiveRideBootPermissions } from '@/features/live-ride/hooks/useLiveRideBootGate';
import { useLiveRideMotionFromPositions } from '@/features/live-ride/hooks/useLiveRideMotionFromPositions';
import { useMapboxResize } from '@/features/live-ride/hooks/useMapboxResize';
import { useRideLiveHub } from '@/features/live-ride/hooks/useRideLiveHub';
import { LIVE_MAP_SAFE_BOTTOM } from '@/features/live-ride/liveRideMapLayout';
import { subscribeDeviceCompass } from '@/features/live-ride/utils/liveRideCompass';
import { topPeersByDistance } from '@/features/live-ride/utils/liveRideNearbyPeers';
import { normalizeTrackToLineString } from '@/features/live-ride/utils/normalizeTrackToLineString';
import { enableRideLiveDebugFromQuery, rideLiveLog } from '@/features/live-ride/utils/rideLiveLog';
import { isRideUpcoming, useRideEvent } from '@/features/rides/hooks/useRideEvent';
import { buildRoutePreviewFeatureCollection } from '@/features/routes/utils/routePreviewGeoJson';
import { env } from '@/shared/config/env';
import { usePageBreadcrumbDetail } from '@/shared/context/BreadcrumbContext';
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
  X,
  XCircle,
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Marker, NavigationControl, Source } from 'react-map-gl/mapbox';
import { useNavigate, useParams, Link } from 'react-router-dom';

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

function NearbyPeerRow({ peer }) {
  const name = peer.displayName || `Rider ${peer.userId}`;
  return (
    <li className="flex items-center justify-between gap-2">
      <span className={`min-w-0 truncate ${peer.isStale ? 'text-fg-muted' : ''}`}>{name}</span>
      {peer.isStale ? (
        <X className="h-3.5 w-3.5 shrink-0 text-red-400" strokeWidth={2.5} aria-hidden />
      ) : (
        <span className="shrink-0 tabular-nums text-fg-muted">{formatDistanceM(peer.distanceM)}</span>
      )}
    </li>
  );
}

const hubChipShell =
  'inline-flex max-w-full items-center gap-2 rounded-2xl border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-3 py-2 text-xs font-medium shadow backdrop-blur-md';

function LiveHubStatusChip({ transportState, hubError, onRetry }) {
  const joined = transportState === 'joined' && !hubError;
  const spinner = <Loader2 className="h-4 w-4 shrink-0 animate-spin text-fg-muted" aria-hidden />;

  if (joined) {
    return (
      <div className={`${hubChipShell} border-border text-fg`}>
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
        <span>Live</span>
      </div>
    );
  }

  if (transportState === 'connecting' || transportState === 'syncing' || transportState === 'idle') {
    const label = hubChipLabel(transportState === 'idle' ? 'connecting' : transportState);
    return (
      <div className={`${hubChipShell} border-border text-fg-muted`}>
        {spinner}
        <span>{label}</span>
      </div>
    );
  }

  if (transportState === 'reconnecting') {
    return (
      <div className={`${hubChipShell} border-amber-500/35 text-amber-100/95`}>
        {spinner}
        <span>{hubChipLabel(transportState)}</span>
      </div>
    );
  }

  if (transportState === 'offline' || transportState === 'error') {
    const label = hubChipLabel(transportState);
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div
          className={`${hubChipShell} border-red-500/30 text-fg md:max-w-[min(100%,14rem)]`}
          title={hubError?.message || undefined}
        >
          <XCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden />
          <span className="line-clamp-2 wrap-break-word md:line-clamp-1">{label}</span>
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-3 py-2 text-xs font-medium text-fg shadow backdrop-blur-md hover:border-white/20"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`${hubChipShell} border-border text-fg md:max-w-[min(100%,14rem)]`}
      title={hubError?.message || undefined}
    >
      <XCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden />
      <span className="line-clamp-2 wrap-break-word md:line-clamp-1">
        {hubChipLabel(transportState) ?? 'No Connection'}
      </span>
    </div>
  );
}

/**
 * @param {{ moduleReady?: boolean }} props
 */
export default function RideLiveMapPage({ moduleReady = true }) {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const followCameraRef = useRef(true);
  const programmaticMoveRef = useRef(false);

  const { ride, isLoading, isError, error } = useRideEvent(rideId);

  usePageBreadcrumbDetail(ride?.name);

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

  const trackGeoJson = useMemo(
    () => buildRoutePreviewFeatureCollection(ride?.preview ?? null),
    [ride?.preview],
  );
  const line = useMemo(() => normalizeTrackToLineString(trackGeoJson), [trackGeoJson]);
  const routeFc = useMemo(() => (line ? featureCollection([line]) : null), [line]);

  const permissions = useLiveRideBootPermissions({ moduleReady });

  const { peersById, transportState, hubError, offerPose, retryHub } = useRideLiveHub(
    rideId,
    hubEnabled && permissions.permissionsReady,
    myUserId,
  );

  const [showRecenter, setShowRecenter] = useState(false);
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [nearbyOpen, setNearbyOpen] = useState(false);

  const compassHeadingRef = useRef(null);

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

  const { geoError, selfFix, puckDisplay, puckDisplayRef } = useLiveRideMotionFromPositions({
    motionLoopEnabled: hubEnabled && permissions.permissionsReady,
    useDeviceGps: true,
    replayFixes: null,
    replayPlaying: false,
    replayEpoch: 0,
    offerPose,
    applyFollowCamera,
    followCameraRef,
    compassHeadingRef,
  });

  const activeBoot = useLiveRideBootGate({
    moduleReady,
    rideLoading: isLoading,
    ride,
    line,
    routeFc,
    isError,
    permissionsReady: permissions.permissionsReady,
    permissions,
    mapRef,
    selfFix,
    puckDisplay,
    geoError,
  });

  useEffect(() => {
    if (!hubEnabled || !activeBoot.canMountHiddenMap) {
      compassHeadingRef.current = null;
      return undefined;
    }
    return subscribeDeviceCompass((h) => {
      compassHeadingRef.current = h;
    });
  }, [hubEnabled, activeBoot.canMountHiddenMap]);

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

  const mapShellReady = Boolean(token && activeBoot.canMountHiddenMap && line && routeFc);
  const resizeMap = useMapboxResize(mapRef, containerRef, mapShellReady);

  const onMapLoad = useCallback(
    (e) => {
      rideLiveLog('Map onLoad');
      activeBoot.handleMapLoad(e.target);
      resizeMap();
    },
    [activeBoot, resizeMap],
  );

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

  const selfLatForNearby = puckDisplay?.lat ?? selfFix?.lat;
  const selfLngForNearby = puckDisplay?.lng ?? selfFix?.lng;

  const nearbyListPeers = useMemo(
    () => topPeersByDistance(selfLatForNearby, selfLngForNearby, peersById.values(), 4),
    [selfLatForNearby, selfLngForNearby, peersById],
  );

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

  const backTo = ROUTES.rideEvent.replace(':rideId', String(rideId));

  const fatalError = useMemo(() => {
    if (!token) {
      return 'Mapbox is not configured. Add VITE_MAPBOX_ACCESS_TOKEN to client/.env.local.';
    }
    if (!isLoading && isError) {
      return error?.message || 'Could not load this ride.';
    }
    if (!isLoading && ride && !line) {
      return 'This ride has no usable route line for live view.';
    }
    return null;
  }, [token, isLoading, isError, error, ride, line]);

  if (fatalError) {
    return (
      <LiveRideBootOverlay
        milestones={activeBoot.milestones}
        label="Unable to start live ride"
        bootBlocked={false}
        needsLocationAction={false}
        needsOrientationAction={false}
        permissionRequestInFlight={false}
        fatalError={fatalError}
        backTo={backTo}
        rideName={ride?.name}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="rydo-live-map fixed inset-0 z-(--rydo-z-live-map) h-dvh w-full overflow-hidden bg-[#0a0908]"
    >
      {mapShellReady ? (
        <div
          className={
            activeBoot.bootComplete
              ? 'h-full w-full'
              : 'pointer-events-none opacity-0 h-full w-full'
          }
          aria-hidden={!activeBoot.bootComplete}
        >
          <Map
            ref={mapRef}
            mapboxAccessToken={token}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            attributionControl={false}
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
            {(() => {
              const puck =
                puckDisplay?.lat != null && puckDisplay?.lng != null ? puckDisplay : selfFix;
              if (puck?.lat == null || puck?.lng == null) return null;
              return (
                <Marker longitude={puck.lng} latitude={puck.lat} anchor="center">
                  <LiveRideAvatarMarker
                    name={user?.fullName ?? 'You'}
                    avatarUrl={user?.avatarUrl}
                    isSelf
                    headingDeg={null}
                  />
                </Marker>
              );
            })()}
            {peersList.map((p) => (
              <Marker key={p.userId} longitude={p.lng} latitude={p.lat} anchor="center">
                <LiveRideAvatarMarker
                  name={p.displayName || 'Rider'}
                  avatarUrl={p.avatarUrl}
                  stale={Boolean(p.isStale)}
                />
              </Marker>
            ))}
            <NavigationControl position="top-right" showCompass visualizePitch />
          </Map>

          {activeBoot.bootComplete ? (
            <>
              <div
                className="rydo-live-map-chrome pointer-events-none absolute inset-x-0 top-0 flex flex-row flex-wrap items-center gap-2 p-3 max-md:pr-[4.5rem] md:justify-between"
                style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
              >
                <div className="pointer-events-auto flex min-w-0 flex-wrap items-center gap-2">
                  <Link
                    to={backTo}
                    className="inline-flex rounded-2xl border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-3 py-2 text-sm font-medium text-fg shadow backdrop-blur-md"
                  >
                    Back
                  </Link>
                  <LiveHubStatusChip
                    transportState={transportState}
                    hubError={hubError}
                    onRetry={hubEnabled ? retryHub : undefined}
                  />
                  {peersSnapshotUncertain(transportState) ? (
                    <p className="w-full text-[11px] text-amber-200/80">
                      Rider positions may be outdated until sync completes.
                    </p>
                  ) : null}
                </div>
              </div>

              <div
                className="rydo-live-map-chrome pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 pt-1"
                style={{ paddingBottom: LIVE_MAP_SAFE_BOTTOM }}
              >
                {showRecenter || (user && !env.isMockApi) ? (
                  <div className="pointer-events-auto relative h-11 w-full shrink-0">
                    {!showRecenter && puckDisplay && hubEnabled ? (
                      <div
                        className="pointer-events-none absolute left-[max(1rem,env(safe-area-inset-left))] top-1/2 inline-flex max-w-[min(42%,11rem)] -translate-y-1/2 items-center gap-1.5 rounded-full border border-emerald-500/35 bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-2.5 py-1.5 text-[11px] font-medium text-emerald-100/90 shadow backdrop-blur-md sm:max-w-none sm:px-3 sm:text-xs"
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
                        className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_92%,transparent)] px-4 py-2 text-sm font-medium text-fg shadow-lg backdrop-blur-md"
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
                        className="absolute top-1/4 flex h-13 w-13 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-rydo-purple text-white shadow-lg shadow-rydo-purple/30 transition-[transform,box-shadow,background-color] duration-200 ease-out hover:scale-105 hover:border-white/25 hover:shadow-xl hover:shadow-rydo-purple/40 active:scale-95"
                        style={{ right: 'max(1rem, env(safe-area-inset-right))' }}
                      >
                        <MessageCircle className="h-5 w-5" aria-hidden />
                        {chatUnread > 0 ? (
                          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                            {chatUnread > 99 ? '99+' : chatUnread}
                          </span>
                        ) : null}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <div className="pointer-events-auto mx-auto flex w-[min(92vw,32rem)] shrink-0 flex-col gap-1.5 rounded-2xl border border-white/12 bg-[color-mix(in_srgb,var(--rydo-bg-deep)_92%,transparent)] p-2.5 shadow-[0_-8px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                  <div className="flex w-full items-center gap-0 rounded-xl border border-white/10 bg-black/28 px-2.5 py-1.5">
                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <Gauge className="h-3.5 w-3.5 shrink-0 text-rydo-purple/85" strokeWidth={2} aria-hidden />
                        <p className="min-w-0 truncate text-xs leading-tight text-fg">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                            Speed
                          </span>
                          <span className="mx-1 text-fg-subtle" aria-hidden>
                            ·
                          </span>
                          <span className="font-semibold tabular-nums" title="Ground speed from GPS">
                            {formatSpeedKmh(selfFix?.speedFiltered)}
                          </span>
                        </p>
                      </div>
                      <div className="hidden h-6 w-px shrink-0 bg-white/12 sm:block" aria-hidden />
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-[#3ecfb9]/90" strokeWidth={2} aria-hidden />
                        <p className="min-w-0 truncate text-xs leading-tight text-fg">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                            Time
                          </span>
                          <span className="mx-1 text-fg-subtle" aria-hidden>
                            ·
                          </span>
                          <span className="font-semibold tabular-nums">{timeLabel}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {geoError ? (
                    <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-center text-[11px] text-amber-100/95">
                      {geoError}
                    </p>
                  ) : null}

                  <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-black/22">
                    <button
                      type="button"
                      onClick={() => setNearbyOpen((o) => !o)}
                      aria-expanded={nearbyOpen}
                      aria-controls="nearby-riders-panel"
                      aria-label={nearbyOpen ? 'Hide nearby riders' : 'Show nearby riders'}
                      className="flex w-full items-center gap-2 rounded-none border-0 bg-transparent px-2.5 py-1.5 text-left transition hover:bg-black/30 active:scale-[0.99]"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-rydo-purple/20 text-rydo-purple">
                        <Users className="h-3 w-3" strokeWidth={2} aria-hidden />
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
                    {nearbyOpen ? (
                      <div
                        id="nearby-riders-panel"
                        className="max-h-[min(40vh,16rem)] overflow-y-auto border-t border-white/[0.06] px-2.5 py-2 text-xs text-fg md:max-h-[min(50vh,20rem)]"
                      >
                        {nearbyListPeers.length === 0 ? (
                          <p className="text-fg-muted">No other riders to compare yet.</p>
                        ) : (
                          <ul className="space-y-1">
                            {nearbyListPeers.map((p) => (
                              <NearbyPeerRow key={p.userId} peer={p} />
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <LiveRideMapAttribution />
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {!activeBoot.bootComplete ? (
        <LiveRideBootOverlay
          rideName={ride?.name}
          milestones={activeBoot.milestones}
          label={activeBoot.label}
          bootBlocked={activeBoot.bootBlocked}
          blockingReason={activeBoot.blockingReason}
          needsLocationAction={activeBoot.needsLocationAction}
          needsOrientationAction={activeBoot.needsOrientationAction}
          permissionRequestInFlight={activeBoot.permissionRequestInFlight}
          onRequestLocation={activeBoot.requestLocation}
          onRequestOrientation={activeBoot.requestOrientation}
          onRetry={activeBoot.retryAll}
          backTo={backTo}
          fadingOut={activeBoot.fadingOut}
        />
      ) : null}
    </div>
  );
}
