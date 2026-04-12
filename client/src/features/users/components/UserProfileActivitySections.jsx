import { Link } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import { ROUTES } from '@/app/router/route-paths';
import { buildQueryString } from '@/shared/api/api-helpers';
import RouteCard from '@/features/routes/components/RouteCard';
import {
  useUserParticipatedRidesPreview,
  useUserUploadedRoutesPreview,
} from '@/features/users/hooks/useUserProfileActivity';

function formatWhen(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

function ProfileRidePreviewCard({ ride }) {
  return (
    <Card className="flex flex-col">
      <h3 className="text-lg font-semibold leading-snug">{ride.name}</h3>
      <p className="mt-2 text-sm text-fg-muted">{formatWhen(ride.scheduledDate)}</p>
      <div className="mt-4">
        <Link to={ROUTES.rideEvent.replace(':rideId', String(ride.id))}>
          <Button variant="secondary" type="button" className="text-sm">
            View ride
          </Button>
        </Link>
      </div>
    </Card>
  );
}

/**
 * Uploaded routes + participated rides preview with deep links to Explore routes and My rides.
 */
export function UserProfileActivitySections({ userId, profile }) {
  const id = Number(userId);
  const { data: routesPage, isLoading: routesLoading } = useUserUploadedRoutesPreview(userId);
  const { data: ridesPage, isLoading: ridesLoading } = useUserParticipatedRidesPreview(userId);

  const searchHint = (profile?.fullName || '').trim();
  const routesMoreHref = `${ROUTES.routes}${buildQueryString({
    createdBy: id,
    ...(searchHint ? { q: searchHint } : {}),
  })}`;
  const ridesMoreHref = `${ROUTES.myRides}${buildQueryString({
    member: id,
    ...(searchHint ? { q: searchHint } : {}),
  })}`;

  const routeItems = routesPage?.items ?? [];
  const rideItems = ridesPage?.items?.filter(Boolean) ?? [];
  const routesTotal = routesPage?.total ?? 0;
  const ridesTotal = ridesPage?.total ?? 0;

  if (routesLoading && ridesLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-40 animate-pulse rounded-3xl bg-surface-strong" />
        <div className="h-40 animate-pulse rounded-3xl bg-surface-strong" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Routes</p>
            <h2 className="mt-1 text-xl font-semibold">Uploaded routes</h2>
          </div>
          {routesTotal > 2 ? (
            <Link
              to={routesMoreHref}
              className="text-sm font-medium text-rydo-purple hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple rounded"
            >
              Show more
            </Link>
          ) : null}
        </div>
        {routeItems.length === 0 ? (
          <p className="text-sm text-fg-muted">No routes uploaded yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {routeItems.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Rides</p>
            <h2 className="mt-1 text-xl font-semibold">Rides</h2>
          </div>
          {ridesTotal > 2 ? (
            <Link
              to={ridesMoreHref}
              className="text-sm font-medium text-rydo-purple hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple rounded"
            >
              Show more
            </Link>
          ) : null}
        </div>
        {rideItems.length === 0 ? (
          <p className="text-sm text-fg-muted">No rides to show yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {rideItems.map((ride) => (
              <ProfileRidePreviewCard key={ride.id} ride={ride} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
