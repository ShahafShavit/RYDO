import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import Card from '@/shared/components/ui/card/Card';
import { ROUTES } from '@/app/router/route-paths';
import { durationSourceLabel } from '@/features/routes/utils/durationSource';
import CompactRouteMapPreview from '@/features/routes/components/CompactRouteMapPreview';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';
import { formatTrailMetaLabel } from '@/features/routes/utils/route-formatters';
import RouteRidersPanel from '@/features/routes/components/RouteRidersPanel';
import TruncatedText from '@/shared/components/ui/TruncatedText';

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

export default function RouteCard({ route }) {
  const { formatKm } = useFormatDistance();
  const title = route?.title || 'Untitled route';
  const terrain = formatTrailMetaLabel(route?.terrain || 'mixed');
  const duration = formatDuration(route?.estimatedDurationMinutes);
  const distance =
    route?.distanceKm != null && Number.isFinite(Number(route.distanceKm))
      ? formatKm(route.distanceKm)
      : null;
  const fromYou =
    route?.distanceFromUserKm != null && Number.isFinite(Number(route.distanceFromUserKm))
      ? formatKm(route.distanceFromUserKm)
      : null;

  const routeId = route?.id ?? '';
  const mapPreview = useMemo(() => route?.preview ?? null, [route]);

  const routeHref = ROUTES.routeDetails.replace(':routeId', String(routeId));
  const favoriteCount = route?.favoriteCount ?? 0;
  const showRidersBadge = route?.routeRiders?.totalCount > 0;
  const showFavoriteBadge = favoriteCount > 0;
  const favoriteTitle =
    favoriteCount === 1
      ? '1 person saved this route as a favorite'
      : `${favoriteCount} people saved this route as favorites`;

  return (
    <Card className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col text-center">
        <div className="relative w-full min-w-0 shrink-0 overflow-hidden">
          <CompactRouteMapPreview preview={mapPreview} />
          {showRidersBadge || showFavoriteBadge ? (
            <div className="rydo-map-overlay pointer-events-none inset-x-0 top-2 flex items-start justify-between gap-2 px-2">
              <div className="pointer-events-auto min-w-0">
                {showRidersBadge ? (
                  <RouteRidersPanel
                    variant="mapBadge"
                    routeId={routeId}
                    routeRiders={route.routeRiders}
                  />
                ) : null}
              </div>
              <div className="pointer-events-auto shrink-0">
                {showFavoriteBadge ? (
                  <div
                    role="img"
                    className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/65 px-2 py-1 text-sm font-semibold tabular-nums text-white shadow-md backdrop-blur-sm"
                    title={favoriteTitle}
                    aria-label={favoriteTitle}
                  >
                    <Heart className="h-3.5 w-3.5 shrink-0 fill-white/25 opacity-95" strokeWidth={2} aria-hidden />
                    <span aria-hidden="true">{favoriteCount}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        <div className="mt-4 w-full min-w-0 shrink-0 text-center">
          <h3 className="w-full min-w-0 text-xl font-semibold">
            <TruncatedText
              as={Link}
              to={routeHref}
              className="text-fg underline-offset-2 transition hover:text-rydo-purple hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple rounded-sm"
            >
              {title}
            </TruncatedText>
          </h3>
        </div>
        {/* Fills extra row height so the stats row lines up across cards with different title lengths */}
        <div className="min-h-0 flex-1" aria-hidden="true" />
        <div className="mt-4 shrink-0 border-t border-border/40 pt-3">
          <div className="flex min-w-0 gap-0 text-center">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle sm:text-xs sm:tracking-[0.14em]">
                Terrain
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-fg">{terrain}</p>
            </div>
            <div className="min-w-0 flex-1 border-l border-border/50 px-2 sm:px-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle sm:text-xs sm:tracking-[0.14em]">
                Distance
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-fg">
                {distance ?? '—'}
              </p>
            </div>
            <div className="min-w-0 flex-1 border-l border-border/50 pl-2 sm:pl-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle sm:text-xs sm:tracking-[0.14em]">
                Duration
              </p>
              <p
                className="mt-0.5 truncate text-sm font-semibold tabular-nums text-fg"
                title={duration ? durationSourceLabel(route?.estimatedDurationSource) : undefined}
              >
                {duration || '—'}
              </p>
            </div>
          </div>
          {/* {route?.physicsDifficultyScore != null && Number.isFinite(Number(route.physicsDifficultyScore)) ? (
            <p className="mt-2 text-center text-xs tabular-nums text-fg-muted" title="Mechanical intensity (GPX physics)">
              Physics {Number(route.physicsDifficultyScore).toFixed(1)}/10
            </p>
          ) : null} */}
          {fromYou ? (
            <p
              className="mt-2.5 text-center text-xs tabular-nums text-fg-muted"
              title="Straight-line distance from your location to the route start"
            >
              {fromYou} from you
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
