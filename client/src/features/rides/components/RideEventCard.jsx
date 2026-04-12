import { Link } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import Badge from '@/shared/components/ui/badge/Badge';
import { ROUTES } from '@/app/router/route-paths';

function isRideUpcoming(ride) {
  const iso = ride?.scheduledDate || ride?.time;
  if (!iso) return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return true;
  return d.getTime() >= Date.now();
}

export default function RideEventCard({ ride }) {
  const upcoming = isRideUpcoming(ride);
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neon">{upcoming ? 'Upcoming' : 'Past'}</Badge>
        <Badge>{ride.routeName}</Badge>
        {ride.clubName ? <Badge variant="success">Club: {ride.clubName}</Badge> : null}
      </div>
      <h1 className="mt-4 text-3xl font-semibold">{ride.name}</h1>
      {ride.createdBy?.fullName ? (
        <p className="mt-2 text-sm text-white/52">
          Organized by{' '}
          {ride.createdBy?.id != null ? (
            <Link
              to={ROUTES.userProfile.replace(':userId', String(ride.createdBy.id))}
              className="font-medium text-[#7B5CFF] hover:underline"
            >
              {ride.createdBy.fullName}
            </Link>
          ) : (
            <span className="text-white/72">{ride.createdBy.fullName}</span>
          )}
        </p>
      ) : null}
      <p className="mt-2 text-white/64">{ride.time}</p>
      <p className="mt-4 text-white/72">{ride.notes}</p>
    </Card>
  );
}
