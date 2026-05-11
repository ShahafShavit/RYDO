import { useQuery } from '@tanstack/react-query';
import {
  buildOpenMeteoHourlyGmtUrl,
  closestHourlyIndex,
  fetchOpenMeteoJson,
  hourlyDateRangeAroundUtc,
} from '@/features/weather/openMeteo';
import { getRouteStartLatLng } from '@/features/weather/routeStartLatLng';

function roundCoord(n) {
  return Math.round(Number(n) * 100) / 100;
}

/**
 * Hourly forecast at route start, slot closest to ride scheduled instant (UTC).
 * @param {object | null} ride mapped ride DTO
 * @param {object | null} linkedRoute normalized route
 * @param {{ isUpcoming: boolean }} ctx
 */
export function useRideHourForecast(ride, linkedRoute, { isUpcoming }) {
  const ll = linkedRoute ? getRouteStartLatLng(linkedRoute) : null;
  const scheduled = ride?.scheduledDate || ride?.time || '';
  const range = scheduled ? hourlyDateRangeAroundUtc(scheduled, 2) : null;
  const enabled = Boolean(isUpcoming && ll && range && scheduled);

  return useQuery({
    queryKey: [
      'weather',
      'ride-hour',
      ride?.id,
      scheduled,
      ll ? roundCoord(ll.lat) : null,
      ll ? roundCoord(ll.lng) : null,
      range?.startDate,
      range?.endDate,
    ],
    queryFn: async () => {
      if (!ll || !range) throw new Error('Missing location or date range for weather.');
      const url = buildOpenMeteoHourlyGmtUrl({
        lat: ll.lat,
        lng: ll.lng,
        startDate: range.startDate,
        endDate: range.endDate,
      });
      const json = await fetchOpenMeteoJson(url);
      const times = json?.hourly?.time;
      const hourly = json?.hourly ?? {};
      const targetMs = Date.parse(scheduled);
      const idx = closestHourlyIndex(times, targetMs);
      if (idx < 0) return { json, idx: -1, slot: null };

      const wCode = hourly.weather_code?.[idx] ?? hourly.weathercode?.[idx];
      const slot = {
        timeUtc: times[idx],
        temperatureC: hourly.temperature_2m?.[idx] ?? null,
        precipProb: hourly.precipitation_probability?.[idx] ?? null,
        weatherCode: wCode ?? null,
        windKmh: hourly.wind_speed_10m?.[idx] ?? null,
      };
      return { json, idx, slot };
    },
    enabled,
    staleTime: 30 * 60 * 1000,
  });
}
