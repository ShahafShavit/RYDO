import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import RideEventCard from '@/features/rides/components/RideEventCard';
import EditRideModal from '@/features/rides/components/EditRideModal';
import RideMembersList from '@/features/rides/components/RideMembersList';
import RouteMapWithElevation from '@/features/routes/components/RouteMapWithElevation';
import RouteMetadataPanel from '@/features/routes/components/RouteMetadataPanel';
import { isRideUpcoming, useRideEvent } from '@/features/rides/hooks/useRideEvent';
import { useRideAttendance } from '@/features/rides/hooks/useRideAttendance';
import { useRouteDetails } from '@/features/routes/hooks/useRouteDetails';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Button from '@/shared/components/ui/button/Button';
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
        <div className="h-40 animate-pulse rounded-3xl bg-surface-strong" />
      </section>
    );
  }

  if (isError || !ride) {
    const loadError =
      error?.status === 404
        ? 'This ride was not found or is not visible with your account.'
        : error?.message || 'Could not load this ride.';
    return (
      <section className="space-y-4">
        <p className="text-red-400">{loadError}</p>
        <Button variant="secondary" type="button" onClick={() => refetch()}>
          Retry
        </Button>
      </section>
    );
  }

  const upcoming = isRideUpcoming(ride);
  const showEdit = Boolean(ride.viewerCanEdit && upcoming);

  return (
    <section className="space-y-6">
      <RideEventCard
        ride={ride}
        showEdit={showEdit}
        onEditClick={() => setEditOpen(true)}
      />
      <EditRideModal open={editOpen} onClose={() => setEditOpen(false)} ride={ride} />
      {ride.routeId ? (
        <div className="space-y-4">
          {routeLoading ? (
            <div className="h-64 animate-pulse rounded-3xl bg-surface-strong" />
          ) : (
            <RouteMapWithElevation geoJson={geoJson} />
          )}
          <RouteMetadataPanel route={linkedRoute} />
        </div>
      ) : (
        <p className="text-sm text-fg-muted">No route is linked to this event yet.</p>
      )}
      {user && ride.rideKind !== 'soloLog' && upcoming ? (
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
      ) : null}
      {!user && ride.rideKind !== 'soloLog' && upcoming ? (
        <p className="text-sm text-fg-muted">Sign in to join this ride.</p>
      ) : null}
      <RideMembersList members={ride.participantDetails} participantCount={ride.participantCount ?? 0} />
    </section>
  );
}
