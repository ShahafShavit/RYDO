import distance from '@turf/distance';
import { point } from '@turf/helpers';

/**
 * Validates per-point timestamps and builds cumulative distance along the line (for time-based playback).
 * Requires strictly increasing times and a recording span ≥ 1s.
 *
 * @param {import('geojson').Feature<import('geojson').LineString>} line
 * @param {number[] | null | undefined} timesMs parallel to vertices (epoch ms)
 * @returns {{ ok: false } | { ok: true; timesMs: number[]; cumDistKm: number[]; firstMs: number; lastMs: number; totalKm: number }}
 */
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

  /** @type {number[]} */
  const cumDistKm = [0];
  for (let i = 1; i < n; i++) {
    const d = distance(point(coords[i - 1]), point(coords[i]), { units: 'kilometers' });
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

/**
 * @param {number} playbackU animation progress 0..1 (wall clock along export/preview timeline)
 * @param {number} lineLengthKm turf line length
 * @param {boolean} useRecordingVelocity
 * @param {{ ok?: boolean; firstMs?: number; lastMs?: number; timesMs?: number[]; cumDistKm?: number[]; totalKm?: number }} schedule
 */
export function distanceKmAtPlaybackU(playbackU, lineLengthKm, useRecordingVelocity, schedule) {
  const u = Math.min(1, Math.max(0, playbackU));
  if (!useRecordingVelocity || !schedule || !schedule.ok) return u * lineLengthKm;
  const tMs = schedule.firstMs + u * (schedule.lastMs - schedule.firstMs);
  return distanceKmAtRecordingTimeMs(tMs, schedule);
}

/**
 * @param {number} tMs absolute epoch ms within recording
 * @param {{ ok: true; timesMs: number[]; cumDistKm: number[]; totalKm: number }} schedule
 */
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
