import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
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
import { requestLiveRidePermissions } from '@/features/live-ride/utils/requestLiveRidePermissions';
import RideWeatherSummary from '@/features/weather/RideWeatherSummary';
import { usePageBreadcrumbDetail } from '@/shared/context/BreadcrumbContext';

export default function RideEventPage() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const { ride, isLoading, isError, error, refetch } = useRideEvent(rideId);

  usePageBreadcrumbDetail(ride?.name);
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

  const rideHeaderExtra =
    user && ride.rideKind !== 'soloLog' && upcoming ? (
      <>
        {amParticipant && ride.routeId ? (
          <Button
            type="button"
            variant="neon"
            className="shrink-0"
            onClick={async () => {
              await requestLiveRidePermissions();
              navigate(ROUTES.rideLive.replace(':rideId', String(ride.id)));
            }}
          >
            Live Ride
          </Button>
        ) : null}
        {amParticipant ? (
          <Button variant="secondary" type="button" className="shrink-0" onClick={() => leaveRide()} disabled={isLeaving}>
            {isLeaving ? 'Leaving…' : 'Leave ride'}
          </Button>
        ) : (
          <Button variant="primary" type="button" className="shrink-0" onClick={() => joinRide()} disabled={isJoining}>
            {isJoining ? 'Joining…' : 'Join ride'}
          </Button>
        )}
      </>
    ) : null;

  return (
    <section className="space-y-6">
      <RideEventCard
        ride={ride}
        showEdit={showEdit}
        onEditClick={() => setEditOpen(true)}
        headerExtra={rideHeaderExtra}
      />
      <EditRideModal open={editOpen} onClose={() => setEditOpen(false)} ride={ride} />
      {ride.routeId ? (
        <div className="space-y-4">
          <RouteMapWithElevation
            geoJson={geoJson}
            layout="split"
            splitTriplePreset={upcoming ? 'mapHalf' : 'default'}
            splitTrailing={
              upcoming ? (
                <RideWeatherSummary
                  key={`${ride.id}-ride-weather`}
                  ride={ride}
                  linkedRoute={linkedRoute}
                  routeLoading={routeLoading}
                  layout="split"
                />
              ) : null
            }
          />
          <RouteMetadataPanel route={linkedRoute} />
        </div>
      ) : (
        <p className="text-sm text-fg-muted">No route is linked to this event yet.</p>
      )}
      {!user && ride.rideKind !== 'soloLog' && upcoming ? (
        <p className="text-sm text-fg-muted">Sign in to join this ride.</p>
      ) : null}
      <RideMembersList members={ride.participantDetails} participantCount={ride.participantCount ?? 0} />
    </section>
  );
}
