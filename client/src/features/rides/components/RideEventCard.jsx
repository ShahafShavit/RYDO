import { Link } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import Badge from '@/shared/components/ui/badge/Badge';
import Button from '@/shared/components/ui/button/Button';
import { ROUTES } from '@/app/router/route-paths';
import { isRideUpcoming } from '@/features/rides/hooks/useRideEvent';

const badgeLinkClass =
  'inline-flex min-w-0 max-w-full rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple';

/**
 * @param {{ ride: object, showEdit?: boolean, onEditClick?: () => void }} props
 */
export default function RideEventCard({ ride, showEdit = false, onEditClick }) {
  const upcoming = isRideUpcoming(ride);
  const routeBadge = (
    <Badge variant="route" className="max-w-full min-w-0 truncate">
      {ride.routeName}
    </Badge>
  );
  const clubBadge =
    ride.clubName != null && String(ride.clubName).trim() !== '' ? (
      <Badge variant="success" className="max-w-full min-w-0 truncate">
        Club: {ride.clubName}
      </Badge>
    ) : null;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Badge variant="neon">{upcoming ? 'Upcoming' : 'Past'}</Badge>
          {ride.routeId != null ? (
            <Link to={ROUTES.routeDetails.replace(':routeId', String(ride.routeId))} className={badgeLinkClass}>
              {routeBadge}
            </Link>
          ) : (
            routeBadge
          )}
          {ride.clubName && ride.clubId != null ? (
            <Link to={ROUTES.clubDetails.replace(':clubId', String(ride.clubId))} className={badgeLinkClass}>
              {clubBadge}
            </Link>
          ) : (
            clubBadge
          )}
        </div>
        {showEdit ? (
          <Button variant="secondary" type="button" className="shrink-0" onClick={onEditClick}>
            Edit ride
          </Button>
        ) : null}
      </div>
      <h1 className="mt-4 text-3xl font-semibold">{ride.name}</h1>
      {ride.createdBy?.fullName ? (
        <p className="mt-2 text-sm text-fg-muted">
          Organized by{' '}
          {ride.createdBy?.id != null ? (
            <Link
              to={ROUTES.userProfile.replace(':userId', String(ride.createdBy.id))}
              className="font-medium text-rydo-purple hover:underline"
            >
              {ride.createdBy.fullName}
            </Link>
          ) : (
            <span className="text-fg-muted">{ride.createdBy.fullName}</span>
          )}
        </p>
      ) : null}
      <p className="mt-2 text-fg-muted">{ride.time}</p>
      <p className="mt-4 text-fg-muted">{ride.notes}</p>
    </Card>
  );
}
