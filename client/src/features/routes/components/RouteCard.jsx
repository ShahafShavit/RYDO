import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import Badge from '@/shared/components/ui/badge/Badge';
import Button from '@/shared/components/ui/button/Button';
import { ROUTES } from '@/app/router/route-paths';
import { durationSourceLabel } from '@/features/routes/utils/durationSource';
import CompactRouteMapPreview from '@/features/routes/components/CompactRouteMapPreview';
import { RouteCardDescription } from '@/features/routes/components/RouteDescriptionSnippet';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';
import { formatTrailMetaLabel } from '@/features/routes/utils/route-formatters';
import RouteRidersPanel from '@/features/routes/components/RouteRidersPanel';

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

export default function RouteCard({ route }) {
  const { formatKm } = useFormatDistance();
  const title = route?.title || 'Untitled route';
  const descriptionFallback =
    'Structured route metadata for fast decision-making before you ride.';
  const difficulty = formatTrailMetaLabel(route?.difficulty || 'unknown');
  const terrain = formatTrailMetaLabel(route?.terrain || 'mixed');
  const duration = formatDuration(route?.estimatedDurationMinutes);
  const distance = route?.distanceKm != null ? formatKm(route.distanceKm) : null;
  const fromYou =
    route?.distanceFromUserKm != null && Number.isFinite(Number(route.distanceFromUserKm))
      ? formatKm(route.distanceFromUserKm)
      : null;

  const routeId = route?.id ?? '';
  const mapPreview = useMemo(() => route?.preview ?? null, [route]);

  return (
    <Card className="flex h-full flex-col justify-between">
      <div>
        <CompactRouteMapPreview preview={mapPreview} />
        <div className="mt-4 flex w-full min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap gap-2">
            <Badge>{terrain}</Badge>
            {fromYou && (
              <Badge title="Straight-line distance from your location to the route start">
                {fromYou} from you
              </Badge>
            )}
            {distance && <Badge>{distance}</Badge>}
            {duration && (
              <span title={durationSourceLabel(route?.estimatedDurationSource)}>
                <Badge>{duration}</Badge>
              </span>
            )}
          </div>
          <Badge variant="neon" className="shrink-0">
            {difficulty}
          </Badge>
        </div>
        <div className="mt-4">
          <h3 className="text-xl font-semibold">{title}</h3>
          <RouteCardDescription
            description={route?.description}
            fallback={descriptionFallback}
            routeId={routeId}
          />
        </div>
        {route?.routeRiders?.totalCount > 0 ? (
          <div className="mt-4 min-w-0">
            <RouteRidersPanel variant="inline" routeId={routeId} routeRiders={route.routeRiders} />
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <Link to={ROUTES.routeDetails.replace(':routeId', String(routeId))}>
          <Button variant="secondary">View route</Button>
        </Link>
      </div>
    </Card>
  );
}
