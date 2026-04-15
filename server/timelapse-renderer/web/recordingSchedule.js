/**
 * Keep logic aligned with `client/src/features/timelapse/timelapseRecordingSchedule.js`.
 */
import * as turf from '@turf/turf';

export function buildRecordingSchedule(line, timesMs) {
  const coords = line.geometry?.coordinates;
  if (!coords || coords.length < 2) return { ok: false };
  if (!timesMs || timesMs.length !== coords.length) return { ok: false };
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(timesMs[i])) return { ok: false };
  }
  for (let i = 0; i < n - 1; i++) {
    if (timesMs[i + 1] <= timesMs[i]) return { ok: false };
  }
  const span = timesMs[n - 1] - timesMs[0];
  if (span < 1000) return { ok: false };

  const cumDistKm = [0];
  for (let i = 1; i < n; i++) {
    const d = turf.distance(turf.point(coords[i - 1]), turf.point(coords[i]), { units: 'kilometers' });
    cumDistKm[i] = cumDistKm[i - 1] + d;
  }
  const totalKm = cumDistKm[n - 1];
  if (!(totalKm > 0)) return { ok: false };

  return {
    ok: true,
    timesMs,
    cumDistKm,
    firstMs: timesMs[0],
    lastMs: timesMs[n - 1],
    totalKm,
  };
}

export function distanceKmAtPlaybackU(playbackU, lineLengthKm, useRecordingVelocity, schedule) {
  const u = Math.min(1, Math.max(0, playbackU));
  if (!useRecordingVelocity || !schedule || !schedule.ok) return u * lineLengthKm;
  const tMs = schedule.firstMs + u * (schedule.lastMs - schedule.firstMs);
  return distanceKmAtRecordingTimeMs(tMs, schedule);
}

function distanceKmAtRecordingTimeMs(tMs, schedule) {
  if (!schedule.ok) return 0;
  const { timesMs, cumDistKm, totalKm } = schedule;
  const n = timesMs.length;
  if (tMs <= timesMs[0]) return 0;
  if (tMs >= timesMs[n - 1]) return totalKm;

  let i = 0;
  for (let k = 0; k < n - 1; k++) {
    if (timesMs[k] <= tMs && tMs <= timesMs[k + 1]) {
      i = k;
      break;
    }
  }
  const dt = timesMs[i + 1] - timesMs[i];
  if (dt <= 0) return cumDistKm[i];
  const alpha = (tMs - timesMs[i]) / dt;
  return cumDistKm[i] + alpha * (cumDistKm[i + 1] - cumDistKm[i]);
}
