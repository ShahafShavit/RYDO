import { Link } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import Badge from '@/shared/components/ui/badge/Badge';
import Button from '@/shared/components/ui/button/Button';
import { ROUTES } from '@/app/router/route-paths';

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

export default function RouteCard({ route }) {
  const title = route?.title || route?.name || 'Untitled route';
  const description = route?.description || 'Structured route metadata for fast decision-making before you ride.';
  const difficulty = route?.difficulty || 'unknown';
  const terrain = route?.terrain || 'mixed';
  const duration = formatDuration(route?.durationMinutes ?? route?.duration);
  const distance = route?.distanceKm ? `${route.distanceKm} km` : null;

  const routeId = route?.id ?? route?.routeId ?? '';

  return (
    <Card className="flex h-full flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-white/60">{description}</p>
          </div>
          <Badge variant="neon">{difficulty}</Badge>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Badge>{terrain}</Badge>
          {distance && <Badge>{distance}</Badge>}
          {duration && <Badge>{duration}</Badge>}
        </div>
      </div>

      <div className="mt-6">
        <Link to={ROUTES.routeDetails.replace(':routeId', String(routeId))}>
          <Button variant="secondary">View route</Button>
        </Link>
      </div>
    </Card>
  );
}
