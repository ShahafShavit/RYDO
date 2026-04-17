import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '@/shared/components/ui/card/Card';
import { getRouteStartLatLng } from '@/features/weather/routeStartLatLng';
import { useRouteLocationForecast } from '@/features/weather/useRouteLocationForecast';
import { weatherCodeDisplay } from '@/features/weather/weatherCode';

const VISIBLE_DAYS = 2;

function formatDailyHeading(isoDate) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function OpenMeteoCredit({ compact = false }) {
  return (
    <p className={compact ? 'mt-auto pt-2 text-[10px] leading-snug text-fg-subtle' : 'mt-4 text-xs text-fg-subtle'}>
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

function DayTile({ day, code, hi, lo, pop }) {
  const { emoji, label } = weatherCodeDisplay(code);
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-border bg-black/20 px-1.5 py-2 text-center sm:px-2 sm:py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle sm:text-xs">{formatDailyHeading(day)}</p>
      <p className="mt-1 text-3xl leading-none sm:mt-2 sm:text-4xl" title={label} aria-hidden>
        {emoji}
      </p>
      <p className="mt-0.5 text-[10px] text-fg-muted sm:mt-1 sm:text-xs" title={label}>
        {label}
      </p>
      <p className="mt-1 text-xs font-semibold text-fg sm:mt-2 sm:text-sm">
        {Number.isFinite(lo) && Number.isFinite(hi) ? `${Math.round(lo)}° / ${Math.round(hi)}°` : '—'}
      </p>
      {Number.isFinite(pop) ? (
        <p className="mt-0.5 text-[10px] text-fg-subtle sm:mt-1 sm:text-xs">Rain {Math.round(pop)}%</p>
      ) : null}
    </div>
  );
}

function GalleryNav({ canPrev, canNext, onPrev, onNext }) {
  const btnClass =
    'inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-strong/80 p-1.5 text-fg transition enabled:hover:border-border-strong enabled:hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-35';
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" className={btnClass} disabled={!canPrev} onClick={onPrev} aria-label="Show earlier days">
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <button type="button" className={btnClass} disabled={!canNext} onClick={onNext} aria-label="Show later days">
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/**
 * @param {{ route: object | null, isRouteLoading?: boolean, layout?: 'card' | 'split' }} props
 */
export default function RouteWeatherPanel({ route, isRouteLoading = false, layout = 'card' }) {
  const split = layout === 'split';
  const q = useRouteLocationForecast(route, { days: 7 });
  const ll = route ? getRouteStartLatLng(route) : null;

  const [start, setStart] = useState(0);

  const daily = q.data?.daily;
  const times = Array.isArray(daily?.time) ? daily.time : [];
  const codes = Array.isArray(daily?.weather_code)
    ? daily.weather_code
    : Array.isArray(daily?.weathercode)
      ? daily.weathercode
      : [];
  const tMax = Array.isArray(daily?.temperature_2m_max) ? daily.temperature_2m_max : [];
  const tMin = Array.isArray(daily?.temperature_2m_min) ? daily.temperature_2m_min : [];
  const precip = Array.isArray(daily?.precipitation_probability_max)
    ? daily.precipitation_probability_max
    : [];

  const maxStart = Math.max(0, times.length - VISIBLE_DAYS);
  const effectiveStart = Math.min(Math.max(0, start), maxStart);

  if (isRouteLoading || !route) {
    if (!split) return null;
    return (
      <div className="flex h-full min-h-[12rem] flex-col rounded-3xl border border-border bg-surface p-3 backdrop-blur-xl md:min-h-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-fg">Weather</p>
          <div className="flex gap-1">
            <div className="h-8 w-8 animate-pulse rounded-full bg-surface-strong" />
            <div className="h-8 w-8 animate-pulse rounded-full bg-surface-strong" />
          </div>
        </div>
        <div className="mt-3 flex min-h-0 flex-1 gap-2">
          {[0, 1].map((k) => (
            <div key={k} className="min-h-24 flex-1 animate-pulse rounded-2xl bg-surface-strong" />
          ))}
        </div>
      </div>
    );
  }

  const shellClass = split
    ? 'flex h-full min-h-[12rem] flex-col rounded-3xl border border-border bg-surface p-3 backdrop-blur-xl md:min-h-0'
    : '';

  if (!ll) {
    const inner = (
      <>
        <h3 className="text-lg font-semibold">Weather</h3>
        <p className="mt-3 text-sm text-fg-muted">
          This route does not have enough map preview coordinates to pin a forecast location.
        </p>
      </>
    );
    if (split) {
      return <div className={shellClass}>{inner}</div>;
    }
    return <Card>{inner}</Card>;
  }

  if (q.isLoading) {
    const inner = (
      <>
        <h3 className="text-lg font-semibold">Weather</h3>
        <div className="mt-4 flex gap-3">
          {[0, 1].map((k) => (
            <div key={k} className="h-28 flex-1 animate-pulse rounded-2xl bg-surface-strong" />
          ))}
        </div>
      </>
    );
    if (split) {
      return <div className={shellClass}>{inner}</div>;
    }
    return <Card>{inner}</Card>;
  }

  if (q.isError) {
    const inner = (
      <>
        <h3 className="text-lg font-semibold">Weather</h3>
        <p className="mt-3 text-sm text-red-400">{q.error?.message || 'Could not load forecast.'}</p>
        <OpenMeteoCredit compact={split} />
      </>
    );
    if (split) {
      return <div className={shellClass}>{inner}</div>;
    }
    return <Card>{inner}</Card>;
  }

  if (times.length === 0) {
    const inner = (
      <>
        <h3 className="text-lg font-semibold">Weather</h3>
        <p className="mt-3 text-sm text-fg-muted">No daily forecast available for this location.</p>
        <OpenMeteoCredit compact={split} />
      </>
    );
    if (split) {
      return <div className={shellClass}>{inner}</div>;
    }
    return <Card>{inner}</Card>;
  }

  const slice = times.slice(effectiveStart, effectiveStart + VISIBLE_DAYS);
  const canPrev = effectiveStart > 0;
  const canNext = effectiveStart < maxStart;

  const gallery = (
    <div className="flex min-h-0 flex-1 gap-1.5 sm:gap-2">
      {slice.map((day, j) => {
        const i = effectiveStart + j;
        return (
          <DayTile
            key={day}
            day={day}
            code={codes[i]}
            hi={tMax[i]}
            lo={tMin[i]}
            pop={precip[i]}
          />
        );
      })}
    </div>
  );

  const headerRow = (
    <div className="flex shrink-0 items-center justify-between gap-2">
      <div className="min-w-0">
        <h3 className={`font-semibold text-fg ${split ? 'text-sm' : 'text-lg'}`}>Weather</h3>
        {!split ? (
          <p className="mt-1 text-sm text-fg-muted">Next few days at the beginning of this track.</p>
        ) : (
          <p className="text-[11px] text-fg-muted">Near route start</p>
        )}
      </div>
      {times.length > VISIBLE_DAYS ? (
        <GalleryNav
          canPrev={canPrev}
          canNext={canNext}
          onPrev={() => setStart((s) => Math.max(0, Math.min(s, maxStart) - 1))}
          onNext={() => setStart((s) => Math.min(maxStart, Math.min(s, maxStart) + 1))}
        />
      ) : null}
    </div>
  );

  if (split) {
    return (
      <div className={`${shellClass} min-h-0`}>
        {headerRow}
        <div className="mt-2 flex min-h-0 flex-1 flex-col">{gallery}</div>
        <OpenMeteoCredit compact />
      </div>
    );
  }

  return (
    <Card>
      {headerRow}
      <div className="mt-4">{gallery}</div>
      <OpenMeteoCredit />
    </Card>
  );
}
