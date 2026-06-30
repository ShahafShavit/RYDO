import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DEFAULT_LIVE_RIDE_MOTION_TUNING, mergeLiveRideMotionTuning } from '@/features/live-ride/utils/liveRideMotionTuning';
import {
  createPeerMotionState,
  getPeerDisplayPose,
  ingestPeerFix,
  stepPeerMotionFrame,
} from '@/features/live-ride/utils/liveRidePeerMotion';
import { pickTuning } from '@/features/live-ride/utils/liveRideTuningPick';

function buildDisplayPeersMap(peersById, motionById) {
  const next = new Map();
  for (const [userId, peer] of peersById) {
    const state = motionById.get(userId);
    const pose = state ? getPeerDisplayPose(state) : null;
    next.set(userId, {
      ...peer,
      lat: pose?.lat ?? peer.lat,
      lng: pose?.lng ?? peer.lng,
    });
  }
  return next;
}

/**
 * Smooth peer avatars between sparse hub pose updates (~2s heartbeats).
 *
 * @param {object} opts
 * @param {Map<number, object>} opts.peersById — wire poses from `useRideLiveHub`
 * @param {boolean} opts.enabled — run ingest + rAF (map boot complete, hub on)
 * @param {Partial<typeof DEFAULT_LIVE_RIDE_MOTION_TUNING> | undefined} [opts.tuning]
 * @returns {Map<number, object>} display poses with smoothed `lat`/`lng`
 */
export function usePeerMotionDisplay({ peersById, enabled, tuning: tuningProp }) {
  const [displayPeersById, setDisplayPeersById] = useState(() => new Map());
  const motionByIdRef = useRef(new Map());
  const peersByIdRef = useRef(peersById);
  const tuningRef = useRef(mergeLiveRideMotionTuning(tuningProp));

  useLayoutEffect(() => {
    tuningRef.current = mergeLiveRideMotionTuning(tuningProp);
  }, [tuningProp]);

  useLayoutEffect(() => {
    peersByIdRef.current = peersById;
  }, [peersById]);

  useLayoutEffect(() => {
    const motionById = motionByIdRef.current;
    const activeIds = new Set();

    for (const [userId, peer] of peersById) {
      activeIds.add(userId);
      let state = motionById.get(userId);
      if (!state) {
        state = createPeerMotionState();
        motionById.set(userId, state);
      }
      ingestPeerFix(state, peer, tuningRef.current);
    }

    for (const userId of motionById.keys()) {
      if (!activeIds.has(userId)) motionById.delete(userId);
    }

    if (!enabled || peersById.size === 0) {
      setDisplayPeersById(new Map());
      return;
    }

    setDisplayPeersById(buildDisplayPeersMap(peersById, motionById));
  }, [peersById, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;

    let rafId = 0;
    const lastPublish = { t: 0 };

    const tick = (now) => {
      const peers = peersByIdRef.current;
      const motionById = motionByIdRef.current;
      const tun = tuningRef.current;
      const puckMinMs = pickTuning(tun, 'PUCK_DISPLAY_MIN_MS', DEFAULT_LIVE_RIDE_MOTION_TUNING.PUCK_DISPLAY_MIN_MS);
      const rafCap = pickTuning(tun, 'RAF_DT_CAP_S', DEFAULT_LIVE_RIDE_MOTION_TUNING.RAF_DT_CAP_S);

      if (peers.size > 0) {
        for (const [userId, state] of motionById) {
          if (!peers.has(userId)) continue;
          const last = state.lastRafMs ?? now;
          const dt = Math.min(rafCap, Math.max(0, (now - last) / 1000));
          state.lastRafMs = now;
          stepPeerMotionFrame(state, dt, tun, now);
        }

        if (now - lastPublish.t >= puckMinMs) {
          lastPublish.t = now;
          setDisplayPeersById(buildDisplayPeersMap(peers, motionById));
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [enabled]);

  return displayPeersById;
}
