import { TIMELAPSE_DEFAULT_ROUTE_DURATION_SEC } from '@/features/timelapse/timelapseMapPreset';

/** Allowed wall-clock animation length for export (matches API + renderer). */
export const TIMELAPSE_ROUTE_DURATION_RANGE = { min: 30, max: 120, step: 5 };

/**
 * Suggest wall-clock duration for a timelapse from GPX clock span and/or track length.
 * @param {number} lineLengthKm
 * @param {string} xmlText raw GPX
 * @returns {number} seconds (clamped)
 */
export function suggestTimelapseDurationSec(lineLengthKm, xmlText) {
  const { min, max } = TIMELAPSE_ROUTE_DURATION_RANGE;
  const fromClock = parseGpxRecordingSpanSec(xmlText);
  if (fromClock != null && fromClock >= min) {
    return clamp(Math.round(fromClock * 1.05), min, max);
  }
  const kmh = 20;
  if (lineLengthKm > 0) {
    const fromPace = (lineLengthKm / kmh) * 3600;
    return clamp(Math.round(fromPace), min, max);
  }
  return TIMELAPSE_DEFAULT_ROUTE_DURATION_SEC;
}

/**
 * @returns {number | null} seconds between first and last trkpt time, if parseable
 */
function parseGpxRecordingSpanSec(xmlText) {
  if (!xmlText || typeof xmlText !== 'string') return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const times = [];
  for (const el of doc.getElementsByTagName('trkpt')) {
    for (const child of el.children) {
      if (child.tagName === 'time' || child.localName === 'time') {
        const v = child.textContent?.trim();
        if (v) {
          const d = Date.parse(v);
          if (!Number.isNaN(d)) times.push(d);
        }
        break;
      }
    }
  }
  if (times.length < 2) return null;
  let min = times[0];
  let max = times[0];
  for (const t of times) {
    if (t < min) min = t;
    if (t > max) max = t;
  }
  return (max - min) / 1000;
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/** Preview playback speed options (wall-clock multiplier). */
export const PREVIEW_SPEED_OPTIONS = [
  { value: 0.125, label: '0.125×' },
  { value: 0.25, label: '0.25×' },
  { value: 0.5, label: '0.5×' },
  { value: 1, label: '1×' },
  { value: 1.5, label: '1.5×' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
];
