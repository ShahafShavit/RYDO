import { useCallback, useEffect, useRef } from 'react';
import along from '@turf/along';
import bearing from '@turf/bearing';
import length from '@turf/length';
import { point } from '@turf/helpers';

const LOOKAHEAD_KM = 0.025;
const BEHIND_KM = 0.02;
const BEARING_SMOOTH = 0.12;
const MAX_FRAME_DT_SEC = 0.12;

/**
 * @param {object} opts
 * @param {import('geojson').Feature<import('geojson').LineString> | null} opts.line
 * @param {number} opts.speedMps
 * @param {boolean} opts.playing
 * @param {number} opts.resetEpoch bump to rewind to start
 * @param {(args: { map: import('mapbox-gl').Map }) => void} [opts.onMapReady]
 * @param {() => void} [opts.onFinished] when the simulated rider reaches the end of the line
 * @param {(args: { lng: number, lat: number, bearing: number, distanceM: number, totalM: number }) => void} opts.onFrame
 */
export function useDesktopSimulator({
  line,
  speedMps,
  playing,
  resetEpoch,
  onMapReady,
  onFinished,
  onFrame,
}) {
  const distanceMRef = useRef(0);
  const smoothedBearingRef = useRef(0);
  const playingRef = useRef(playing);
  const speedRef = useRef(speedMps);
  const lineRef = useRef(line);
  const onFrameRef = useRef(onFrame);
  const onMapReadyRef = useRef(onMapReady);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    speedRef.current = speedMps;
  }, [speedMps]);
  useEffect(() => {
    lineRef.current = line;
  }, [line]);
  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);
  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    distanceMRef.current = 0;
    const ln = lineRef.current;
    if (ln) {
      const start = along(ln, 0, { units: 'kilometers' });
      const [lng, lat] = start.geometry.coordinates;
      const next = along(ln, Math.min(LOOKAHEAD_KM, length(ln, { units: 'kilometers' })), {
        units: 'kilometers',
      });
      smoothedBearingRef.current = bearing(point([lng, lat]), next);
    }
  }, [line, resetEpoch]);

  const handleMapLoad = useCallback(
    (e) => {
      const map = /** @type {import('mapbox-gl').Map} */ (e.target);
      onMapReadyRef.current?.({ map });
    },
    [],
  );

  useEffect(() => {
    if (!line || !playing) return;

    let frameId = 0;
    let last = performance.now();

    const tick = (now) => {
      const ln = lineRef.current;
      if (!ln || !playingRef.current) return;

      let dt = (now - last) / 1000;
      last = now;
      if (dt > MAX_FRAME_DT_SEC) dt = MAX_FRAME_DT_SEC;

      const totalM = length(ln, { units: 'meters' });
      if (totalM <= 0) return;

      let distanceM = distanceMRef.current + speedRef.current * dt;
      const reachedEnd = distanceM >= totalM;
      if (reachedEnd) distanceM = totalM;
      distanceMRef.current = distanceM;

      const distKm = distanceM / 1000;
      const totalKm = totalM / 1000;
      const pos = along(ln, distKm, { units: 'kilometers' });
      const [lng, lat] = pos.geometry.coordinates;

      let targetBearing = smoothedBearingRef.current;
      const aheadKm = Math.min(distKm + LOOKAHEAD_KM, totalKm);
      if (aheadKm > distKm + 1e-8) {
        const aheadPt = along(ln, aheadKm, { units: 'kilometers' });
        targetBearing = bearing(pos, aheadPt);
      } else {
        const behindKm = Math.max(0, distKm - BEHIND_KM);
        const behindPt = along(ln, behindKm, { units: 'kilometers' });
        targetBearing = bearing(behindPt, pos);
      }

      const cur = smoothedBearingRef.current;
      const delta = ((targetBearing - cur + 540) % 360) - 180;
      smoothedBearingRef.current = (cur + BEARING_SMOOTH * delta + 360) % 360;

      onFrameRef.current?.({
        lng,
        lat,
        bearing: smoothedBearingRef.current,
        distanceM,
        totalM,
      });

      if (reachedEnd) {
        playingRef.current = false;
        onFinishedRef.current?.();
        return;
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [line, playing, resetEpoch]);

  return { handleMapLoad, distanceMRef, smoothedBearingRef };
}
