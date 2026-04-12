import { Link } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import Badge from '@/shared/components/ui/badge/Badge';
import Button from '@/shared/components/ui/button/Button';
import { ROUTES } from '@/app/router/route-paths';
import { isRideUpcoming } from '@/features/rides/hooks/useRideEvent';

/**
 * @param {{ ride: object, showEdit?: boolean, onEditClick?: () => void }} props
 */
export default function RideEventCard({ ride, showEdit = false, onEditClick }) {
  const upcoming = isRideUpcoming(ride);
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Badge variant="neon">{upcoming ? 'Upcoming' : 'Past'}</Badge>
          <Badge>{ride.routeName}</Badge>
          {ride.clubName ? <Badge variant="success">Club: {ride.clubName}</Badge> : null}
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
