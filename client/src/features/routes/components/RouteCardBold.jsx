import { Link } from 'react-router-dom';
import { Bike, ChevronRight, MapPin } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import CompactRouteMapPreview from '@/features/routes/components/CompactRouteMapPreview';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';
import { formatTrailMetaLabel } from '@/features/routes/utils/route-formatters';
import { cn } from '@/shared/lib/cn';

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function diffPillClass(difficulty) {
  const d = String(difficulty || '').toLowerCase();
  if (d === 'hard') return 'rydo-pill-amber';
  if (d === 'casual' || d === 'easy') return 'rydo-pill-green';
  return '';
}

export default function RouteCardBold({ route, className }) {
  const { formatKm, formatElevation } = useFormatDistance();
  const title = route?.title || 'Untitled route';
  const terrain = formatTrailMetaLabel(route?.terrain || 'mixed');
  const difficulty = formatTrailMetaLabel(route?.difficulty || '');
  const distance =
    route?.distanceKm != null && Number.isFinite(Number(route.distanceKm))
      ? formatKm(route.distanceKm)
      : '—';
  const elevation =
    route?.elevationGainM != null && Number.isFinite(Number(route.elevationGainM))
      ? formatElevation(route.elevationGainM, 0)
      : '—';
  const riders = route?.routeRiders?.totalCount ?? 0;
  const routeHref = ROUTES.routeDetails.replace(':routeId', String(route?.id ?? ''));
  const mapPreview = route?.preview ?? null;

  return (
    <Link
      to={routeHref}
      className={cn(
        'rydo-bold-glass-row flex items-stretch gap-3 p-2.5 transition hover:border-border-strong',
        className,
      )}
    >
      <div className="w-24 min-h-16 shrink-0 self-stretch overflow-hidden rounded-2xl border border-border">
        <CompactRouteMapPreview
          preview={mapPreview}
          compactPlaceholder
          className="h-full w-full overflow-hidden rounded-none border-0 bg-surface"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('rydo-pill px-2.5 py-0.5 text-[11px] font-bold', diffPillClass(route?.difficulty))}>
            {difficulty || 'Route'}
          </span>
          {riders > 0 ? (
            <span className="rydo-subtle inline-flex items-center gap-1 text-[11px]">
              <Bike className="h-3 w-3" aria-hidden />
              {riders}
            </span>
          ) : null}
        </div>
        <DisplayTitle as="div" size="sm" className="mt-1.5 truncate text-lg">
          {title}
        </DisplayTitle>
        {route?.region ? (
          <span className="rydo-subtle mt-0.5 inline-flex items-center gap-1 text-xs">
            <MapPin className="h-3 w-3" aria-hidden />
            {route.region}
          </span>
        ) : null}
        <div className="mt-auto flex gap-3.5 pt-2">
          <span className="rydo-tnum text-[13px] font-bold text-fg">{distance}</span>
          <span className="rydo-tnum text-[13px] font-bold text-fg">{elevation}</span>
          <span className="rydo-subtle text-xs font-semibold">{terrain}</span>
        </div>
      </div>
      <ChevronRight className="my-auto h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden />
    </Link>
  );
}
