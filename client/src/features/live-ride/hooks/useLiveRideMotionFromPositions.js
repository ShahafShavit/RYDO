import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  correctSyntheticTowardGps,
  decaySpeedOnRejectedGps,
  distanceMeters,
  evaluateKinematicGate,
  getSmoothedPoseLngLat,
  inferSeedDtSeconds,
  bearingDegrees,
  offsetByHeadingMeters,
  stepDisplayEmaTowardSyn,
  stepDisplayHeadingTowardTarget,
  syncStationaryDisplayFreeze,
  updateAcceptedKinematics,
} from '@/features/live-ride/utils/liveRideDeadReckon';
import { blendHeadingBySpeedKmh, getHeadingBlendWeight } from '@/features/live-ride/utils/liveRideHeadingBlend';
import { mergeLiveRideMotionTuning, DEFAULT_LIVE_RIDE_MOTION_TUNING } from '@/features/live-ride/utils/liveRideMotionTuning';
import { pickTuning } from '@/features/live-ride/utils/liveRideTuningPick';
import { createSpeedFilterState, updateFilteredSpeedMps } from '@/features/live-ride/utils/liveRideSpeedFilter';
import { isKinematicGateEnabled, isRideLiveLogEnabled, rideLiveLog } from '@/features/live-ride/utils/rideLiveLog';
import { getGeolocationProvider } from '@/shared/platform/geolocation-provider';

/**
 * GPS fix `heading` is only used above the compass-only band, or when compass is available at low speed.
 * @param {number | null | undefined} headingFromFix
 * @param {number} speedKmh
 * @param {number | null | undefined} compassHeading
 * @param {Record<string, number>} tun
 * @returns {number | null}
 */
function gpsHeadingLastResortFromFix(headingFromFix, speedKmh, compassHeading, tun) {
  const low = pickTuning(tun, 'HEADING_BLEND_LOW_KMH', DEFAULT_LIVE_RIDE_MOTION_TUNING.HEADING_BLEND_LOW_KMH);
  const compassOk = compassHeading != null && Number.isFinite(compassHeading);
  if (speedKmh < low && !compassOk) return null;
  return headingFromFix != null && Number.isFinite(headingFromFix) ? headingFromFix : null;
}

/**
 * @param {import('@/features/live-ride/utils/buildReplayFixesFromGeoJson').ReplayFix} fix
 * @returns {GeolocationPosition}
 */
function fixToGeolocationPosition(fix) {
  return {
    coords: {
      latitude: fix.lat,
      longitude: fix.lng,
      accuracy: fix.accuracyM ?? 5,
      speed: Number.isFinite(fix.speedMps) ? fix.speedMps : 0,
      heading: fix.heading != null && Number.isFinite(fix.heading) ? fix.heading : null,
    },
    timestamp: fix.timestampMs,
  };
}

/**
 * Shared live-ride GPS sample processing + rAF dead reckoning (device GPS or GPX replay).
 *
 * @param {object} opts
 * @param {boolean} opts.motionLoopEnabled — run watch + rAF (hub on ride page, or replay playing on /live).
 * @param {boolean} opts.useDeviceGps — when true with motionLoopEnabled, use `navigator.geolocation`.
 * @param {import('@/features/live-ride/utils/buildReplayFixesFromGeoJson').ReplayFix[] | null | undefined} opts.replayFixes
 * @param {boolean} opts.replayPlaying
 * @param {number} opts.replayEpoch — bump to reset replay cursor and DR state.
 * @param {(lat: number, lng: number, bearing: number | null, acc: number | null) => void} opts.offerPose
 * @param {(lng: number, lat: number, bearingOpt?: number) => void} opts.applyFollowCamera
 * @param {React.MutableRefObject<boolean>} opts.followCameraRef
 * @param {React.MutableRefObject<number | null | undefined>} opts.compassHeadingRef
 * @param {Partial<typeof DEFAULT_LIVE_RIDE_MOTION_TUNING> | undefined} opts.tuning — preview overrides (`/live` panel); omitted = coded defaults.
 * @returns {object} Includes `replayElapsedMs` and `seekReplayToOffsetMs` when not using device GPS (replay); live ride ignores these.
 */
export function useLiveRideMotionFromPositions({
  motionLoopEnabled,
  useDeviceGps,
  replayFixes,
  replayPlaying,
  replayEpoch,
  offerPose,
  applyFollowCamera,
  followCameraRef,
  compassHeadingRef,
  tuning: tuningProp,
}) {
  const [geoError, setGeoError] = useState(null);
  const [selfFix, setSelfFix] = useState(null);
  const [puckDisplay, setPuckDisplay] = useState(null);
  /** Replay-only: wall-clock timeline position for UI (ms from track start). */
  const [replayElapsedMs, setReplayElapsedMs] = useState(0);

  const selfFixRef = useRef(null);
  const gpsHeadingRef = useRef(null);
  const gpsUpdateSeqRef = useRef(0);
  const tuningRef = useRef(mergeLiveRideMotionTuning(tuningProp));
  useLayoutEffect(() => {
    tuningRef.current = mergeLiveRideMotionTuning(tuningProp);
  }, [tuningProp]);

  const speedFilterRef = useRef(createSpeedFilterState(mergeLiveRideMotionTuning(tuningProp)));
  const driftLockRef = useRef({ firstDriftMs: null, lastDriftMs: null, driftFixCount: 0 });
  const puckDisplayRef = useRef(null);
  const stationaryMapRef = useRef({ active: false, snapshot: null });
  const stationaryPrevFrozenRef = useRef(false);
  const lastMotionLoopRef = useRef(false);
  const deadReckonRef = useRef({
    initialized: false,
    synLat: null,
    synLng: null,
    displayLat: null,
    displayLng: null,
    speedMps: 0,
    extrapolateHeadingDeg: null,
    displayHeadingDeg: null,
    lastRafMs: null,
    lastCameraApplyMs: 0,
    kinematicHistory: false,
    lastAcceptedLat: null,
    lastAcceptedLng: null,
    lastAcceptedMs: null,
    velEastMps: 0,
    velNorthMps: 0,
    lastAcceptedAccuracyM: null,
    consecutiveRejects: 0,
  });

  const offerPoseRef = useRef(offerPose);
  const applyFollowRef = useRef(applyFollowCamera);
  const replayFixesRef = useRef(replayFixes ?? null);

  useLayoutEffect(() => {
    offerPoseRef.current = offerPose;
    applyFollowRef.current = applyFollowCamera;
    replayFixesRef.current = replayFixes ?? null;
  }, [offerPose, applyFollowCamera, replayFixes]);
  const replayIdxRef = useRef(0);
  /** `performance.now()` anchor so `now - anchor` equals replay timeline ms; null before first play/seek. */
  const replayT0Ref = useRef(null);

  /** @type {React.MutableRefObject<{
   *   compassDeg: number | null,
   *   gpsDeg: number | null,
   *   speedKmh: number,
   *   blendWeight: number,
   *   extrapolateHeadingDeg: number | null,
   *   displayHeadingDeg: number | null,
   * } | null>} */
  const bearingTelemetryRef = useRef(null);

  useLayoutEffect(() => {
    if (useDeviceGps) return;
    speedFilterRef.current = createSpeedFilterState(tuningRef.current);
  }, [tuningProp, useDeviceGps]);

  useLayoutEffect(() => {
    selfFixRef.current = selfFix;
  }, [selfFix]);

  useLayoutEffect(() => {
    puckDisplayRef.current = puckDisplay;
  }, [puckDisplay]);

  const applyGeolocationSample = useCallback((pos) => {
    const tun = tuningRef.current;
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracy = pos.coords.accuracy;
    const rawSpeed = pos.coords.speed;
    const speed = Number.isFinite(rawSpeed) && rawSpeed >= 0 ? rawSpeed : 0;
    const filteredSpeedMps = updateFilteredSpeedMps(speedFilterRef.current, speed, tun);
    const speedKmh = filteredSpeedMps * 3.6;
    let heading = pos.coords.heading;
    if (heading != null && Number.isNaN(heading)) heading = null;

    const prev = selfFixRef.current;
    const courseOverGround =
      prev?.lat != null && prev?.lng != null ? bearingDegrees(prev.lat, prev.lng, lat, lng) : null;
    const gpsDegForBlend = heading != null && Number.isFinite(heading) ? heading : courseOverGround;
    gpsHeadingRef.current = gpsDegForBlend ?? null;

    const seq = (gpsUpdateSeqRef.current += 1);
    const recenterEvery = Math.max(1, Math.round(pickTuning(tun, 'LOW_SPEED_RECENTER_EVERY_N', DEFAULT_LIVE_RIDE_MOTION_TUNING.LOW_SPEED_RECENTER_EVERY_N)));
    const lowSpeedBypassCone = seq % recenterEvery === 0;
    setSelfFix((old) => ({
      lat,
      lng,
      heading,
      speedRaw: speed,
      speedFiltered: filteredSpeedMps,
      accuracy,
      lowSpeedBypassCone,
      previousFix: old && old.lat != null && old.lng != null ? { lat: old.lat, lng: old.lng } : null,
    }));

    const dr = deadReckonRef.current;
    const ts =
      pos.timestamp != null && Number.isFinite(pos.timestamp) && pos.timestamp > 0 ? pos.timestamp : Date.now();
    const incoming = {
      lat,
      lng,
      timestampMs: ts,
      speedMpsHint: filteredSpeedMps,
      accuracyM: accuracy,
    };

    const send = offerPoseRef.current;

    if (!dr.initialized) {
      dr.synLat = lat;
      dr.synLng = lng;
      dr.initialized = true;
    }

    const lowFreezeKmh = pickTuning(tun, 'LOW_SPEED_FREEZE_KMH', DEFAULT_LIVE_RIDE_MOTION_TUNING.LOW_SPEED_FREEZE_KMH);
    if (speedKmh < lowFreezeKmh) {
      dr.speedMps = 0;
      dr.velEastMps = 0;
      dr.velNorthMps = 0;
      dr.consecutiveRejects = 0;

      const shouldRecenter = seq % recenterEvery === 0;
      const driftErrorM =
        dr.synLat != null && dr.synLng != null ? distanceMeters(dr.synLat, dr.synLng, lat, lng) : 0;
      const drift = driftLockRef.current;
      const driftErrTh = pickTuning(tun, 'DRIFT_RESEED_ERROR_M', DEFAULT_LIVE_RIDE_MOTION_TUNING.DRIFT_RESEED_ERROR_M);
      const driftDetected = Number.isFinite(driftErrorM) && driftErrorM >= driftErrTh;
      if (driftDetected) {
        if (drift.firstDriftMs == null) drift.firstDriftMs = ts;
        drift.lastDriftMs = ts;
        drift.driftFixCount += 1;
      } else {
        drift.firstDriftMs = null;
        drift.lastDriftMs = null;
        drift.driftFixCount = 0;
      }

      const driftDurationMs =
        drift.firstDriftMs != null && drift.lastDriftMs != null ? drift.lastDriftMs - drift.firstDriftMs : 0;
      const driftDurMin = pickTuning(tun, 'DRIFT_RESEED_MIN_DURATION_MS', DEFAULT_LIVE_RIDE_MOTION_TUNING.DRIFT_RESEED_MIN_DURATION_MS);
      const driftFixMin = Math.max(1, Math.round(pickTuning(tun, 'DRIFT_RESEED_MIN_FIXES', DEFAULT_LIVE_RIDE_MOTION_TUNING.DRIFT_RESEED_MIN_FIXES)));
      const shouldHardReseed =
        driftDetected && driftDurationMs >= driftDurMin && drift.driftFixCount >= driftFixMin;

      if (shouldRecenter || shouldHardReseed) {
        dr.synLat = lat;
        dr.synLng = lng;
        dr.lastAcceptedLat = lat;
        dr.lastAcceptedLng = lng;
        dr.lastAcceptedMs = ts;
        if (Number.isFinite(accuracy)) dr.lastAcceptedAccuracyM = accuracy;
        dr.velEastMps = 0;
        dr.velNorthMps = 0;
        dr.consecutiveRejects = 0;
        stationaryMapRef.current = { active: false, snapshot: null };
        drift.firstDriftMs = null;
        drift.lastDriftMs = null;
        drift.driftFixCount = 0;
      }

      const vKmhFreeze = 0;
      const blendedHeadingDeg = blendHeadingBySpeedKmh(compassHeadingRef.current, gpsDegForBlend, vKmhFreeze, tun);
      if (blendedHeadingDeg != null && Number.isFinite(blendedHeadingDeg)) {
        dr.extrapolateHeadingDeg = blendedHeadingDeg;
      } else {
        dr.extrapolateHeadingDeg = null;
        dr.displayHeadingDeg = null;
      }

      stepDisplayEmaTowardSyn(
        dr,
        pickTuning(tun, 'EMA_GPS_LOW_SPEED_FREEZE', DEFAULT_LIVE_RIDE_MOTION_TUNING.EMA_GPS_LOW_SPEED_FREEZE),
        tun,
      );
      const freezePose = getSmoothedPoseLngLat(dr);
      const freezeBearing =
        dr.displayHeadingDeg ??
        dr.extrapolateHeadingDeg ??
        gpsHeadingLastResortFromFix(heading, speedKmh, compassHeadingRef.current, tun);
      const freezeAcc = dr.lastAcceptedAccuracyM ?? accuracy ?? null;
      syncStationaryDisplayFreeze(dr, freezePose, freezeBearing, freezeAcc, stationaryMapRef.current, tun);
      const snapFreeze = stationaryMapRef.current.snapshot;
      if (snapFreeze) {
        send(
          snapFreeze.lat,
          snapFreeze.lng,
          freezeBearing ?? snapFreeze.bearingDeg ?? null,
          freezeAcc ?? snapFreeze.accuracyM ?? null,
        );
      } else {
        send(freezePose.lat, freezePose.lng, freezeBearing, freezeAcc);
      }
      return;
    }

    driftLockRef.current.firstDriftMs = null;
    driftLockRef.current.lastDriftMs = null;
    driftLockRef.current.driftFixCount = 0;

    const gateEnabled = isKinematicGateEnabled();
    const prevState = {
      kinematicHistory: dr.kinematicHistory,
      lastAcceptedLat: dr.lastAcceptedLat,
      lastAcceptedLng: dr.lastAcceptedLng,
      lastAcceptedMs: dr.lastAcceptedMs,
      velEastMps: dr.velEastMps,
      velNorthMps: dr.velNorthMps,
    };
    const gate = gateEnabled ? evaluateKinematicGate(prevState, incoming, tun) : { accept: true, reason: 'gate_off' };

    if (!gate.accept) {
      dr.consecutiveRejects = (dr.consecutiveRejects || 0) + 1;
      if (isRideLiveLogEnabled()) {
        const n = dr.consecutiveRejects;
        if (n <= 4 || n % 14 === 0) {
          rideLiveLog('kinematic reject', {
            n,
            reason: gate.reason,
            dtS: gate.dtS,
            dM: gate.dM,
            dv: gate.dv,
            maxDv: gate.maxDv,
            maxDistM: gate.maxDistM,
          });
        }
      }
      stepDisplayEmaTowardSyn(
        dr,
        pickTuning(tun, 'EMA_GPS_REJECT', DEFAULT_LIVE_RIDE_MOTION_TUNING.EMA_GPS_REJECT),
        tun,
      );
      const rej = getSmoothedPoseLngLat(dr);
      const rejBearing =
        dr.displayHeadingDeg ??
        dr.extrapolateHeadingDeg ??
        gpsHeadingLastResortFromFix(heading, speedKmh, compassHeadingRef.current, tun);
      const rejAcc = dr.lastAcceptedAccuracyM ?? accuracy ?? null;
      syncStationaryDisplayFreeze(dr, rej, rejBearing, rejAcc, stationaryMapRef.current, tun);
      const snapRej = stationaryMapRef.current.snapshot;
      if (stationaryMapRef.current.active && snapRej) {
        send(
          snapRej.lat,
          snapRej.lng,
          rejBearing ?? snapRej.bearingDeg ?? null,
          rejAcc ?? snapRej.accuracyM ?? null,
        );
      } else {
        send(rej.lat, rej.lng, rejBearing, rejAcc);
      }
      return;
    }

    const anchorLat = dr.lastAcceptedLat ?? dr.synLat;
    const anchorLng = dr.lastAcceptedLng ?? dr.synLng;
    const dtMin = pickTuning(tun, 'KIN_DT_MIN_S', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_DT_MIN_S);
    const dtMax = pickTuning(tun, 'KIN_DT_MAX_S', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_DT_MAX_S);
    const dtS =
      dr.lastAcceptedMs != null && Number.isFinite(dr.lastAcceptedMs)
        ? Math.max(dtMin, Math.min(dtMax, (ts - dr.lastAcceptedMs) / 1000))
        : inferSeedDtSeconds(anchorLat, anchorLng, lat, lng, tun);

    correctSyntheticTowardGps(dr, lat, lng, { accuracyM: accuracy }, tun);
    updateAcceptedKinematics(
      dr,
      anchorLat,
      anchorLng,
      incoming,
      dtS,
      {
        hardReseed: gate.reason === 'gap_reseed',
      },
      tun,
    );

    const vKmh = (Number.isFinite(dr.speedMps) ? dr.speedMps : 0) * 3.6;
    const blendedHeadingDeg = blendHeadingBySpeedKmh(compassHeadingRef.current, gpsDegForBlend, vKmh, tun);
    if (blendedHeadingDeg != null && Number.isFinite(blendedHeadingDeg)) {
      dr.extrapolateHeadingDeg = blendedHeadingDeg;
    } else {
      dr.extrapolateHeadingDeg = null;
      dr.displayHeadingDeg = null;
    }

    stepDisplayEmaTowardSyn(
      dr,
      pickTuning(tun, 'EMA_GPS_ACCEPT', DEFAULT_LIVE_RIDE_MOTION_TUNING.EMA_GPS_ACCEPT),
      tun,
    );
    const pose = getSmoothedPoseLngLat(dr);
    const poseBearing =
      dr.displayHeadingDeg ??
      dr.extrapolateHeadingDeg ??
      gpsHeadingLastResortFromFix(heading, vKmh, compassHeadingRef.current, tun);
    const poseAcc = dr.lastAcceptedAccuracyM ?? accuracy ?? null;
    syncStationaryDisplayFreeze(dr, pose, poseBearing, poseAcc, stationaryMapRef.current, tun);
    const snapPose = stationaryMapRef.current.snapshot;
    if (stationaryMapRef.current.active && snapPose) {
      send(
        snapPose.lat,
        snapPose.lng,
        poseBearing ?? snapPose.bearingDeg ?? null,
        poseAcc ?? snapPose.accuracyM ?? null,
      );
    } else {
      send(pose.lat, pose.lng, poseBearing, poseAcc);
    }
  }, [compassHeadingRef]);

  const seekReplayToOffsetMs = useCallback(
    (offsetMs) => {
      if (useDeviceGps) return;
      const fixes = replayFixesRef.current;
      if (!fixes?.length) return;
      const lastOff = fixes[fixes.length - 1]?.offsetMs ?? 0;
      const t = Math.max(0, Math.min(offsetMs, lastOff));

      replayIdxRef.current = 0;
      speedFilterRef.current = createSpeedFilterState(tuningRef.current);
      gpsUpdateSeqRef.current = 0;
      deadReckonRef.current = {
        initialized: false,
        synLat: null,
        synLng: null,
        displayLat: null,
        displayLng: null,
        speedMps: 0,
        extrapolateHeadingDeg: null,
        displayHeadingDeg: null,
        lastRafMs: null,
        lastCameraApplyMs: 0,
        kinematicHistory: false,
        lastAcceptedLat: null,
        lastAcceptedLng: null,
        lastAcceptedMs: null,
        velEastMps: 0,
        velNorthMps: 0,
        lastAcceptedAccuracyM: null,
        consecutiveRejects: 0,
      };
      driftLockRef.current = { firstDriftMs: null, lastDriftMs: null, driftFixCount: 0 };
      stationaryMapRef.current = { active: false, snapshot: null };

      let i = 0;
      for (; i < fixes.length; i++) {
        if (fixes[i].offsetMs > t) break;
        applyGeolocationSample(fixToGeolocationPosition(fixes[i]));
      }
      replayIdxRef.current = i;
      replayT0Ref.current =
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t;

      const dr = deadReckonRef.current;
      if (dr.initialized && dr.synLat != null && dr.synLng != null) {
        const tun = tuningRef.current;
        const lastApplied = i > 0 ? fixes[i - 1] : null;
        const vKmh = (Number.isFinite(dr.speedMps) ? dr.speedMps : 0) * 3.6;
        const smooth = getSmoothedPoseLngLat(dr);
        const headingFromFix =
          lastApplied?.heading != null && Number.isFinite(lastApplied.heading) ? lastApplied.heading : null;
        const displayBearing =
          dr.displayHeadingDeg ??
          dr.extrapolateHeadingDeg ??
          gpsHeadingLastResortFromFix(headingFromFix, vKmh, compassHeadingRef.current, tun);
        setPuckDisplay({
          lat: smooth.lat,
          lng: smooth.lng,
          bearing: displayBearing,
        });
      }
      setReplayElapsedMs(t);
    },
    [useDeviceGps, applyGeolocationSample, compassHeadingRef],
  );

  useEffect(() => {
    if (!motionLoopEnabled) {
      if (useDeviceGps) {
        lastMotionLoopRef.current = false;
        stationaryMapRef.current = { active: false, snapshot: null };
        stationaryPrevFrozenRef.current = false;
      }
      return undefined;
    }

    if (useDeviceGps) {
      if (!lastMotionLoopRef.current) {
        deadReckonRef.current.displayHeadingDeg = null;
      }
      lastMotionLoopRef.current = true;

      const geo = getGeolocationProvider();
      if (!geo.isAvailable) {
        const t = window.setTimeout(() => setGeoError('Geolocation is not available in this browser.'), 0);
        return () => clearTimeout(t);
      }

      const id = geo.watchPosition(
        (pos) => {
          setGeoError(null);
          applyGeolocationSample(pos);
        },
        (err) => {
          setGeoError(err.message || 'Could not read GPS');
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
      );

      return () => geo.clearWatch(id);
    }

    return undefined;
  }, [motionLoopEnabled, useDeviceGps, applyGeolocationSample]);

  /** Replay-only: reset DR when a new file loads (`replayEpoch` bump). */
  useEffect(() => {
    if (useDeviceGps) return;
    replayIdxRef.current = 0;
    speedFilterRef.current = createSpeedFilterState(tuningRef.current);
    gpsUpdateSeqRef.current = 0;
    deadReckonRef.current = {
      initialized: false,
      synLat: null,
      synLng: null,
      displayLat: null,
      displayLng: null,
      speedMps: 0,
      extrapolateHeadingDeg: null,
      displayHeadingDeg: null,
      lastRafMs: null,
      lastCameraApplyMs: 0,
      kinematicHistory: false,
      lastAcceptedLat: null,
      lastAcceptedLng: null,
      lastAcceptedMs: null,
      velEastMps: 0,
      velNorthMps: 0,
      lastAcceptedAccuracyM: null,
      consecutiveRejects: 0,
    };
    driftLockRef.current = { firstDriftMs: null, lastDriftMs: null, driftFixCount: 0 };
    stationaryMapRef.current = { active: false, snapshot: null };
    replayT0Ref.current = null;
    queueMicrotask(() => {
      setSelfFix(null);
      setPuckDisplay(null);
      setGeoError(null);
      setReplayElapsedMs(0);
    });
  }, [replayEpoch, useDeviceGps]);

  /** Seed replay clock on first Play after load/seek; do not reset timeline on Pause → Play. */
  useEffect(() => {
    if (useDeviceGps || !replayPlaying) return;
    if (replayT0Ref.current == null) {
      replayT0Ref.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    }
  }, [replayPlaying, useDeviceGps]);

  /** Keep UI timeline in sync while replay runs (avoid setState every rAF). */
  useEffect(() => {
    if (useDeviceGps || !replayPlaying || !motionLoopEnabled) return undefined;
    const fixes = replayFixesRef.current;
    if (!fixes?.length) return undefined;
    const maxT = fixes[fixes.length - 1].offsetMs;
    const tick = () => {
      const anchor = replayT0Ref.current;
      if (anchor == null) return;
      const raw = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - anchor;
      setReplayElapsedMs(Math.min(Math.max(0, raw), maxT));
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [useDeviceGps, replayPlaying, motionLoopEnabled]);

  useEffect(() => {
    if (!motionLoopEnabled) return undefined;

    let rafId = 0;
    const lastPuckThrottle = { t: 0 };

    const tick = (now) => {
      const tun = tuningRef.current;
      const puckMinMs = pickTuning(tun, 'PUCK_DISPLAY_MIN_MS', DEFAULT_LIVE_RIDE_MOTION_TUNING.PUCK_DISPLAY_MIN_MS);
      const followMinMs = pickTuning(tun, 'FOLLOW_CAMERA_MIN_MS', DEFAULT_LIVE_RIDE_MOTION_TUNING.FOLLOW_CAMERA_MIN_MS);
      const rafCap = pickTuning(tun, 'RAF_DT_CAP_S', DEFAULT_LIVE_RIDE_MOTION_TUNING.RAF_DT_CAP_S);
      const drMin = pickTuning(tun, 'DR_MIN_SPEED_MPS', DEFAULT_LIVE_RIDE_MOTION_TUNING.DR_MIN_SPEED_MPS);

      if (!useDeviceGps && replayPlaying) {
        const fixes = replayFixesRef.current;
        const anchor = replayT0Ref.current;
        if (fixes && fixes.length > 0 && anchor != null) {
          const elapsed = now - anchor;
          while (replayIdxRef.current < fixes.length) {
            const f = fixes[replayIdxRef.current];
            if (f.offsetMs > elapsed) break;
            applyGeolocationSample(fixToGeolocationPosition(f));
            replayIdxRef.current += 1;
          }
        }
      }

      const dr = deadReckonRef.current;
      if (dr.initialized && dr.synLat != null && dr.synLng != null) {
        const last = dr.lastRafMs ?? now;
        const dt = Math.min(rafCap, Math.max(0, (now - last) / 1000));
        dr.lastRafMs = now;

        decaySpeedOnRejectedGps(dr, dt, tun);

        const vKmh = (Number.isFinite(dr.speedMps) ? dr.speedMps : 0) * 3.6;
        const blendedHeading = blendHeadingBySpeedKmh(
          compassHeadingRef.current,
          gpsHeadingRef.current,
          vKmh,
          tun,
        );
        if (blendedHeading != null && Number.isFinite(blendedHeading)) {
          dr.extrapolateHeadingDeg = blendedHeading;
        } else {
          dr.extrapolateHeadingDeg = null;
          dr.displayHeadingDeg = null;
        }

        if (dr.speedMps >= drMin && dr.extrapolateHeadingDeg != null) {
          const dist = dr.speedMps * dt;
          if (dist > 0) {
            const o = offsetByHeadingMeters(dr.synLat, dr.synLng, dr.extrapolateHeadingDeg, dist);
            dr.synLat = o.lat;
            dr.synLng = o.lng;
          }
        }

        stepDisplayEmaTowardSyn(dr, undefined, tun);

        stepDisplayHeadingTowardTarget(dr, dt, tun);

        const raw = selfFixRef.current;
        const displayBearing =
          dr.displayHeadingDeg ??
          dr.extrapolateHeadingDeg ??
          gpsHeadingLastResortFromFix(raw?.heading ?? null, vKmh, compassHeadingRef.current, tun);

        const smooth = getSmoothedPoseLngLat(dr);
        const smoothAcc = dr.lastAcceptedAccuracyM ?? raw?.accuracy ?? null;
        const frozen = syncStationaryDisplayFreeze(dr, smooth, displayBearing, smoothAcc, stationaryMapRef.current, tun);

        const applyFollow = applyFollowRef.current;

        if (frozen) {
          const snap = stationaryMapRef.current.snapshot;
          if (snap && now - lastPuckThrottle.t >= puckMinMs) {
            lastPuckThrottle.t = now;
            setPuckDisplay({
              lat: snap.lat,
              lng: snap.lng,
              bearing: displayBearing ?? snap.bearingDeg ?? null,
            });
          }
          if (snap && followCameraRef.current && now - dr.lastCameraApplyMs >= followMinMs) {
            dr.lastCameraApplyMs = now;
            applyFollow(snap.lng, snap.lat, displayBearing ?? snap.bearingDeg ?? undefined);
          }
          if (snap) stationaryPrevFrozenRef.current = true;
        } else {
          stationaryPrevFrozenRef.current = false;
          if (now - lastPuckThrottle.t >= puckMinMs) {
            lastPuckThrottle.t = now;
            setPuckDisplay({
              lat: smooth.lat,
              lng: smooth.lng,
              bearing: displayBearing,
            });
          }

          if (followCameraRef.current && now - dr.lastCameraApplyMs >= followMinMs) {
            dr.lastCameraApplyMs = now;
            applyFollow(smooth.lng, smooth.lat, displayBearing ?? undefined);
          }
        }

        bearingTelemetryRef.current = {
          compassDeg:
            compassHeadingRef.current != null && Number.isFinite(compassHeadingRef.current)
              ? compassHeadingRef.current
              : null,
          gpsDeg: gpsHeadingRef.current != null && Number.isFinite(gpsHeadingRef.current) ? gpsHeadingRef.current : null,
          speedKmh: vKmh,
          blendWeight: getHeadingBlendWeight(vKmh, tun),
          extrapolateHeadingDeg:
            dr.extrapolateHeadingDeg != null && Number.isFinite(dr.extrapolateHeadingDeg)
              ? dr.extrapolateHeadingDeg
              : null,
          displayHeadingDeg:
            dr.displayHeadingDeg != null && Number.isFinite(dr.displayHeadingDeg) ? dr.displayHeadingDeg : null,
        };
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [motionLoopEnabled, replayPlaying, useDeviceGps, applyGeolocationSample, followCameraRef, compassHeadingRef]);

  return {
    geoError,
    setGeoError,
    selfFix,
    puckDisplay,
    deadReckonRef,
    selfFixRef,
    puckDisplayRef,
    applyGeolocationSample,
    bearingTelemetryRef,
    /** Replay-only: elapsed ms on the loaded track (UI timeline). */
    replayElapsedMs,
    /** Replay-only: jump to `offsetMs` by re-feeding fixes; preserves clock for resume. */
    seekReplayToOffsetMs,
  };
}
