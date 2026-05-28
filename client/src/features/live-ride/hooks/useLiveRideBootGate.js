import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createEmptyBootMilestones,
  liveRideBootActiveLabel,
  liveRideBootProgress,
} from '@/features/live-ride/liveRideBootMilestones';
import {
  isOrientationPermissionRequired,
  queryGeolocationPermissionState,
  requestLiveRideLocationPermission,
  requestLiveRideOrientationPermission,
} from '@/features/live-ride/utils/requestLiveRidePermissions';

const MAP_PITCH = 55;
const MAP_ZOOM = 15.5;

/**
 * Permission gate for live ride boot (must run before GPS motion loop).
 * @param {{ moduleReady: boolean }} opts
 */
export function useLiveRideBootPermissions({ moduleReady }) {
  const [bootBlocked, setBootBlocked] = useState(false);
  const [blockingReason, setBlockingReason] = useState(undefined);
  const [permissionRequestInFlight, setPermissionRequestInFlight] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [orientationGranted, setOrientationGranted] = useState(() => !isOrientationPermissionRequired());
  const permissionsAttemptedRef = useRef(false);

  const permissionsReady =
    locationGranted && (orientationGranted || !isOrientationPermissionRequired());

  const applyPermissionFailure = useCallback((reason) => {
    setBootBlocked(true);
    setBlockingReason(reason);
  }, []);

  const requestLocation = useCallback(async () => {
    setPermissionRequestInFlight(true);
    setBootBlocked(false);
    setBlockingReason(undefined);
    try {
      const permState = await queryGeolocationPermissionState();
      if (permState === 'denied') {
        applyPermissionFailure(
          'Location access is blocked. Enable location for this site in your browser settings, then try again.',
        );
        return;
      }
      const result = await requestLiveRideLocationPermission();
      if (result.location === 'granted') {
        setLocationGranted(true);
        setBootBlocked(false);
      } else {
        applyPermissionFailure(result.blockingReason);
      }
    } finally {
      setPermissionRequestInFlight(false);
    }
  }, [applyPermissionFailure]);

  const requestOrientation = useCallback(async () => {
    setPermissionRequestInFlight(true);
    setBootBlocked(false);
    setBlockingReason(undefined);
    try {
      const result = await requestLiveRideOrientationPermission();
      if (result.orientation === 'granted' || result.orientation === 'not_applicable') {
        setOrientationGranted(true);
      } else {
        applyPermissionFailure(result.blockingReason);
      }
    } finally {
      setPermissionRequestInFlight(false);
    }
  }, [applyPermissionFailure]);

  const resetPermissions = useCallback(() => {
    setBootBlocked(false);
    setBlockingReason(undefined);
    permissionsAttemptedRef.current = false;
    setLocationGranted(false);
    setOrientationGranted(!isOrientationPermissionRequired());
  }, []);

  const retryAll = useCallback(async () => {
    resetPermissions();
    await requestLocation();
  }, [resetPermissions, requestLocation]);

  useEffect(() => {
    if (!moduleReady || permissionsAttemptedRef.current || bootBlocked) return;
    permissionsAttemptedRef.current = true;
    requestLocation();
  }, [moduleReady, bootBlocked, requestLocation]);

  const needsLocationAction = !locationGranted && !bootBlocked && !permissionRequestInFlight;
  const needsOrientationAction =
    locationGranted &&
    isOrientationPermissionRequired() &&
    !orientationGranted &&
    !bootBlocked &&
    !permissionRequestInFlight;

  return {
    permissionsReady,
    bootBlocked,
    blockingReason,
    permissionRequestInFlight,
    needsLocationAction,
    needsOrientationAction,
    requestLocation,
    requestOrientation,
    retryAll,
    resetPermissions,
    applyPermissionFailure,
  };
}

/**
 * @param {object} opts
 * @param {boolean} opts.moduleReady
 * @param {boolean} opts.rideLoading
 * @param {object | null | undefined} opts.ride
 * @param {object | null | undefined} opts.line
 * @param {object | null | undefined} opts.routeFc
 * @param {boolean} opts.isError
 * @param {boolean} opts.permissionsReady
 * @param {ReturnType<typeof useLiveRideBootPermissions>} opts.permissions
 * @param {import('react').RefObject<{ getMap?: () => import('mapbox-gl').Map | undefined } | null>} opts.mapRef
 * @param {object | null | undefined} opts.selfFix
 * @param {object | null | undefined} opts.puckDisplay
 * @param {string | null | undefined} opts.geoError
 */
export function useLiveRideBootGate({
  moduleReady,
  rideLoading,
  ride,
  line,
  routeFc,
  isError,
  permissionsReady,
  permissions,
  mapRef,
  selfFix,
  puckDisplay,
  geoError,
}) {
  const [milestones, setMilestones] = useState(createEmptyBootMilestones);
  const [mapSurfaceReady, setMapSurfaceReady] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const cameraSettleStartedRef = useRef(false);

  const rideReady = Boolean(!rideLoading && ride && !isError && line && routeFc);
  const canMountHiddenMap = rideReady && permissionsReady;

  const hasLocation = useMemo(() => {
    const lat = puckDisplay?.lat ?? selfFix?.lat;
    const lng = puckDisplay?.lng ?? selfFix?.lng;
    return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  }, [puckDisplay?.lat, puckDisplay?.lng, selfFix?.lat, selfFix?.lng]);

  useEffect(() => {
    setMilestones((m) => ({ ...m, module: moduleReady }));
  }, [moduleReady]);

  useEffect(() => {
    setMilestones((m) => ({ ...m, ride: rideReady }));
  }, [rideReady]);

  useEffect(() => {
    setMilestones((m) => ({ ...m, permissions: permissionsReady }));
  }, [permissionsReady]);

  useEffect(() => {
    setMilestones((m) => ({ ...m, map: mapSurfaceReady }));
  }, [mapSurfaceReady]);

  useEffect(() => {
    setMilestones((m) => ({ ...m, location: hasLocation }));
  }, [hasLocation]);

  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    const markMapReady = () => {
      setMapSurfaceReady(true);
    };

    if (map.isStyleLoaded?.()) {
      if (map.loaded?.()) {
        markMapReady();
      } else {
        map.once('idle', markMapReady);
      }
    } else {
      map.once('load', () => {
        map.once('idle', markMapReady);
      });
    }
  }, [mapRef]);

  useEffect(() => {
    if (!canMountHiddenMap || !mapSurfaceReady || !hasLocation || milestones.camera) return;
    if (cameraSettleStartedRef.current) return;

    const map = mapRef.current?.getMap?.();
    if (!map?.isStyleLoaded?.()) return;

    const lat = puckDisplay?.lat ?? selfFix?.lat;
    const lng = puckDisplay?.lng ?? selfFix?.lng;
    if (lat == null || lng == null) return;

    cameraSettleStartedRef.current = true;

    map.jumpTo({
      center: [lng, lat],
      zoom: MAP_ZOOM,
      pitch: MAP_PITCH,
      bearing: map.getBearing(),
    });

    map.once('idle', () => {
      setMilestones((m) => ({ ...m, camera: true }));
    });
  }, [canMountHiddenMap, mapSurfaceReady, hasLocation, milestones.camera, mapRef, puckDisplay, selfFix]);

  const allMilestonesComplete =
    milestones.module &&
    milestones.ride &&
    milestones.permissions &&
    milestones.map &&
    milestones.location &&
    milestones.camera;

  useEffect(() => {
    if (!allMilestonesComplete || bootComplete) return;
    setFadingOut(true);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setBootComplete(true));
    });
    return () => cancelAnimationFrame(id);
  }, [allMilestonesComplete, bootComplete]);

  useEffect(() => {
    if (!permissionsReady || !geoError || bootComplete) return;
    permissions.applyPermissionFailure(geoError);
  }, [permissionsReady, geoError, bootComplete, permissions]);

  const retryAll = useCallback(async () => {
    setMilestones(createEmptyBootMilestones());
    setMapSurfaceReady(false);
    cameraSettleStartedRef.current = false;
    setBootComplete(false);
    setFadingOut(false);
    permissions.resetPermissions();
    await permissions.retryAll();
  }, [permissions]);

  const progress = liveRideBootProgress(milestones);
  const label = permissions.bootBlocked
    ? 'Permission required'
    : permissions.needsLocationAction
      ? 'Allow location to continue'
      : permissions.needsOrientationAction
        ? 'Allow motion & orientation to continue'
        : liveRideBootActiveLabel(milestones);

  return {
    milestones,
    progress,
    label,
    bootComplete,
    fadingOut,
    bootBlocked: permissions.bootBlocked,
    blockingReason: permissions.blockingReason,
    canMountHiddenMap,
    needsLocationAction: permissions.needsLocationAction,
    needsOrientationAction: permissions.needsOrientationAction,
    permissionRequestInFlight: permissions.permissionRequestInFlight,
    requestLocation: permissions.requestLocation,
    requestOrientation: permissions.requestOrientation,
    retryAll,
    handleMapLoad,
  };
}
