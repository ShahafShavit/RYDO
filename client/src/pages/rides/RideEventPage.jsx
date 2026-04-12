import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import RideEventCard from '@/features/rides/components/RideEventCard';
import EditRideModal from '@/features/rides/components/EditRideModal';
import RideMembersList from '@/features/rides/components/RideMembersList';
import RideStatusBanner from '@/features/rides/components/RideStatusBanner';
import RouteMapWithElevation from '@/features/routes/components/RouteMapWithElevation';
import RouteMetadataPanel from '@/features/routes/components/RouteMetadataPanel';
import RouteRidersPanel from '@/features/routes/components/RouteRidersPanel';
import { isRideUpcoming, useRideEvent } from '@/features/rides/hooks/useRideEvent';
import { useRideAttendance } from '@/features/rides/hooks/useRideAttendance';
import { useRouteDetails } from '@/features/routes/hooks/useRouteDetails';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Button from '@/shared/components/ui/button/Button';
import { ROUTES } from '@/app/router/route-paths';
import { buildRoutePreviewFeatureCollection } from '@/features/routes/utils/routePreviewGeoJson';

export default function RideEventPage() {
  const { rideId } = useParams();
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const { ride, isLoading, isError, error, refetch } = useRideEvent(rideId);
  const { joinRide, leaveRide, isJoining, isLeaving } = useRideAttendance(rideId);
  const rid = ride?.routeId != null ? String(ride.routeId) : '';
  const { route: linkedRoute, isLoading: routeLoading } = useRouteDetails(rid);

  const geoJson = useMemo(
    () => buildRoutePreviewFeatureCollection(linkedRoute?.preview ?? null),
    [linkedRoute],
  );

  const myUserId = user?.id != null ? Number(user.id) : null;
  const amParticipant = useMemo(() => {
    if (myUserId == null || !ride) return false;
    if (Array.isArray(ride.participants) && ride.participants.length > 0) {
      return ride.participants.map(Number).includes(myUserId);
    }
    if (Array.isArray(ride.participantDetails)) {
      return ride.participantDetails.some((p) => Number(p.userId) === myUserId);
    }
    return false;
  }, [myUserId, ride]);

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="h-40 animate-pulse rounded-3xl bg-white/10" />
      </section>
    );
  }

  if (isError || !ride) {
    return (
      <section className="space-y-4">
        <p className="text-red-400">{error?.message || 'Could not load this ride.'}</p>
        <Button variant="secondary" type="button" onClick={() => refetch()}>
          Retry
        </Button>
      </section>
    );
  }

  const showEdit = Boolean(ride.viewerCanEdit && isRideUpcoming(ride));

  return (
    <section className="space-y-6">
      <RideStatusBanner />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <RideEventCard ride={ride} />
        </div>
        {showEdit ? (
          <Button variant="secondary" type="button" className="shrink-0" onClick={() => setEditOpen(true)}>
            Edit ride
          </Button>
        ) : null}
      </div>
      <EditRideModal open={editOpen} onClose={() => setEditOpen(false)} ride={ride} />
      {ride.routeId ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              to={ROUTES.routeDetails.replace(':routeId', String(ride.routeId))}
              className="text-sm font-medium text-[#7B5CFF] hover:underline"
            >
              Open full route profile
            </Link>
          </div>
          {routeLoading ? (
            <div className="h-64 animate-pulse rounded-3xl bg-white/10" />
          ) : (
            <RouteMapWithElevation geoJson={geoJson} />
          )}
          <RouteRidersPanel routeRiders={linkedRoute?.routeRiders} />
          <RouteMetadataPanel route={linkedRoute} />
        </div>
      ) : (
        <p className="text-sm text-white/56">No route is linked to this event yet.</p>
      )}
      {user ? (
        <div className="flex flex-wrap gap-3">
          {amParticipant ? (
            <Button variant="secondary" type="button" onClick={() => leaveRide()} disabled={isLeaving}>
              {isLeaving ? 'Leaving…' : 'Leave ride'}
            </Button>
          ) : (
            <Button variant="primary" type="button" onClick={() => joinRide()} disabled={isJoining}>
              {isJoining ? 'Joining…' : 'Join ride'}
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-white/56">Sign in to join this ride.</p>
      )}
      <RideMembersList members={ride.participantDetails} participantCount={ride.participantCount ?? 0} />
    </section>
  );
}
