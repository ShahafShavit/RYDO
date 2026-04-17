import { useQuery } from '@tanstack/react-query';
import { buildOpenMeteoDailyUrl, fetchOpenMeteoJson } from '@/features/weather/openMeteo';
import { getRouteStartLatLng } from '@/features/weather/routeStartLatLng';

function roundCoord(n) {
  return Math.round(Number(n) * 100) / 100;
}

const calendarDayUtc = () => new Date().toISOString().slice(0, 10);

/** Daily outlook at route start (preview first point). */
export function useRouteLocationForecast(route, opts = {}) {
  const days = opts.days ?? 7;
  const ll = route ? getRouteStartLatLng(route) : null;
  const enabled = Boolean(ll);

  return useQuery({
    queryKey: [
      'weather',
      'daily',
      ll ? roundCoord(ll.lat) : null,
      ll ? roundCoord(ll.lng) : null,
      days,
      calendarDayUtc(),
    ],
    queryFn: async () => {
      const url = buildOpenMeteoDailyUrl({ lat: ll.lat, lng: ll.lng, forecastDays: days });
      return fetchOpenMeteoJson(url);
    },
    enabled,
    staleTime: 30 * 60 * 1000,
  });
}
