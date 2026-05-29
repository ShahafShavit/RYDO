import Card from '@/shared/components/ui/card/Card';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';
import { isRideUpcoming } from '@/features/rides/hooks/useRideEvent';
import { getRouteStartLatLng } from '@/features/weather/routeStartLatLng';
import { useRideHourForecast } from '@/features/weather/useRideHourForecast';
import { weatherCodeDisplay } from '@/features/weather/weatherCode';

function OpenMeteoCredit({ compact = false }) {
  return (
    <p
      className={
        compact
          ? 'mt-auto pt-2 text-[10px] leading-snug text-fg-subtle'
          : 'mt-3 text-xs text-fg-subtle'
      }
    >
      Weather data by{' '}
      <a
        href="https://open-meteo.com/"
        target="_blank"
        rel="noreferrer noopener"
        className="text-rydo-purple hover:underline"
      >
        Open-Meteo
      </a>
      .
    </p>
  );
}

/**
 * @param {{ ride: object, linkedRoute: object | null, routeLoading?: boolean, layout?: 'card' | 'split' }} props
 */
export default function RideWeatherSummary({
  ride,
  linkedRoute,
  routeLoading = false,
  layout = 'card',
}) {
  const { formatSpeedKmh } = useFormatDistance();
  const split = layout === 'split';
  const upcoming = isRideUpcoming(ride);
  const hasRoute = ride?.routeId != null;
  const q = useRideHourForecast(ride, linkedRoute, { isUpcoming: Boolean(upcoming && hasRoute) });

  if (!upcoming || !hasRoute) {
    return null;
  }

  const ll = linkedRoute ? getRouteStartLatLng(linkedRoute) : null;

  const shellClass = split
    ? 'flex h-full min-h-[12rem] flex-col rounded-3xl border border-border bg-surface p-3 backdrop-blur-xl md:min-h-0'
    : '';

  if (routeLoading || !linkedRoute) {
    if (split) {
      return (
        <div className={shellClass}>
          <p className="text-sm font-semibold text-fg">Weather</p>
          <p className="text-[11px] text-fg-muted">At ride start</p>
          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2">
            <div className="h-14 animate-pulse rounded-2xl bg-surface-strong" aria-hidden />
            <div className="h-8 animate-pulse rounded-xl bg-surface-strong" aria-hidden />
          </div>
        </div>
      );
    }
    return (
      <Card>
        <h3 className="text-lg font-semibold">Weather at ride start</h3>
        <div className="mt-4 h-16 animate-pulse rounded-2xl bg-surface-strong" aria-hidden />
      </Card>
    );
  }

  if (!ll) {
    const inner = (
      <>
        <h3 className={`font-semibold text-fg ${split ? 'text-sm' : 'text-lg'}`}>Weather at ride start</h3>
        <p className={`text-fg-muted ${split ? 'mt-2 text-xs' : 'mt-3 text-sm'}`}>
          This linked route has no preview coordinates, so a forecast cannot be placed.
        </p>
      </>
    );
    if (split) {
      return <div className={shellClass}>{inner}</div>;
    }
    return <Card>{inner}</Card>;
  }

  if (q.isLoading) {
    if (split) {
      return (
        <div className={shellClass}>
          <p className="text-sm font-semibold text-fg">Weather</p>
          <p className="text-[11px] text-fg-muted">At ride start</p>
          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2">
            <div className="h-14 animate-pulse rounded-2xl bg-surface-strong" aria-hidden />
            <div className="h-8 animate-pulse rounded-xl bg-surface-strong" aria-hidden />
          </div>
        </div>
      );
    }
    return (
      <Card>
        <h3 className="text-lg font-semibold">Weather at ride start</h3>
        <div className="mt-4 h-16 animate-pulse rounded-2xl bg-surface-strong" aria-hidden />
      </Card>
    );
  }

  if (q.isError) {
    const inner = (
      <>
        <h3 className={`font-semibold text-fg ${split ? 'text-sm' : 'text-lg'}`}>Weather at ride start</h3>
        <p className={`text-red-400 ${split ? 'mt-2 text-xs' : 'mt-3 text-sm'}`}>
          {q.error?.message || 'Could not load forecast.'}
        </p>
        <OpenMeteoCredit compact={split} />
      </>
    );
    if (split) {
      return <div className={`${shellClass} min-h-0`}>{inner}</div>;
    }
    return <Card>{inner}</Card>;
  }

  const slot = q.data?.slot;
  if (!slot || q.data?.idx < 0) {
    const inner = (
      <>
        <h3 className={`font-semibold text-fg ${split ? 'text-sm' : 'text-lg'}`}>Weather at ride start</h3>
        <p className={`text-fg-muted ${split ? 'mt-2 text-xs' : 'mt-3 text-sm'}`}>
          No hourly forecast is available for that date yet. Check again closer to the ride.
        </p>
        <OpenMeteoCredit compact={split} />
      </>
    );
    if (split) {
      return <div className={`${shellClass} min-h-0`}>{inner}</div>;
    }
    return <Card>{inner}</Card>;
  }

  const { emoji, label } = weatherCodeDisplay(slot.weatherCode);
  const temp =
    slot.temperatureC != null && Number.isFinite(Number(slot.temperatureC))
      ? `${Math.round(Number(slot.temperatureC))}°C`
      : '—';
  const popPct =
    slot.precipProb != null && Number.isFinite(Number(slot.precipProb))
      ? Math.round(Number(slot.precipProb))
      : null;
  const windKmh =
    slot.windKmh != null && Number.isFinite(Number(slot.windKmh)) ? Math.round(Number(slot.windKmh)) : null;

  if (split) {
    return (
      <div className={`${shellClass} min-h-0`}>
        <div className="shrink-0">
          <h3 className="text-sm font-semibold text-fg">Weather</h3>
          <p className="text-[11px] text-fg-muted">At ride start (UTC hour)</p>
        </div>
        <div className="mt-2 flex min-h-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-black/20 px-2 py-3 text-center">
          <span className="text-4xl leading-none sm:text-5xl" aria-hidden>
            {emoji}
          </span>
          <p className="max-w-full text-xs font-medium text-fg" title={label}>
            {label}
          </p>
          <p className="text-xl font-semibold tabular-nums text-fg">{temp}</p>
          <div className="mt-1 flex flex-col gap-0.5 text-[10px] text-fg-muted">
            {popPct != null ? <span>{popPct}% rain</span> : null}
            {windKmh != null ? <span>{formatSpeedKmh(windKmh, 0)}</span> : null}
          </div>
        </div>
        <OpenMeteoCredit compact />
      </div>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold">Weather at ride start</h3>
      <p className="mt-1 text-sm text-fg-muted">
        Forecast for the model hour closest to your scheduled start (UTC-matched).
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-black/20 px-4 py-4">
        <span className="text-5xl leading-none sm:text-6xl" aria-hidden>
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-fg">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-fg">{temp}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
            {popPct != null ? <span>{popPct}% chance of rain</span> : null}
            {windKmh != null ? <span>{formatSpeedKmh(windKmh, 0)} wind</span> : null}
          </div>
        </div>
      </div>
      <OpenMeteoCredit />
    </Card>
  );
}
