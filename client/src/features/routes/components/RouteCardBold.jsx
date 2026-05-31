import { Link } from 'react-router-dom';
import { Bike, ChevronRight, MapPin } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import CompactRouteMapPreview from '@/features/routes/components/CompactRouteMapPreview';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import ListCardMeta, { difficultyAccent } from '@/shared/components/bold/ListCardMeta';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';
import { formatTrailMetaLabel } from '@/features/routes/utils/route-formatters';
import { cn } from '@/shared/lib/cn';

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
        <div className="flex items-start justify-between gap-2">
          <DisplayTitle as="div" size="sm" truncate className="min-w-0 flex-1 text-lg leading-tight">
            {title}
          </DisplayTitle>
          {riders > 0 ? (
            <span className="rydo-subtle inline-flex shrink-0 items-center gap-1 pt-0.5 text-[11px] font-semibold tabular-nums">
              <Bike className="h-3 w-3" aria-hidden />
              {riders}
            </span>
          ) : null}
        </div>
        <ListCardMeta
          parts={[
            {
              text: difficulty || 'Route',
              accent: difficultyAccent(route?.difficulty),
            },
            terrain ? { text: terrain } : null,
          ].filter(Boolean)}
          className="mt-1"
        />
        {route?.region ? (
          <span className="rydo-subtle mt-0.5 inline-flex items-center gap-1 text-xs">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{route.region}</span>
          </span>
        ) : null}
        <div className="mt-auto flex gap-3.5 pt-2">
          <span className="rydo-tnum text-[13px] font-bold text-fg">{distance}</span>
          <span className="rydo-tnum text-[13px] font-bold text-fg">{elevation}</span>
        </div>
      </div>
      <ChevronRight className="my-auto h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden />
    </Link>
  );
}
