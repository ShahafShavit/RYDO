export const OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast';

/**
 * @param {object} opts
 * @param {number} opts.lat
 * @param {number} opts.lng
 * @param {number} [opts.forecastDays=7]
 */
export function buildOpenMeteoDailyUrl({ lat, lng, forecastDays = 7 }) {
  const p = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
    ].join(','),
    forecast_days: String(Math.min(Math.max(forecastDays, 1), 16)),
    timezone: 'auto',
  });
  return `${OPEN_METEO_FORECAST}?${p.toString()}`;
}

/**
 * Hourly series in GMT so each `time` can be parsed as UTC (append Z) and matched to ride instants.
 * @param {object} opts
 * @param {number} opts.lat
 * @param {number} opts.lng
 * @param {string} opts.startDate yyyy-MM-dd
 * @param {string} opts.endDate yyyy-MM-dd
 */
export function buildOpenMeteoHourlyGmtUrl({ lat, lng, startDate, endDate }) {
  const p = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    hourly: ['temperature_2m', 'precipitation_probability', 'weather_code', 'wind_speed_10m'].join(','),
    start_date: startDate,
    end_date: endDate,
    timezone: 'GMT',
  });
  return `${OPEN_METEO_FORECAST}?${p.toString()}`;
}

/** @param {string} timeFromApi e.g. "2026-05-01T14:00" when timezone=GMT */
export function parseOpenMeteoGmtInstantMs(timeFromApi) {
  if (!timeFromApi || typeof timeFromApi !== 'string') return NaN;
  const s = timeFromApi.includes('T') ? timeFromApi : `${timeFromApi}T00:00`;
  const iso = s.endsWith('Z') ? s : `${s}Z`;
  return Date.parse(iso);
}

/**
 * @param {string[]} times
 * @param {number} targetMs
 * @returns {number} index or -1
 */
export function closestHourlyIndex(times, targetMs) {
  if (!Array.isArray(times) || times.length === 0 || !Number.isFinite(targetMs)) return -1;
  let bestI = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const ms = parseOpenMeteoGmtInstantMs(times[i]);
    if (!Number.isFinite(ms)) continue;
    const diff = Math.abs(ms - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestI = i;
    }
  }
  return bestI;
}

/** @param {string} isoRideUtc from API e.g. scheduledDate */
export function hourlyDateRangeAroundUtc(isoRideUtc, padDays = 2) {
  const t = Date.parse(isoRideUtc);
  if (!Number.isFinite(t)) return null;
  const pad = padDays * 86400000;
  const fmt = (ms) => new Date(ms).toISOString().slice(0, 10);
  return { startDate: fmt(t - pad), endDate: fmt(t + pad) };
}

export async function fetchOpenMeteoJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Weather request failed (${res.status})`);
  }
  return res.json();
}
