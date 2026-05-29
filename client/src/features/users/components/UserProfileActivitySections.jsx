import { Link } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import { ROUTES } from '@/app/router/route-paths';
import { buildQueryString } from '@/shared/api/api-helpers';
import RouteCard from '@/features/routes/components/RouteCard';
import TruncatedText from '@/shared/components/ui/TruncatedText';
import {
  useUserParticipatedRidesPreview,
  useUserUploadedRoutesPreview,
} from '@/features/users/hooks/useUserProfileActivity';

import { formatProfileWhen } from '@/features/users/utils/profile-formatters';

function ProfileRidePreviewCard({ ride }) {
  return (
    <Card className="flex min-w-0 flex-col">
      <h3 className="w-full min-w-0 text-center text-lg font-semibold leading-snug">
        <TruncatedText>{ride.name}</TruncatedText>
      </h3>
      <p className="mt-2 text-sm text-fg-muted">{formatProfileWhen(ride.scheduledDate)}</p>
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
function activityVisibility(profile, isOwn, key) {
  if (isOwn) return true;
  if (key === 'routes') {
    return profile?.privacy?.publicUploadedRoutesOnProfile ?? profile?.publicUploadedRoutesOnProfile ?? true;
  }
  return profile?.privacy?.publicParticipatedRidesOnProfile ?? profile?.publicParticipatedRidesOnProfile ?? true;
}

export function UserProfileActivitySections({ userId, profile, isOwn }) {
  const id = Number(userId);
  const showRoutes = activityVisibility(profile, isOwn, 'routes');
  const showRides = activityVisibility(profile, isOwn, 'rides');
  const { data: routesPage, isLoading: routesLoading } = useUserUploadedRoutesPreview(userId, {
    enabled: showRoutes,
  });
  const { data: ridesPage, isLoading: ridesLoading } = useUserParticipatedRidesPreview(userId, {
    enabled: showRides,
  });

  const routesMoreHref = `${ROUTES.routes}${buildQueryString({ createdBy: id })}`;
  const ridesMoreHref = `${ROUTES.myRides}${buildQueryString({ member: id })}`;

  const routeItems = routesPage?.items ?? [];
  const rideItems = ridesPage?.items?.filter(Boolean) ?? [];
  const routesTotal = routesPage?.total ?? 0;
  const ridesTotal = ridesPage?.total ?? 0;

  if ((showRoutes && routesLoading) || (showRides && ridesLoading)) {
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
          {showRoutes && routesTotal > 2 ? (
            <Link
              to={routesMoreHref}
              className="text-sm font-medium text-rydo-purple hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple rounded"
            >
              Show more
            </Link>
          ) : null}
        </div>
        {!showRoutes ? (
          <p className="text-sm text-fg-muted">This member hides uploaded routes on their profile.</p>
        ) : routeItems.length === 0 ? (
          <p className="text-sm text-fg-muted">No routes uploaded yet.</p>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
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
          {showRides && ridesTotal > 2 ? (
            <Link
              to={ridesMoreHref}
              className="text-sm font-medium text-rydo-purple hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple rounded"
            >
              Show more
            </Link>
          ) : null}
        </div>
        {!showRides ? (
          <p className="text-sm text-fg-muted">This member hides rides they join on their profile.</p>
        ) : rideItems.length === 0 ? (
          <p className="text-sm text-fg-muted">No rides to show yet.</p>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
            {rideItems.map((ride) => (
              <ProfileRidePreviewCard key={ride.id} ride={ride} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
