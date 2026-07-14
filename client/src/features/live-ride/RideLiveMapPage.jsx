import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';
import { rideEventWindow } from '@/features/rides/utils/rideEventWindow';
import { RideChatFab } from '@/features/ride-chat/components/RideChatPanel';
import HazardReportSheet from '@/features/hazards/components/HazardReportSheet';
import HazardVoteSheet from '@/features/hazards/components/HazardVoteSheet';
import LiveHazardMarker from '@/features/hazards/components/LiveHazardMarker';
import { HAZARD_VOTE_RADIUS_M, hazardTypeIcon, hazardTypeLabel } from '@/features/hazards/hazard-constants';
import { useReportLiveHazard, useVoteHazard } from '@/features/hazards/hooks/useHazardMutations';
import { useHazardExitBuffer } from '@/features/hazards/hooks/useHazardExitBuffer';
import { useNewHazardIds } from '@/features/hazards/hooks/useNewHazardIds';
import { applyLocalUserVote } from '@/features/hazards/utils/hazardHubState';
import { buildHazardMarkerLayout } from '@/features/hazards/utils/hazardMarkerLayout';
import {
  hazardAccordionVariants,
  hazardListItemVariants,
  hazardListStagger,
  hazardToastVariants,
  hazardTransition,
} from '@/features/hazards/utils/hazard-motion';
import LiveRideAvatarMarker from '@/features/live-ride/components/LiveRideAvatarMarker';
import LiveRideBootOverlay from '@/features/live-ride/components/LiveRideBootOverlay';
import LiveRideMapAttribution from '@/features/live-ride/components/LiveRideMapAttribution';
import { hubChipLabel, peersSnapshotUncertain } from '@/features/live-ride/connectivity/rideLiveConnectivity';
import { useLiveRideBootGate, useLiveRideBootPermissions } from '@/features/live-ride/hooks/useLiveRideBootGate';
import { useLiveRideMotionFromPositions } from '@/features/live-ride/hooks/useLiveRideMotionFromPositions';
import { useMapboxResize } from '@/features/live-ride/hooks/useMapboxResize';
import { usePeerMotionDisplay } from '@/features/live-ride/hooks/usePeerMotionDisplay';
import { useRideLiveHub } from '@/features/live-ride/hooks/useRideLiveHub';
import { LIVE_MAP_SAFE_BOTTOM, LIVE_MAP_SAFE_TOP } from '@/features/live-ride/liveRideMapLayout';
import { getCompassProvider } from '@/shared/platform/compass-provider';
import { topPeersByDistance, topHazardsByDistance, haversineDistanceM } from '@/features/live-ride/utils/liveRideNearbyPeers';
import { normalizeTrackToLineString } from '@/features/live-ride/utils/normalizeTrackToLineString';
import { enableRideLiveDebugFromQuery, rideLiveLog } from '@/features/live-ride/utils/rideLiveLog';
import { useRideEvent } from '@/features/rides/hooks/useRideEvent';
import { buildRoutePreviewFeatureCollection } from '@/features/routes/utils/routePreviewGeoJson';
import { env } from '@/shared/config/env';
import { usePageBreadcrumbDetail } from '@/shared/context/BreadcrumbContext';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { featureCollection } from '@turf/helpers';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Crosshair,
  Gauge,
  Loader2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { Layer, Marker, NavigationControl, Source } from 'react-map-gl/mapbox';
import { useNavigate, useParams, Link } from 'react-router-dom';

const MAP_PITCH = 55;
const MotionDiv = motion.div;
const MotionUl = motion.ul;
const MotionLi = motion.li;
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

function NearbyPeerRow({ peer, formatShortDistance, onFocus }) {
  const name = peer.displayName || `Rider ${peer.userId}`;
  if (peer.isStale) {
    return (
      <li className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-fg-muted">{name}</span>
        <X className="h-3.5 w-3.5 shrink-0 text-red-400" strokeWidth={2.5} aria-hidden />
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        onClick={() => onFocus(peer.lng, peer.lat)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border-0 bg-transparent px-1 py-0.5 text-left transition hover:bg-black/25 active:scale-[0.99]"
      >
        <span className="min-w-0 truncate">{name}</span>
        <span className="shrink-0 tabular-nums text-fg-muted">{formatShortDistance(peer.distanceM)}</span>
      </button>
    </li>
  );
}

function NearbyHazardRow({ hazard, formatShortDistance, onFocus }) {
  const label = hazardTypeLabel(hazard.type);
  const icon = hazardTypeIcon(hazard.type);
  const desc = hazard.description?.trim();
  return (
    <MotionLi variants={hazardListItemVariants}>
      <button
        type="button"
        onClick={() => onFocus(hazard)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border-0 bg-transparent px-1 py-0.5 text-left transition hover:bg-black/25 active:scale-[0.99]"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-sm" aria-hidden>
            {icon}
          </span>
          <span className="min-w-0 truncate">
            <span className="font-medium">{label}</span>
            {desc ? (
              <span className="text-fg-muted">
                {' · '}
                {desc.length > 40 ? `${desc.slice(0, 40)}…` : desc}
              </span>
            ) : null}
          </span>
        </span>
        <span className="shrink-0 tabular-nums text-fg-muted">{formatShortDistance(hazard.distanceM)}</span>
      </button>
    </MotionLi>
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
  const { formatSpeed, formatShortDistance } = useFormatDistance();
  const reducedMotion = useReducedMotion();
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const followCameraRef = useRef(true);
  const programmaticMoveRef = useRef(false);

  const { ride, isLoading, isError, error } = useRideEvent(rideId);

  usePageBreadcrumbDetail(ride?.name);

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

  const eventWindow = ride ? rideEventWindow(ride) : null;
  const liveAvailable = Boolean(eventWindow?.liveAvailable);
  const hubEnabled = Boolean(user && amParticipant && liveAvailable && ride?.routeId);

  const trackGeoJson = useMemo(
    () => buildRoutePreviewFeatureCollection(ride?.preview ?? null),
    [ride?.preview],
  );
  const line = useMemo(() => normalizeTrackToLineString(trackGeoJson), [trackGeoJson]);
  const routeFc = useMemo(() => (line ? featureCollection([line]) : null), [line]);

  const permissions = useLiveRideBootPermissions({ moduleReady });

  const { peersById, hazards, setHazardsById, transportState, hubError, offerPose, retryHub } = useRideLiveHub(
    rideId,
    hubEnabled && permissions.permissionsReady,
    myUserId,
  );

  const newHazardIds = useNewHazardIds(hazards);
  const { displayHazards, exitingIds, onMarkerExitComplete } = useHazardExitBuffer(hazards);

  const [showRecenter, setShowRecenter] = useState(false);
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [bottomPanelSection, setBottomPanelSection] = useState(null);
  const [hazardSheetOpen, setHazardSheetOpen] = useState(false);
  const [selectedHazardId, setSelectedHazardId] = useState(null);
  const [hazardVoteSheetOpen, setHazardVoteSheetOpen] = useState(false);
  const [hazardNotice, setHazardNotice] = useState(null);
  const [mapZoom, setMapZoom] = useState(MAP_ZOOM);

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

  const focusMapOnTarget = useCallback(
    (lng, lat) => {
      if (lng == null || lat == null || !Number.isFinite(lng) || !Number.isFinite(lat)) return;
      followCameraRef.current = false;
      setShowRecenter(true);
      recenterCamera(lng, lat, undefined, { instant: false });
    },
    [recenterCamera],
  );

  const toggleBottomPanelSection = useCallback((section) => {
    setBottomPanelSection((prev) => (prev === section ? null : section));
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

  const displayPeersById = usePeerMotionDisplay({
    peersById,
    enabled: activeBoot.bootComplete && hubEnabled,
  });

  const reportHazardMutation = useReportLiveHazard({
    rideId,
    onSuccess: (hazard) => {
      if (hazard.bumped) {
        setHazardNotice('Added to existing hazard nearby');
        setTimeout(() => setHazardNotice(null), 3000);
      }
      setHazardsById((prev) => {
        const next = new Map(prev);
        next.set(hazard.id, hazard);
        return next;
      });
    },
  });

  const voteHazardMutation = useVoteHazard({
    onSuccess: (result, variables) => {
      setHazardsById((prev) => {
        let next = applyLocalUserVote(prev, variables.hazardId, result?.userVote ?? variables.value);
        const existing = next.get(variables.hazardId);
        if (existing && result?.score != null) {
          next = new Map(next);
          if (result.status === 'hidden' || result.score <= 0) {
            next.delete(variables.hazardId);
            setSelectedHazardId(null);
            setHazardVoteSheetOpen(false);
          } else {
            next.set(variables.hazardId, {
              ...existing,
              score: result.score,
              status: result.status,
              userVote:
                result.userVote === 1 || result.userVote === -1
                  ? result.userVote
                  : result.userVote == null
                    ? null
                    : existing.userVote,
            });
          }
        }
        return next;
      });
    },
  });

  const puckCoords = puckDisplay?.lat != null && puckDisplay?.lng != null ? puckDisplay : selfFix;

  const selectedHazard = useMemo(
    () => hazards.find((h) => h.id === selectedHazardId) ?? null,
    [hazards, selectedHazardId],
  );

  const hazardMarkerLayout = useMemo(
    () => buildHazardMarkerLayout(displayHazards, { zoom: mapZoom }),
    [displayHazards, mapZoom],
  );

  const canVoteOnSelected = useMemo(() => {
    if (!selectedHazard || puckCoords?.lat == null || puckCoords?.lng == null) return false;
    return (
      haversineDistanceM(
        puckCoords.lat,
        puckCoords.lng,
        selectedHazard.location.lat,
        selectedHazard.location.lng,
      ) <= HAZARD_VOTE_RADIUS_M
    );
  }, [selectedHazard, puckCoords]);

  const handleReportHazard = async ({ type, description }) => {
    if (puckCoords?.lat == null || puckCoords?.lng == null) return;
    await reportHazardMutation.mutateAsync({
      type,
      description,
      latitude: puckCoords.lat,
      longitude: puckCoords.lng,
    });
  };

  const handleVoteHazard = async (value) => {
    const hazardId = selectedHazard?.id;
    const lat = puckCoords?.lat;
    const lng = puckCoords?.lng;
    if (hazardId == null || lat == null || lng == null) return;
    try {
      await voteHazardMutation.mutateAsync({
        hazardId,
        rideId: Number(rideId),
        latitude: lat,
        longitude: lng,
        value,
      });
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Could not submit vote. Try again.';
      setHazardNotice(message);
      setTimeout(() => setHazardNotice(null), 3000);
    }
  };

  const handleFocusPeer = useCallback(
    (lng, lat) => {
      focusMapOnTarget(lng, lat);
    },
    [focusMapOnTarget],
  );

  const handleFocusHazardFromList = useCallback(
    (hazard) => {
      setSelectedHazardId(hazard.id);
      setHazardVoteSheetOpen(true);
      focusMapOnTarget(hazard.location.lng, hazard.location.lat);
    },
    [focusMapOnTarget],
  );

  const handleFocusHazardFromMarker = useCallback(
    (hazard) => {
      setSelectedHazardId(hazard.id);
      setHazardVoteSheetOpen(true);
      focusMapOnTarget(hazard.location.lng, hazard.location.lat);
    },
    [focusMapOnTarget],
  );

  const handleCloseHazardVoteSheet = useCallback(() => {
    setSelectedHazardId(null);
    setHazardVoteSheetOpen(false);
  }, []);

  useEffect(() => {
    if (!hubEnabled || !activeBoot.canMountHiddenMap) {
      compassHeadingRef.current = null;
      return undefined;
    }
    return getCompassProvider().subscribe((h) => {
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
    if (!amParticipant || !liveAvailable) {
      navigate(ROUTES.rideEvent.replace(':rideId', String(rideId)), { replace: true });
    }
  }, [ride, isLoading, user, rideId, navigate, amParticipant, liveAvailable]);

  const selfLatForNearby = puckDisplay?.lat ?? selfFix?.lat;
  const selfLngForNearby = puckDisplay?.lng ?? selfFix?.lng;

  const nearbyListPeers = useMemo(
    () => topPeersByDistance(selfLatForNearby, selfLngForNearby, displayPeersById.values(), 4),
    [selfLatForNearby, selfLngForNearby, displayPeersById],
  );

  const nearbyListHazards = useMemo(
    () => topHazardsByDistance(selfLatForNearby, selfLngForNearby, hazards, 4),
    [selfLatForNearby, selfLngForNearby, hazards],
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

  const peersList = useMemo(() => [...displayPeersById.values()], [displayPeersById]);

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
          <MapGL
            ref={mapRef}
            mapboxAccessToken={token}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            attributionControl={false}
            initialViewState={initialViewState}
            onLoad={onMapLoad}
            onMove={(evt) => setMapZoom(evt.viewState.zoom)}
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
                <button
                  type="button"
                  onClick={() => !p.isStale && handleFocusPeer(p.lng, p.lat)}
                  disabled={Boolean(p.isStale)}
                  className="border-0 bg-transparent p-0 disabled:cursor-default"
                  aria-label={`Center map on ${p.displayName || 'rider'}`}
                >
                  <LiveRideAvatarMarker
                    name={p.displayName || 'Rider'}
                    avatarUrl={p.avatarUrl}
                    stale={Boolean(p.isStale)}
                  />
                </button>
              </Marker>
            ))}
            {displayHazards.map((hazard) => {
              const layout = hazardMarkerLayout.get(hazard.id);
              const anchorLat = layout?.anchorLat ?? hazard.location.lat;
              const anchorLng = layout?.anchorLng ?? hazard.location.lng;
              const isExiting = exitingIds.has(hazard.id);

              return (
                <Marker
                  key={hazard.id}
                  longitude={anchorLng}
                  latitude={anchorLat}
                  anchor="center"
                >
                  <LiveHazardMarker
                    hazard={hazard}
                    selected={selectedHazardId === hazard.id}
                    isNew={newHazardIds.has(hazard.id)}
                    isExiting={isExiting}
                    offsetPx={layout?.offsetPx}
                    clusterSize={layout?.clusterSize ?? 1}
                    onClick={() => handleFocusHazardFromMarker(hazard)}
                    onExitComplete={onMarkerExitComplete}
                  />
                </Marker>
              );
            })}
            <NavigationControl position="top-right" showCompass visualizePitch />
          </MapGL>

          <AnimatePresence>
            {hazardVoteSheetOpen && selectedHazard ? (
              <MotionDiv
                key="hazard-vote-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={hazardTransition(reducedMotion, { duration: 0.15 })}
                className="absolute inset-0 z-20"
              >
                <button
                  type="button"
                  className="absolute inset-0 z-0 cursor-default border-0 bg-transparent p-0"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleCloseHazardVoteSheet();
                  }}
                  aria-label="Close hazard details"
                />
              </MotionDiv>
            ) : null}
          </AnimatePresence>

          {activeBoot.bootComplete ? (
            <>
              <div
                className="rydo-live-map-chrome pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-row flex-wrap items-center gap-2 p-3 max-md:pr-[4.5rem] md:justify-between"
                style={{ paddingTop: LIVE_MAP_SAFE_TOP }}
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
                className="rydo-live-map-chrome pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-1 pt-1"
                style={{ paddingBottom: LIVE_MAP_SAFE_BOTTOM }}
              >
                {showRecenter || (user && !env.isMockApi) ? (
                  <div
                    className="pointer-events-auto relative flex h-13 w-full shrink-0 items-center justify-between gap-2 px-[max(1rem,var(--rydo-safe-left))]"
                    style={{ paddingRight: 'max(1rem, var(--rydo-safe-right))' }}
                  >
                    <div className="flex w-13 shrink-0 items-center justify-start">
                      {hubEnabled && activeBoot.bootComplete && user && amParticipant && !env.isMockApi ? (
                        <button
                          type="button"
                          onClick={() => setHazardSheetOpen(true)}
                          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] text-amber-200 shadow-lg backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
                          aria-label="Report hazard"
                        >
                          <AlertTriangle className="h-5 w-5" strokeWidth={2} />
                        </button>
                      ) : !showRecenter && puckDisplay && hubEnabled ? (
                        <div
                          className="pointer-events-none inline-flex max-w-[min(42%,11rem)] items-center gap-1.5 rounded-full border border-emerald-500/35 bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-2.5 py-1.5 text-[11px] font-medium text-emerald-100/90 shadow backdrop-blur-md sm:max-w-none sm:px-3 sm:text-xs"
                          aria-live="polite"
                        >
                          <Crosshair className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
                          Following
                        </div>
                      ) : null}
                    </div>

                    <div className="flex min-w-0 flex-1 items-center justify-center">
                      {showRecenter ? (
                        <button
                          type="button"
                          onClick={handleRecenterClick}
                          className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_92%,transparent)] px-4 py-2 text-sm font-medium text-fg shadow-lg backdrop-blur-md"
                        >
                          <Crosshair className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                          <span className="truncate">Center on me</span>
                        </button>
                      ) : null}
                    </div>

                    <div className="flex w-13 shrink-0 items-center justify-end">
                      {user && amParticipant && !env.isMockApi ? (
                        <RideChatFab rideId={rideId} />
                      ) : null}
                    </div>
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
                            {formatSpeed(selfFix?.speedFiltered)}
                          </span>
                        </p>
                      </div>
                      <div className="hidden h-6 w-px shrink-0 bg-white/12 sm:block" aria-hidden />
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--rydo-green-bright)]/90" strokeWidth={2} aria-hidden />
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
                  <AnimatePresence>
                    {hazardNotice ? (
                      <MotionDiv
                        key="hazard-notice"
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={hazardToastVariants}
                        transition={hazardTransition(reducedMotion, { duration: 0.18 })}
                        className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-center text-[11px] text-amber-100/95"
                      >
                        {hazardNotice}
                      </MotionDiv>
                    ) : null}
                  </AnimatePresence>

                  <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-black/22">
                    <button
                      type="button"
                      onClick={() => toggleBottomPanelSection('riders')}
                      aria-expanded={bottomPanelSection === 'riders'}
                      aria-controls="nearby-riders-panel"
                      aria-label={bottomPanelSection === 'riders' ? 'Hide nearby riders' : 'Show nearby riders'}
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
                      {bottomPanelSection === 'riders' ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {bottomPanelSection === 'riders' ? (
                        <MotionDiv
                          key="nearby-riders-panel"
                          id="nearby-riders-panel"
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          variants={hazardAccordionVariants}
                          transition={hazardTransition(reducedMotion, { duration: 0.22 })}
                          className="overflow-hidden border-t border-white/[0.06]"
                        >
                          <div className="max-h-[min(40vh,16rem)] overflow-y-auto px-2.5 py-2 text-xs text-fg md:max-h-[min(50vh,20rem)]">
                            {nearbyListPeers.length === 0 ? (
                              <p className="text-fg-muted">No other riders to compare yet.</p>
                            ) : (
                              <ul className="space-y-1">
                                {nearbyListPeers.map((p) => (
                                  <NearbyPeerRow
                                    key={p.userId}
                                    peer={p}
                                    formatShortDistance={formatShortDistance}
                                    onFocus={handleFocusPeer}
                                  />
                                ))}
                              </ul>
                            )}
                          </div>
                        </MotionDiv>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-black/22">
                    <button
                      type="button"
                      onClick={() => toggleBottomPanelSection('hazards')}
                      aria-expanded={bottomPanelSection === 'hazards'}
                      aria-controls="nearby-hazards-panel"
                      aria-label={bottomPanelSection === 'hazards' ? 'Hide route hazards' : 'Show route hazards'}
                      className="flex w-full items-center gap-2 rounded-none border-0 bg-transparent px-2.5 py-1.5 text-left transition hover:bg-black/30 active:scale-[0.99]"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-300">
                        <AlertTriangle className="h-3 w-3" strokeWidth={2} aria-hidden />
                      </span>
                      <p className="min-w-0 flex-1 text-xs leading-snug text-fg-muted">
                        <span className="font-semibold tabular-nums text-fg">{hazards.length}</span>
                        {' · '}
                        hazard{hazards.length === 1 ? '' : 's'} on the route
                      </p>
                      {bottomPanelSection === 'hazards' ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {bottomPanelSection === 'hazards' ? (
                        <MotionDiv
                          key="nearby-hazards-panel"
                          id="nearby-hazards-panel"
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          variants={hazardAccordionVariants}
                          transition={hazardTransition(reducedMotion, { duration: 0.22 })}
                          className="overflow-hidden border-t border-white/[0.06]"
                        >
                          <div className="max-h-[min(40vh,16rem)] overflow-y-auto px-2.5 py-2 text-xs text-fg md:max-h-[min(50vh,20rem)]">
                            {nearbyListHazards.length === 0 ? (
                              <p className="text-fg-muted">No hazards on this route yet.</p>
                            ) : (
                              <MotionUl
                                className="space-y-1"
                                initial="hidden"
                                animate="visible"
                                variants={hazardListStagger}
                              >
                                {nearbyListHazards.map((h) => (
                                  <NearbyHazardRow
                                    key={h.id}
                                    hazard={h}
                                    formatShortDistance={formatShortDistance}
                                    onFocus={handleFocusHazardFromList}
                                  />
                                ))}
                              </MotionUl>
                            )}
                          </div>
                        </MotionDiv>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  <LiveRideMapAttribution />
                </div>
              </div>

              {/*
                Vote sheet must NOT sit under a pointer-events-none parent — Capacitor/WebView
                often lets taps fall through to the backdrop, closing the sheet before Up/Down fire.
              */}
              <AnimatePresence>
                {hazardVoteSheetOpen && selectedHazard ? (
                  <MotionDiv
                    key="hazard-vote-sheet-layer"
                    className="absolute inset-x-0 bottom-0 z-40 flex justify-center"
                    style={{ paddingBottom: LIVE_MAP_SAFE_BOTTOM }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={hazardTransition(reducedMotion, { duration: 0.15 })}
                  >
                    <div className="w-[min(92vw,32rem)] px-0 pb-1 pt-1">
                      <HazardVoteSheet
                        open
                        hazard={selectedHazard}
                        canVote={canVoteOnSelected}
                        isOwnHazard={myUserId != null && selectedHazard?.reportedBy?.id === myUserId}
                        isPending={voteHazardMutation.isPending}
                        onVote={handleVoteHazard}
                        onClose={handleCloseHazardVoteSheet}
                      />
                    </div>
                  </MotionDiv>
                ) : null}
              </AnimatePresence>
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

      <HazardReportSheet
        open={hazardSheetOpen}
        onClose={() => setHazardSheetOpen(false)}
        onSubmit={handleReportHazard}
        isPending={reportHazardMutation.isPending}
      />
    </div>
  );
}
